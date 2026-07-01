# Hero

Hero entrance cascade, Spline robot, and StarField. Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** Hero entrance cascade, SplineScene, and StarField. Preloader handoff and app-level observer setup → `docs/architecture.md`. Variant object definitions → `docs/animation.md`.

## Hero Internal Z-Order

`StarField` `z:0` → `SplineScene` `z:1` → text/H1 `z:2`

## Hero Entrance Cascade

`Hero.jsx` drives `animate={started ? 'show' : 'hidden'}` where `started` is the `heroStarted` flag from `App.jsx` — the entire cascade holds at `hidden` until **after** the preloader curtain has fully swept up. `heroStarted` is set from `Preloader`'s `onRevealComplete` (`AnimatePresence onExitComplete`), which fires ~0.88s after `revealed` becomes true. This ensures the Framer reconciliation spike that schedules all ~5.6s of `HERO_SEQUENCE` delays lands on a clean main thread with the overlay already gone. The Spline robot is unaffected (its crossfade is outside the cascade, driven by its own `onLoad`). See `docs/architecture.md` for the three-flag preloader handoff.

### Sequence (serialized)

StarField → meta-row + name letters → manifesto quote → metric cards (simultaneous) → CTA → terminal → footer → robot hotspot

### Timing Constants (`src/animations/variants.js`)

- `HERO_SEQUENCE` — `{ grid, meta, name, manifesto, metrics, cta, terminal, footer, robot }` in seconds. Edit to shift phase start times.
- `HERO_SEQUENCE_INSTANT` — paired table with all values 0; used when `useReducedMotion()` is true.
- `fadeUp(delay, duration?)` — factory returning `{ hidden, show }`. Use for every new hero element; pass `T[key]` as the delay where `T` is `HERO_SEQUENCE` or `HERO_SEQUENCE_INSTANT`.

### `HERO_PARENT`

A bare cascade root — sets `initial:'hidden'` and propagates to all children. **Never reintroduce a global `staggerChildren` on `HERO_PARENT`** — it breaks the per-phase ordering.

### Two-Word Name Reveal

`SAIRITHIK` fades up as a single unit at `T.name`; `KOMURAVELLY.` follows 120 ms later (`T.name + 0.12`), both using `fadeUp(delay, 0.7)`. Under reduced motion the 120 ms offset collapses to 0. Each word is wrapped in `<motion.span className="hero-name-line">` inside the `h1`; individual `HeroLetter` spans carry only `whileHover` (no entrance variant).

Legacy exports from `variants.js` that are **no longer used by `Hero.jsx`**: `HERO_LETTER`, `HERO_LINE_PARENT`, `HERO_INNER_STAGGER`, `HERO_CHILD`, `HERO_CHILD_FADE` — retained for stability.

### Reduced Motion

`useReducedMotion()` in `Hero.jsx` sets `T = HERO_SEQUENCE_INSTANT` (all delays 0) and `dur = 0` (all durations 0) — entire sequence collapses to instant show. Apply the same `T`/`dur` pattern to any new Hero-level animation.

## SplineScene (Hero Robot)

Spline via `@splinetool/react-spline` + `@splinetool/runtime`.

### Lazy Boundary

`SplineScene` is a **static import** in `Hero.jsx`. The heavy `@splinetool/react-spline` package is `React.lazy`-loaded **inside** `SplineScene.jsx`. The code-split boundary is that package import — keep it lazy. Never eager-load.

### Load Fade

`SplineScene` starts at `opacity:0` and crossfades to `1` (0.9s) when Spline fires `onLoad`. A 4s `setTimeout` fallback in `SplineScene.jsx` triggers the fade if `onLoad` never fires (slow/offline). **Do not remove either path** — both are needed for reliability.

### `onLoaded` Prop (Reveal Gate)

`SplineScene` accepts an `onLoaded` prop. Both the `onLoad` callback and the 4s fallback call `onLoaded` when they fire — this propagates up through `Hero` (`onSplineLoaded`) to `App`, which forwards it to `createPreloadTracker().markSplineReady()`. The preloader curtain waits for this signal (plus HeroFluid's `markFluidReady`) before revealing. Do not remove the `onLoaded` call from either code path in `SplineScene.jsx`.

### Spline Pointer Forwarding (Load-Bearing)

`handlePointerMove` in `Hero.jsx` re-dispatches synthetic `pointermove`+`mousemove` (`bubbles: false`) to the Spline canvas whenever the cursor is **outside** `.hero-spline`. Removing this requires also disabling letter `whileHover` in `HeroLetter.jsx` — they share a pointer-events split.

## Terminal

`.hero-bottom-row .sub` is `position: absolute` (out of flex flow) so the terminal centers on the robot without disturbing the left column. The `left` formula is `78vw`-based: robot center ≈ `--robot-left` (48%) + half the remaining span + `--robot-translate` (8%) ≈ 78.16vw. The `max(40px, (100vw - 1440px) / 2)` term corrects for hero padding that grows above 1440px — without it the terminal drifts right on wide monitors. At `≤980px` the terminal reverts to `position: static` so it stacks normally below the metrics.

**Framer Motion trap:** `.sub` is a `motion.div`. Framer sets `style.transform = "none"` inline, overriding any CSS `transform`. Never center with `translateX(-50%)` — bake the half-width offset into `left` directly.

Copy lives in `src/data/terminal.js`; line shapes are documented there. The `help` command and `● READY` status line are intentionally absent.

## StarField

Static import in `Hero.jsx`. Renders at `z:0`. Its `100vw` full-bleed extends past the `.shell` intentionally — `body { overflow-x: hidden }` in `global.css` is the containment; do not remove it.

Three depth layers (small/many/fast → large/sparse/slow) drift upward via `useAnimationFrame` + `useMotionValue` (the same rAF pattern used by the former `InfiniteGrid`). A subtle `useSpring` parallax shifts all layers together on `window` `pointermove`. Both are frozen under `useReducedMotion()`.

**Legibility stack (inside `.starfield`):**
1. `.starfield__vignette` — opaque `--bg`/`--bg-2` radial base; covers the page background within the hero viewport (intentional).
2. `.starfield__layers` — the drifting star dots (box-shadow on centered 1/2/3 px divs).
3. `.starfield__scrim` — soft `color-mix()` radial overlay darkening the text column by ~55% at center, fading to transparent at the edges. Ensures cream text stays fully legible over cream star points.

CSS partial: `src/styles/hero/starfield.css` (registered in `global.css` at the former `grid.css` slot).

## Common Edits

**Adding a new Hero cascade phase:** Add a key to `HERO_SEQUENCE` (and a matching `0` in `HERO_SEQUENCE_INSTANT`). In `Hero.jsx`, use `fadeUp(T.newKey, dur)` where `T` is `HERO_SEQUENCE` or `HERO_SEQUENCE_INSTANT` depending on reduced-motion state. Wrap the new element in `<motion.div>` with that variant and `animate` bound to the parent `animate` prop.

**Adding a new Hero metric card:** Add to the metrics array in `src/data/` (or wherever card data lives) — the card inherits the `T.metrics` delay already wired to its parent group.

## Do Not

- Never reintroduce `staggerChildren` on `HERO_PARENT` — it breaks per-phase ordering.
- Never remove either load-fade path from `SplineScene` (the `onLoad` handler and the 4s `setTimeout` fallback) — both are needed.
- Never remove the Spline pointer-forwarding in `Hero.jsx` without also removing letter `whileHover` in `HeroLetter.jsx` — they share a pointer-events split.
- Never add `mix-blend-mode` to `.noise` — forces a full-viewport blend pass per scrolled frame.
- Never eager-load `@splinetool/react-spline` — keep it `React.lazy` inside `SplineScene.jsx`.
- Never center the terminal with `transform: translateX(-50%)` — Framer Motion sets `transform: none` inline; bake the offset into `left` directly.
- Never move the scanline back to `.terminal::after` — it belongs on `.terminal .bar::after`; `.bar` needs `position: relative; overflow: hidden` to clip it.
- Never shrink `.hero-manifesto` below `max-width: clamp(520px, 58%, 768px)` — the longest metric label truncates below 768px.
