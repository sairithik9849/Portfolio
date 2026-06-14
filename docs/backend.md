# Backend

Vercel Serverless Functions, AI chat API, and environment variables. Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** `/api` functions, `api/chat.js` design decisions, and env-var rules. Frontend data structure and content mapping → `docs/architecture.md`.

## Serverless Model

Backend is Vercel Serverless Functions in `/api`. No Express, no server framework. Each file in `/api` is a standalone function.

## AI Chat — `api/chat.js`

Single serverless function that proxies to Google Gemini (`gemini-1.5-flash-latest`).

Key design decisions:
- **No conversation history** — every request sends the full system prompt + user message in one `contents` turn.
- **Persona/facts live entirely in `SYSTEM_PROMPT`** at the top of the file. Edit that constant to change the AI's persona.
- **`maxOutputTokens: 200` is intentional** — keeps responses under ~90 words for the orb UI. Do not raise it without considering the drawer layout.

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
- Never add conversation history — each request is stateless by design (full system prompt + user message in one turn).
- Never add an Express or similar framework — each `/api` file is a standalone Vercel function.
