---
name: visual-verify
description: Verify a UI/CSS/animation change visually in the browser before declaring it done. Captures Playwright screenshots across the portfolio's phone, tablet, and desktop breakpoints (390/768/1280/1440/1920/2560), checks the reduced-motion path for animation changes, flags that hover states seen at mobile widths are false, and gates the "done" claim until every viewport is confirmed — with a real-device step for touch and coarse-pointer behavior. Use after any hero, viz, styling, or responsive tweak — or whenever a visual change should not be called finished without browser proof.
---

# Visual Verify

Composition & handoffs: see `docs/skills.md`. In the component-integration workflow, `visual-verify` runs after `design-review`. On completion, hand off to `doc-audit` if docs changed.

You are doing browser verification for the portfolio. The goal is a confirmed, per-viewport result before anything is called done.

## Token awareness (read first)

Check the 5-hour usage shown in the statusline. **If it is above 50%, state the current usage and ask whether to proceed** before taking any Playwright screenshot. If the user already authorized Playwright use this turn or session, skip re-asking.

## Step 1 — Dev-server hygiene

Never spawn a redundant dev server. Check whether one is already running:

```bash
# Try both common Vite ports in order
activePort=""
for port in 5173 5174; do
  if curl -sf -o /dev/null "http://localhost:$port"; then
    activePort=$port
    break
  fi
done
echo "$activePort"  # empty means none running
```

- If a server is already up, reuse that port.
- If none is up, start the dev server in the background: `npm run dev` (it binds to `5173`).
- **Never start a second server if one is already running.**
- After starting, wait for the server to be ready before navigating.

## Step 2 — Navigate

Use `mcp__playwright__browser_navigate` to load `http://localhost:<activePort>` (or the specific route being tested).

## Step 3 — Breakpoint matrix

Capture screenshots at the six portfolio breakpoints. For each, call `mcp__playwright__browser_resize` then `mcp__playwright__browser_take_screenshot`.

| Label | Width | Height | Tier |
|---|---|---|---|
| `sm` | 390 | 844 | phone |
| `md` | 768 | 1024 | tablet |
| `lg` | 1280 | 900 | desktop |
| `xl` | 1440 | 900 | desktop |
| `2xl` | 1920 | 1080 | desktop |
| `4k` | 2560 | 1440 | desktop |

All six are **required**, not optional. `sm` and `md` are the phone and tablet tiers
from `docs/mobile.md` §3.2 — do not substitute 375 or other widths.

Name screenshots descriptively: `<feature>-<label>.png` (e.g. `hero-manifesto-xl.png`).

### Hover states at mobile widths are FALSE

`browser_resize` changes the viewport and nothing else. The browser still reports
`pointer: fine` and `hover: hover` at 390px, so `@media (pointer: coarse)` and
`(hover: none)` blocks **never match** in this loop, and any hover style visible in a
`sm`/`md` screenshot will not exist on a real phone.

This loop proves: alignment, overflow, wrapping, type scale, stacking order, spacing.

It **cannot** prove: iOS Safari's engine, `100svh` collapse against the address bar,
touch momentum interacting with Lenis, or real thermal/GPU behavior. Route those to
Step 6.

### Verifying `(pointer: coarse)` — use CDP, not resize

`page.emulateMedia()` does **not** cover `pointer`/`hover`, and the MCP surface has no
context-creation tool — but `browser_run_code_unsafe` exposes `page`, and a CDP session
off it flips both. This is how DevTools device mode works, and it is verified working on
this project. Do **not** add Playwright as a dependency for this.

```js
async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await page.setViewportSize({ width: 1024, height: 768 });   // iPad landscape
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
  await page.reload();                 // required — re-evaluates gsap.matchMedia
  await page.waitForTimeout(5000);     // preloader floor + idle-mounted sections
  return JSON.stringify(await page.evaluate(() => ({
    coarse: matchMedia('(pointer: coarse)').matches,   // → true
    hoverNone: matchMedia('(hover: none)').matches,    // → true
  })));
}
```

Notes learned the hard way:

- **Reload after enabling touch.** `gsap.matchMedia` and `DESKTOP_QUERY` are evaluated at
  setup; toggling emulation on a live page can leave stale ScrollTriggers.
- **Below-fold sections mount on `requestIdleCallback`** (`App.jsx`), so `.journey-*`,
  `#work`, and `.wid-*` are absent for a beat after reload. Wait, then scroll to them,
  before asserting `absent` means anything.
- Assert on **computed styles and `getBoundingClientRect`**, not screenshots — it is
  precise, cheap, and immune to the renderer stall below.

### When screenshots time out

`browser_take_screenshot` can fail repeatedly with `Timeout 5000ms exceeded — waiting for
fonts to load`, because GSAP's ticker never lets the renderer go quiescent. Retry once
after a `browser_wait_for`; if it fails again, **stop** and fall back to computed-style
probes, then say plainly in the report which rows have pixel proof and which have
computed-style proof. Do not claim a viewport is ✓ on evidence you did not gather.

### Scrolling — Lenis, not native `window.scrollTo`

`App.jsx` mounts Lenis on `window.__lenis`, and GSAP's ticker drives `lenis.raf` every frame (see `docs/architecture.md`). A native `window.scrollTo(...)` fights that rAF loop instead of moving the page — this is the cause of `window.scrollTo is not a function`-shaped failures seen in past sessions. When the page isn't in the reduced-motion branch (Step 4), scroll via `browser_evaluate`:

```javascript
window.__lenis?.scrollTo(target, { immediate: true })
```

`target` can be a selector string, element, or Y offset. `immediate: true` jumps without an animated tween, which is what verification needs. If `window.__lenis` is undefined, the page is already in the reduced-motion branch — native `scrollIntoView`/`scrollTo` works fine there.

### Settle before capturing

GSAP's ticker and ScrollTrigger keep rAF running continuously on this site, so a screenshot tool that waits on network-idle or renderer-quiescence can stall — this is the source of the frozen-renderer/CDP screenshot timeouts seen in past sessions. After a resize or scroll, use `mcp__playwright__browser_wait_for` with a short fixed delay (~300–500ms) before calling `browser_take_screenshot`, rather than relying on the page to go idle.

### If the browser context dies mid-run

If a tool call fails with "Target page, context or browser has been closed" (or similar), do **one** fresh `browser_navigate` to the same URL and retry the failed step. If it fails the same way again, stop — don't keep hammering a dead context — and report to the user what step failed and what you tried, per the standing "avoid rabbit holes" guidance for browser automation.

## Step 4 — Reduced-motion pass (animation changes only)

When the change touches any Framer Motion variant, GSAP animation, CSS `@keyframes`, or `transition`, also verify the `prefers-reduced-motion` branch:

```javascript
// Inject via mcp__playwright__browser_evaluate
await page.emulateMedia({ reducedMotion: 'reduce' });
```

Then reload and capture at 1440 (minimum). Confirm the page still renders without blank screens or broken layout. The portfolio's `prefers-reduced-motion` path: Lenis is disabled, all hero delays collapse to instant, WhatIDo skips the ScrollTrigger pin.

## Step 5 — Report before declaring done

For every viewport captured, state the result explicitly:

```
sm  (390)  — ✓ / ✗ <what you saw>
md  (768)  — ✓ / ✗ <what you saw>
lg  (1280) — ✓ / ✗ <what you saw>
xl  (1440) — ✓ / ✗ <what you saw>
2xl (1920) — ✓ / ✗ <what you saw>
4k  (2560) — ✓ / ✗ <what you saw>
reduced-motion — ✓ / ✗ <what you saw>  (if applicable)
real iPhone    — ✓ / ✗ / not run      (Step 6)
real Android   — ✓ / ✗ / not run      (Step 6)
```

**Do NOT say "done" until every relevant row is ✓.** If any row is ✗, diagnose and fix before reporting complete.

When the change is mobile/tablet work, desktop rows are **regression checks** — they must
be unchanged from before. A desktop row that differs is a bug in the change, not an
improvement.

## Step 6 — Real-device gate (mobile/tablet changes only)

Authoritative for everything Step 3 cannot prove. Required once per section before that
section is called done — see `docs/mobile.md` §7.2.

```bash
npm run dev:clean          # repo rule: kills stale 5173/5174 first
npm run dev -- --host      # then open the printed LAN URL on a real device
```

The agent cannot run this. **Ask the user to open the LAN URL on a real iPhone and a real
Android and report back.** Until they do, report those rows as `not run` — never assume
them ✓, and never let a green Step 3 stand in for them.

## Common failure modes to watch for

- **Blank / white screen** — often a broken `useTransform` array form or missing import. Revert and use wrapper-opacity approach.
- **Off-center elements** — check `transform-origin` and CSS 3D `translateZ` order (rotation before translation is wrong — translate first, then rotate in `transform` shorthand).
- **Overflow / clipping at wide breakpoints** — `.shell` caps at `max-width: 1440px`; elements using `100vw` full-bleed may clip unexpectedly at 2560.
- **Animation still playing under reduced-motion** — confirm `useReducedMotion()` from framer-motion is actually being read at the component level.
