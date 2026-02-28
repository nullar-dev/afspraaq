# TODO: Automated Safe Supabase Migrations (Staging -> Production)

This file is a practical checklist for making DB updates automatic **without risking user data**.

## Goal

Make schema updates run reliably on every release, with safety gates:

- Staging first
- Production only after approval
- Backup before production migration
- Stop deploy on migration/test failure

## High-Level Release Flow

1. Push code with new migration SQL files in `supabase/migrations/`.
2. CI runs lint/tests/build.
3. CI migrates **staging** database.
4. CI runs smoke tests on staging.
5. Manual approval required for production job.
6. CI creates production DB backup.
7. CI migrates **production** database.
8. Deploy app.
9. Run post-deploy smoke tests.

## Must-Have Safety Rules

- Never edit old migration files after they are applied in production.
- Only add new migration files with increasing numbers.
- Prefer additive changes (`ADD COLUMN`, new tables, backfill) before destructive cleanup.
- Block deploy if migration step fails.
- Keep production migration behind manual approval.

## Implementation TODO

## 1) GitHub Environments and Secrets

- [ ] Create GitHub environment: `staging`
- [ ] Create GitHub environment: `production` (with required reviewers)
- [ ] Add env secret: `STAGING_DATABASE_URL`
- [ ] Add env secret: `PRODUCTION_DATABASE_URL`
- [ ] Add env secret: `SUPABASE_ACCESS_TOKEN` (if needed by CLI flow)
- [ ] Add env secret: `SUPABASE_PROJECT_REF` (if needed by CLI flow)

## 2) CI Workflow Jobs

- [ ] Add/confirm `migrate-staging` job:
  - Run on push to main (or release branch)
  - Execute migration command against staging DB
  - Fail pipeline on error
- [ ] Add `smoke-staging` job after `migrate-staging`
- [ ] Add `migrate-production` job:
  - Requires manual approval (GitHub environment protection)
  - Runs backup step first
  - Runs migration against production DB
  - Fails hard on any error
- [ ] Add `deploy-production` job that depends on successful `migrate-production`
- [ ] Add `smoke-production` job after deploy

## 3) Backup Strategy

- [ ] Define backup command for production DB (provider-native snapshot or dump)
- [ ] Save backup metadata (timestamp + release SHA) in logs/artifacts
- [ ] Document restore process in runbook

## 4) Migration Commands

Use one consistent method:

- Option A: `supabase db push --db-url "$DATABASE_URL"`
- Option B: `psql "$DATABASE_URL" -f ...` via migration runner script

TODO:

- [ ] Decide final migration command path
- [ ] Keep it identical between staging and production jobs

## 5) Drift Protection

- [ ] Keep check: if `supabase/migrations/*` changed, then `src/types/supabase.generated.ts` must also change
- [ ] Keep CI fail when generated types differ from committed file

## 6) App/DB Compatibility Strategy

- [ ] Use expand/contract rollout for risky schema changes:
  - Release A: add new schema, keep old
  - Release B: app reads/writes new path
  - Release C: remove old schema
- [ ] Avoid destructive changes in same release as app logic switch

## 7) Rollback Plan

- [ ] Document “app rollback only” path (fast path)
- [ ] Document “DB restore from backup” path (break-glass)
- [ ] Add runbook file: `docs/INCIDENT_DB_MIGRATION_ROLLBACK.md`

## 8) Observability

- [ ] Log migration start/end with commit SHA
- [ ] Alert on migration failure
- [ ] Alert on post-deploy smoke test failure

## Nice-to-Have (Later)

- [ ] Auto-run migrations on staging for PR preview DBs (ephemeral)
- [ ] Add migration duration metrics
- [ ] Add “dry-run” validation job on pull requests

## One-Line Policy

No production app deploy happens unless production DB migration and safety checks pass.
