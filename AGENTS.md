# Repository Guidelines

## Project Structure & Module Organization

This is a React 19 portfolio app built with Vite. The main app entry points are `src/main.jsx` and `src/App.jsx`. Reusable UI lives in `src/components/`, with project-specific visual components grouped under `src/components/visuals/`. Static content is separated into `src/data/` modules, shared animation variants live in `src/animations/`, hooks in `src/hooks/`, utilities in `src/utils/`, and global styling in `src/styles/global.css`. Public assets such as `favicon.svg` and `icons.svg` belong in `public/`. Serverless/API code is currently under `api/`. `dist/`, `node_modules/`, local logs, and Playwright MCP output are generated and should not be edited directly.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package.json`.
- `npm run dev`: start the Vite development server with HMR.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the production build locally for verification.
- `npm run lint`: run ESLint across the repo.

Run `npm run lint` and `npm run build` before opening a pull request or handing off substantial UI changes.

## Coding Style & Naming Conventions

Use ES modules, React function components, and JSX. Match the existing style: two-space indentation, single quotes, no semicolons, and concise component files. Name React components in PascalCase, for example `HeroFluid.jsx` or `ProjectVisual.jsx`; hooks should use the `useThing.js` pattern; data modules should use lowercase descriptive names such as `projects.js`. Prefer editing data in `src/data/` instead of hardcoding repeated content in components. Keep comments limited to non-obvious animation, shader, or interaction logic.

## Testing Guidelines

No automated test runner is currently configured. Treat `npm run lint` and `npm run build` as required baseline checks. For UI changes, also run `npm run dev` or `npm run preview` and manually verify desktop and mobile behavior, especially animated sections, navigation anchors, drawer interactions, and Three.js/Spline rendering. If tests are added later, colocate them near the relevant component or use a dedicated `src/__tests__/` directory.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit-style prefixes such as `feat:`, `refactor:`, and `chore:`. Keep subjects imperative and scoped, for example `feat: add project visual hover state`. Pull requests should describe the user-facing change, list validation performed, link related issues when applicable, and include screenshots or short recordings for visual changes.

## Security & Configuration Tips

Keep secrets in `.env.local`; do not commit local environment files. Review `api/chat.js` changes carefully because API routes may expose environment variables or external service behavior.
