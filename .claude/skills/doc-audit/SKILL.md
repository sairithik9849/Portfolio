---
name: doc-audit
description: Evidence-grounded audit of CLAUDE.md and docs/*.md against the real code. Verifies every file reference, named export, and "Do Not" rule still holds. Enforces the "new component -> update docs + routing table" rule. Use after a structural change, when docs feel stale, or to confirm a proposed change won't violate stated architecture before implementing it.
---

# Doc Audit

Composition & handoffs: see `docs/skills.md`. In the component-integration workflow, `doc-audit` runs after `visual-verify` (only if architecture or docs changed). On completion, hand off to `git-workflow`.

You are auditing the portfolio's governance docs against the real code. The goal is a verdict — **confirmed or contradicted** — for every concrete claim, backed by `file:line` evidence. Never assume; always verify.

## Scope

Audit can be:
- **Targeted:** a single doc passed as an argument (e.g. `/doc-audit docs/animation.md`).
- **Full:** all docs — run `CLAUDE.md` router first, then each `docs/*.md` in turn.

Default to full if no doc is specified.

## What to audit

For each doc, verify these four categories:

### 1. File and path references

Every file path named in the doc must exist in the repo. Check:
- Component paths (e.g. `src/components/Preloader.jsx`)
- Utility paths (e.g. `src/utils/scrollTo.js`, `src/utils/cursor.js`)
- Data files (e.g. `src/data/projects.js`, `src/data/nav.js`)
- CSS partials (e.g. `src/styles/hero/shell.css`, `src/styles/global.css`)
- Hook paths (e.g. `src/hooks/useHotkey.js`)

Report: `✓ exists` or `✗ NOT FOUND` with the claimed path.

### 2. Named exports and component/prop contracts

Every named export, component prop, or function the doc relies on must actually exist at that file with that name. Spot-check:
- `src/animations/variants.js` exports: `REVEAL`, `STAGGER_PARENT`, `STAGGER_CHILD`, `HERO_PARENT`, `HERO_SEQUENCE`, `HERO_SEQUENCE_INSTANT`, `fadeUp`, `WID_PANEL_REVEAL`, `WID_DRAW`, `WID_AMBIENT_REST`
- `src/utils/cursor.js` exports: `CURSOR_X`, `CURSOR_Y`
- `src/utils/scrollTo.js` exports: `scrollToId`
- `src/components/ProjectVisual.jsx`: `VIZ` map keys match entries in `src/data/projects.js`
- Any new exports a recent change added that docs don't yet mention

Report: `✓ confirmed at <file>:<line>` or `✗ not found / renamed`.

### 3. "Do Not" rules

Each doc's "Do Not" block states invariants. Verify the most consequential ones against the live code. Key checks:

| Rule | How to verify |
|---|---|
| No inline variants — all in `variants.js` | `grep -r "initial={" src/components` — flag any `{ hidden:…, show:… }` not imported |
| No raw `scrollIntoView` | `grep -r "scrollIntoView" src/` — must be 0 results |
| No CSS import from component files | `grep -r "import.*\.css" src/components` — must be 0 results |
| GSAP only in App.jsx + WhatIDo.jsx | `grep -r "gsap\." src/ --include="*.jsx" --include="*.js"` — flag any hit outside those two |
| No layout property animation (`width`/`height`/`top`/`left` in `animate=`) | scan component files for `animate={{ width` etc. |
| `HeroFluid` and `react-spline` are `React.lazy` | check `src/App.jsx` imports |
| No unassigned color role | Scan `src/styles` for raw hex values — every color should be `var(--…)`; any raw hex outside WebGL/canvas JS mirrors is a violation. New accent colors must have a documented semantic role in `docs/design-system.md`. |
| `mountContent` in IntersectionObserver deps | check `App.jsx` observer dep arrays |

Report per rule: `✓ invariant holds` or `✗ violation at <file>:<line> — <quote>`.

### 4. "Extending the Docs" rule (CLAUDE.md)

> Any new major component, third-party integration, or architectural rule must: (1) add or update the relevant `docs/*.md`, (2) add a routing-table row in CLAUDE.md.

Check:
- All components in `src/components/` are either covered by an existing doc or are small enough not to warrant a dedicated doc.
- All `src/components/visuals/Viz*.jsx` and `src/components/widviz/Viz*.jsx` are covered by `docs/architecture.md` or `docs/what-i-do.md` respectively.
- The CLAUDE.md routing table rows account for all current `docs/*.md` files.
- If a new file/folder exists that isn't mentioned in any doc, flag it as a potential gap.

### 5. Router invariant (CLAUDE.md only)

When auditing `CLAUDE.md`, confirm it stays a **router** — no subsystem implementation detail in the root file. Every concrete implementation detail should live in `docs/<subsystem>.md`. Flag any section that belongs in a subsystem doc.

---

## Output format

For each doc, report:

```
## docs/animation.md

### File references
✓ src/animations/variants.js — exists
✓ src/components/AboutMe.jsx — exists
✗ src/components/HeroLetter.jsx — NOT FOUND (may have been removed or renamed)

### Named exports (variants.js)
✓ REVEAL — confirmed at src/animations/variants.js:12
✓ fadeUp — confirmed at src/animations/variants.js:47
✗ HERO_CHILD_FADE — exported but doc says "no longer used by Hero.jsx" — CONFIRM still exported, not deleted

### "Do Not" rules
✓ No raw scrollIntoView — 0 hits in src/
✗ GSAP used in src/components/SomeComponent.jsx:88 — outside the two permitted files

### Extending the Docs
✓ All Viz*.jsx in widviz/ covered by docs/what-i-do.md
✗ src/components/AgentSection.jsx exists but has no doc coverage — consider docs/agent.md or adding a section to docs/architecture.md

### Overall
2 issues found — see ✗ items above. Propose edits? (Y/N)
```

**Propose edits but do not silently rewrite docs.** Surface findings first, then ask before making changes.

---

## What to do with findings

- **Confirmed (✓):** note it, move on.
- **Contradicted (✗ / stale reference):** state the contradiction with evidence, then propose the minimal doc update to make it accurate.
- **Missing doc coverage:** flag the gap; recommend whether it warrants a new `docs/*.md` or a section addition.
- **"Do Not" violation in code:** that is a code bug, not a doc bug — surface it for the user to decide whether to fix the code or relax the rule.

Never silently "fix" docs to match wrong code, or fix code to match outdated docs, without confirming intent first.
