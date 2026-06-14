# Architecture

App-shell wiring, render order, preloader handoff, scrolling, observers, and cross-cutting singletons. Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** `App.jsx` wiring, preloader flags, Lenis setup, IntersectionObservers, AIOrb, cursor singleton, shader attractor, nav/footer, project-card visuals, and content data mapping. Hero internals → `docs/hero.md`. WhatIDo rig → `docs/what-i-do.md`. Animation variants → `docs/animation.md`.

## Section Render Order (`App.jsx`)

`Nav → Hero → AboutMe → WhatIDo → Experience → Education → Projects → Footer`

`AIOrb` + `AIDrawer` + `Cursor` are fixed overlays at the end of the tree.

**`<Nav />` is currently commented out in `App.jsx`** (temporarily hidden) — its import and visibility wiring remain intact; uncomment the JSX to restore it.

## Section id ↔ Component ↔ Nav Label

The ids in `nav.js` do not match component names — use this table for scroll targets and anchor links:

| Component | DOM id | Nav label |
|-----------|--------|-----------|
| `Hero` | `#top` | "Index" |
| `AboutMe` | `#about` | "About" |
| `WhatIDo` | `#what-i-do` | "What I Do" |
| `Experience` | `#experience` | "Experience" |
| `Education` | `#education` | "Education" |
| `Projects` | `#work` | "Work" |
| `Footer` | `#contact` | "Contact" |

## Two-Phase Preloader Handoff

`App.jsx` uses two booleans — `mountContent` and `revealed` — instead of a single `ready` flag.

- `mountContent` (set by `Preloader`'s `onMount` callback) mounts the full content tree **under the still-opaque overlay** so HeroFluid's WebGL shader can compile and Spline can init while the monolith canvas is frozen and the GPU is free.
- `revealed` (set when HeroFluid fires `onReady` on its first rendered frame, or after a 1200ms safety cap) triggers `beginExit` on the Preloader, which plays the clip-path wipe and flips `started=true` on `Hero` so the `HERO_SEQUENCE` cascade begins.

**Do not collapse these back into one flag** — that causes a triple-whammy frame spike (two WebGL contexts + Spline init + Framer entrance all contending with the wipe).

The three `IntersectionObserver` effects in `App.jsx` have `mountContent` in their dep array so they attach only after the Hero DOM actually exists; do not change their deps back to `[]`.

## `preloadAssets.js` Progress Model

Uses a continuous time-based ramp (0→0.88 over `MIN_DISPLAY_MS`) instead of discrete signal weights. The old eager `import()` warm-signals for HeroFluid and Spline were removed — their synchronous eval was blocking the main thread right as the counter reached ~92%, causing a visible freeze. The ramp plus `document.fonts.ready` bonus (0.08 head-start) provides a smooth counter climb; `done` fires from the min-display timer as before.

## Lenis Momentum Scroll

`App.jsx` owns a site-wide Lenis smooth-scroll instance (`duration: 1.6`, exponential ease, `smoothWheel: true`), driven by `gsap.ticker` (single shared clock):
- `gsap.ticker.add(tickerFn)` calls `lenis.raf(time * 1000)`
- `lenis.on('scroll', ScrollTrigger.update)` keeps ScrollTrigger in sync
- `gsap.ticker.lagSmoothing(0)` prevents frame-skip after tab blur
- Exposed as `window.__lenis` for cross-component access

Key behaviours:
1. **Entirely disabled** under `prefers-reduced-motion` (early return, no instance created).
2. **Paused** (`.stop()`) while the AI drawer is open, resumed (`.start()`) on close — prevents wheel events leaking behind the drawer.

Framer Motion's `useScroll` reads native `scrollTop` transparently — do not replace native scroll with a virtual Lenis scroll container.

**Anchor scrolling goes through `scrollToId(id)` (`src/utils/scrollTo.js`)** — it routes through `window.__lenis.scrollTo` when Lenis exists and falls back to native `scrollIntoView`. Use it (Hero and Nav already do) instead of raw `scrollIntoView` for any new in-page link.

## AIOrb Visibility

Hidden while the Hero (`#top`) **or** the What I Do section (`#what-i-do`) is intersecting the viewport — `AIOrb` receives `hidden={heroVisible || whatIdoVisible}`. Both flags come from `IntersectionObserver`s in `App.jsx`. A third observer on `#contact` drives `footerVisible` for the HeroFluid active gate. The Hero gate avoids overlapping the robot hotspot; the What I Do gate keeps the orb off the pinned viz panel.

## Global Hotkey

`useHotkey('cmd+k', toggleAI)` in `App.jsx` (from `src/hooks/useHotkey.js`) opens the AI drawer. The hook also supports `'escape'`. Any new global shortcut belongs in `App.jsx` using this hook.

## Cursor MotionValue Singleton

`CURSOR_X` / `CURSOR_Y` are exported from `src/utils/cursor.js`. Any component needing pointer position imports them — never prop-drill, never duplicate `pointermove` listeners. Mark interactive elements with `data-cursor="hover"` for the hover state.

## Shader Attractor Singleton

`App.jsx` owns `globalMouseRef` (viewport-normalized 0–1 + `lastMove` timestamp) passed to `HeroFluid`. The glow is **confined to `#top` and `#contact`** via `e.target.closest('#top, #contact')` in `handleGlobalPointerMove` — it does not activate over mid-page sections. Idle-decays (~1.75s) in `HeroFluid.jsx` when the pointer leaves those regions. If the fluid stops tracking the cursor, check this ref's `pointermove` listener in `App.jsx`.

## Page Background Z-Order

- `HeroFluid` (lazy WebGL) at `z:0`
- `.noise` CSS texture at `z:2`
- Both persistent across the page

The old static `.grid-bg` is gone — do not reintroduce. See `docs/hero.md` for HeroFluid render-loop gating and `uTime` accumulator details.

`.noise` deliberately has **no `mix-blend-mode`** (plain 4% opacity) — overlay blending forced a full-viewport blend pass per scrolled frame; do not reintroduce it.

## Layout Shell

`.shell` = `max-width: 1440px; padding: 0 24px`. All sections use it. Hero overrides to flush-left (`padding-left/right: 0; overflow: visible`). `body { overflow-x: hidden }` is load-bearing — Spline canvas and `InfiniteGrid`'s `100vw` full-bleed both extend past the shell intentionally.

## Nav Visibility

Driven by an `IntersectionObserver` on `#top` (Hero root). Toggles `opacity`/`y`/`pointer-events` so a hidden nav is never accidentally clickable. (Nav is currently commented out in `App.jsx` — see render-order note above.)

## Footer Mount Animation

`Footer.jsx` uses a delayed `initial/animate` fade (delay = `HERO_SEQUENCE.footer`, 5.3s) rather than `whileInView`. It participates in the hero reload sequence even though it is off-screen at page load. Do not revert it to `REVEAL` / `whileInView`.

## Project Card Visuals

Each project in `src/data/projects.js` maps to a purely CSS/SVG visualization component in `src/components/visuals/` (e.g. `VizAero.jsx`, `VizMF.jsx`). `src/components/ProjectVisual.jsx` is the switch — it selects the viz via a `VIZ` map (keyed `aero/mf/spp/ll/wb/sch`) using the `kind` prop. Adding a new project requires a new `Viz*.jsx` in `visuals/` and a `VIZ` map entry in `ProjectVisual.jsx` — no canvas or third-party deps in these components.

## Content Data Mapping

All copy lives in `src/data/` — never hardcode inside components.

| File | Exports / Used by |
|---|---|
| `nav.js` | Nav links |
| `aboutMe.js` | `ABOUT_ME_STATEMENT`, `ABOUT_ME_HIGHLIGHT`, `ABOUT_ME_EMPHASES` → `AboutMe.jsx` |
| `whatIDo.js` | `WHAT_I_DO` entries → `WhatIDo.jsx` |
| `widViz.js` | `WID_VIZ` keyed by id → `WidVisual.jsx` / `Viz*.jsx` |
| `projects.js` | Project entries → `Projects.jsx` / `ProjectVisual.jsx` |
| `experience.js` | Experience entries → `Experience.jsx` |
| `education.js` | Education entries → `Education.jsx` |
| `agent.js` | AI persona data |
| `preloader.js` | `PRELOADER_NAME`, `STATUS_PHASES`, `getStatusLabel(progress)` → `Preloader.jsx` |

## Common Edits

**Adding a new page section:** Add the component to the render order in `App.jsx`, add an `IntersectionObserver` if needed for AIOrb/HeroFluid gating, add an entry to the section-id table above, add an entry to `nav.js`, and create `src/styles/<name>.css` (see `docs/design-system.md`).

**Adding a new in-page anchor link:** Use `scrollToId(id)` from `src/utils/scrollTo.js` — never use raw `scrollIntoView`.

**Adding a new global hotkey:** Add `useHotkey('<combo>', handler)` in `App.jsx` using the existing hook from `src/hooks/useHotkey.js`.

**Adding a new project card:** Add to `src/data/projects.js`, create `src/components/visuals/Viz*.jsx` (CSS/SVG only, no canvas, no third-party deps), and add a `VIZ` map entry in `ProjectVisual.jsx`.

> If project-card visuals grow into a major subsystem, promote them to `docs/visuals.md` and update the routing-table row in `CLAUDE.md`.

## Do Not

- Do not collapse `mountContent` and `revealed` into one flag — causes a triple-whammy frame spike (two WebGL contexts + Spline init + Framer entrance contending with the wipe).
- Do not change the IntersectionObserver dep arrays back to `[]` — they must include `mountContent`.
- Do not use raw `scrollIntoView` for in-page links — always route through `scrollToId`.
- Do not replace native `scrollTop` scroll with a Lenis virtual scroll container — Framer Motion's `useScroll` reads native scroll and breaks if replaced.
- Do not reintroduce `.grid-bg`.
- Do not add `mix-blend-mode` to `.noise` — forces a full-viewport blend pass per scrolled frame.
- Do not prop-drill cursor position — import `CURSOR_X`/`CURSOR_Y` from `src/utils/cursor.js`.
- Do not duplicate `pointermove` listeners — the cursor singleton covers the whole document.
