# Design System

CSS structure, color tokens, typography, spacing, radii, interaction patterns, and the layout
shell. Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** `src/styles/` structure, `global.css` manifest, all token categories, typography,
interaction patterns, and the `.shell` layout primitive. Section-specific animation and component
behavior live in the relevant subsystem doc.

---

## Brand: Cyber-Brutalist

The portfolio's visual language is Cyber-Brutalist — precision engineering aesthetics meet
clinical dark-UI craft. Deep obsidian surfaces, hairline borders, strict grid discipline, and
vibrant laser-lime accents project technical authority. The noise overlay (4% opacity SVG
fractal noise, `layout.css:.noise`) evokes CRT phosphor texture without imposing visual weight.
This is a direction, not a rigid specification — interaction patterns and tokens embody it;
vague prose descriptions do not.

---

## CSS Architecture

CSS is split into one partial per section/component in `src/styles/`. `global.css` is the
**import manifest** (ordered list of `@import`s) — it is the only CSS file imported by
`src/main.jsx`. Each partial owns its section's base rules **and** its responsive overrides
(co-located `@media` at the bottom of the file). `layout.css` contains shared primitives
(`.shell`, `.row`, `.section-head`, `.noise`, `.kicker`, `.dot`).

### Partials (in import order)

`fonts.css`, `tokens.css`, `preloader.css`, `layout.css`, `nav.css`, then the hero sub-folder
(`hero/grid.css`, `hero/shell.css`, `hero/identity.css`, `hero/robot.css`, `hero/manifesto.css`,
`hero/terminal.css`), `ai.css`, `components.css`, `about-me.css`, `WhatIDo.css`, then the widviz
sub-folder (`widviz/shell.css`, `widviz/backend.css`, `widviz/systems.css`, `widviz/data.css`,
`widviz/interface.css`, `widviz/agents.css`), `journey.css`, `projects.css`, `footer.css`.

Two sections use a per-concern sub-folder instead of a single file: `src/styles/hero/` (six
partials) and `src/styles/widviz/` (six partials — one per viz module plus the shared panel
scaffold). Each file owns its component's base rules and co-located responsive overrides. All
partials in each sub-folder are listed in `global.css` in cascade order.

### Adding a new section

1. Create `src/styles/<name>.css` with the section's rules + responsive overrides in one file.
2. Add `@import './<name>.css'` to `global.css` in visual/section order.

---

## Color System

**Canonical source of truth:** `src/styles/tokens.css` — all 15 color tokens defined as CSS
custom properties on `:root`. Docs reference semantic roles; never re-list raw hex values here
(drift risk).

### Semantic roles

Three roles cover all colored elements in the portfolio:

| Token | Value | Semantic role |
|---|---|---|
| `--accent` | `#c9f558` (lime) | Primary interactive: active states, hover reveals, data highlights, focus indicators, brand moments |
| `--accent-2` | `#e8c47a` (gold) | Non-interactive metadata: role strings, index prefixes, identifier badges, manifesto emphasis |
| `--fg` | `#ededdf` (cream) | Body content, headings |

All other color tokens in `tokens.css` (`--bg*`, `--fg-2`, `--muted*`, `--line*`, `--accent-dim`,
`--accent-2-dim`, `--accent-alert`) serve structural or state-extension purposes. When adding a
colored element, **assign it to the role that matches its semantic purpose**. If none fits, update
this doc with a justified new role — do not silently add raw hex.

---

## Typography

Fonts are self-hosted: `src/styles/fonts.css` declares `@font-face` rules pointing at
`public/fonts/*.woff2` (latin + latin-ext subsets only, trimmed to the weights actually used —
no 300 anywhere in the codebase). `index.html` preloads the hero h1 face
(`ibm-plex-sans-condensed-normal-500-latin.woff2`) and preconnects to `prod.spline.design`; there
is no Google Fonts request. `fonts.css` is imported first in `global.css`, ahead of `tokens.css`.
Three typefaces form three reading registers:

| Token | Family | Register | Use |
|---|---|---|---|
| `--serif` | **IBM Plex Sans Condensed** | Display | Headlines, index numbers, statement pieces. Set with tight line-height and negative tracking. Note: legacy token name — it is a condensed sans-serif, not a true serif. |
| `--mono` | **JetBrains Mono** | HUD / Code | Terminal, metadata tags, nav labels, button text. Wide letter-spacing (`--tracking-wide` to `--tracking-widest`) for all-caps HUD text. |
| `--sans` | **Geist** | Reading | Body paragraphs, UI descriptions, conversational copy. |

Type scale and letter-spacing tokens are defined in `tokens.css` (`:root`) with inline usage
comments. Use the scale tokens (`--text-*`), never literal `px` sizes.

---

## Spacing & Radii

**All spacing and radii must use tokens from `tokens.css`.** Do not introduce magic numbers.

### Spacing (4px baseline)

| Token | Value | Use |
|---|---|---|
| `--space-xs` | 4px | Micro padding, icon gaps |
| `--space-sm` | 8px | Internal component padding, list-item gaps |
| `--space-md` | 12px | Standard list-item spacing |
| `--space-lg` | 24px | Column gaps, gutter, section sub-spacing |
| `--space-xl` | 48px | Content block gaps, card padding |
| `--space-xxl` | 120px | Section macro-gap (`padding-top` on `.section-head`) |
| `--space-gutter` | 24px | Shell horizontal padding (named for intent, equals `--space-lg`) |
| `--shell-max` | 1440px | Max-width for `.shell` containers |

### Radii

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 2px | Status badges, input fields, terminal panels |
| `--radius-md` | 6px | Buttons (typically paired with `skewX(-6deg)`) |
| `--radius-lg` | 8px | Cards, elevated panels |
| `--radius-full` | 999px | Pill-shaped nav, suggestion chips |

---

## Layout Shell

`.shell` = `max-width: var(--shell-max); padding: 0 var(--space-gutter)`. All sections use it.

- Hero overrides to flush-left (`padding-left/right: 0; overflow: visible`).
- `body { overflow-x: clip }` — **`clip`, not `hidden`**. `hidden` makes body a scroll container
  which breaks ScrollTrigger's `position: fixed` pin. `clip` contains horizontal overflow without
  creating a scroll container. Do not revert this to `hidden`.

---

## Interaction Patterns

These document the portfolio's **current interaction language** — how key UI elements behave.
They are patterns, not frozen specs; the design language can evolve, but changes should update
this section to stay current.

### Navigation highlight (`nav.css:53–64`)

A `.nav-tab-cursor` pill element (`background: var(--accent)`, `border-radius: 999px`) is
absolutely positioned inside the nav strip and animated via Framer Motion to slide behind the
hovered tab. On hover, tab text flips from `var(--fg-2)` to `var(--bg)` (deep obsidian) for
maximum contrast against the lime fill.

### Card hover (`projects.css:19`, `projects.css:97`)

On project card hover, the index number colors to `var(--accent)`. The card visual panel gains a
`box-shadow` lime glow: `0 0 10px var(--accent)`. Transition on the glow, not layout properties.

### Skew decoration (`hero/robot.css:90`, `hero/manifesto.css:282`)

`skewX(-6deg)` appears on hero elements (robot shell, manifesto blocks) to convey structural
tech energy. This pattern should remain consistent when new interactive elements use tilt effects.
Pair with `--radius-md` on bordered containers.

### Return-to-Hero marker (`return-to-top.css`)

A 44×44px solid dark plate (`rgba(12, 12, 12, 0.92)`, `--radius-md`, hairline `var(--line-2)`
border) pinned top-right at z-index 40 — no `backdrop-filter`. It's a `position: fixed` element
that stays on screen while the user scrolls; blurring a fixed element re-samples the scrolling
content behind it every frame, so the raised-opacity solid plate reads the same without the
repaint. Contains an icon-only upward chevron
(`currentColor`, `var(--fg-2)` at rest). On hover/focus: border lights to `var(--accent)`;
a vertical lime gradient streak (`.return-top-ascent`) sweeps upward through the bezel via
`translateY` (transform only, clipped by `overflow:hidden`); chevron color shifts to `var(--accent)`
and lifts `translateY(-2px)`. All transitions use `cubic-bezier(0.22, 1, 0.36, 1)` at 250–400ms.
Under `prefers-reduced-motion` the streak is suppressed; only border/glow activates.

### Status badge pulse (`widviz.css:1583–1584`)

Active status indicators use a CSS keyframe:
`0%/100% { opacity: 0.35; box-shadow: none } 50% { opacity: 1.0; box-shadow: 0 0 5px currentColor }`
Pulse is `currentColor`-driven so the same animation works for lime and alert-red variants.

### Terminal panel (`hero/terminal.css`)

Terminal chrome: dark panel with `.bar` chrome strip (traffic-light dots via `nth-child`),
monospaced content, line numbers in `var(--muted)`, and syntax keywords highlighted in
`var(--accent)`. The pattern extends to any code or command-output display in the portfolio.

---

## Elevation & Glow

Visual hierarchy uses **tonal layers and glow halos** — no traditional drop shadows.

- **Layers:** `--bg` (base canvas) → `--bg-2` (elevated containers) → `--bg-3` (floating elements).
- **Borders:** Hairline `1px solid var(--line)` (8% bone) or `var(--line-2)` (16% bone).
- **Glow:** `box-shadow` in `var(--accent)` or `var(--accent-2)` with blur 5–32px at 12–35%
  opacity, simulating light emission. Currently ad-hoc per component in CSS partials.
- **Glass:** `backdrop-filter: blur(...)  saturate(...)` is reserved for `.terminal`
  (`hero/terminal.css`) — the hero's one signature glass surface, and its internal
  `.term-suggest` autocomplete dropdown. Every other floating panel that used to carry
  `backdrop-filter` (hero metric cards, meta-row chips, social buttons, the CTA button, the AI
  orb) is now a solid/raised-opacity plate instead. Reason: these sit over the always-drifting
  StarField or stay on screen during scroll (`position: fixed`), and a blurred backdrop
  re-samples the pixels behind it every frame it's visible — the single largest GPU cost on the
  page before this was fixed. Default to a solid plate for new floating panels; only reach for
  `backdrop-filter` on a static, non-scrolling surface where the glass effect is the point.
- **Noise texture:** `layout.css:.noise` — fixed-position 4% opacity SVG fractal noise overlay.
  Do not add a second noise layer.

---

## Common Edits

**Using a color:** pick the token whose semantic role matches. Do not use raw hex in CSS.
WebGL/canvas/Framer-Motion contexts that cannot read CSS vars may mirror the hex as a JS
constant — always add a comment noting which token it mirrors (see
`src/components/widviz/VizData.jsx` for the established pattern).

**Adding a new section's CSS:** create `src/styles/<name>.css`, add `@import` to `global.css`.
No other file needs updating.

**Adding spacing or radii:** always use `--space-*` / `--radius-*` tokens. Do not introduce new
hardcoded `px` values for spacing or border-radius in CSS partials.

---

## Do Not

- Do not use raw hex values in CSS partials — use `var(--…)` tokens. (WebGL/canvas JS mirrors
  are the only exception; see above.)
- Do not introduce a new accent color without adding a justified semantic role to this doc.
- Do not animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`) —
  `transform`/`opacity` only (60fps floor). Animation concerns: see `docs/animation.md`.
- Do not import CSS files directly from component files — `global.css` is the sole manifest.
- Do not revert `body { overflow-x: clip }` to `hidden` — doing so breaks ScrollTrigger pinning.
- Do not add a second noise overlay — one fixed `layout.css:.noise` layer is intentional.
- Do not duplicate token values in docs — reference `tokens.css` as the canonical source.
