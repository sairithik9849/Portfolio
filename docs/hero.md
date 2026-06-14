# Hero

Hero entrance cascade, WebGL fluid background, Spline robot, and InfiniteGrid. Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** Hero entrance cascade, HeroFluid WebGL, SplineScene, InfiniteGrid, and the shader attractor. Preloader handoff and app-level observer setup → `docs/architecture.md`. Variant object definitions → `docs/animation.md`.

## Hero Internal Z-Order

`InfiniteGrid` `z:0` → `SplineScene` `z:1` → text/H1 `z:2`

## Hero Entrance Cascade

`Hero.jsx` drives `animate={started ? 'show' : 'hidden'}` where `started` is the `revealed` flag from `App.jsx` — the entire cascade holds at `hidden` until the preloader overlay wipe fires. See `docs/architecture.md` for the two-phase preloader handoff.

### Sequence (serialized)

InfiniteGrid → meta-row + name letters → manifesto quote → metric cards (simultaneous) → CTA → terminal → footer → robot hotspot

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

## HeroFluid (WebGL Background)

Three.js via `@react-three/fiber` + `@react-three/drei` (GLSL noise shader).

### Lazy Boundary

`HeroFluid` is `React.lazy` + Suspense in `App.jsx`. **Never convert to a static import** — the bundle is ~600 KB and must code-split.

### Render Loop Gating

`frameloop` is `"always"` only when **both** conditions are true:
1. `App.jsx` passes `active={heroVisible || footerVisible}` — two `IntersectionObserver`s on `#top`/`#contact`.
2. `HeroFluid` itself listens to `visibilitychange` and sets `docHidden=false` — prevents the shader rendering stale/throttled frames while the browser is backgrounded, which previously caused a jarring green flash on return.

`frameloop` is `"never"` otherwise.

### `uTime` — Clamped-Delta Accumulator

`useFrame` receives `delta` and advances `timeRef.current += Math.min(delta, MAX_FRAME_DELTA)` (cap: 0.05 s) instead of reading `clock.getElapsedTime()`. This ensures no tab pause can teleport the noise field forward by the idle gap and snap it onto a bright/green frame.

### Shader Attractor

`App.jsx` owns `globalMouseRef` (viewport-normalized 0–1 + `lastMove` timestamp) passed to `HeroFluid`. The glow is **confined to `#top` and `#contact`** via `e.target.closest('#top, #contact')` in `handleGlobalPointerMove` — it does not activate over mid-page sections. Idle-decays (~1.75s) in `HeroFluid.jsx` when the pointer leaves those regions. If the fluid stops tracking the cursor, check this ref's `pointermove` listener in `App.jsx`.

### `.noise` CSS Texture

`.noise` deliberately has **no `mix-blend-mode`** (plain 4% opacity) — overlay blending forced a full-viewport blend pass per scrolled frame; do not reintroduce it.

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

## InfiniteGrid

Static import in `Hero.jsx`. Renders at `z:0`. Its `100vw` full-bleed extends past the `.shell` intentionally — `body { overflow-x: hidden }` in `global.css` is the containment; do not remove it.

## Common Edits

**Adding a new Hero cascade phase:** Add a key to `HERO_SEQUENCE` (and a matching `0` in `HERO_SEQUENCE_INSTANT`). In `Hero.jsx`, use `fadeUp(T.newKey, dur)` where `T` is `HERO_SEQUENCE` or `HERO_SEQUENCE_INSTANT` depending on reduced-motion state. Wrap the new element in `<motion.div>` with that variant and `animate` bound to the parent `animate` prop.

**Adding a new Hero metric card:** Add to the metrics array in `src/data/` (or wherever card data lives) — the card inherits the `T.metrics` delay already wired to its parent group.

## Do Not

- Never reintroduce `staggerChildren` on `HERO_PARENT` — it breaks per-phase ordering.
- Never convert `HeroFluid` to a static import — the ~600 KB bundle must stay code-split.
- Never use `clock.getElapsedTime()` in `HeroFluid` — use the clamped-delta accumulator (`Math.min(delta, MAX_FRAME_DELTA)`); `getElapsedTime()` teleports the noise field after a tab pause.
- Never remove the `docHidden` + `active` render-loop gate — removing it causes a jarring green flash on tab return.
- Never remove either load-fade path from `SplineScene` (the `onLoad` handler and the 4s `setTimeout` fallback) — both are needed.
- Never remove the Spline pointer-forwarding in `Hero.jsx` without also removing letter `whileHover` in `HeroLetter.jsx` — they share a pointer-events split.
- Never add `mix-blend-mode` to `.noise` — forces a full-viewport blend pass per scrolled frame.
- Never eager-load `@splinetool/react-spline` — keep it `React.lazy` inside `SplineScene.jsx`.
