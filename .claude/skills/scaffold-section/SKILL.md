---
name: scaffold-section
description: Architecture-compliant scaffolding for new portfolio sections, project Viz cards, hero cascade phases, and scroll-reveals. Use when adding any new UI that must wire into App.jsx, styles, data, or animation variants. Enforces the "Do Not" rules from all subsystem docs on the first pass so nothing needs reverting.
---

# Scaffold Section

You are adding new UI to the portfolio. Read the relevant subsystem doc first (routing table below), then follow the matching recipe. Every recipe ends with the always-on guardrails — check each one before writing any code.

## Routing table (read before starting)

| What you're adding | Read first |
|---|---|
| New page section, IntersectionObserver, nav link | `docs/architecture.md` |
| New animation variant, scroll-reveal, hero phase | `docs/animation.md` |
| New CSS file, color token, typography | `docs/design-system.md` |
| Anything inside Hero, HeroFluid, SplineScene, InfiniteGrid | `docs/hero.md` |
| WhatIDo panel, widviz component | `docs/what-i-do.md` |
| API endpoint, AI chat, Gemini key | `docs/backend.md` |

Read **only** what the task requires. Do not read docs for subsystems you are not touching.

---

## Recipe A — New page section

1. **Component:** create `src/components/<Name>.jsx`. All copy goes in `src/data/<name>.js`, not hardcoded in the component.
2. **Render order:** add `<Name />` to `App.jsx` in visual section order: `Nav → Hero → AboutMe → WhatIDo → Experience → Education → Projects → Footer`. Overlays (`AIOrb`, `AIDrawer`, `Cursor`) stay at the end.
3. **Section id:** add a `#<id>` to the component root. Update the section-id table in `docs/architecture.md`.
4. **Nav link:** add an entry to `src/data/nav.js` with the correct `#<id>` target. Use `scrollToId(id)` from `src/utils/scrollTo.js` for any in-page anchor — never `scrollIntoView`.
5. **CSS:** create `src/styles/<name>.css` with all base rules plus co-located responsive `@media` at the bottom. Add `@import './<name>.css'` to `src/styles/global.css` in visual section order. Never import CSS from the component file directly.
6. **IntersectionObserver (if needed for AIOrb or HeroFluid gating):** add the observer effect in `App.jsx`. Its dep array **must include `mountContent`** — do not use `[]`.
7. **Animation:** see Recipe C and Recipe D for variants and scroll-reveal.
8. **Docs:** if this is a major subsystem, add a `docs/<name>.md` and a routing-table row in `CLAUDE.md`.

## Recipe B — New project card

1. Add a project entry to `src/data/projects.js` (title, description, `kind`, tags, links).
2. Create `src/components/visuals/Viz<Name>.jsx`. **CSS and inline SVG only — no canvas, no third-party deps.** All animation via CSS `@keyframes` in the component's style block or a `src/styles/visuals/<name>.css` partial.
3. Add a `VIZ` map entry in `src/components/ProjectVisual.jsx`:
   ```js
   import Viz<Name> from './visuals/Viz<Name>.jsx';
   // inside VIZ object:
   <name>: Viz<Name>,
   ```
4. The `kind` field in `projects.js` must match the map key.

## Recipe C — New hero cascade phase

1. Add a key to `HERO_SEQUENCE` in `src/animations/variants.js` with the start time in seconds.
2. Add a matching key with value `0` to `HERO_SEQUENCE_INSTANT` (the reduced-motion twin).
3. At the call site in `Hero.jsx`, use `fadeUp(T.<newKey>, duration)` — never `HERO_CHILD`, never inline `{ hidden, show }` objects.
4. Do not add `staggerChildren` to `HERO_PARENT` — it breaks per-phase ordering.

## Recipe D — New scroll-reveal

- **Single element:** `<motion.div variants={REVEAL} initial="hidden" whileInView="show" viewport={{ once: true }}>` — import `REVEAL` from `src/animations/variants.js`.
- **Staggered group:**
  ```jsx
  <motion.div variants={STAGGER_PARENT} initial="hidden" whileInView="show" viewport={{ once: true }}>
    {items.map(item => <motion.div key={item.id} variants={STAGGER_CHILD}>…</motion.div>)}
  </motion.div>
  ```
- Never define variants inline — always add to `variants.js` and import.
- Do not convert the `AboutMe` scroll word-reveal to `whileInView` — it is a `useScroll`/`useTransform` rig and must stay that way.

---

## Always-on guardrails (check every one before writing code)

| Rule | Source |
|---|---|
| Variants only from `src/animations/variants.js` — never inline | `docs/animation.md` |
| All copy in `src/data/` — never hardcoded inside a component | `docs/architecture.md` |
| Animate `transform` and `opacity` only — no `width`, `height`, `top`, `left`, `margin`, `padding` | `docs/animation.md`, `docs/design-system.md` |
| In-page anchors via `scrollToId` from `src/utils/scrollTo.js` — never `scrollIntoView` | `docs/architecture.md` |
| CSS imported only via `global.css` — never from component files | `docs/design-system.md` |
| Three color tokens only: `--accent` (lime, interactive), `--accent-2` (gold, metadata), `--fg` (cream, body) | `docs/design-system.md` |
| Framer Motion for component animation — no react-spring, no component-level `@keyframes` | `docs/animation.md` |
| GSAP only in `App.jsx` (ticker) and `WhatIDo.jsx` (ScrollTrigger pin) — nowhere else | `docs/animation.md` |
| `HeroFluid` and `@splinetool/react-spline` must stay `React.lazy` — never eager-import | `CLAUDE.md` |
| Cursor position via `CURSOR_X`/`CURSOR_Y` from `src/utils/cursor.js` — never prop-drill, never duplicate `pointermove` | `docs/architecture.md` |
| New major subsystem → update the relevant `docs/*.md` and add a routing-table row in `CLAUDE.md` | `CLAUDE.md` |

After implementation, run `/visual-verify` to confirm the change renders correctly at all desktop breakpoints before calling it done.
