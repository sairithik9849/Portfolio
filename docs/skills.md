# Skill Operating System

This document defines how Claude Code skills in this repository **compose into a pipeline**
rather than function as isolated tools. Read it before writing or invoking any repo skill.

---

## Architecture First (repo-wide principle)

> **Architecture First.** Before modifying code, understand the repository's existing
> architecture. Never import external architecture wholesale. Adapt external ideas to existing
> repository conventions whenever practical. Only recommend architectural changes when they
> provide clear long-term value and are intentionally approved.

This principle is the through-line behind every skill in this repo:
- `design-intake` reconciles ideas against existing tokens/docs rather than importing them.
- `component-integration` translates external components to repo conventions rather than porting
  external architecture.
- `design-review` reports violations rather than autonomously refactoring to a new model.

---

## Development Workflows

### Primary: component-integration workflow

Most new interactive features follow this lifecycle. `component-integration` is the entry point.

```
External component (21st.dev, Magic UI, Aceternity UI, React Bits, shadcn/ui)
      ↓
component-integration     (analyze → translate → plan → await approval → implement)
      ↓
design-review             (report design-system violations; suggest fixes)
      ↓
visual-verify             (browser proof across 4 breakpoints + reduced-motion)
      ↓
doc-audit                 (run only if architecture or docs changed)
      ↓
Commit via git-workflow   (only if user wants to commit)
```   

### Parallel: design-intake workflow

Inspiration from any source feeds docs and tokens, then follows the same review tail.

```
Inspiration (Stitch / Figma / Mobbin / Stripe / Vercel / Linear / screenshot / clip)
      ↓
design-intake             (classify → route → distill → discard raw source)
      ↓
design-review             (if tokens/docs/patterns were updated)
      ↓
visual-verify             (if interaction patterns changed)
      ↓
doc-audit                 (confirm docs match code after any token/doc update)
      ↓
Commit via git-workflow
```

### Related: scaffold-section

`scaffold-section` handles **net-new portfolio sections** (new component + CSS + data + animation
wiring in `App.jsx`). `component-integration` handles **external components being adapted for
use inside any section**. They are complementary — scaffold-section may invoke
component-integration as a sub-task.

---

## Skill Composition Contract

Each skill has a defined responsibility boundary. Skills call each other only as **handoffs**
(one finishes, the next begins) — never as nested invocations.

| Skill | Inputs | Key files read | Hands off to | Does **not** |
|---|---|---|---|---|
| `design-intake` | Inspiration artifact (export, screenshot, URL, clip) | `tokens.css`, `docs/design-system.md` | `design-review` | translate component code; auto-edit the codebase |
| `component-integration` | External React component source | `package.json`, `tokens.css`, `docs/design-system.md`, `docs/animation.md`, `src/styles/global.css` | `design-review` → `visual-verify` → `doc-audit` | distill visual inspiration; perform compliance review; skip the plan-first gate |
| `design-review` | Changed files / diff | `docs/design-system.md`, `tokens.css` | `visual-verify` | review animation; edit or refactor code |
| `visual-verify` *(exists)* | Running app at localhost | Rendered output (Playwright screenshots) | `doc-audit` | judge source-level token discipline |
| `doc-audit` *(exists)* | `docs/*.md` + source files | docs + `src/` | `git-workflow` | change runtime behavior |
| `scaffold-section` *(exists)* | Task description | `docs/architecture.md`, `docs/animation.md`, `docs/design-system.md` | `visual-verify` | adapt external components |
| `git-workflow` *(exists)* | Branch state | `main` branch status | — | implement features |
| `animation-review` *(deferred)* | Changed files touching motion | `docs/animation.md`, `src/animations/variants.js` | `visual-verify` | design-system token review |

---

## Exit Criteria

Every skill has a deterministic definition of "done." Partial completion is not done.

### design-intake — Done when:
- Every discrete idea extracted from the inspiration is classified: **Keep / Adapt / Reject / Defer**
- Every kept/adapted idea has a destination: **token**, **documentation**, **interaction pattern**
- Repository conflicts (token name clash, value mismatch) are explicitly identified
- The raw inspiration artifact can be discarded (nothing useful remains unrouted)

### design-review — Done when:
- Every design-system violation in the changed files is reported
- Each violation includes a *why* explanation (which rule, which doc section)
- A suggested fix accompanies each violation
- **No** autonomous design changes were performed during review

### component-integration — Done when:
- All external dependencies are analyzed (keep / replace / drop decided for each)
- All framework-specific styling (Tailwind utilities, CSS-in-JS) is translated to a
  `src/styles/<name>.css` partial registered in `global.css`
- All raw color/spacing/radii/type literals are replaced with `tokens.css` custom properties
- Behavior (interactions, accessibility semantics) is preserved; deliberate changes are noted
- An implementation plan was produced and **approved before** any code change began

### visual-verify — Done when:
- All four breakpoints (1280/1440/1920/2560) are confirmed with screenshots
- Reduced-motion path confirmed if the change touched any animation
- No ✗ rows remain in the result table

### doc-audit — Done when:
- All file references, named exports, and "Do Not" rules are verified with `file:line` evidence
- Every ✗ item has a proposed resolution
- No autonomous doc rewrites occurred without confirming intent

---

## Adding a New Skill

1. Create `.claude/skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`).
2. Open the skill body with a one-line Architecture First reference:
   `Inherit the Architecture First principle (see docs/skills.md) — adapt, never import wholesale.`
3. Declare the composition contract (inputs, reads, hands off to, does not).
4. Define explicit exit criteria.
5. Add the skill to the composition table in this doc and to `CLAUDE.md`'s routing table if
   it warrants a row.
