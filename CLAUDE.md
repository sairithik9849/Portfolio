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

## Production & Branch Workflow

heysai.dev is live. `main` is production — every push to `main` auto-deploys to Vercel and immediately affects real users. Never experiment on `main`; never treat it as a playground.

Act as the lead engineer responsible for a live production codebase. Protecting production stability outranks delivering the next feature. (Plan-first, minimal scope, no silent regressions, and per-task file summaries are already governed by **Global Rules** and **Exploration Budget** — follow those; they are not repeated here.)

**Every feature ships through a branch:**

1. Start from an up-to-date `main`.
2. Create a `feature/<scope>` branch before any implementation begins.
3. Do all work inside that branch; keep unrelated changes out.
4. Validate via the branch's Vercel preview deployment.
5. Squash-merge into `main` only after the feature is complete and verified.

Example branches: `feature/mobile`, `feature/ai-agent`, `feature/projects`, `feature/blog`, `feature/contact`, `feature/animation-v2`.

**Git (agent-driven, human-triggered).** Implementing code and creating Git history are two separate responsibilities. The human decides when work reaches a milestone.

Never perform Git operations unless explicitly instructed. Do not commit, push, merge, squash-merge, delete branches, create tags, or deploy to production — even after a feature is complete. Completing implementation does not imply permission to act on Git state.

When a coding task ends, stop and report: what changed, which files were modified, any remaining work, and whether the feature appears ready to commit. Then wait.

Explicit approval is required before any Git operation. Examples: *"commit this," "push this branch," "merge this," "open a PR," "deploy."* If those words have not been given, treat Git state as intentionally unchanged.

When Git operations are requested: suggest branch names, write meaningful commit messages, and advise when something should or should not merge. Default merge into `main` is a **squash merge** — one clean commit per feature. Treat history as release documentation, not an autosave mechanism.

**Vercel.** Preview deployments are the default review mechanism for feature branches. Production deploys happen only by merging into `main`.

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

## Routing Table

Read the listed doc before working in each area. Read only what the task requires.

| When touching…                                                                                                                     | Read                    |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `App.jsx`, section order, preloader, Lenis, IntersectionObservers, AIOrb, hotkeys, cursor, nav/footer wiring, project-card visuals | `docs/architecture.md`  |
| Framer Motion, GSAP, `src/animations/variants.js`, scroll-reveal, reduced-motion                                                   | `docs/animation.md`     |
| `src/styles/`, colors, typography, layout shell                                                                                    | `docs/design-system.md` |
| `Hero.jsx`, `HeroFluid`, `SplineScene`, `InfiniteGrid`, robot, shader glow                                                         | `docs/hero.md`          |
| `WhatIDo.jsx`, `src/components/widviz/`, `src/data/widViz.js`                                                                      | `docs/what-i-do.md`     |
| `api/`, AI chat, env vars, `GEMINI_API_KEY`                                                                                        | `docs/backend.md`       |

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
