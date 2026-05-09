# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Sairithik Komuravelly (Sai) — pronounced "Sigh-RIH-thick Koh-moo-ruh-VEL-lee". 
The goal is to build the absolute best portfolio in the developer space: highly animated, deeply interactive, and polished to perfection. It must showcase a balance of low-level systems engineering knowledge and high-end frontend execution.

## Tech Stack

- **Frontend:** React (Vite)
- **Backend:** Vercel Serverless Functions (Node.js) natively located in the `/api` directory. No standalone Express server.
- **Language:** JavaScript only — ES6+ syntax (arrow functions, destructuring, async/await, optional chaining, etc.). No TypeScript.
- **Styling/Animation:** Framer Motion (for physics-based animations, scroll reveals, and layout transitions).
- **Hosting:** Vercel

## Commands

### Local Development

```bash
# Install dependencies
npm install

# Start frontend dev server only
npm run dev

# Start FULL local environment (Frontend + Serverless API functions)
vercel dev

### Vercel

```bash
# Deploy to Vercel (from project root)
vercel              # preview deployment
vercel --prod       # production deployment
```

## Project Structure

```
Portfolio/
├── api/          
│   └── chat.js
├── src/             # React Frontend
│   ├── components/  # Modular UI components
│   ├── hooks/       # Custom React hooks
│   ├── App.jsx      # Main application router/wrapper
│   └── main.jsx     # Vite entry point
├── package.json
├── vite.config.js
└── vercel.json      # Vercel configuration (headers, rewrites, etc.)
```

## Architecture

- **The Frontend:** A Single Page Application (SPA) built with React and bundled via Vite. It handles all UI, state, and Framer Motion animations.

- **The Backend (Serverless):** Vercel automatically maps any file inside the `/api` folder to a serverless Function. The frontend securely calls these endpoints (e.g., `fetch('/api/chat')`).

- **Security:** API keys (like the Google Gemini key) must ONLY be accessed inside the `/api` directory via `process.env`. Never expose them in the `/src` frontend.

- Use ES modules (`import` / `export`) throughout — stick to it.

## Code Style

- JavaScript only — no TypeScript, no type annotations.
- ES6+ features preferred: arrow functions, template literals, destructuring, spread/rest, async/await.
- Use `const` by default, `let` when reassignment is needed, never `var`.
- Write modular, highly reusable components. Keep the Node.js backend lightweight and latency-optimized.

## Aesthetic Rules

- Animations Must be silky smooth (60fps+). Avoid janky layout shifts. Favor hardware-accelerated CSS properties (transform, opacity).
- Styling Highly stylish means attention to typography, negative space, and custom micro-interactions (e.g., custom cursors, magnetic buttons, scroll-triggered reveals).
