# Animation

Animation-library policy, shared variants, scroll-reveal patterns, and reduced-motion handling. Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** Library policy, all `variants.js` exports, scroll-reveal, reduced-motion pattern, and AboutMe word-reveal. Hero cascade *execution* and timing → `docs/hero.md`. WhatIDo scroll clock and snapping → `docs/what-i-do.md`.

## Library Policy

- **Framer Motion** is the primary component animation library — no react-spring, no component-level CSS keyframes.
- **GSAP (`gsap@^3.15.0` + `ScrollTrigger`) is used in exactly two places:**
  1. `App.jsx` — `gsap.ticker` is the sole rAF driver for Lenis (`lenis.raf(time * 1000)`), and `lenis.on('scroll', ScrollTrigger.update)` keeps a single shared clock so Lenis and ScrollTrigger never double-rAF.
  2. `WhatIDo.jsx` — `gsap.matchMedia` + `ScrollTrigger` pin/scrub for the word-stack scroll animation, with `gsap.set` driving the stack `y`. Snapping is Lenis-driven, not GSAP `snap` — see `docs/what-i-do.md`.
- Do not add other animation libraries.

## `src/animations/variants.js` — Single Source of Variants

Import from here; never redefine variants inline. All shared Framer Motion variant objects live in this file.

### Scroll-reveal (`whileInView`)

- `REVEAL` — standard fade-up reveal for a single element
- `STAGGER_PARENT` — orchestrator for staggered child groups
- `STAGGER_CHILD` — individual child within a staggered group

Apply scroll-triggered fades (`whileInView`), staggered reveals on grouped content, and smooth hover transitions on every interactive element (`whileHover` or variant-driven).

### Hero Cascade Variants

See `docs/hero.md` for the full Hero entrance sequence. The relevant exports from `variants.js`:

- `HERO_PARENT` — bare cascade root; sets `initial:'hidden'`, no `staggerChildren` (breaking the per-phase order is the risk).
- `HERO_SEQUENCE` — timing table `{ grid, meta, name, manifesto, metrics, cta, terminal, footer, robot }` in seconds. Edit to shift phase start times.
- `HERO_SEQUENCE_INSTANT` — paired table with all values 0; used when `useReducedMotion()` is true.
- `fadeUp(delay, duration?)` — factory returning `{ hidden, show }` for a single delayed fade-up. Use for every new hero element; pass `T[key]` as the delay.

(The former legacy exports `HERO_CHILD`, `HERO_CHILD_FADE`, `HERO_LETTER`, `HERO_LINE_PARENT`, and `HERO_INNER_STAGGER` were unused and have been deleted from `variants.js`.)

### What I Do Shared Variants

- `WID_PANEL_REVEAL` — panel `whileInView` fade (the only shared WhatIDo variant; the former `WID_DRAW` / `WID_AMBIENT_REST` exports were unused and deleted)

### My Journey Variants

- `JOURNEY_CHAPTER` — chapter body transition inside `AnimatePresence mode="wait"`. Incoming: `opacity 0→1, blur 8px→0, y 40px→0` (~0.45s). Outgoing: reverse with y→−40px (~0.30s). Keyed by active chapter index.
- `JOURNEY_COUNTER` — odometer digit slide. Incoming: `y '105%'→'0%'`. Outgoing: `y '0%'→'-105%'`. Combined with `overflow:hidden` on the parent slot for the slot-machine mask effect.

## Reduced-Motion Pattern

`useReducedMotion()` (from framer-motion) is the standard gate:

- In `Hero.jsx`: sets `T = HERO_SEQUENCE_INSTANT` (all delays 0) and `dur = 0` (all durations 0) — entire sequence collapses to instant show. Apply the same `T`/`dur` pattern to any new Hero-level animation.
- In `AboutMe.jsx`: renders all words solid instantly (no ghost/fg opacity split).
- In `WhatIDo.jsx`: skips the ScrollTrigger pin entirely; falls back to frozen mobile layout (see `docs/what-i-do.md`).
- Lenis is **entirely disabled** under `prefers-reduced-motion` in `App.jsx` — no instance is created.

## Scroll-Scrubbed Sections (useScroll + useTransform)

Two sections use `useScroll`/`useTransform` from Framer Motion rather than `whileInView`:

**AboutMe** — `useScroll({ offset: ['start end', 'center center'] })` progress mapped to per-word opacity via `useTransform`. Each word lights across its `index/total → (index+1)/total` slice. `useReducedMotion()` renders all words solid instantly. Do not convert to `REVEAL`/`whileInView`.

**MyJourney** — `useScroll({ target: scrollContainerRef, offset: ['start start', 'end end'] })` produces the single 0→1 progress that drives the canvas engine, chapter counter, chapter body, and nav indicator simultaneously. Progress is piped to `ImageSequenceRenderer.setProgress()` via a MotionValue `.on('change', …)` subscription (zero React re-renders for frame changes); chapter index is derived via `progressToChapter` in `src/lib/journey/journeyProgress.js`. See `docs/journey.md` for the full architecture.

## Performance Floor

- Animate `transform` and `opacity` only — no layout-thrashing properties (`width`, `height`, `top`, `left`, etc.).
- 60fps+ target on all transitions. Avoid janky layout shifts. Favor hardware-accelerated CSS properties.

## Common Edits

**Adding a shared variant:** Add to `src/animations/variants.js` and import at the usage site — never define inline.

**Adding a new Hero cascade phase:** Add a key to `HERO_SEQUENCE` (and a matching `0` to `HERO_SEQUENCE_INSTANT`), then use `fadeUp(T.newKey, duration)` at the call site. Do not define raw variant objects inline.

**Adding scroll-reveal to a new section:** Wrap with `<motion.div variants={STAGGER_PARENT} initial="hidden" whileInView="show" viewport={{ once: true }}>` and use `STAGGER_CHILD` on children, or `REVEAL` on a standalone element.

## Do Not

- Do not add animation libraries beyond Framer Motion (no react-spring, no component-level CSS `@keyframes`).
- Do not use GSAP beyond the two existing places — `App.jsx` (ticker) and `WhatIDo.jsx` (ScrollTrigger pin). See `docs/what-i-do.md`.
- Do not define variants inline — always add to `variants.js` and import.
- Do not add `staggerChildren` to `HERO_PARENT` — it breaks per-phase ordering.
- Do not convert the `AboutMe` scroll word-reveal to `whileInView` — it is a `useScroll`/`useTransform` rig and must stay that way.
- Do not animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`) — use `transform`/`opacity` only.
