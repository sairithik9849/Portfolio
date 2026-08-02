# What I Do

Word-stack scroll rig and live-system viz panel subsystem. Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** Word-stack scroll clock, Lenis snapping, knockout band, viz switch (`WidVisual`), per-viz scroll slices, the phone rig, the reduced-motion frozen fallback, and `widViz.js` data. Shared WID animation variants → `docs/animation.md`.

## Overview

The `#what-i-do` section is a two-part rig: a pinned word-stack scrubber on the left and a scroll-synced "live system" viz panel on the right. Driven by `WhatIDo.jsx` + the `src/components/widviz/` subsystem.

## Single Scroll Clock → `progress` MotionValue

`WhatIDo.jsx` owns one `gsap.matchMedia` + `ScrollTrigger` that pins the section and scrubs
1:1 (`scrub: true` — Lenis is the smoothing layer; a scrub-lerp would add a second
interpolation track that fights it). One arm, `MOTION_QUERY = '(prefers-reduced-motion:
no-preference)'` — the rig runs at **every** width/pointer tier now; the fallback (below)
is reduced-motion-only, not a width fallback. Full stage-by-stage history and rationale:
`docs/mobile.md` §5.3.

`setup()` branches on `isPhone = !matchMedia('(min-width:768px)').matches` and measures
`viewportH = document.documentElement.clientHeight` (never `vh` — phone address-bar
collapse makes `vh` lie; `docs/mobile.md` §5.2.1). ≥768px math is byte-identical to before.

Pin length is budgeted per word: `end = max(perWord × (N-1), travel + dwellPx)`, where
`perWord`/`dwellPx` are `SCROLL_PER_WORD = 1100`/`AGENTS_DWELL_PX = 800` on desktop/tablet,
or both replaced by the measured `viewportH` on phone (~1 screen of runway per word — a
fixed 1100px carried over from desktop would run ~7 screens instead of ~5).

**There are two progress tracks, not one.** `progress` (the `useMotionValue` above) drives
the word scrub and the per-viz `widSlice` cross-dissolve. A second value, `agentsProgress`,
tracks dwell into the trailing Agents-only runway (`dwellPx`) and derives `captionFade` /
`exitFade` — the caption's fade-out over the last 10% of that dwell so the blurb clears
before the section un-pins. Any port of this rig (a new breakpoint, a rewrite) must
reproduce both tracks; reading only `progress` silently loses the Agents exit fade.

Its `onUpdate` **does not re-render on scroll**: sets both word stacks' `y` via `gsap.set`,
pushes `self.progress` into `progress` (`progress.set` — no React render), only calls
`setActive(i)` when the rounded snap index actually changes (guarded by `activeRef`), and
arms the settle snap.

**Never add a second ScrollTrigger or read scroll position elsewhere in this section** — the viz must stay on this one clock.

## Snapping — Lenis-Driven, Not GSAP

GSAP `snap` was removed — it fights Lenis's own interpolation and feels rubbery; **do not reintroduce it**.

A settle snap fires after `SETTLE_MS` (140 ms) of inactivity, re-checks `window.__lenis.velocity` and defers until momentum decays below `SETTLE_VELOCITY_MAX`, then `lenis.scrollTo`s the nearest `i/(N-1)` snap target (skipped within `SNAP_EPSILON_PX`). An `isSnapping` flag suppresses re-arming while a programmatic scroll (settle or click) is in flight.

**On coarse pointers, the trigger is different, not the guards.** Lenis's touch path
reports raw per-event pixel deltas as `velocity` (not the wheel path's smoothed lerp), so
`SETTLE_VELOCITY_MAX` — tuned against the smoothed value — is meaningless there
(`docs/mobile.md` §5.3.1 #4). When `matchMedia('(pointer: coarse)').matches && 'onscrollend'
in window`, the timer-based re-arm in `onUpdate` is skipped and a native `scrollend`
listener calls `attemptSettle()` directly on genuine stop instead. All three guards below
still gate `attemptSettle` itself, regardless of which trigger fired it.

**The settle snap must never fire outside the pin range** — it is triple-guarded:

1. Armed only at `0 < progress < 1`
2. `attemptSettle` bails when `!st.isActive`
3. `onLeave`/`onLeaveBack` clear pending timers

A stale settle-timer chain surviving past the boundary ghost-scrolls the user back into the section. **Keep all three guards.**

## Word Click / Keyboard Navigation

Each base-stack `.wid-word` is `role="button"` + `tabIndex=0`; clicking (or Enter/Space) calls `scrollToIndex` — a Lenis scroll to that word's exact snap position, populated into `scrollToIndexRef` inside setup and cleared on teardown. `scrollToIndexRef` is populated at every tier now (the pin runs everywhere); the `scrollIntoView` fallback on the matching `.wid-mobile-blurb-item` only fires under **reduced motion**, where there's no ScrollTrigger to scroll within.

**Keep the ko-stack geometry identical to the base stack** (no padding/margin/font overrides) — glyph registration depends on it.

## Caption + Number Highlighting

The active blurb renders as real DOM text in `.wid-caption` (`aria-live`, `AnimatePresence mode="wait"` crossfade); the viz panel itself is `aria-hidden`. `highlightText` in `WhatIDo.jsx` wraps numeric tokens (and per-entry `blurbMarks` phrases from `whatIDo.js`) in gold `.wid-caption-num` spans.

## Font-Dependent Measurement

Pin end and word travel are computed from the measured `.wid-word` line-box height, which depends on the loaded web font. Setup runs inside `document.fonts.ready.then(...)` guarded by an `alive` flag; teardown happens in `mm.revert()` (handles StrictMode + resize-out-of-range). **Do not move measurement earlier.**

## Knockout Band Technique

Two identical word stacks share the same JS-set `y` so glyphs register pixel-perfectly:

- `.wid-stack--base` (cream) — carries real text and is the accessible stack
- `.wid-stack--ko` (in `--bg`, `aria-hidden`) — clipped by `.wid-band` (`overflow:hidden`, accent fill) to produce the lime "active word" reveal

## Viz Switch

`WidVisual.jsx` selects a viz via a `VIZ` map keyed by `whatIDo.js` id:

| id | Component | Status |
|---|---|---|
| `systems` | `VizSystems.jsx` | Live |
| `backend` | `VizBackend.jsx` | Live |
| `data` | `VizData.jsx` | Live |
| `interface` | `VizInterface.jsx` | Live (4-layer autonomous isometric breathing card: raw data stream → logic grid → insight widgets → glass control panel) |
| `agents` | `VizAgents.jsx` | Live — "Orchestrator Core" orbital composition. Five lifecycle stages (GOAL, DISCOVERY, PLANNING, VERIFY, SHIP) arranged clockwise on an elliptical orbit around a central core. One luminous traveler rides the ring, igniting one stage at a time. At PLANNING, 4 agent orbs dispatch and orbit the core in parallel (the execution centerpiece). They converge to VERIFY; first pass always fails → gold rework arc (cubic bezier through the core) loops back to PLANNING; second pass ships. Minimal labels only; no HUD telemetry. One unified RAF clock, refs-only, zero re-renders. Depth layer: seeded background scatter network (CSS breathing), ambient drift particles, traveler comet trail (6-dot ring buffer), per-agent personality (speed/glow/radius variance), one contextual phase label, and completion feedback (synchronized ring + node glow + network ripple on ship). |

All five layers render absolutely stacked and cross-dissolve via opacity; each receives `progress`, `index`, `isActive`, `reduced`, `frozen`.

Adding a capability requires: a `WHAT_I_DO` entry, a `WID_VIZ` entry, a new `Viz*.jsx` in `src/components/widviz/`, and a `VIZ` map entry in `WidVisual.jsx`.

## Desktop Viz Field — Off-Screen Mount Gate

Three of the five `Viz*` components (`VizData`, `VizAgents`, `VizSystems`) run a `requestAnimationFrame` loop that **reschedules every frame for the component's entire mounted lifetime** — an internal `isActive`/`dissolve` check skips the per-frame *work* but never the wakeup itself. Left unmounted-always (as it was originally), this meant ~3 rAF callbacks ran continuously for the whole page lifetime, even while the hero was on screen and this section nowhere near the viewport — a real cost on weak GPUs.

`WhatIDo.jsx` now wraps the **desktop** `<WidVisual>` field (the one at the bottom of the section, not the mobile `frozen` list) in a `vizInView` gate: an `IntersectionObserver` on `sectionRef` with `rootMargin: '50% 0px 50% 0px'` (mounts ~half a viewport early so `WID_PANEL_REVEAL` still has time to play; unmounts the same distance after exit). This fully unmounts all 5 Viz components — and their rAF loops — off-screen, mirroring the pause/resume pattern `useJourneyEngine.js` already uses for the Journey canvas engine.

This gate is independent of the pin/scrub `ScrollTrigger` above it — pin geometry is measured off the word column (`stackBase`/`stackKo`), never off the viz field, so mounting/unmounting the field cannot perturb scrub or settle-snap math. The mobile `<WidVisual frozen index={i} />` list is intentionally **not** gated — it renders one static frame each, no rAF loop to save.

**Do not remove this gate or widen its `rootMargin` significantly** — it is the primary fix for WhatIDo's continuous main-thread cost on low-end GPUs.

## Per-Viz Scroll Slices — `widSlice.js`

`widSlice(index, n)` returns the input/output ranges each viz maps `progress` through with `useTransform`:

- `dissolveIn` + `dissolveOut` trapezoid `[s-d/2, s, s+d/2, s+d] → [0, 1, 1, 0]` (hold for first half of the scroll gap, crossfade over the second half — lands fully at the next snap)
- `enterIn` one-way `[s-d, s] → [0, 1]` (enter only)

`useTransform` clamps, so edge vizzes (i=0, i=n-1) need no manual clamping. **Use this helper for any new viz** rather than hand-rolling ranges.

## Phone Rig — Vertical Re-choreography (`<768px`)

Same pin/scrub/settle mechanic as desktop — decided by running it on real hardware first,
not by theory (`docs/mobile.md` §5.3.2) — re-choreographed onto one column: word window on
top, viz field in the middle, caption at the bottom. No DOM reorder; `.what-i-do`'s
children are already in this order, `WhatIDo.css`'s phone block just un-absolutes them
into the existing flex column.

- **Word window**: 3 rows, hard-clipped above (`overflow: hidden`), soft `mask-image` fade
  below. Height/`marginTop` are set by `setup()`'s phone branch, not CSS.
- **Caption**: clamped to 5 lines (`-webkit-line-clamp`); a real `<button
  aria-expanded>` (`captionClamped`/`captionExpanded` state, `measureCaption` ref callback
  comparing `scrollHeight` vs. `clientHeight`) overlays the expanded text on the viz field
  (which keeps animating, dimmed) rather than growing the caption and pushing the viz
  around. A one-shot scroll listener auto-collapses it.
- **Far-layer gate**: `.widviz-layer[data-far] { content-visibility: hidden }` (`@supports`,
  with a `display:none` fallback for pre-Safari-18) stops the 24 ungated CSS keyframe animations
  in off-active viz layers from ticking — the real mobile perf cost, not the rAF loops
  (those already early-return idle). Scoped to `≤980px`/coarse pointer; `active ± 1` is
  always sufficient since the cross-dissolve trapezoid spans at most two layers above zero
  opacity.
- **Per-viz phone fit**: each of the five vizzes needed its own fix once real geometry was
  measurable — Systems/Data centering-padding/`vh` sizing replaced with flex-relative
  sizing, Backend/Agents/Interface a phone-scoped `scale()` (`0.72`/`0.85`/`0.75`). Every
  phone-scoped viz rule is prefixed `.widviz-panel:not(.widviz-panel--frozen)` — the same
  class powers the frozen fallback below, and a first pass leaked scale rules into it before
  this scoping was added. Full per-viz rationale: `docs/mobile.md` §5.3.13.

Full stage-by-stage design record, measurements, and verification tables: `docs/mobile.md`
§5.3.

## Frozen Mode — Reduced-Motion Fallback (any tier)

Under `prefers-reduced-motion: reduce` **only** — not "mobile"; the phone rig above runs
the live pin at every tier, reduced motion is the one condition that disables it anywhere —
`.wid-mobile-blurbs` lists all five blurbs, each with `<WidVisual frozen index={i} />`. A frozen panel renders one viz seeded at its snap point (`frozenProgress = index/(N-1)`) with `reduced`+`frozen` true so it resolves to its final static frame. Keep both the live pinned path and the frozen path working — they are not interchangeable, and per-viz phone-fit rules above must never leak into this one (see the scoping note above).

## Data — `src/data/widViz.js`

`WID_VIZ` (keyed by id) contains: labels, metrics, glyph copy, and precomputed geometry (e.g. the SYSTEMS Fibonacci-sphere nodes/edges/pulse-edges computed once at module load with a seeded Mulberry32 PRNG). No copy inside the `Viz*.jsx` components themselves.

## Common Edits

**Adding a new capability/viz:**

1. Add a `WHAT_I_DO` entry in `src/data/whatIDo.js` (with `id`, `blurb`, and optional `blurbMarks`).
2. Add a `WID_VIZ` entry in `src/data/widViz.js` (keyed by the same `id`).
3. Create `src/components/widviz/Viz<Name>.jsx`. Accept `{ progress, index, isActive, reduced, frozen }`. Use `widSlice(index, n)` for scroll-slice ranges. Implement a `frozen` fast-path seeded at `frozenProgress = index/(N-1)`.
4. Add the new id → component mapping in the `VIZ` map inside `WidVisual.jsx`.

## Do Not

- Never add a second `ScrollTrigger` in `WhatIDo.jsx` — the viz panel must stay on the single scroll clock.
- Never reintroduce GSAP `snap` — it fights Lenis interpolation and feels rubbery. Snapping is Lenis-driven only.
- Never remove any of the three settle-snap guards (progress range check, `!st.isActive` bail, `onLeave`/`onLeaveBack` timer clear) — a stale timer ghost-scrolls the user back into the section.
- Never move font measurement before `document.fonts.ready` — pin geometry depends on loaded web font metrics.
- Never apply padding, margin, or font overrides to the `.wid-stack--ko` stack that differ from `.wid-stack--base` — glyph registration depends on pixel-identical geometry.
- Never add a scrub lerp to the ScrollTrigger — `scrub: true` (no value) keeps the one-to-one Lenis mapping; a numeric lerp adds a second interpolation track that fights Lenis.
- Never drive `.wifc-particle` (the Interface viz's data-flow dot, `VizInterface.jsx`) via `top`/`left` — it moves through Framer `x`/`y` motion values (`transform`, compositor-only) against a `translate: -50% -50%` CSS centering offset kept as a *standalone* `translate` property so it composes with Framer's inline `transform` instead of being overwritten by it. The stage it travels through (`.wifc-stage`) is a fixed 340×260px box, so the motion-value ranges are hardcoded px fractions of that box, not live-measured — if the stage's fixed size ever changes, update those constants alongside it. `.wifc-stage` now has **three** scale arms — base `1.35`, a laptop-height `1.15` (`max-height:900px` + `min-width:981px`), and phone/tablet fits (`0.75`/`0.8`) — check which one resolves before assuming the base value.
- Never assume `global.css`'s import order is harmless: it imports `WhatIDo.css` **before** `widviz/shell.css`. Any same-specificity selector in `WhatIDo.css` targeting `.widviz-panel` loses to shell.css's unconditional rule regardless of media query unless it out-specifies it (e.g. the phone block's `.what-i-do .widviz-panel:not(.widviz-panel--frozen)`). Check import order before assuming a same-file-looking override will win (`docs/mobile.md` §5.3.10).
- Never declare a function `setup()` references in `onUpdate`/`ScrollTrigger.create()`'s synchronous refresh as a `const` arrow function *after* that call — `ScrollTrigger.create()` fires `onUpdate` immediately, and if the user is already mid-pin (e.g. a resize-driven rebuild during a device rotation), that's a temporal-dead-zone `ReferenceError`. Use a hoisted `function` declaration for anything reachable from the synchronous refresh (`docs/mobile.md` §5.3.12).
- Never read `getBoundingClientRect` to measure a field that carries a CSS `transform: scale()` (the phone-fit rules above) — it returns the post-transform visual rect, double-applying the scale into position math. Use `offsetWidth`/`offsetHeight` (layout box, transform-immune) instead, as `VizData.jsx`/`VizBackend.jsx`/`VizAgents.jsx` do.
