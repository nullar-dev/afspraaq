#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required. Install it first: https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ ! -f "supabase/seed.sql" ]]; then
  echo "No supabase/seed.sql found."
  exit 1
fi

echo "Seeding local Supabase database..."
supabase db seed --local
echo "Seed complete."
