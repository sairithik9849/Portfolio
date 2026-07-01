# CLAUDE.md

Guidance for Claude Code across this repository.

## Project

Personal portfolio for **Sairithik Komuravelly (Sai)**. Goal: best-in-class developer portfolio — highly animated, deeply interactive, polished. Showcases low-level systems engineering + high-end frontend execution.

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

## Dev Server Hygiene

Before starting a Vite dev server, check for and kill stale/running servers to avoid port cycling. Do not spawn redundant background dev servers.

## Global Rules

These apply everywhere, regardless of the area being touched.

- **Language:** JavaScript only. No TypeScript, no type annotations. ES6+ (arrow fns, destructuring, async/await, optional chaining). `const` default, `let` for reassignment, never `var`. ES modules throughout.
- **Stack:** React + Vite (SPA) frontend; Vercel Serverless Functions in `/api` (no Express).
- **Animation default:** Framer Motion for all component-level animation — no react-spring, no component-level CSS keyframes. GSAP is used in exactly two places only — see `docs/animation.md`.
- **3D bundles:** `HeroFluid` and `@splinetool/react-spline` are `React.lazy`. Never eager-load (~600 KB).
- **Content:** All copy lives in `src/data/`. Never hardcode content inside components.
- **CSS:** Animate `transform`/`opacity` only — no layout-thrashing properties. 60fps floor.
- **No silent regressions:** If existing styles, classes, or behavior must change, say so explicitly.
- **Respect existing architecture:** Prefer extending existing patterns over introducing new libraries, frameworks, or architectural rewrites. When an existing system can solve the problem, use it.
- **Architecture First:** Before modifying code, understand the repository's existing architecture. Never import external architecture wholesale. Adapt external ideas to existing repository conventions whenever practical. Only recommend architectural changes when they provide clear long-term value and are intentionally approved. (Full operating-system context: `docs/skills.md`.)

## Routing Table

Read the listed doc before working in each area. Read only what the task requires.

| When touching…                                                                                                                     | Read                    |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `App.jsx`, section order, preloader, Lenis, IntersectionObservers, AIOrb, ReturnToTop, hotkeys, cursor, nav/footer wiring, project-card visuals | `docs/architecture.md`  |
| Framer Motion, GSAP, `src/animations/variants.js`, scroll-reveal, reduced-motion                                                   | `docs/animation.md`     |
| `src/styles/`, colors, typography, spacing, radii, layout shell, interaction patterns                                              | `docs/design-system.md` |
| `Hero.jsx`, `SplineScene`, `StarField`, robot                                                                                      | `docs/hero.md`          |
| `WhatIDo.jsx`, `src/components/widviz/`, `src/data/widViz.js`                                                                      | `docs/what-i-do.md`     |
| `src/components/journey/`, `src/lib/journey/`, `src/hooks/useJourneyEngine.js`, `src/data/journey.js`                              | `docs/journey.md`       |
| `src/components/ReturnToTop.jsx`, `src/styles/return-to-top.css`                                                                    | `docs/architecture.md`  |
| `api/`, AI chat, env vars, `GEMINI_API_KEY`                                                                                        | `docs/backend.md`       |
| Skills, skill composition, development workflow, Architecture First, design/component intake                                        | `docs/skills.md`        |

## Extending the Docs

Any new major component, third-party integration, or architectural rule must:

1. Add or update the relevant `docs/*.md` with full implementation detail.
2. Add a routing-table row in this file.

Do not place subsystem-specific implementation details in CLAUDE.md.

The root file stays a router — all implementation detail lives in `docs/`.

If this file and a subsystem doc ever conflict on implementation detail, the subsystem doc wins for that area.

## Exploration Budget

Before making a change:

1. Read the requested file.
2. Read at most 2 directly related files.
3. Do not perform repository-wide searches unless blocked.
4. Do not create architecture reviews for localized edits.
5. Escalate only if implementation cannot proceed.

Do not read to understand the app: `dist/`, `node_modules/`, `.vercel/`, lockfiles, or `src/components/visuals/Viz*.jsx` / `src/components/widviz/Viz*.jsx` visual components unless that specific visual is the task.
