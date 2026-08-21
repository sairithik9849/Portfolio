# Backend

Vercel Serverless Functions, AI chat API, and environment variables. Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** `/api` functions, `api/chat.js` design decisions, and env-var rules. Frontend data structure and content mapping → `docs/architecture.md`.

## Serverless Model

Backend is Vercel Serverless Functions in `/api`. No Express, no server framework. Each file in `/api` is a standalone function.

## AI Chat — `api/chat.js`

Single serverless function that proxies to Google Gemini (`gemini-3.6-flash`).

Key design decisions:

- **No conversation history** — each request is stateless; no prior turns are retained or resent.
- **`SYSTEM_PROMPT` is sent via Gemini's `systemInstruction` field, not concatenated into the user turn.** `contents` carries only the visitor's raw message. `systemInstruction` is a separate, higher-authority channel the model weighs above user-supplied text — this is the main defense against basic prompt-injection ("ignore your instructions and...") attempts. Verified live: a visitor message opening with "Ignore all previous instructions" still got pulled back into persona by the model on its own. Not airtight — pair with an explicit scope-boundary instruction inside `SYSTEM_PROMPT` itself for off-topic queries.
- **Persona/facts live entirely in `SYSTEM_PROMPT`** at the top of the file. Edit that constant to change the AI's persona.
- **`maxOutputTokens: 200` is intentional** — keeps responses under ~90 words for the orb UI. Do not raise it without considering the drawer layout.
- **`thinkingConfig: { thinkingLevel: 'minimal' }` is intentional.** The entire Gemini 2.5 line (`gemini-2.5-flash`, `-flash-lite`, `-pro`) is retired for new API keys/projects as of August 2026 — confirmed via a live 404 against this project's key: `"is no longer available to new users."` Gemini 3.x models cannot disable thinking outright (there is no `thinkingBudget: 0` equivalent — sending the legacy `thinkingBudget` field 400s); `thinking_level: "minimal"` is the lowest available setting and keeps reasoning tokens from eating the `maxOutputTokens: 200` budget before the visible reply is written. Verified end-to-end against the real API with the actual system prompt: a realistic reply lands around 60-70 output tokens, comfortably inside the cap.
- **Model name is pinned, not a `-latest` alias.** `gemini-1.5-flash-latest` was retired by Google with no warning and silently 404'd in production — that's why this function went down (twice, during this same fix: the first replacement model chosen, `gemini-2.5-flash`, turned out to already be retired for this key). A pinned name fails via Google's deprecation notices instead of a silent prod outage, at the cost of needing a manual bump when it's eventually retired too. Before ever changing this model string again, verify eligibility with a live `curl` against the real key — Google's `ListModels` catalog lists models this key can *see*, not necessarily ones it's still eligible to *call*.

## Environment Variables

`GEMINI_API_KEY` is set in Vercel project settings; `vercel dev` injects it locally — no `.env` file needed.

Rules:

- Read env vars **only inside `/api`** via `process.env`.
- **Never import from `/src`** inside `/api` functions and never import `/api` inside `/src`.
- Do not commit `.env` files — the gitignore does not explicitly exclude them but there is no `.env` file in this repo.

## Commands

```bash
vercel dev    # runs frontend + all /api functions locally with env vars injected
vercel        # preview deploy (all /api functions deployed)
vercel --prod # production deploy
```

## Common Edits

**Adding a new serverless function:** Create `api/<name>.js` that exports a default `handler(req, res)`. Access env vars via `process.env`. No imports from `src/`.

**Updating the AI persona:** Edit the `SYSTEM_PROMPT` constant at the top of `api/chat.js`.

## Do Not

- Never import from `src/` inside `/api` functions, and never import `/api` inside `src/`.
- Never raise `maxOutputTokens` without verifying the drawer layout can handle longer responses — 200 tokens (~90 words) is intentional.
- Never add conversation history — each request is stateless by design (no prior turns retained or resent).
- Never add an Express or similar framework — each `/api` file is a standalone Vercel function.
