# Design System

CSS structure, color tokens, typography, and the layout shell. Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** `src/styles/` structure, `global.css` manifest, color tokens, typography tokens, and the `.shell` layout primitive. Section-specific animation and component behavior live in the relevant subsystem doc.

## CSS Architecture

CSS is split into one partial per section/component in `src/styles/`. `global.css` is the **import manifest** (ordered list of `@import`s) — it is the only CSS file imported by `src/main.jsx`. Each partial owns its section's base rules **and** its responsive overrides (co-located `@media` at the bottom of the file). `layout.css` contains shared primitives (`.shell`, `.row`, `.section-head`).

### Partials (in import order)

`tokens.css`, `preloader.css`, `cursor.css`, `layout.css`, `nav.css`, `hero.css`, `ai.css`, `components.css`, `about-me.css`, `WhatIDo.css`, `widviz.css`, `experience.css`, `education.css`, `projects.css`, `footer.css`

### Adding a New Section

1. Create `src/styles/<name>.css` with the section's rules + responsive overrides in one file.
2. Add `@import './<name>.css'` to `global.css` in visual/section order.

## Color System — Three Tokens

Each token has a semantic role. When adding a colored element, assign it to one of these three roles. **Never introduce a fourth color** without updating this section.

| Token | Value | Role |
|---|---|---|
| `--accent` | `#c9f558` (lime) | Primary actions, brand highlights, hover-revealed states, interactive indicators, data highlights |
| `--accent-2` | `#e8c47a` (gold) | Non-interactive metadata labels and manifesto emphasis: role strings, index prefixes, identifier badges (e.g. `.bar-shell`, `.exec-co-role`, `.pj-info .role`, `.acc-role`, `.exec-bullet-n`, version meta-string), italicized manifesto verbs (`.manifesto-quote .serif`), hero surname letters (`.char--last`) |
| `--fg` | `#ededdf` (cream) | Body content, headings |

## Typography

Fonts are loaded in `index.html`.

| Token | Family | Use |
|---|---|---|
| `--serif` | **IBM Plex Sans Condensed** | Headlines/display: `.hero h1`, `.mf-num`, project/edu/exec headings. Loaded with italic axis for editorial accents in `.hero h1 .it` and `.manifesto-quote-sm .serif`. Note: `--serif` is a legacy token name — the typeface is actually a condensed sans-serif. |
| `--mono` | **JetBrains Mono** | Code, terminal, metadata |
| `--sans` | **Geist** | Body, UI |

## Layout Shell

`.shell` = `max-width: 1440px; padding: 0 24px`. All sections use it.

- Hero overrides to flush-left (`padding-left/right: 0; overflow: visible`).
- `body { overflow-x: hidden }` is load-bearing — Spline canvas and `InfiniteGrid`'s `100vw` full-bleed both extend past the shell intentionally. Do not remove it.

## Common Edits

**Adding a new section's CSS:** Create `src/styles/<name>.css` with the section's base rules and responsive overrides (`@media` at the bottom). Add `@import './<name>.css'` to `global.css` in visual order. No other file needs updating.

**Using a color:** Choose the existing token whose role matches (`--accent` for interactive/highlight, `--accent-2` for non-interactive metadata, `--fg` for body/headings). Do not introduce a new value.

## Do Not

- Never introduce a fourth color token — assign everything to `--accent`, `--accent-2`, or `--fg`, or update this doc with a justified new role.
- Never animate layout properties (`width`, `height`, `top`, `left`, etc.) — `transform`/`opacity` only.
- Never import CSS files directly from component files — `global.css` is the sole import manifest.
- Do not remove `body { overflow-x: hidden }` — the full-bleed elements depend on it.
