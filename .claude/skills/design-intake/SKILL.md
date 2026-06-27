---
name: design-intake
description: Source-agnostic workflow for incorporating any design inspiration into the repository. Analyzes inspiration from any source (Google Stitch, Figma, Mobbin, Stripe, Vercel, Linear, Apple, Dribbble, screenshots, landing pages) and classifies each idea as Keep/Adapt/Reject/Defer before routing to tokens, docs, interaction patterns, or discard. Ends by discarding the raw source — only the distilled output stays.
---

# Design Intake

You are distilling design inspiration into durable repository knowledge. Your job is classification
and routing — **not** editing components or writing code. Inherit the Architecture First principle
(`docs/skills.md`): adapt ideas to existing conventions, never import external architecture
wholesale.

## Composition contract

- **Inputs:** Any inspiration artifact — a pasted design-system export, a URL, a screenshot
  description, a component library's visual language, or even a single interaction clip.
  The input may or may not be a complete design system. Do not assume it is.
- **Reads:** `src/styles/tokens.css` (the token source of truth), `docs/design-system.md` (usage
  rules, interaction patterns, Do Not list).
- **Hands off to:** `design-review` (if tokens, docs, or interaction patterns were changed).
- **Does not:** translate component code, edit CSS files, or auto-apply changes.

## Step 1 — Extract discrete ideas

Break the inspiration into individual, independently evaluable ideas. One idea = one decision.
Examples of what counts as a discrete idea: a specific color value, a spacing scale, a radii
system, a component shape, a motion behavior, a layout pattern, a typography pairing, a brand
philosophy statement.

## Step 2 — Classify each idea

For every extracted idea, assign one verdict and state the reasoning:

| Verdict | Meaning |
|---|---|
| **Keep** | Adopt as-is — directly maps to a gap in the repo's existing system |
| **Adapt** | The concept is valid but the specifics must be reconciled to repo conventions |
| **Reject** | Redundant with what already exists, conflicts with existing decisions, or not suitable |
| **Defer** | Valid but not urgent — note it for a future session |

## Step 3 — Reconcile against the repo

For every Keep/Adapt idea, check:
- Does a token with this role already exist in `tokens.css`? If so, do the values conflict?
- Does the interaction pattern already exist in `docs/design-system.md`? Is it documented correctly?
- Does the idea contradict a "Do Not" rule?

Report conflicts explicitly. The repo wins on value conflicts — only propose overriding an
existing value with documented justification.

## Step 4 — Route each kept idea

Assign every Keep/Adapt idea to exactly one destination:

| Destination | When |
|---|---|
| **Token** (`src/styles/tokens.css`) | A measurable value (color, size, scale) that has no token yet |
| **Documentation** (`docs/design-system.md`) | A usage rule, brand philosophy blurb, or interaction pattern |
| **Interaction pattern** (section in `docs/design-system.md`) | A specific UI behavior verified against code |
| **Discard** | Vague prose, internal taxonomy, or anything redundant with what exists |

## Step 5 — Rewrite vague prose into rules

Design exports often contain flowery descriptions ("CRT phosphor glow", "clinical futurism").
Convert every kept phrase into a deterministic engineering rule or a 3-line brand blurb. If it
cannot be made deterministic, discard it.

## Step 6 — Present decisions and discard the source

Output a structured decision table (idea | verdict | destination | reasoning) for every idea.
Get approval before updating any file. After approval, apply only the approved changes.

Once changes are committed, **discard the raw inspiration artifact** — no raw exports are stored
in the repo. The distilled output in `tokens.css` and `docs/` is the permanent record.

## Exit criteria (done when)

- Every discrete idea from the inspiration is classified (Keep/Adapt/Reject/Defer)
- Every kept/adapted idea has an assigned destination
- Repository conflicts are identified and the repo's existing values are preserved unless
  explicitly overridden with justification
- The raw inspiration artifact can be discarded — nothing useful remains unrouted

## Output format

```
## Intake: <source name / date>

| Idea | Verdict | Destination | Reasoning |
|---|---|---|---|
| Spacing scale (4px base) | Keep | Token (--space-*) | No spacing tokens exist; values match existing hardcoded conventions |
| M3 on-tertiary-fixed token | Reject | Discard | Redundant with existing --bg-3; M3 taxonomy doesn't map to this system |
| "clinical futurism" | Adapt | Doc (Brand blurb, 2 sentences) | Captures aesthetic intent; rewritten as a design direction, not an enforceable rule |
…

## Conflicts identified
- Stitch says canvas #131313; repo uses --bg: #070707. Repo value wins.

## Proposed file changes (pending approval)
- src/styles/tokens.css: add --space-xs through --shell-max
- docs/design-system.md: add Spacing & Radii section, update Brand blurb
```

After approval, hand off to `design-review` if any repo file was changed.
