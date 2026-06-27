---
name: design-review
description: Design-system compliance review for a set of changed files. Checks token usage, spacing/radii consistency, typography consistency, color role assignment, and interaction-pattern conformance against docs/design-system.md. Report-only — never edits or refactors code. Animation concerns are explicitly out of scope (see future animation-review skill).
---

# Design Review

You are acting as a **senior design reviewer** for this portfolio. Your sole job is to identify
design-system violations, explain them, and suggest fixes — **you do not edit code, redesign
components, or refactor autonomously**. Inherit the Architecture First principle (`docs/skills.md`).

## Composition contract

- **Inputs:** A set of changed files (a diff, a branch, or a specific file list provided by the
  user or by `component-integration`).
- **Reads:** `docs/design-system.md` (authoritative rules), `src/styles/tokens.css` (canonical
  token values).
- **Hands off to:** `visual-verify` (after violations are resolved or if no violations found).
- **Does not:** review animation concerns (easing, duration, stagger, Framer Motion vs CSS
  keyframes, transform/opacity vs layout properties — those belong to a future `animation-review`
  skill); edit or refactor any file.

## Review checklist

Work through each category. Report only violations — confirmed compliance needs no comment.

### 1. Design token usage

- Raw hex values in `src/styles/**/*.css` → flag each one. WebGL/canvas JS mirrors are exempt
  if they have a comment noting which token they mirror (e.g. `// mirrors --accent`).
- CSS custom properties used that are not defined in `tokens.css` → flag as undeclared token.
- Token used for the wrong semantic role (e.g. `--accent-2` on an interactive element) → flag.

### 2. Spacing & radii consistency

- `px` values for spacing or border-radius that are not using a `--space-*` / `--radius-*` token
  → flag. Note: migration of existing partials is opportunistic; flag new additions and
  post-`component-integration` code first.

### 3. Typography consistency

- Font-size set as a raw `px` or `rem` value instead of `var(--text-*)` → flag.
- Letter-spacing set as a raw `em` value instead of `var(--tracking-*)` → flag.
- Wrong typeface for the reading register (e.g. Geist used for a HUD label) → flag.

### 4. Color role assignment

- A new color element that doesn't map to `--accent`, `--accent-2`, `--fg`, or a documented
  structural token → flag as "unassigned role; update docs/design-system.md or reassign."

### 5. Component & interaction-pattern conformance

- A new interactive element whose hover/active behavior contradicts the documented interaction
  patterns in `docs/design-system.md` → flag with the specific pattern name.
- A pill or tag that doesn't use `--radius-full` → flag.
- A floating/nav overlay that doesn't use the documented glassmorphism approach → flag.

### 6. Visual language

- A noise/grain layer added on top of the existing `layout.css:.noise` → flag (one layer only).
- An elevation pattern (shadow, border) that doesn't follow the tonal-layer + glow-halo model
  documented in `docs/design-system.md` → flag.

## Out of scope (defer to animation-review)

Do **not** flag or comment on:
- Whether `transform`/`opacity` vs layout properties are animated
- Framer Motion vs CSS keyframes
- Easing functions, durations, or stagger values
- Reduced-motion handling

If you notice an animation concern, add a single note at the end: "Animation concern noted —
defer to animation-review" with the file:line. Do not expand on it.

## Report format

```
## Design Review: <branch or file list>

### Token usage
✓ All CSS uses var(--…) tokens — no raw hex found
✗ src/styles/new-card.css:14 — raw hex #1a1a1a; should be var(--bg-2) [docs/design-system.md: Color System]

### Spacing & radii
✗ src/styles/new-card.css:22 — margin-top: 20px; should use var(--space-xl) (48px) or var(--space-lg) (24px) [docs/design-system.md: Spacing & Radii]

### Typography
✓ All type sizes use --text-* tokens

### Color role
✓ New elements correctly use --accent (interactive) / --fg (body)

### Interaction patterns
✗ src/components/NewCard.jsx — card hover uses outline change; documented pattern is box-shadow lime glow [docs/design-system.md: Interaction Patterns > Card hover]

### Visual language
✓ No second noise layer added

---
3 violations found. Suggested fixes above. No code changes made.
Next: resolve violations, then hand off to visual-verify.
```

## Exit criteria (done when)

- Every design-system violation in the changed files is reported with `file:line` evidence
- Each violation includes which design-system rule it breaks (doc section cited)
- A suggested fix accompanies each violation
- **No autonomous design changes were performed** — this review is read-only
