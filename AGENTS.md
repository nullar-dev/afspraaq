# Repository Guidelines

## Project Structure & Module Organization

- App code lives in `src/` using Next.js App Router (`src/app/*`).
- Booking and auth UI is in `src/components/` and `src/components/pages/`; admin UI is in `src/components/admin/`.
- State management is in `src/context/` (`AuthContext`, `BookingContext`).
- API handlers are in `src/app/api/**/route.ts`.
- Tests are split by type under `src/__tests__/unit`, `src/__tests__/components`, `src/__tests__/api`, and `src/__tests__/e2e`.
- Database artifacts are in `supabase/migrations/*.sql`; operational migration runner is `scripts/run-migrations.sh`.
- CI/CD workflows are in `.github/workflows/` (`ci-cd.yml`, `release-migrate-deploy.yml`).

## Build, Test, and Development Commands

- `pnpm build`: production Next.js build.
- `pnpm lint` / `pnpm format:check` / `pnpm typecheck`: static quality gates.
- `pnpm test`: full Vitest suite.
- `pnpm run test:coverage`: coverage run (CI threshold is 80%+).
- `pnpm playwright test src/__tests__/e2e`: E2E checks.
- Stack baseline: **Node 24.x**, **pnpm 10.x**.

## Coding Style & Naming Conventions

- TypeScript-first, functional React components, explicit types on non-trivial boundaries.
- Use ESLint + Prettier defaults from repo config; do not bypass lint/type failures.
- Naming: `*.test.ts(x)` for tests, `route.ts` for API endpoints, numbered SQL migrations (`009_feature_name.sql`).
- Prefer small focused modules in `src/lib/*` for reusable logic.

## Testing Guidelines

- Keep tests close to behavior risks: auth flows, booking transitions, API security checks, migration integrity.
- Add or update tests whenever behavior changes.
- Before push, run at minimum: `pnpm lint && pnpm typecheck && pnpm test && pnpm run test:coverage`.
- Run E2E for routing/auth/UI-critical changes.

## E2E Environment Policy (Security-First)

- Use a split model for maximum bug discovery with low operational risk:
- **Staging/Pre-Prod (private):** run full mutating E2E, including auth/session/logout, role checks, and ephemeral test user setup/teardown.
- **Production:** run non-mutating smoke checks only (availability, safe redirects, basic auth page rendering, critical headers).
- Never run destructive or role-mutating E2E flows directly against production.
- For admin E2E, prefer ephemeral admin users created per run and removed in teardown; do not rely on long-lived static admin credentials.
- For new features, apply the same split by default unless explicitly overridden in writing.

## Supabase & Migration Discipline (Security-First)

- Never edit applied migration files; always append a new numbered migration.
- Schema/data model changes **must** include SQL migration updates in `supabase/migrations/`.
- Keep `scripts/run-migrations.sh` aligned with workflow and safety checks.
- If migrations change, update `src/types/supabase.generated.ts` when required by CI drift checks.
- Treat auth, roles, RLS, and profile integrity changes as high-risk and review defensively.

## Branch, Commit, Push, and PR Workflow

- Always create a new branch; never push directly to `main`.
- Use clear commit prefixes seen in history: `fix:`, `feat:`, `test:`, `fix(ci):`.
- Ensure pre-commit hook (`.githooks/pre-commit`) and full test suite pass before pushing.
- Open a PR for every mainline change; include summary, risk/rollback notes, and test evidence.
- If user request does not explicitly mention PR creation, ask before opening one.

## Security & Configuration Notes

- Required env vars for app auth/runtime include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ALLOWED_ORIGINS`.
- Production migrations are executed through `Release Migrate and Deploy`; keep DB secrets environment-scoped.
- Fail closed on missing security config; do not weaken auth/error messaging to expose internals.
