# What I Do

Word-stack scroll rig and live-system viz panel subsystem. Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** Word-stack scroll clock, Lenis snapping, knockout band, viz switch (`WidVisual`), per-viz scroll slices, frozen mobile fallback, and `widViz.js` data. Shared WID animation variants → `docs/animation.md`.

## Overview

The `#what-i-do` section is a two-part rig: a pinned word-stack scrubber on the left and a scroll-synced "live system" viz panel on the right. Driven by `WhatIDo.jsx` + the `src/components/widviz/` subsystem.

## Single Scroll Clock → `progress` MotionValue

`WhatIDo.jsx` owns one `gsap.matchMedia` + `ScrollTrigger` (desktop only — `DESKTOP_QUERY` = `min-width:981px` + `pointer:fine` + `no-preference`) that pins the section and scrubs 1:1 (`scrub: true` — Lenis is the smoothing layer; a scrub-lerp would add a second interpolation track that fights it).

Pin length is budgeted per word: `end = max(SCROLL_PER_WORD × (N-1), travel + 800)` with `SCROLL_PER_WORD = 780` (`N = WHAT_I_DO.length = 5`).

Its `onUpdate` **does not re-render on scroll**: sets both word stacks' `y` via `gsap.set`, pushes `self.progress` into a `useMotionValue` (`progress.set` — no React render), only calls `setActive(i)` when the rounded snap index actually changes (guarded by `activeRef`), and arms the settle snap.

**Never add a second ScrollTrigger or read scroll position elsewhere in this section** — the viz must stay on this one clock.

## Snapping — Lenis-Driven, Not GSAP

GSAP `snap` was removed — it fights Lenis's own interpolation and feels rubbery; **do not reintroduce it**.

Instead a settle snap fires after `SETTLE_MS` (140 ms) of inactivity, re-checks `window.__lenis.velocity` and defers until momentum decays below `SETTLE_VELOCITY_MAX`, then `lenis.scrollTo`s the nearest `i/(N-1)` snap target (skipped within `SNAP_EPSILON_PX`). An `isSnapping` flag suppresses re-arming while a programmatic scroll (settle or click) is in flight.

**The settle snap must never fire outside the pin range** — it is triple-guarded:
1. Armed only at `0 < progress < 1`
2. `attemptSettle` bails when `!st.isActive`
3. `onLeave`/`onLeaveBack` clear pending timers

A stale settle-timer chain surviving past the boundary ghost-scrolls the user back into the section. **Keep all three guards.**

## Word Click / Keyboard Navigation

Each base-stack `.wid-word` is `role="button"` + `tabIndex=0`; clicking (or Enter/Space) calls `scrollToIndex` — a Lenis scroll to that word's exact snap position, populated into `scrollToIndexRef` inside setup and cleared on teardown. On mobile/reduced-motion (no ScrollTrigger) the click falls back to `scrollIntoView` on the matching `.wid-mobile-blurb-item`.

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
| `agents` | `VizAgents.jsx` | **Placeholder (`return null`)** — animation not yet built; blurb in `whatIDo.js` is an empty string |

All five layers render absolutely stacked and cross-dissolve via opacity; each receives `progress`, `index`, `isActive`, `reduced`, `frozen`.

Adding a capability requires: a `WHAT_I_DO` entry, a `WID_VIZ` entry, a new `Viz*.jsx` in `src/components/widviz/`, and a `VIZ` map entry in `WidVisual.jsx`.

## Per-Viz Scroll Slices — `widSlice.js`

`widSlice(index, n)` returns the symmetric input ranges each viz maps `progress` through with `useTransform`:
- `dissolveIn` triangle `[s-d, s, s+d] → [0, 1, 0]` (cross-dissolve)
- `enterIn` one-way `[s-d, s] → [0, 1]` (enter only)

`useTransform` clamps, so edge vizzes (i=0, i=n-1) need no manual clamping. **Use this helper for any new viz** rather than hand-rolling ranges.

## `widDwell.js` — Dead Code

`src/utils/widDwell.js` is a plateau transfer function (flat dwell around each snap point, smoothstep between) whose fixed points are the `i/(n-1)` snap targets — but **nothing imports it**. The dwell shaping was removed when snapping moved to Lenis. Comments in `WhatIDo.jsx` still reference it (`DWELL_HOLD`, "fixed points of widDwell") — read those as historical. If you reintroduce dwell shaping, this is the helper to use.

## Frozen Mode — Mobile / Reduced-Motion Fallback

On mobile and `prefers-reduced-motion`, `.wid-mobile-blurbs` lists all five blurbs, each with `<WidVisual frozen index={i} />`. A frozen panel renders one viz seeded at its snap point (`frozenProgress = index/(N-1)`) with `reduced`+`frozen` true so it resolves to its final static frame. Keep both the pinned desktop path and the frozen mobile path working — they are not interchangeable.

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
