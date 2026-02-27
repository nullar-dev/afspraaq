# Supabase Local Development

## Prerequisites

- Supabase CLI installed and authenticated.
- Docker running locally.

## Start local stack

```bash
supabase start
```

## Apply migrations

```bash
supabase db reset --local
```

This applies all SQL files in `supabase/migrations/` in order.

## Seed local database

```bash
pnpm run dev:db:seed
```

Seed SQL is in `supabase/seed.sql`.

## One-command reset (migrations + seed)

```bash
pnpm run dev:db:reset
```

## Keep local auth behavior close to production

- Keep rate-limit values aligned with `supabase/config.toml`.
- Use the same auth providers enabled in production (currently email/password only).
- Keep `ALLOWED_ORIGINS` configured for local app origin when testing mutating API routes.
