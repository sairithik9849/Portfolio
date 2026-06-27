---
name: git-workflow
description: Git, branch, commit, merge, PR, and Vercel deploy workflow for this production portfolio. Use when committing, pushing, branching, merging, squash-merging, opening a PR, tagging, or deploying. Covers branch naming, squash-merge into main, commit message format, pre-merge gate, PR steps, and preview-vs-production deploys.
---

# Git & Deploy Workflow

You are doing git/deploy work for the portfolio. Follow this workflow.

## Production context

heysai.dev is live. `main` is production — every push to `main` auto-deploys to Vercel and immediately affects real users. Never experiment on `main`; never treat it as a playground. Protecting production stability outranks shipping the next feature.

## Branch workflow

Every feature ships through a branch:

1. Start from an up-to-date `main`.
2. Create a `feature/<scope>` branch before any implementation begins.
3. Do all work inside that branch; keep unrelated changes out.
4. Validate via the branch's Vercel preview deployment.
5. **Run the pre-merge gate** (see below) before merging.
6. Squash-merge into `main` only after the feature is complete, verified, and the gate passes.

Example branches: `feature/mobile`, `feature/ai-agent`, `feature/projects`, `feature/blog`, `feature/contact`, `feature/animation-v2`.

When asked to do git work, suggest branch names and advise when something should or should not merge.

## Commit messages

- Meaningful and release-documentation quality. Treat history as release documentation, not an autosave mechanism.
- **Plain ASCII only — no em dashes or non-ASCII characters.** PowerShell here-strings break on em dashes; use plain hyphens.
- End every commit message with the co-author line for the current model. Use the model name shown in the session (e.g. `Claude Opus 4.8`, `Claude Sonnet 4.6`) — do not hardcode a stale model name:

  ```
  Co-Authored-By: Claude <model-name> <noreply@anthropic.com>
  ```

## Pre-merge gate (hard requirement)

Before squash-merging any branch into `main`, both of these must pass cleanly:

```powershell
npm run lint    # ESLint flat config — zero errors required
npm run build   # Vite production build — must complete without errors
```

The per-file `eslint-fix.mjs` PostToolUse hook catches incremental issues during editing, but it does not cover the full project build. Run the full gate explicitly before merging. Do not bypass it.

## Merges

Default merge into `main` is a **squash merge** — one clean commit per feature.

```bash
git checkout main
git merge --squash feature/<scope>
git commit   # write the squash commit message per the rules above
git push origin main
```

## Pull requests

Use `gh pr` for review workflows or when the branch needs outside review before merge:

```bash
# Open a PR from the current feature branch
gh pr create --title "<concise title, ASCII only>" --base main

# Check PR status and CI
gh pr status
gh pr checks

# View and merge when ready
gh pr merge --squash
```

Keep PR titles ASCII-safe (same rule as commit messages). The PR body should summarize what changed and link any relevant Vercel preview URL.

## Worktrees

Claude Code may create isolated worktrees under `.claude/worktrees/` for parallel or sandboxed feature work. These are separate git working trees on separate branches — safe to work in without affecting your main checkout. They auto-clean when the agent finishes if no changes were made. If a worktree sticks around, remove it with:

```bash
git worktree remove .claude/worktrees/<name>
```

## Vercel

Preview deployments are the default review mechanism for feature branches. Production deploys happen only by merging into `main`.

**After a production deploy:** wait ~60 seconds for Vercel to propagate, then do a smoke check on [heysai.dev](https://heysai.dev) — confirm the page loads, the preloader runs, and the hero section renders. If anything looks wrong, check Vercel deployment logs with:

```bash
# Requires Vercel CLI logged in
vercel logs --prod
```
