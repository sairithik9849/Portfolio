---
name: component-integration
description: Translates an external React component (from 21st.dev, Magic UI, Aceternity UI, React Bits, shadcn/ui, or similar) into a repository-native implementation. Analyzes dependencies, identifies architectural assumptions, converts Tailwind/utility-class styling to repo CSS partials, replaces color/spacing/type literals with tokens, re-expresses animation in Framer Motion, and produces an implementation plan for approval before touching any code.
---

# Component Integration

You are translating an external React component into this repository's native architecture.
This is a **code-translation** problem, not a visual-inspiration problem — you translate
implementation, not ideas. Inherit the Architecture First principle (`docs/skills.md`):
translate to repo conventions, never port external architecture wholesale.

## Composition contract

- **Inputs:** External component source code (pasted or linked from 21st.dev, Magic UI,
  Aceternity UI, React Bits, shadcn/ui, or similar).
- **Reads:** `package.json` (existing deps), `src/styles/tokens.css` (token values),
  `docs/design-system.md` (CSS conventions, interaction patterns, Do Not list),
  `docs/animation.md` (motion conventions), `src/styles/global.css` (import manifest order).
- **Hands off to:** `design-review` → `visual-verify` → `doc-audit`.
- **Does not:** distill visual inspiration (use `design-intake` for that); perform the
  compliance review itself; skip the plan-first gate.

---

## Step 1 — Analyze dependencies

List every `import` statement in the external source. For each dependency:

| Dependency | Status | Decision |
|---|---|---|
| Already in `package.json` | ✓ | Keep |
| Can be replaced by a repo primitive | — | Replace (state the replacement) |
| Adds no net-new capability over existing deps | — | Drop |
| Genuinely net-new and justified | — | Keep (add to `package.json`) |

Common external deps to evaluate: `clsx`, `tailwind-merge`, `class-variance-authority`,
`@radix-ui/*`, `react-spring`, `@headlessui/*`, CSS-in-JS runtime packages.

Default decisions:
- `clsx` / `tailwind-merge` / `cva` → **Drop** (no Tailwind in this repo; not needed).
- `react-spring` → **Replace** with Framer Motion (`framer-motion` already installed).
- Radix primitives → **Evaluate** — keep if the component genuinely needs accessible headless
  primitives that Framer/React alone don't provide.

---

## Step 2 — Identify architectural assumptions

Flag every architecture the external component assumes that differs from this repo:

- **Tailwind utility classes** — must be translated to a CSS partial (see Step 3).
- **`cn()`/`tw-merge` helper** — must be removed (no utility-class merging in this repo).
- **TypeScript types and annotations** — must be stripped (JavaScript only per `CLAUDE.md`).
- **CSS-in-JS** (styled-components, emotion, stitches) — must be extracted to a CSS partial.
- **Component-level `@keyframes`** — must be converted to Framer Motion variants in
  `src/animations/variants.js`.
- **Eager-loaded heavy deps** (Three.js, Spline, large GL libs) — must become `React.lazy`.
- **Hardcoded copy** — must move to `src/data/<name>.js`.

---

## Step 3 — Translate to repo conventions

### 3a. Tailwind → CSS partial

Create `src/styles/<component-name>.css`. For each Tailwind utility:
- Look up the CSS declaration it maps to.
- Replace the literal value with the closest `tokens.css` token (see Step 3d).
- Group declarations semantically (base → interactive states → responsive overrides at bottom).
- Register `@import './<component-name>.css'` in `src/styles/global.css` at the correct
  cascade position (after the section it belongs to).

Never import the CSS partial directly from the component file — `global.css` is the sole
manifest.

### 3b. Strip TypeScript

Remove all `: Type`, `interface`, `type Alias =`, generic brackets `<T>`, and `as Type` casts.
Convert `function Foo(props: Props)` → `function Foo(props)`.

### 3c. Motion translation

Re-express animations in Framer Motion via `src/animations/variants.js`:
- CSS transitions on enter/exit → Framer `AnimatePresence` + `motion.*` with `variants`.
- CSS `@keyframes` → define a Framer variant; add to `variants.js` and import.
- `react-spring` useSpring/useTransition → Framer Motion equivalents.
- Always check `src/animations/variants.js` for an existing variant before adding a new one.
- Add `useReducedMotion()` guard at the component level for any new motion.

Do not use GSAP unless touching the two existing GSAP sites (`App.jsx` ticker,
`WhatIDo.jsx` ScrollTrigger pin) — see `docs/animation.md`.

### 3d. Token substitution

Replace every literal value with the appropriate token:

| Literal type | Token family |
|---|---|
| Color hex / rgb | `var(--accent)`, `var(--fg)`, `var(--bg-*)`, `var(--muted)`, etc. |
| Spacing (px/rem padding/margin/gap) | `var(--space-xs)` through `var(--space-xxl)` |
| Border-radius | `var(--radius-sm)` through `var(--radius-full)` |
| Font-size | `var(--text-*)` |
| Font-family | `var(--serif)`, `var(--mono)`, `var(--sans)` |
| Letter-spacing | `var(--tracking-*)` |

For values that have no token equivalent (e.g. a very specific layout measurement), note it
explicitly in the plan. Do not invent new token names without going through `design-intake`.

### 3e. Content externalization

Move any hardcoded copy (strings, labels, placeholder text) to `src/data/<component-name>.js`
and import it into the component.

---

## Step 4 — Preserve behavior

The translated component must behave identically to the original at the user-interaction level.
For every interaction the original had (hover, click, keyboard, focus-visible), confirm the
translated version preserves it. Note any deliberate change explicitly — no silent regressions.

Accessibility semantics (ARIA roles, keyboard navigation, focus management) must be preserved
through the translation.

---

## Step 5 — Plan before code

Before writing any implementation, produce a structured plan:

```
## Component Integration Plan: <ComponentName>

### Source
<URL or description>

### Dependency analysis
| Dep | Decision | Reason |
|---|---|---|
| clsx | Drop | No Tailwind in repo |
| @radix-ui/dialog | Keep | Accessible headless overlay, no repo equivalent |

### Architectural assumptions to resolve
- Uses TypeScript — will strip all types
- 12 Tailwind utilities → translated to src/styles/new-card.css
- Entrance animation via react-spring → converted to Framer Motion REVEAL variant

### New files
- src/components/NewCard.jsx
- src/styles/new-card.css (registered in global.css after components.css)
- src/data/newCard.js (externalized copy)

### Token mappings
- bg-gray-900 → var(--bg-2)
- text-sm → var(--text-sm)
- rounded-lg → var(--radius-lg)
- p-4 → var(--space-lg) (16px → 24px, closest token; note intentional size change)

### Behavior preserved
- Hover reveals description ✓
- Keyboard: Enter/Space activates ✓

### Behavior changed (deliberate)
- Original used outline on focus; translated to box-shadow glow in var(--accent) per
  docs/design-system.md interaction pattern
```

**Get approval before implementing.** Do not write component code until the plan is approved.

---

## Exit criteria (done when)

- All external dependencies are analyzed (keep/replace/drop decided for each)
- All framework-specific styling (Tailwind utilities, CSS-in-JS) is translated to a
  `src/styles/<name>.css` partial registered in `global.css`
- All literal color/spacing/radii/type values are replaced with `tokens.css` custom properties
- Behavior (interactions, accessibility semantics) is preserved; deliberate changes are noted
- An implementation plan was produced and **approved before any code was written**
- On completion, hand off to `design-review`
