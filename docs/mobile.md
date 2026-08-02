# Mobile & Responsive

Owner doc for the **responsive tier system**, the **pointer-capability axis**, and the
desktop → mobile translation effort.

- `docs/design-system.md` owns tokens, spacing, type scale, color roles.
- **This doc owns** which viewport widths exist, what each tier is derived from,
  how hover/touch is handled, and the phase-by-phase progress ledger.

If the two conflict on a breakpoint value, this doc wins.

**Status (2026-08-01):** **Phases 1–3 done — Hero, AboutMe, WhatIDo are translated,
Chromium-verified, and real-device-verified** (real iPhone + real Android, confirmed by
Sai — matches the intended design). Phase 4 (Journey) is next, expected verify-only per
§4.1. Phases 5 (Projects) and 6 (Footer/AIOrb/ReturnToTop/ScrollProgressFrame) are not
started. Decisions in §3 are locked (interview, 2026-07-23; Hero interview 2026-07-24;
AboutMe interview 2026-07-31; WhatIDo interview 2026-07-31).

---

## 1. What Sai is trying to do

Make the portfolio render *and animate* correctly on phones and tablets **without
losing the desktop site's looks, animation, or feel**.

Non-negotiables, stated directly by Sai:

1. **All content ships everywhere.** No section, element, or copy is dropped on mobile.
2. **All animation ships everywhere.** Nothing becomes a static list.
3. **Perfect alignment** at small widths — no overflow, no clipping, no cramped stacks.
4. Work proceeds **top-to-bottom, one section at a time**, after a shared foundation.

> An agent resuming this work must not propose cutting Spline, the avatar sequence,
> StarField, or any section "for mobile performance." That was explicitly rejected.
> See §6. One narrow, already-approved exception exists (AIOrb on phone) — see §6.1.

---

## 2. The reframe that drove this effort

Mobile was not greenfield — the repo already had ~20 `@media` blocks, a dedicated
`JourneyMobile.jsx`, a `gsap.matchMedia` desktop gate, and a correct
`<meta name="viewport">`, none of it ever rendered at a mobile width. The job was to
render what exists at 390px, find where it breaks, and translate it section by
section — not "add mobile support." That framing still applies to Phases 4–6.

---

## 3. Locked decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Audit + translate, not build from scratch | Mobile CSS already exists everywhere; see §2 |
| 2 | **No** multi-agent skills (`fan-out-fan-in`, `stochastic-multi-agent-consensus`, `model-chat`) | Discovery tools for open-ended questions. The architecture already chose; the bottleneck is rendering on a phone |
| 3 | Full fidelity — nothing cut | Sai's explicit requirement |
| 4 | Animations **translate**, never delete | A horizontal scrub is illegible at 390px. Keep the *beats*, change the *axis* |
| 5 | **Three tiers**: phone `<768` / tablet `768–980` / desktop `≥981` | Sai's choice over a simpler two-tier split |
| 6 | Tablet is derived from **desktop choreography, retuned** | Keeps pin/scrub/sticky mechanics; scales type, spacing, stage widths |
| 7 | `(pointer: coarse)` is a **separate axis**, independent of width | A tablet running desktop layouts has no hover. Also covers touch laptops at desktop widths |
| 8 | Ship all weight; measure before cutting | `<SpeedInsights />` is mounted (`App.jsx:363`). Don't build a device-capability system for an unconfirmed problem |
| 9 | Verify layout via MCP resize; verify touch/engine behavior on a **real phone** | See §7 |
| 10 | Foundation phase first, then strict top-to-bottom | Prevents each section inventing its own breakpoint vocabulary |

### 3.1 Options considered and rejected — do not re-propose without new information

- **Mobile-lite** (drop Spline / widviz / avatar sequence) — rejected, §1.
- **Pure reflow, no bespoke work** — rejected; leaves sections as shrunken desktop.
- **Two tiers** (at 980px or 768px) — rejected in favour of three, §3 decision 5.
- **Bespoke third design per section for tablet** — rejected; tablet derives from desktop.
- **Capability-gating** (`deviceMemory`/`saveData`/`effectiveType`) — rejected as speculative; iOS Safari reports none of it.
- **Pre-emptive half-res avatar sequence** — rejected; revisit only if Speed Insights flags it.
- **Adding `playwright` as a devDependency** — rejected; the real-device gate is authoritative anyway.
- **Sticky + Framer `useScroll` for WhatIDo's phone rig** — rejected after measurement; GSAP's pin was tested on real hardware and passed. See §5.3.

### 3.2 The tier system

```text
   0 ──────── 767 │ 768 ──────── 980 │ 981 ──────────►
   [   PHONE      ]│[   TABLET       ]│[   DESKTOP    ]
    vertical        desktop mechanics,  full
    translation     retuned scale       choreography

   ORTHOGONAL:  @media (pointer: coarse), (hover: none)
                applies at ANY width — converts hover → tap/scroll-triggered
```

**Every tier-defining `@media` width in `src/styles/` must be `768px` or `981px`.**
Intra-tier refinements (e.g. `@media (max-width: 460px)` inside the phone tier) are
allowed — they refine within a tier, they don't define one.

```css
@media (max-width: 767px)                        { /* phone   */ }
@media (min-width: 768px) and (max-width: 980px) { /* tablet  */ }
@media (min-width: 981px)                        { /* desktop */ }
```

768px belongs to **tablet**. Audit with:

```bash
grep -rn "min-width: 769px\|max-width: 768px" src/styles   # must return nothing
```

**Do not try to "tokenize" this.** CSS custom properties cannot be read inside
`@media` queries. The tier system is a documented convention enforced by review. Do
**not** add PostCSS, Sass, or a build plugin to work around this.

---

## 4. Ground truth: current state of the code

### 4.1 Journey is already correct — use it as the reference

`MyJourney.jsx` renders `<JourneyMobile>` unconditionally and `.journey-desktop` is
hidden by default (`journey.css:32`), opting in at `min-width: 768px`, with a
`768–980` retune block at `journey.css:794`. That is **exactly** the target
architecture from §3.2 — the reference implementation, not an outlier. Expect Phase 4
to be verify-only.

### 4.2 Section status

| Section | Status | Notes |
|---|---|---|
| Layout shell | ✅ done (Phase 0) | Shared foundation |
| Hero | ✅ done (Phase 1) | §5.1 |
| AboutMe | ✅ done (Phase 2) | Coupled to Hero via the sticky-stack |
| WhatIDo | ✅ done (Phase 3) | §5.3 — hardest translation in this effort |
| Journey | Not started (Phase 4) | Expected verify-only, §4.1 |
| Projects | Not started (Phase 5) | Horizontal accordion → vertical expand. Mobile cutoff currently `≤980px` in `projects.css:248` — needs the `≤767` / `768–980` split per §3.2 |
| Footer / AIOrb / ReturnToTop / ScrollProgressFrame | Not started (Phase 6) | Smallest surface. AIOrb phone treatment already shipped early, out of order — see §6.1 |

### 4.3 Hover inventory (needs the `(pointer: coarse)` treatment)

28 `:hover` rules total across the codebase. Only one coarse-pointer block existed
before this effort (`hero/robot.css:185`) — it is the pattern to follow, co-located
with its component. Do **not** create a global `responsive.css`; keep pointer rules
next to the styles they override. Hero's hovers gained coarse fallbacks in Phase 1.
Remaining un-audited: `journey.css` (3), `ai.css` (4), `return-to-top.css` (3),
`footer.css` (1) — relevant to Phases 4 and 6.

### 4.4 Orphan breakpoints — intentionally left alone

`preloader.css:254` (600px), `hero/manifesto.css:391` (460px),
`hero/identity.css:116` (640px). All three sit **inside** the phone tier, so they are
intra-tier refinements, not tier violations. Leave them.

### 4.5 Mobile payload (shipping as-is per §3 decision 8)

| Asset | Cost | Current mobile behavior |
|---|---|---|
| Spline robot | ~600 KB runtime + WebGL context + shader compile | Ships to phones — `hero/robot.css:127`. Lazy-loaded via `SplineScene.jsx` |
| Avatar sequence | `public/avatar/` — 193 `.webp` frames, 5.2 MB | Windowed at ±24 frames (`src/lib/journey/sequenceConfig.js`), streams |
| StarField | box-shadow raster — paint-bound on mobile GPUs | Ships; phone-tier density reduced without changing on-screen look, §5.2.2 |

Before proposing any cut: read the **mobile** LCP / INP / CLS percentiles in Vercel
Speed Insights (already mounted, `App.jsx:363`, never yet checked).

---

## 5. Phase plan

| Phase | Scope | Status |
|---|---|---|
| ✅ 0 | Foundation — tier normalization, breakpoint audit | Done 2026-07-23 |
| ✅ 1 | Preloader + Hero | Done 2026-07-24. §5.1 |
| ✅ 2 | AboutMe + `hero-about-stack.css` | Done 2026-07-31. §5.2 |
| ✅ 3 | WhatIDo | Done 2026-08-01. §5.3 |
| 4 | Journey | Expected **verify-only** — already correct per §4.1 |
| 5 | Projects | Horizontal accordion → vertical expand |
| 6 | Footer / AIOrb / ReturnToTop / ScrollProgressFrame | Smallest surface |

Each phase is done only when §7's checklist passes, including the real-device rows.

### 5.1 Phase 1 — Preloader + Hero

Hero interview (grill-me, 2026-07-24) drove the design: robot on phone is a centered
band above the cards; tablet = retuned desktop (robot right, terminal absolute over
it, 4-col metrics); sticky-pin deferred to Phase 2; phone H1 fits each word on one
line; phone meta-row restacks; metrics stay 2×2 on phone; hero hovers gained
`(pointer: coarse)` fallbacks. `preloader.css` gained a mobile/tablet-only "BEST
EXPERIENCED ON DESKTOP" advisory line.

Files: `hero/shell.css`, `hero/identity.css`, `hero/manifesto.css`, `hero/robot.css`,
`hero/terminal.css`, `Preloader.jsx`, `preloader.css`, `data/preloader.js`.

**Real-device bugs found and fixed:**

- iOS Safari has no `requestIdleCallback`; the below-fold mount and Lenis init landed
  on top of the Hero cascade's opening beats. Fixed via `src/utils/scheduleIdle.js`
  (non-zero `setTimeout` fallback instead of `0`).
- The Spline robot tracked touch drags on phone/tablet (Spline's own canvas listener
  saw native touch events `Hero.jsx`'s mouse-only forwarding never covered). Fixed
  with `.hero-spline { pointer-events: none }` inside the existing coarse-pointer block.

**Verified:** real iPhone + real Android, Chromium resize matrix (390/768/1280/1440/
1920/2560), CDP coarse-pointer emulation, reduced-motion.

### 5.2 Phase 2 — AboutMe section head + universal sticky-stack

AboutMe interview (grill-me, 2026-07-31) drove two changes: the section-head
scale/spacing defect, and extending the Hero → AboutMe sticky-stack to every tier
including phone (a bigger scope than §3's original "tablet only" framing).

**Section head.** `layout.css`'s tier blocks narrowed the index column per tier but
never scaled the index/title font. Fixed by adding font-size/padding overrides to the
tier blocks; `about-me.css`'s duplicate grid declaration and stale `.right {
display:none }` patch were deleted — `layout.css` now owns section-head sizing at
every tier.

**Sticky-stack.** The phone hero must stay taller than the viewport (not compressed
to one screen), so `top: 0` sticky (which works when `.hero` is exactly `100svh`)
can't apply directly. Fix: `top: var(--hero-pin-top, 0px)`, written by an `App.jsx`
`ResizeObserver` effect as `min(0, clientHeight − hero.offsetHeight)` — ~0px on
desktop/tablet (unchanged), a negative offset on phone so the hero scrolls normally
and only locks once its bottom edge reaches the viewport bottom. The pin's gate
dropped its width condition entirely — one shared rule now:
`(prefers-reduced-motion: no-preference)` gates pin + card + SVG progress frame at
every tier.

Files: `layout.css`, `about-me.css`, `hero-about-stack.css`, `App.jsx`,
`ScrollProgressFrame.jsx`, `scroll-progress-frame.css`.

**Real-device bugs found and fixed:**

- The progress-frame's birth-phase transform used a CSS `vh` unit while everything
  else in the component measured via `clientHeight` — the two diverge on iOS Safari
  as the address bar collapses, so the gold line detached from the card's edge
  mid-scroll. Fixed by switching to the same measured-pixel value everywhere.
- `heroVisible` read `entry.isIntersecting` on `#hero-sentinel`, which starts below
  the fold on phone (`.hero` is deliberately taller than the viewport there) — so it
  was `false` from first paint, freezing StarField and MatrixText. Fixed by reading
  `entry.boundingClientRect.top > 0` instead. Paired with a phone-tier StarField
  density reduction (`STAR_SPREAD`/`LAYERS` scaled down, same on-screen density) and
  `will-change: transform` on `.starfield__layer` for Safari compositing.

**Verified:** real iPhone + real Android, Chromium resize matrix, CDP coarse-pointer
emulation, reduced-motion, scroll-simulated pin-lock trigger.

### 5.3 Phase 3 — WhatIDo (the hardest translation)

Interview via `grill-me`, 2026-07-31. Landed across six stages (A–F); design record
condensed below. Full mechanic-decision evidence (GSAP vs. sticky+`useScroll`, tested
on real hardware) lives in git history if ever needed again — the decision itself is
locked, §3.1.

**What shipped.** One `gsap.matchMedia` arm, `MOTION_QUERY = '(prefers-reduced-motion:
no-preference)'`, runs the pin at **every** tier — replacing the old
`DESKTOP_QUERY` (`min-width:981px` and `pointer:fine`), which had a live gap at 1024px
with a coarse pointer (iPad landscape), where neither the pin nor the CSS fallback
applied and the word stacks collapsed. `setup()` branches on `isPhone` and a measured
`viewportH` (never `vh`) to compute phone-specific runway/window geometry;
`≥768px` math is unchanged from before. Phone layout: word window (3 rows, masked
fade) → viz field → caption (5-line clamp, `<button aria-expanded>` overlay-expand,
auto-collapses on scroll), un-absoluted into the section's existing flex column — no
DOM reorder. Tablet needed no container-geometry changes beyond one Interface-viz
overflow fix. All five vizzes got a phone-specific fit (scale or flex-relative
sizing, per §5.3-era measurement — see "Lessons learned" below for the reusable
gotchas that drove each one). The reduced-motion fallback (any tier, not "mobile" —
the live rig now runs everywhere) was restyled to the live rig's visual language:
index+word as the divider, lime hairline, gold index number.

Files: `WhatIDo.jsx`, `WhatIDo.css`, `widviz/systems.css`, `backend.css`,
`interface.css`, `agents.css`, `data.css`, `VizData.jsx`, `VizBackend.jsx`,
`VizAgents.jsx`.

**Real-device bugs found and fixed** (iPhone 14 Pro):

- `min-height: 100svh` came up short once GSAP pinned the section to
  `position: fixed` — WebKit-specific `svh` handling, not reproducible in Chromium.
  Fixed by overriding with the JS-measured `clientHeight` pixel value on phone; CSS
  `100svh` stays as the pre-JS fallback only.
- All five vizzes rendered desktop-sized content clipped by the panel's
  `overflow: hidden` — driven by real screenshots, not the design record's
  predictions. Data needed a fix nobody had scoped in (its field was sized off
  viewport `vh`, not the panel).

**Verified:** real iPhone + real Android (confirmed working as intended, 2026-08-01),
Chromium resize matrix, CDP coarse-pointer emulation, reduced-motion, mid-pin resize
(device rotation simulation).

#### Lessons learned — reusable beyond WhatIDo

These recurred enough during Phases 1–3 that they're worth carrying into Phases 4–6:

- **`vh`/`svh` lie under `position: fixed`/pinned sections on iOS Safari.** Always
  measure with `document.documentElement.clientHeight` (via `ResizeObserver`) and
  feed that into JS-set inline styles; keep the CSS viewport-unit value only as a
  pre-JS fallback. Hit three times independently (progress-frame birth line §5.2,
  WhatIDo's phone runway, WhatIDo's `100svh`-under-`fixed`).
- **Equal-specificity CSS across files resolves by import order in `global.css`**,
  not just selector specificity — a same-specificity rule in a file imported earlier
  loses to one in a file imported later, regardless of media query. Check import
  order before assuming a same-file-looking override will win.
- **`const` arrow functions referenced inside a synchronous `ScrollTrigger.create()`
  refresh must be hoisted `function` declarations**, not `const`, if the user can
  already be mid-pin when the refresh fires (e.g. a resize-driven rebuild during
  device rotation) — otherwise it's a temporal-dead-zone crash.
- **`getBoundingClientRect` returns the post-transform visual rect** — under a CSS
  `transform: scale()`, that silently double-applies the scale into position math.
  Use `offsetWidth`/`offsetHeight` (layout box, transform-immune) for anything
  computing geometry on a scaled element.
- **Lenis's touch-scroll `velocity` is a raw per-event pixel delta**, not the wheel
  path's smoothed lerp value — thresholds tuned against the wheel path are
  meaningless on touch. Prefer the native `scrollend` event as the trigger on
  `(pointer: coarse)` where supported.
- **Width and pointer are different axes** (also §6 rule 5) — a tablet/coarse
  combination (iPad landscape, touch laptop) can fall through a gap that neither a
  width-only gate nor a pointer-only gate covers on its own.

---

## 6. Standing rules for any agent resuming this

1. **Never propose cutting content, sections, or animations for mobile.** Rejected, §1.
2. **Translate, don't delete.** If a desktop interaction can't work as-is on a phone,
   re-choreograph it on the vertical axis. `display: none` is not a mobile strategy.
3. **Every `@media` width is `768px` or `981px`.** Intra-tier refinements excepted.
4. **Never tokenize breakpoints.** CSS vars don't work in `@media`. No build plugins.
5. **Width and pointer are different axes.** Adding a width breakpoint does not fix a
   hover problem, and vice versa.
6. **No new dependencies for verification.** Real device is the gate, §7.2.
7. **Don't spawn multi-agent skills for this work.** §3, decision 2.
8. Standard repo rules still apply: JavaScript only, Framer Motion for component
   animation, GSAP only in its two existing sites, animate `transform`/`opacity`
   only, content stays in `src/data/`.

### 6.1 Standing exception — AIOrb on phone

AIOrb is not rendered on phone (`<768px`) — a user-approved exception decided outside
phase order via a grill-me interview (2026-07-31), performance + visual real-estate
call. Do not "fix" this back. See `docs/architecture.md`'s "AIOrb Visibility" for the
mechanism. Hero/Footer AI-chat CTAs are unaffected and still work on phone. Tablet
and desktop are unaffected.

---

## 7. Verification protocol

Split by what each method can actually prove. Still required for Phases 4–6.

### 7.1 Fast loop — MCP Playwright (layout only)

`mcp__playwright__browser_resize` at **390 / 768 / 1280 / 1440 / 1920 / 2560**.

Proves: alignment, overflow, wrapping, type scale, stacking order, spacing.

`browser_resize` alone does **not** change pointer type — the browser still reports
`pointer: fine` at 390px, so **any hover state visible in a resize-only mobile
screenshot is false**. Use the CDP method below for anything pointer-dependent.

**Cannot prove by any local method — these rows need §7.2:**

- iOS Safari's rendering engine
- `100svh` collapse against the address bar
- real touch momentum interacting with Lenis
- thermal / GPU behavior under sustained animation

### 7.1a Coarse-pointer emulation via CDP

`browser_run_code_unsafe` exposes `page`; a CDP session off it flips both
`pointer: coarse` and `hover: none` — the same mechanism as DevTools device mode.

```js
async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
  await page.reload();              // required — re-evaluates gsap.matchMedia
  await page.waitForTimeout(5000);  // preloader floor + idle-mounted sections
  /* then assert on computed styles */
}
```

Do **not** add Playwright as a dependency (§3.1) — CDP needs none. Gotcha: reload
after enabling touch, or stale ScrollTriggers survive; below-fold sections mount on
`requestIdleCallback`, so wait and scroll before treating `absent` as a finding.

### 7.1b Screenshots can stall

`browser_take_screenshot` can fail with a font-load timeout when GSAP's ticker keeps
the renderer busy. Prefer computed-style and `getBoundingClientRect` assertions —
more precise, cheaper, immune to this. If screenshots fail, say which rows have pixel
proof and which have computed-style proof.

### 7.2 Gate — real device (authoritative)

```bash
npm run dev:clean          # repo rule: kills stale 5173/5174 first
npm run dev -- --host      # then open the LAN URL on a real phone
```

Required once per phase, on a real iPhone **and** a real Android, before that phase
is called done. This is the only source of truth for the "cannot prove" list above.

### 7.3 `visual-verify` skill

Breakpoint matrix is 390/768/1280/1440/1920/2560 (all required); hover states at
mobile widths are flagged as false; the real-device gate (§7.2) is a required step.

### 7.4 Per-phase done checklist

```text
phone   (390)         — ✓/✗
tablet  (768)         — ✓/✗
desktop (1280)        — ✓/✗   ← regression check, must be unchanged
desktop (1440)        — ✓/✗   ← regression check, must be unchanged
coarse pointer (§7.1a)— ✓/✗   ← CDP touch emulation, automatable
reduced-motion        — ✓/✗
real iPhone           — ✓/✗   ← iOS Safari engine / svh / momentum only
real Android          — ✓/✗
```

State for each row whether the proof is a **screenshot** or a **computed-style
assertion**. Desktop rows are **regression checks** — this effort must not change
desktop rendering; if a desktop row differs from before, that is a bug in the
change, not an improvement.

---

## 8. Resuming

1. Read §1 and §3 — what Sai wants and what is already decided. Do not relitigate.
2. Read §6 — the standing rules.
3. Find the next unstarted phase in §5 (Journey is next, expected verify-only).
4. Re-verify the relevant `file:line` references in §4 (they may have drifted).
5. Follow §7 before claiming anything is done, including the real-device rows.

Interview that produced this doc: 2026-07-23, via the `grill-me` skill.
Update this doc — especially §4's section status and §5's phase table — as phases land.
