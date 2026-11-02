# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`: route screens are in `pages/`, shared primitives in `components/ui/`, domain components in `components/interview/`, and routing in `routes/`. Keep API access in `services/`, shared state in `contexts/`, reusable behavior in `hooks/`, and contracts in `types/`. Design tokens live in `src/styles/`; static files belong in `public/`. Use the `@/` alias for imports from `src`.

## Build, Test, and Development Commands

- `npm ci`: install exact lockfile dependencies.
- `npm run dev`: start Vite with hot reload at `http://localhost:5173`.
- `npm run build`: type-check and produce the production bundle in `dist/`.
- `npm run preview`: serve the production bundle locally.
- `npm test` / `npm run test:watch`: run the Vitest suite once or in watch mode.
- `npm run lint` / `npm run lint:fix`: check or fix ESLint findings.
- `npm run format:check` / `npm run format`: verify or apply Prettier formatting.
- `npm run typecheck`: run TypeScript validation without emitting files.

Copy `.env.example` to `.env` before local development.

## Coding Style & Naming Conventions

Follow Prettier: two-space indentation, single quotes, and no semicolons. Use PascalCase for components (`InterviewRoomPage.tsx`), camelCase for functions and hooks (`useCountdown.ts`), and `import type` for type-only imports. Avoid TypeScript `enum`; use unions. Import shared UI through `@/components/ui`, call APIs through services, and define routes in `src/routes/paths.ts`.

Do not hardcode colors or arbitrary spacing. Add semantic tokens to `src/styles/tokens.css` and reuse `Stack`, `Card`, or approved Tailwind token classes. ESLint enforces these design-system rules.

## Testing Guidelines

Tests run on Vitest with Testing Library and jsdom (`vitest.config.ts`); no coverage threshold is configured. Run `npm test` (or `npm run test:watch` while developing), `npm run lint`, `npm run format:check`, `npm run typecheck`, and `npm run build`; these are the pull-request CI gates. Colocate new tests next to the source as `*.test.ts` or `*.test.tsx`. Also manually exercise affected routes, responsive states, authentication, and error/loading states.

## Commit & Pull Request Guidelines

Recent history favors short Conventional Commit subjects such as `feat: add docker file` and `ci: add format check`. Use an imperative summary with an appropriate type (`feat`, `fix`, `refactor`, `docs`, `test`, or `ci`) and keep each commit focused.

Pull requests should explain the change and verification, link the issue, and include before/after screenshots for UI work. Keep CI green and call out configuration changes or new environment variables.

## Security & Configuration

Only expose browser-safe values through `VITE_` variables. Never commit `.env`, credentials, access tokens, or sensitive interview data; document new variables in `.env.example`.
