# VizBackend → Two-State "Resilience" Narrative

## Context

The BACKEND viz in `#what-i-do` currently tells a vertical "rail-descent probe"
story: a request token descends EDGE → API → CACHE → DB on a HIT/MISS loop, with a
live EKG latency feed. The goal is to replace it with a **two-state before→after arc**
that always reads in this order:

1. **STRESSED** — backend under heavy load, the **database is the bottleneck**
   (latency climbing toward the p99 ceiling, system visibly stressed).
2. **RESOLVED** — a **Redis cache layer + circuit breaker** absorb the load so the DB
   never saturates (latency calm, lime, low).

This is résumé-anchored: `src/data/experience.js:26` —
*"Designed Redis caching + query-shape rewrites that cut **p95 latency by 60%** on hot
paths."* The headline figure is **p95 −60%**; the in-viz p50/p99/hit-rate numbers are
illustrative set-dressing.

**Approved design decisions:**
- **Stress signal:** motion + density + **gold (`--accent-2`) as the caution hue** — no 4th token, no `CLAUDE.md` edit.
- **Flow engine:** Framer-driven "hero" packet + ~6–10 SMIL ambient dots.
- **Story:** two-beat + breaker accent — `STRESSED → RESOLVED`, breaker `OPEN→CLOSED`.

## Scope

**In:** `VizBackend.jsx`, `widViz.js` (backend entry), `whatIDo.js` (backend blurb), `widviz.css` (wbk-* block).
**Out:** all other vizzes, `WhatIDo.jsx`, `widSlice.js`, `WidVisual`, global tokens.

## Contracts unchanged

- Props `{ progress, index, isActive, reduced, frozen }`; `isFinal = reduced || frozen`.
- `widSlice(index, N)` + `useTransform` for cross-dissolve.
- No new deps / canvas / GSAP / second ScrollTrigger.
- Compositor-only properties; 60fps; no layout shift.
- Token variables only (never hardcoded hex).
- Phase-clock anchoring: loop resets to STRESSED on every `isActive` false→true.
- Frozen/reduced: resolved static frame only.
- All copy/metrics/geometry in data files.

## Phases

1. **Data only** — update `whatIDo.js` blurb + `WID_VIZ.backend` fields.
2. **Static resolved frame** — node graph + forked edges + sparkline + BREAKER CLOSED.
3. **Cross-dissolve** — `widSlice`-driven dissolve/scale/enter.
4. **Narrative loop** — `isActive`-anchored STRESSED→RESOLVED clock + flow + strobe.
5. **Sparkline morph** — `buildTrace(lerp(stressed, calm, phase))`.
