# Repository Guidelines

> **This file is a thin pointer.** All architecture rules, component docs, and coding conventions
> live in [`CLAUDE.md`](./CLAUDE.md) and [`docs/`](./docs/). Read those — do not duplicate detail here.
>
> If this file and `CLAUDE.md` / `docs/*.md` ever disagree, `CLAUDE.md` wins.

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

## Where to read

| Topic | File |
|---|---|
| Global rules, routing table, exploration budget | `CLAUDE.md` |
| App.jsx wiring, preloader, Lenis, observers, AI, cursor | `docs/architecture.md` |
| Hero, HeroFluid, Spline, InfiniteGrid, shader glow | `docs/hero.md` |
| WhatIDo scroll rig + widviz subsystem | `docs/what-i-do.md` |
| Framer Motion, GSAP, animation variants | `docs/animation.md` |
| Colors, typography, CSS partials, layout shell | `docs/design-system.md` |
| AI chat API, Gemini, env vars | `docs/backend.md` |
