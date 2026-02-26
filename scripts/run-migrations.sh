#!/bin/bash
# Supabase Migration Script for Coolify
# Run this before deployment

set -e

# Get environment variables from Coolify
SUPABASE_URL="${SERVICE_URL_SUPABASEKONG}"
DB_PASSWORD="${SERVICE_PASSWORD_POSTGRES}"
DB_HOST="${POSTGRES_HOSTNAME:-supabase-db}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-postgres}"
DB_USER="postgres"

echo "Running Supabase migrations..."

# Run migrations using psql
export PGPASSWORD="$DB_PASSWORD"
for migration in supabase/migrations/*.sql; do
  echo "Applying: $migration"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration" --quiet
done

echo "Migrations completed successfully!"
