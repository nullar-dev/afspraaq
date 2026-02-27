# Repository Guidelines

## Project Structure & Module Organization

- Application code lives in `src/` using Next.js App Router.
- Routes are under `src/app/` (for example: `src/app/login/page.tsx`, `src/app/register/page.tsx`).
- Shared helpers are in `src/utils/` (Supabase clients are in `src/utils/supabase/`).
- Tests are grouped by type in `src/__tests__/`: `unit/`, `components/`, `api/`, and `e2e/`.
- Database artifacts are in `supabase/` (`config.toml`, `migrations/*.sql`).

## Build, Test, and Development Commands

- `pnpm install`: install dependencies.
- `pnpm build`: create a production build (`next build`).
- `pnpm start`: run the production server on port 3000.
- `pnpm lint` / `pnpm lint:fix`: run ESLint or auto-fix lint issues.
- `pnpm format:check` / `pnpm format`: verify or apply Prettier formatting.
- `pnpm typecheck`: run TypeScript checks without emitting files.
- `pnpm test`: run Vitest suites.
- `pnpm test:coverage`: run tests with coverage (threshold enforced).
- `pnpm test:e2e`: run Playwright end-to-end tests.

## Coding Style & Naming Conventions

- Language: TypeScript (`.ts/.tsx`) with 2-space indentation.
- Prettier rules: single quotes, semicolons, trailing commas (`es5`), `printWidth: 100`.
- Use the `@/` alias for imports from `src/`.
- Components use PascalCase filenames where appropriate; route segments remain lowercase (Next.js convention).
- Keep page-level UI in `src/app/*`; keep business logic in `src/utils`.

## Testing Guidelines

- Frameworks: Vitest + Testing Library (unit/component/API), Playwright (E2E).
- Test files should end with `.test.ts` or `.test.tsx` and live in the matching `src/__tests__/` subfolder.
- Coverage threshold defaults to 80% for lines/branches/functions/statements (`vitest.config.ts`).
- Example targeted run: `npx vitest run src/__tests__/unit/example.test.ts`.

## Commit & Pull Request Guidelines

- Follow Conventional Commit style seen in history: `fix: ...`, `feat: ...`.
- Prefer short-lived branches like `fix/<topic>` or `feat/<topic>`.
- Before committing, ensure hooks pass (`format`, `lint`, `typecheck`, `test` via `.githooks/pre-commit`).
- PRs should include: clear summary, linked issue (if applicable), test evidence, and screenshots for UI changes.
- Keep PRs focused; avoid mixing refactors with unrelated feature work.
