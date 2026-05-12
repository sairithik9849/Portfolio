# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Sairithik Komuravelly (Sai) — pronounced "Sigh-RIH-thick Koh-moo-ruh-VEL-lee". 
The goal is to build the absolute best portfolio in the developer space: highly animated, deeply interactive, and polished to perfection. It must showcase a balance of low-level systems engineering knowledge and high-end frontend execution.

## Tech Stack

- **Frontend:** React (Vite)
- **Backend:** Vercel Serverless Functions (Node.js) in `/api`. AI chat powered by Google Gemini (`gemini-1.5-flash-latest`). No standalone Express server.
- **Language:** JavaScript only — ES6+ syntax (arrow functions, destructuring, async/await, optional chaining, etc.). No TypeScript.
- **Styling/Animation:** Framer Motion (physics-based animations, scroll reveals, FLIP layout transitions) + custom CSS in `src/styles/global.css`.
- **3D / WebGL:** Two layers: (1) Three.js via `@react-three/fiber` + `@react-three/drei` for the Hero fluid shader (`HeroFluid.jsx`) with custom GLSL; (2) `@splinetool/react-spline` + `@splinetool/runtime` for the Hero interactive 3D scene (`SplineScene.jsx`). Both are lazy-loaded via `React.lazy` to avoid blocking initial paint.
- **Hosting:** Vercel

## Commands

### Local Development

```bash
# Install dependencies
npm install

# Start frontend dev server only
npm run dev

# Start FULL local environment (Frontend + Serverless API functions)
vercel dev
```

### Build & Lint

```bash
npm run build       # production build (output: dist/)
npm run preview     # preview the production build locally
npm run lint        # ESLint (flat config, React + Hooks + Refresh plugins)
```

### Vercel

```bash
# Deploy to Vercel (from project root)
vercel              # preview deployment
vercel --prod       # production deployment
```

## Project Structure

```
Portfolio/
├── api/
│   └── chat.js                    # Serverless function → Gemini API
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── pronounce.mp3              # Name pronunciation audio — played from Hero terminal
├── src/
│   ├── animations/
│   │   └── variants.js            # Shared Framer Motion animation presets
│   ├── components/
│   │   ├── visuals/               # Per-project visualization components
│   │   │   ├── VizAero.jsx
│   │   │   ├── VizLL.jsx
│   │   │   ├── VizMF.jsx
│   │   │   ├── VizSCH.jsx
│   │   │   ├── VizSPP.jsx
│   │   │   └── VizWB.jsx
│   │   ├── AgentSection.jsx       # AI agent capability matrix
│   │   ├── AIDrawer.jsx           # Slide-in AI chat drawer (cmd+k)
│   │   ├── AIOrb.jsx              # Floating AI orb button (rendered inside Hero)
│   │   ├── Bubble.jsx             # Chat message bubble
│   │   ├── Cursor.jsx             # Custom animated cursor (spring-tracked lens + dot)
│   │   ├── Education.jsx          # Education section
│   │   ├── ExperienceRow.jsx      # Expandable job entry
│   │   ├── Experience.jsx         # Experience log section
│   │   ├── Footer.jsx             # Footer with contact links
│   │   ├── Hero.jsx               # Hero with mouse-parallax h1 + fluid shader
│   │   ├── HeroFluid.jsx          # Three.js/WebGL GLSL fluid background (lazy-loaded)
│   │   ├── HeroLetter.jsx         # Single animated character in the Hero h1
│   │   ├── InfiniteGrid.jsx       # Animated SVG grid with cursor flashlight — base layer of Hero
│   │   ├── Metrics.jsx            # Key metrics card grid
│   │   ├── Nav.jsx                # Top navigation bar
│   │   ├── Projects.jsx           # Expanding horizontal accordion
│   │   ├── ProjectVisual.jsx      # Dispatches correct Viz* component
│   │   ├── SectionHead.jsx        # Reusable section header
│   │   ├── SplineScene.jsx        # Lazy Spline 3D wrapper — swap scene via `scene=` prop
│   │   └── Terminal.jsx           # Hero identity terminal — merged bio + pronunciation play button + typed boot line
│   ├── data/                      # All content as plain JS — never hardcode in components
│   │   ├── agent.js               # AI suggestion chips + canned demo responses
│   │   ├── education.js           # Education entries
│   │   ├── experience.js          # Work experience entries
│   │   ├── metrics.js             # Key metrics (GPA, throughput, latency, etc.)
│   │   ├── nav.js                 # Navigation items
│   │   └── projects.js            # Featured projects (6 entries)
│   ├── hooks/
│   │   └── useHotkey.js           # Keyboard shortcut hook (cmd+k / esc)
│   ├── styles/
│   │   └── global.css             # All CSS: custom properties, layout, every component
│   ├── utils/
│   │   └── cursor.js              # Shared CURSOR_X / CURSOR_Y MotionValues (singleton)
│   ├── App.jsx                    # Root layout — assembles all sections
│   └── main.jsx                   # Vite entry point
├── eslint.config.js               # ESLint flat config (React, Hooks, Refresh)
├── index.html                     # HTML shell — Google Fonts loaded here
├── package.json
└── vite.config.js
```

## Architecture

- **The Frontend:** A Single Page Application (SPA) built with React and bundled via Vite. It handles all UI, state, and animations.

- **The Backend (Serverless):** Vercel automatically maps any file inside the `/api` folder to a serverless Function. The frontend securely calls these endpoints (e.g., `fetch('/api/chat')`).

- **Data Layer:** All content (projects, experience, education, metrics, nav items) lives in `src/data/*.js` files. Components import from there — never hardcode content inline.

- **Animation Presets:** Shared Framer Motion variants — `REVEAL`, `STAGGER_PARENT`, `STAGGER_CHILD`, `HERO_PARENT`, `HERO_CHILD`, `HERO_CHILD_FADE` — are defined in `src/animations/variants.js`. Import from there rather than defining variants inline in components.

- **Background Layers:** `App.jsx` renders two persistent full-screen layers beneath all page content (painted in z-order): the WebGL fluid shader (`HeroFluid`) at z-index 0, and a CSS noise texture (`.noise`) at z-index 2. `HeroFluid` is lazy-loaded via `React.lazy` to avoid blocking initial paint (Three.js is ~600 KB). The old static `.grid-bg` has been removed.

- **Custom Cursor:** `Cursor.jsx` renders a spring-tracked lens + dot overlay for pointer devices. It reads from shared `CURSOR_X`/`CURSOR_Y` MotionValues exported by `src/utils/cursor.js` so other components (e.g., Hero parallax) can tap the same values without prop-drilling. Mark interactive elements with `data-cursor="hover"` to trigger the hover cursor state.

- **Hero h1:** Each character of the name is wrapped in `HeroLetter.jsx` — a `motion.span` with a spring bounce and accent-color highlight on hover. The `h1` itself applies mouse-parallax via `useSpring` + `useTransform` MotionValues tracked in `Hero.jsx`.

- **Infinite Grid:** `InfiniteGrid.jsx` is the animated grid layer rendered as the first child of `Hero.jsx` at `z-index: 0` (below the Spline at z:1 and text at z:2). It renders two SVG grid layers: a faint always-on base and a brighter layer revealed under a `300px` radial-gradient mask that follows the cursor (flashlight effect). The grid pattern drifts diagonally via `useAnimationFrame`. Cursor tracking uses a `window` `pointermove` listener (non-capturing, so it never blocks Spline or other pointer events) with pixel coordinates relative to `getBoundingClientRect()`. The div is styled with `width: 100vw; left: 50%; transform: translateX(-50%)` — a CSS full-bleed breakout so the grid covers the full viewport width even though the hero has `max-width: 1440px`. Takes no props; self-contained.

- **Hero 3D Scene:** `SplineScene.jsx` wraps `@splinetool/react-spline` behind `React.lazy` + Suspense. In `Hero.jsx` it lives inside `div.hero-spline` — an absolutely-positioned overlay with `left: 48%; right: 0; transform: translateX(8%)` in `global.css`. The `left: 48%` gives the canvas a wider DOM box (52% of hero width) so the robot's arms have room; `translateX(8%)` then shifts it ~60px rightward visually. `z-index: 1` keeps it below the text at `z-index: 2`. `body { overflow-x: hidden }` prevents any horizontal scrollbar from the rightward shift. To swap the 3D scene, change the `scene=` prop URL on the `<SplineScene>` in `Hero.jsx`. **Pointer-event forwarding:** the Spline canvas only receives events when the mouse is directly over it. To keep the robot tracking while the cursor is over the H1 name, `handlePointerMove` in `Hero.jsx` re-dispatches synthetic `pointermove` + `mousemove` events directly to the canvas whenever `e.target` is not already inside `.hero-spline`. `bubbles: false` on the synthetic events prevents a feedback loop. Never remove this forwarding logic without also disabling letter `whileHover` — both depend on the same pointer-events split.

- **Hero Terminal:** `Terminal.jsx` is the sole content block below the H1 (the previous left-side paragraph and right-side terminal were merged into this one). It renders identity lines (name, pronunciation, alias, role, focus, mission) followed by a typed `$ ./agent --boot` line driven by the local `TypedBoot` component (~1.8s post-mount delay, then character-by-character). Line 03 contains a `<button className="play">` that plays `/public/pronounce.mp3` via `new Audio(...).play()`; the call is wrapped in try/catch + `.catch(() => {})` so a missing file or autoplay block is silent. The terminal sits inside `.hero .sub` (now a single-column block, not a grid) and inherits the `HERO_CHILD` spring entrance. Polish styles in `global.css`: `max-width: 560px`, scanline `::after`, accent-tinted hover glow keyed to `--accent` (#c9f558), and a `.terminal .play` button styled to feel native to the terminal.

- **Nav:** Auto-hides until the user scrolls past the hero. An `IntersectionObserver` watches the hero's root div (`id="top"`) and toggles a `visible` state that drives Framer Motion `opacity`/`y` on the `<motion.nav>` (pointer-events are also toggled so hidden nav isn't accidentally clickable). A spring-animated `motion.li.nav-tab-cursor` slides under the hovered tab — its `left`/`width` are updated via `onMouseEnter` on each `<Tab>` and reset to `opacity: 0` on `onMouseLeave` of the list.

- **Layout & Padding:** `.shell` is the global content-width class (`max-width: 1440px; margin: 0 auto; padding: 0 24px`). All sections use it. The Hero overrides it with `.hero.shell { padding-left: 0; padding-right: 0; overflow: visible }` so text is flush to the hero's left edge and InfiniteGrid's full-bleed isn't clipped. Nav has its own horizontal padding (`18px 24px`) that matches the shell gutter. `body { overflow-x: hidden }` prevents horizontal scrollbars from elements that intentionally extend slightly past the viewport (e.g., the Spline canvas shift).

- **Security:** API keys (like `GEMINI_API_KEY`) must ONLY be accessed inside the `/api` directory via `process.env`. Never expose them in `/src`.

- Use ES modules (`import` / `export`) throughout — stick to it.

## Code Style

- JavaScript only — no TypeScript, no type annotations.
- ES6+ features preferred: arrow functions, template literals, destructuring, spread/rest, async/await.
- Use `const` by default, `let` when reassignment is needed, never `var`.
- Write modular, highly reusable components. Keep the Node.js backend lightweight and latency-optimized.

## Aesthetic Rules

- Animations must be silky smooth (60fps+). Avoid janky layout shifts. Favor hardware-accelerated CSS properties (transform, opacity).
- Styling: attention to typography, negative space, and custom micro-interactions (e.g., custom cursors, magnetic buttons, scroll-triggered reveals).
- **Typography:** Fonts are loaded via Google Fonts in `index.html`. Use: **Instrument Serif** for headlines, **JetBrains Mono** for code/terminal text, **Space Grotesk** for body/UI copy.
