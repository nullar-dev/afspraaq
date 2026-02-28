# Coolify + Supabase Production Setup (Safe Path)

This guide is for your current setup:

- Next.js app on Coolify
- Self-hosted Supabase on Coolify
- Goal: safe deploys, no accidental DB wipe

## Core Principle

`git push main` deploys app code.  
Database changes happen only when migrations are run.

## 1) Website Service Env Vars (Coolify)

Set these in the **website app service** (not Supabase service):

- `NEXT_PUBLIC_SUPABASE_URL=https://supabase.live.nullar.dev`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=${SERVICE_SUPABASEANON_KEY}` (or paste literal anon key)
- `ALLOWED_ORIGINS=https://your-public-frontend-domain`

For these vars:

- `Available at Buildtime`: ON
- `Available at Runtime`: ON

Notes:

- `ALLOWED_ORIGINS` must be your public frontend origin(s), comma-separated if multiple.
- Do not add trailing slash.

## 2) First Bootstrap (DB currently empty)

If SQL editor shows no rows in `public` tables, run migrations once.

From your app repo container/shell:

```bash
bash scripts/run-migrations.sh
```

Then verify:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Expected: at least `profiles` exists.

## 3) Safe Automatic Migrations on Deploy

You have two safe automation options.

### Option A (Recommended): GitHub Actions controls DB + deploy

This repo includes:

- [release-migrate-deploy.yml](/home/nullar-dev/afspraaq/.github/workflows/release-migrate-deploy.yml)

It runs:

1. `migrate-staging`
2. `backup-production` (approval-gated via production environment)
3. `migrate-production`
4. `deploy-coolify` (webhook trigger, optional)

Required setup in GitHub:

1. Create Environment `staging`

- Add secret: `STAGING_DATABASE_URL`

2. Create Environment `production`

- Add secret: `PRODUCTION_DATABASE_URL`
- Add secret: `COOLIFY_DEPLOY_WEBHOOK_URL` (optional, for automatic app deploy trigger)
- Enable required reviewer(s) for manual approval before production jobs

`STAGING_DATABASE_URL` and `PRODUCTION_DATABASE_URL` format:
`postgresql://postgres:<password>@<host>:5432/postgres`

### Option B: Coolify pre-deploy hook runs migrations

In Coolify website service, configure pre-deploy command:

```bash
bash scripts/run-migrations.sh
```

This script is safe to run repeatedly and now:

- Tracks applied files in `public.schema_migrations`
- Skips already applied migrations
- Fails if an old migration file was modified (checksum mismatch)

If migration step fails, deploy should fail.

Important:

- Use **Option A or Option B** as primary control plane.
- Running both is usually safe (idempotent script) but redundant.

## 4) How to Add Schema Changes

1. Add new file in `supabase/migrations/` (e.g. `007_add_x.sql`)
2. Commit + push
3. Deploy runs migration automatically

Do not edit previously applied migration files.

## 5) Backup Before Risky Changes

Before risky migrations, create a DB backup/snapshot from your Postgres/Supabase environment.

## 6) Quick Troubleshooting

### "Authentication is unavailable"

- Check website env vars are set and redeployed.
- Ensure `NEXT_PUBLIC_*` vars are available at build time.

### 403 on POST API routes

- `ALLOWED_ORIGINS` missing or wrong.
- Must match exact frontend origin (protocol + host).

### Migration fails after push

- Check logs for SQL error.
- Fix with a new migration file; do not mutate old applied files.
