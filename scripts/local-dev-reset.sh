#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required. Install it first: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "Resetting local Supabase database..."
supabase db reset --local

if [[ -f "supabase/seed.sql" ]]; then
  echo "Applying local seed data..."
  supabase db seed --local
fi

echo "Local Supabase reset complete."
