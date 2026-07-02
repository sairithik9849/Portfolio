---
name: visual-verify
description: Verify a UI/CSS/animation change visually in the browser before declaring it done. Captures Playwright screenshots at the portfolio's real desktop breakpoints (1280/1440/1920/2560), checks the reduced-motion path for animation changes, and gates the "done" claim until every viewport is confirmed. Use after any hero, viz, or styling tweak — or whenever a visual change should not be called finished without browser proof.
---

# Visual Verify

Composition & handoffs: see `docs/skills.md`. In the component-integration workflow, `visual-verify` runs after `design-review`. On completion, hand off to `doc-audit` if docs changed.

You are doing browser verification for the portfolio. The goal is a confirmed, per-viewport result before anything is called done.

## Token awareness (read first)

Check the 5-hour usage shown in the statusline. **If it is above 50%, state the current usage and ask whether to proceed** before taking any Playwright screenshot. If the user already authorized Playwright use this turn or session, skip re-asking.

## Step 1 — Dev-server hygiene

Never spawn a redundant dev server. Check whether one is already running:

```powershell
# Try both common Vite ports in order
$ports = @(5173, 5174)
$activePort = $null
foreach ($port in $ports) {
  try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$port" -UseBasicParsing -TimeoutSec 3
    if ($resp.StatusCode -eq 200) { $activePort = $port; break }
  } catch {}
}
$activePort  # $null means none running
```

- If a server is already up, reuse that port.
- If none is up, start the dev server in the background: `npm run dev` (it binds to `5173`).
- **Never start a second server if one is already running.**
- After starting, wait for the server to be ready before navigating.

## Step 2 — Navigate

Use `mcp__playwright__browser_navigate` to load `http://localhost:<activePort>` (or the specific route being tested).

## Step 3 — Breakpoint matrix

Capture screenshots at the four portfolio breakpoints. For each, call `mcp__playwright__browser_resize` then `mcp__playwright__browser_take_screenshot`.

| Label | Width | Height |
|---|---|---|
| `lg` | 1280 | 900 |
| `xl` | 1440 | 900 |
| `2xl` | 1920 | 1080 |
| `4k` | 2560 | 1440 |

Name screenshots descriptively: `<feature>-<label>.png` (e.g. `hero-manifesto-xl.png`).

If the caller specifies additional widths (e.g. mobile 375, 768), capture those too — but default to the four above.

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
lg  (1280) — ✓ / ✗ <what you saw>
xl  (1440) — ✓ / ✗ <what you saw>
2xl (1920) — ✓ / ✗ <what you saw>
4k  (2560) — ✓ / ✗ <what you saw>
reduced-motion — ✓ / ✗ <what you saw>  (if applicable)
```

**Do NOT say "done" until every relevant row is ✓.** If any row is ✗, diagnose and fix before reporting complete.

## Common failure modes to watch for

- **Blank / white screen** — often a broken `useTransform` array form or missing import. Revert and use wrapper-opacity approach.
- **Off-center elements** — check `transform-origin` and CSS 3D `translateZ` order (rotation before translation is wrong — translate first, then rotate in `transform` shorthand).
- **Overflow / clipping at wide breakpoints** — `.shell` caps at `max-width: 1440px`; elements using `100vw` full-bleed may clip unexpectedly at 2560.
- **Animation still playing under reduced-motion** — confirm `useReducedMotion()` from framer-motion is actually being read at the component level.
