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
- **3D / WebGL:** Three.js via `@react-three/fiber` and `@react-three/drei`. Used in the Hero fluid shader (`HeroFluid.jsx`) with custom GLSL.
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
│   └── icons.svg
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
│   │   ├── AIOrb.jsx              # Floating AI orb button
│   │   ├── Bubble.jsx             # Chat message bubble
│   │   ├── Education.jsx          # Education section
│   │   ├── ExperienceRow.jsx      # Expandable job entry
│   │   ├── Experience.jsx         # Experience log section
│   │   ├── Footer.jsx             # Footer with contact links
│   │   ├── Hero.jsx               # Hero with parallax + fluid shader
│   │   ├── HeroFluid.jsx          # Three.js/WebGL GLSL fluid background
│   │   ├── Metrics.jsx            # Key metrics card grid
│   │   ├── Nav.jsx                # Top navigation bar
│   │   ├── Projects.jsx           # Expanding horizontal accordion
│   │   ├── ProjectVisual.jsx      # Dispatches correct Viz* component
│   │   ├── SectionHead.jsx        # Reusable section header
│   │   └── Terminal.jsx           # Terminal-style identity display
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

- **Animation Presets:** Shared Framer Motion variants (REVEAL, STAGGER_PARENT/CHILD, HERO_PARENT/CHILD) are defined in `src/animations/variants.js`. Import from there rather than defining variants inline in components.

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
