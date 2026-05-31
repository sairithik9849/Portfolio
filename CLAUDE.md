# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **Animation:** Framer Motion is the primary component animation library — no react-spring, no component-level CSS keyframes. **GSAP (`gsap@^3.15.0` + `ScrollTrigger`) is used deliberately in two places only:** (1) `App.jsx` — `gsap.ticker` is the sole rAF driver for Lenis (`lenis.raf(time * 1000)`), and `lenis.on('scroll', ScrollTrigger.update)` keeps a single shared clock so Lenis and ScrollTrigger never double-rAF; (2) `WhatIDo.jsx` — `gsap.matchMedia` + `ScrollTrigger` pin/scrub/snap for the word-stack scroll animation, with `gsap.set` driving the stack `y`. Do not add other animation libraries. Apply scroll-triggered fades (`whileInView`), staggered reveals on grouped content, and smooth hover transitions on every interactive element (`whileHover` or variant-driven). Shared variants live in `src/animations/variants.js` — import, never redefine inline.
  - Scroll-reveal (whileInView): `REVEAL`, `STAGGER_PARENT`, `STAGGER_CHILD`
  - Hero mount sequence: `HERO_PARENT` is now a bare cascade root (no `staggerChildren` — it just sets `initial:'hidden' / animate:'show'`). Each hero child controls its own timing via `fadeUp(delay, duration)` and `HERO_SEQUENCE` constants. The sequence is serialized: InfiniteGrid → meta-row+name letters → manifesto quote → metric cards (simultaneous) → CTA → terminal → footer → robot hotspot. Never reintroduce a global `staggerChildren` on `HERO_PARENT` — it breaks the per-phase ordering.
  - `HERO_SEQUENCE` (in `variants.js`) — timing table `{ grid, meta, name, manifesto, metrics, cta, terminal, footer, robot }` in seconds. Edit this to shift phase start times.
  - `HERO_SEQUENCE_INSTANT` — paired table with all values 0; used when `useReducedMotion()` is true.
  - `fadeUp(delay, duration?)` — factory that returns a `{ hidden, show }` variant dict for a single delayed fade-up. Use this for every new hero element; pass `T[key]` as the delay where `T` is `HERO_SEQUENCE` or `HERO_SEQUENCE_INSTANT`.
  - `HERO_CHILD`, `HERO_CHILD_FADE` — still exported for legacy use elsewhere; no longer used in `Hero.jsx` directly.
  - Hero per-letter cascade: `HERO_LETTER` (spring per char), `HERO_LINE_PARENT` (still exported but inlined as `nameLineParent` in `Hero.jsx` to accept runtime `T.name` delay), `HERO_INNER_STAGGER` (120ms inner stagger, unused in Hero)
  - `useReducedMotion()` (framer-motion) in `Hero.jsx` sets `T = HERO_SEQUENCE_INSTANT` (all delays 0) and `dur = 0` (all durations 0) — entire sequence collapses to instant show. Apply the same `T`/`dur` pattern to any new Hero-level animation.
  - **AboutMe scroll word-reveal** (`AboutMe.jsx`) is a scroll-scrubbed animation, not `whileInView`. It uses `useScroll({ offset: ['start end', 'center center'] })` progress mapped to per-word opacity via `useTransform` — each word lights across its `index/total → (index+1)/total` slice. `useReducedMotion()` renders all words solid instantly (no ghost/fg split). Do not convert this to `REVEAL`/`whileInView`.
- Animations must be silky smooth (60fps+). Avoid janky layout shifts. Favor hardware-accelerated CSS properties (transform, opacity).
- **3D/WebGL:** Three.js via `@react-three/fiber` + `@react-three/drei` (HeroFluid GLSL); Spline via `@splinetool/react-spline` + `@splinetool/runtime` (Hero robot). Both heavy bundles are code-split: `HeroFluid` is `React.lazy` in `App.jsx`; the `@splinetool/react-spline` package is `React.lazy`-loaded inside `SplineScene.jsx`. Never eager-load (~600 KB).
- **Styling:** CSS is split into one partial per section/component in `src/styles/`. `global.css` is the import manifest (ordered list of `@import`s) — it is the only CSS file imported by `src/main.jsx`. Each partial owns its section's base rules **and** its responsive overrides (co-located `@media` at the bottom of the file). `layout.css` contains shared primitives (`.shell`, `.row`, `.section-head`). To add a new section: create `src/styles/<name>.css` and add `@import './<name>.css'` to `global.css` in visual/section order. Partials: `tokens.css`, `cursor.css`, `layout.css`, `nav.css`, `hero.css`, `ai.css`, `components.css`, `about-me.css`, `about-system.css`, `WhatIDo.css`, `experience.css`, `education.css`, `projects.css`, `footer.css`. Animate `transform`/`opacity` only — no layout-thrashing properties. 60fps+ floor.
- **Color system (three tokens, each with a semantic role):**
  - `--accent: #c9f558` (lime) — primary actions, brand highlights, hover-revealed states, interactive indicators, data highlights
  - `--accent-2: #e8c47a` (gold) — non-interactive metadata labels and manifesto emphasis: role strings, index prefixes, identifier badges (e.g. `bar-id`, `.exec-co-role`, `.pj-info .role`, `.acc-role`, `.exec-bullet-n`, version meta-string), italicized manifesto verbs (`.manifesto-quote .serif`), hero surname letters (`.char--last`)
  - `--fg: #ededdf` (cream) — body content, headings
  - When adding a colored element, assign it to one of these three roles. Never introduce a fourth color without updating this section.
- **Typography (loaded in `index.html`):** Headlines/display → **IBM Plex Sans Condensed** (technical condensed sans, used for `.hero h1`, `.mf-num`, project/edu/exec headings via `--serif` token; loaded with italic axis for editorial accents in `.hero h1 .it` and `.manifesto-quote-sm .serif`). Code/terminal/metadata → **JetBrains Mono** (`--mono`). Body/UI → **Geist** (`--sans`). The `--serif` token name is retained for stability despite IBM Plex Sans Condensed being a sans-serif typeface.
- **Content:** All copy lives in `src/data/` — `nav.js`, `about.js`, `aboutMe.js`, `whatIDo.js`, `projects.js`, `experience.js`, `education.js`, `agent.js`. Never hardcode content inside components. `aboutMe.js` exports `ABOUT_ME_STATEMENT`, `ABOUT_ME_HIGHLIGHT`, `ABOUT_ME_EMPHASES` used by `AboutMe.jsx`.
- **Env vars:** `GEMINI_API_KEY` is set in Vercel project settings; `vercel dev` injects it locally — no `.env` file. Read only inside `/api` via `process.env`. Never import from `/src`.
- **AI chat API (`api/chat.js`):** Single serverless function. No conversation history — every request sends the full system prompt + user message in one `contents` turn. The persona/facts live entirely in `SYSTEM_PROMPT` at the top of that file. `maxOutputTokens: 200` is intentional (keeps responses under 90 words).

## Architecture Rules

- **Section render order in `App.jsx`:** `Nav → Hero → AboutMe → WhatIDo → About → Experience → Education → Projects → Footer`. `AIOrb` + `AIDrawer` + `Cursor` are fixed overlays at the end of the tree.
- **Section id ↔ component ↔ nav label** (the ids in `nav.js` do not match component names — use this table for scroll targets and anchor links):
  | Component | DOM id | Nav label |
  |-----------|--------|-----------|
  | `Hero` | `#top` | "Index" |
  | `AboutMe` | `#about` | "About" |
  | `WhatIDo` | `#what-i-do` | "What I Do" |
  | `About` | `#system` | "System" |
  | `Experience` | `#experience` | "Experience" |
  | `Education` | `#education` | "Education" |
  | `Projects` | `#work` | "Work" |
  | `Footer` | `#contact` | "Contact" |
- **AIOrb visibility:** Hidden while the Hero (`#top`) is intersecting the viewport — toggled via `heroVisible` state driven by `IntersectionObserver` in `App.jsx`. `AIOrb` receives `hidden={heroVisible}` and suppresses itself so it doesn't overlap the robot hotspot.
- **Global hotkey:** `useHotkey('cmd+k', toggleAI)` in `App.jsx` (from `src/hooks/useHotkey.js`) opens the AI drawer. The hook also supports `'escape'`. Any new global shortcut belongs in `App.jsx` using this hook.
- **Page background z-order:** `HeroFluid` (lazy WebGL) at `z:0`, `.noise` CSS texture at `z:2`. Both persistent across the page. The old static `.grid-bg` is gone — do not reintroduce.
- **Hero internal z-order:** `InfiniteGrid` `z:0` → `SplineScene` `z:1` → text/H1 `z:2`.
- **Cursor MotionValue singleton:** `CURSOR_X` / `CURSOR_Y` exported from `src/utils/cursor.js`. Any component needing pointer position imports them — never prop-drill, never duplicate `pointermove` listeners. Mark interactive elements with `data-cursor="hover"` for the hover state.
- **Shader attractor singleton:** `App.jsx` owns `globalMouseRef` (viewport-normalized 0–1 + `lastMove` timestamp) passed to `HeroFluid`. The glow is **confined to `#top` and `#contact`** via `e.target.closest('#top, #contact')` in `handleGlobalPointerMove` — it does not activate over mid-page sections. Idle-decays (~1.75s) in `HeroFluid.jsx` when the pointer leaves those regions. If the fluid stops tracking the cursor, check this ref's `pointermove` listener in `App.jsx`.
- **Lenis momentum scroll:** `App.jsx` owns a site-wide Lenis smooth-scroll instance (`duration: 1.6`, exponential ease, `smoothWheel: true`), driven by `gsap.ticker` (single shared clock — `gsap.ticker.add(tickerFn)` calls `lenis.raf(time * 1000)`; `lenis.on('scroll', ScrollTrigger.update)` keeps ScrollTrigger in sync; `gsap.ticker.lagSmoothing(0)` prevents frame-skip after tab blur) and exposed as `window.__lenis` for cross-component access. Key behaviours: (1) **entirely disabled** under `prefers-reduced-motion` (early return, no instance created); (2) **paused** (`.stop()`) while the AI drawer is open, resumed (`.start()`) on close — prevents wheel events leaking behind the drawer. Framer Motion's `useScroll` reads native `scrollTop` transparently, so scroll-progress animations (e.g. `AboutMe` word reveal) work unchanged — do not replace native scroll with a virtual Lenis scroll container.
- **Layout shell:** `.shell` = `max-width: 1440px; padding: 0 24px`. All sections use it. Hero overrides to flush-left (`padding-left/right: 0; overflow: visible`). `body { overflow-x: hidden }` is load-bearing — Spline canvas and `InfiniteGrid`'s `100vw` full-bleed both extend past the shell intentionally.
- **Spline pointer forwarding (load-bearing):** `handlePointerMove` in `Hero.jsx` re-dispatches synthetic `pointermove`+`mousemove` (`bubbles: false`) to the Spline canvas whenever the cursor is outside `.hero-spline`. Removing this requires also disabling letter `whileHover` in `HeroLetter.jsx` — they share a pointer-events split.
- **Lazy boundaries:** `HeroFluid` is `React.lazy` + Suspense in `App.jsx` — never convert to a static import. `SplineScene` is a static import in `Hero.jsx`; the heavy `@splinetool/react-spline` package is `React.lazy`-loaded inside `SplineScene.jsx`. The Spline code-split boundary is that package import — keep it lazy.
- **SplineScene load fade:** `SplineScene` starts at `opacity:0` and crossfades to `1` (0.9s) when Spline fires `onLoad`. A 4s `setTimeout` fallback in `SplineScene.jsx` triggers the fade if `onLoad` never fires (slow/offline). Do not remove either path.
- **Nav visibility:** Driven by an `IntersectionObserver` on `#top` (Hero root). Toggles `opacity`/`y`/`pointer-events` so a hidden nav is never accidentally clickable.
- **Footer mount animation:** `Footer.jsx` uses a delayed `initial/animate` fade (delay = `HERO_SEQUENCE.footer`, 5.3s) rather than `whileInView`. It participates in the hero reload sequence even though it is off-screen at page load. Do not revert it to `REVEAL` / `whileInView`.
- **Project card visuals:** Each project in `src/data/projects.js` maps to a purely CSS/SVG visualization component in `src/components/visuals/` (e.g. `VizAero.jsx`, `VizMF.jsx`). `src/components/ProjectVisual.jsx` is the switch — it selects the viz via a `VIZ` map (keyed `aero/mf/spp/ll/wb/sch`) using the `kind` prop. Adding a new project requires a new `Viz*.jsx` in `visuals/` and a `VIZ` map entry in `ProjectVisual.jsx` — no canvas or third-party deps in these components.

## Workflow

- Plan-first for multi-file or UI changes. Enumerate existing interactions before integrating into an area with hover/animation/pointer behavior — state how each is preserved or intentionally changed.
- Never silently revert styles, classes, or behavior. Call out intentional regressions.
- Treat this file as living: update it as part of any major architectural change (new component, third-party integration, significant refactor).
