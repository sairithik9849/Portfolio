# Skills Summary

## Project Skills (`.claude/skills/`)

- **git-workflow** — Git/branch/commit/merge/PR/Vercel deploy workflow for this production portfolio. Covers branch naming, squash-merge into main, commit format, pre-merge gate, PR steps, preview-vs-production deploys.
- **visual-verify** — Verifies a UI/CSS/animation change visually in-browser before "done." Playwright screenshots across phone/tablet/desktop breakpoints, reduced-motion path check, hover-state-at-mobile-width flag, real-device touch step.
- **scaffold-section** — Architecture-compliant scaffolding for new portfolio sections, Viz cards, hero cascade phases, scroll-reveals. Enforces subsystem-doc "Do Not" rules up front so nothing needs reverting.
- **component-integration** — Translates an external React component (21st.dev, Magic UI, Aceternity UI, React Bits, shadcn/ui, etc.) into a repo-native implementation: dependency analysis, Tailwind→repo-CSS conversion, token substitution, Framer Motion re-expression, plan for approval before code.
- **design-intake** — Source-agnostic workflow for incorporating design inspiration (Stitch, Figma, Mobbin, Stripe, Vercel, Linear, Apple, Dribbble, screenshots). Classifies each idea Keep/Adapt/Reject/Defer, routes to tokens/docs/patterns, discards the raw source.
- **design-review** — Design-system compliance review for changed files: tokens, spacing/radii, typography, color roles, interaction-pattern conformance against `docs/design-system.md`. Report-only, no edits. Animation out of scope.
- **doc-audit** — Evidence-grounded audit of CLAUDE.md and `docs/*.md` against real code: verifies file references, named exports, "Do Not" rules. Enforces "new component → update docs + routing table." Use after structural changes or before implementing a change that might violate stated architecture.

*(Excluded: learning-project skills — `start-project`, `plan-journey`, `next-lesson`, `adopt-project`.)*

## Global Skills (`~/.claude/skills/`)

- **model-chat** — Spawns 3–5+ Claude Code instances into a shared debate room that challenge, disagree, and converge over multiple rounds (round-robin, rolling summarizer, forced Devil's Advocate, final synthesizer). The "refine" phase of discover-then-refine; can seed from a stochastic-multi-agent-consensus artifact. Trigger: "model chat," "debate this," `/model-chat`.
- **fan-out-fan-in** — Answers divergent/open-ended questions (strategy, trade-offs, comparisons) by fanning out 5 independent researchers (4 Sonnet + 1 Codex cross-model) on the same question, then merging into a scored union. Trigger: "fan out," "get multiple perspectives," `/fan-out-fan-in`.
- **stochastic-multi-agent-consensus** — Spawns N agents (default 5), each with a distinct lens (Conservative Expert, First-Principles Thinker, Disruptive Contrarian, Pragmatic Operator, Systems Thinker), to independently scan the search space and surface a spectrum of solutions. Single-pass clustering to statistical-mode consensus, no debate. Produces a debate-ready artifact. Trigger: "consensus," "stochastic consensus," "scan the search space."
- **grill-me** — Interviews the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Trigger: "grill me," stress-test a plan/design.
