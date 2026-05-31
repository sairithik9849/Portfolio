# Repository Guidelines

## Project

Personal portfolio for **Sairithik Komuravelly (Sai)** . Goal: best-in-class developer portfolio — highly animated, deeply interactive, polished. Showcases low-level systems engineering + high-end frontend execution.

## Commands

```bash
npm install         # install
npm run dev         # frontend only
vercel dev          # frontend + serverless API (required when touching /api)
npm run build       # production build → dist/
npm run preview     # preview production build
npm run lint        # ESLint flat config (React + Hooks + Refresh)
vercel              # preview deploy
vercel --prod       # production deploy
```

## Dev & Design Guidelines

- **Language:** JavaScript only. No TypeScript, no type annotations. ES6+ (arrow fns, destructuring, async/await, optional chaining). `const` default, `let` for reassignment, never `var`. ES modules throughout.
- **Frontend:** React + Vite (SPA).
- **Backend:** Vercel Serverless Functions in `/api`. AI chat → Google Gemini (`gemini-1.5-flash-latest`). No Express.
- **Animation:** Framer Motion. Shared variants (`REVEAL`, `STAGGER_PARENT`, `STAGGER_CHILD`, `HERO_PARENT`, `HERO_CHILD`, `HERO_CHILD_FADE`) live in `src/animations/variants.js` — import, never redefine inline.
- Animations must be silky smooth (60fps+). Avoid janky layout shifts. Favor hardware-accelerated CSS properties (transform, opacity).
- **3D/WebGL:** Three.js via `@react-three/fiber` + `@react-three/drei` (HeroFluid GLSL); Spline via `@splinetool/react-spline` + `@splinetool/runtime` (Hero robot). Both heavy bundles are code-split: `HeroFluid` is `React.lazy` in `App.jsx`; the `@splinetool/react-spline` package is `React.lazy`-loaded inside `SplineScene.jsx`. Never eager-load (~600 KB).
- **Styling:** CSS is split into one partial per section/component in `src/styles/`. `global.css` is the import manifest (ordered list of `@import`s) — it is the only CSS file imported by `src/main.jsx`. Each partial owns its section's base rules **and** its responsive overrides (co-located `@media` at the bottom of the file). `layout.css` contains shared primitives (`.shell`, `.row`, `.section-head`). To add a new section: create `src/styles/<name>.css` and add `@import './<name>.css'` to `global.css` in visual/section order. Partials: `tokens.css`, `cursor.css`, `layout.css`, `nav.css`, `hero.css`, `ai.css`, `components.css`, `about-me.css`, `about-system.css`, `WhatIDo.css`, `experience.css`, `education.css`, `projects.css`, `footer.css`. Animate `transform`/`opacity` only — no layout-thrashing properties. 60fps+ floor.
- **Typography (loaded in `index.html`):** Headlines/display → **IBM Plex Sans Condensed** (technical condensed sans, used for `.hero h1`, `.mf-num`, project/edu/exec headings via `--serif` token; loaded with italic axis for editorial accents in `.hero h1 .it` and `.manifesto-quote-sm .serif`). Code/terminal/metadata → **JetBrains Mono** (`--mono`). Body/UI → **Geist** (`--sans`). The `--serif` token name is retained for stability despite IBM Plex Sans Condensed being a sans-serif typeface.
- **Content:** All copy lives in `src/data/*.js`. Never hardcode content inside components.
- **Env vars:** `GEMINI_API_KEY` is set in Vercel project settings; `vercel dev` injects it locally — no `.env` file. Read only inside `/api` via `process.env`. Never import from `/src`.

## Architecture Rules

- **Section render order in `App.jsx`:** `Nav → Hero → AboutMe → About → Experience → Education → Projects → Footer`. `AIOrb` + `AIDrawer` + `Cursor` are fixed overlays at the end of the tree. Section ids do not match component names: `AboutMe`→`#about`, `About`→`#system`, `Projects`→`#work`, `Footer`→`#contact`.
- **Page background z-order:** `HeroFluid` (lazy WebGL) at `z:0`, `.noise` CSS texture at `z:2`. Both persistent across the page. The old static `.grid-bg` is gone — do not reintroduce.
- **Hero internal z-order:** `InfiniteGrid` `z:0` → `SplineScene` `z:1` → text/H1 `z:2`.
- **Cursor MotionValue singleton:** `CURSOR_X` / `CURSOR_Y` exported from `src/utils/cursor.js`. Any component needing pointer position imports them — never prop-drill, never duplicate `pointermove` listeners. Mark interactive elements with `data-cursor="hover"` for the hover state.
- **Shader attractor singleton:** `App.jsx` owns `globalMouseRef` (viewport-normalized 0–1 + `lastMove` timestamp) passed to `HeroFluid`. Glow is **confined to `#top` and `#contact`** via `e.target.closest('#top, #contact')` — idle-decays ~1.75s when pointer leaves those regions. If the fluid stops tracking the cursor, check this ref's `pointermove` listener in `App.jsx`.
- **Lenis momentum scroll:** `App.jsx` owns a Lenis smooth-scroll instance (`window.__lenis`). Entirely disabled under `prefers-reduced-motion`. Paused while the AI drawer is open. Framer Motion `useScroll` reads native `scrollTop` transparently — do not use a virtual Lenis scroll container.
- **Layout shell:** `.shell` = `max-width: 1440px; padding: 0 24px`. All sections use it. Hero overrides to flush-left (`padding-left/right: 0; overflow: visible`). `body { overflow-x: hidden }` is load-bearing — Spline canvas and `InfiniteGrid`'s `100vw` full-bleed both extend past the shell intentionally.
- **Spline pointer forwarding (load-bearing):** `handlePointerMove` in `Hero.jsx` re-dispatches synthetic `pointermove`+`mousemove` (`bubbles: false`) to the Spline canvas whenever the cursor is outside `.hero-spline`. Removing this requires also disabling letter `whileHover` in `HeroLetter.jsx` — they share a pointer-events split.
- **Lazy boundaries:** `HeroFluid` is `React.lazy` + Suspense in `App.jsx` — never convert to a static import. `SplineScene` is a static import in `Hero.jsx`; the heavy `@splinetool/react-spline` package is `React.lazy`-loaded inside `SplineScene.jsx`. The Spline code-split boundary is that package import — keep it lazy.
- **Nav visibility:** Driven by an `IntersectionObserver` on `#top` (Hero root). Toggles `opacity`/`y`/`pointer-events` so a hidden nav is never accidentally clickable.

## Workflow

- Plan-first for multi-file or UI changes. Enumerate existing interactions before integrating into an area with hover/animation/pointer behavior — state how each is preserved or intentionally changed.
- Never silently revert styles, classes, or behavior. Call out intentional regressions.
- Treat this file as living: update it as part of any major architectural change (new component, third-party integration, significant refactor).

