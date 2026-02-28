#!/usr/bin/env bash
# Safe migration runner for Coolify/Supabase.
# - Applies each migration file once
# - Stores migration history in public.schema_migrations
# - Supports DATABASE_URL or discrete DB env vars

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="${ROOT_DIR}/supabase/migrations"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required but not installed."
  exit 1
fi

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "Migrations directory not found: ${MIGRATIONS_DIR}"
  exit 1
fi

psql_cmd() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "${DATABASE_URL}" "$@"
    return
  fi

  local db_host="${POSTGRES_HOSTNAME:-supabase-db}"
  local db_port="${POSTGRES_PORT:-5432}"
  local db_name="${POSTGRES_DB:-postgres}"
  local db_user="${POSTGRES_USER:-postgres}"
  local db_password="${SERVICE_PASSWORD_POSTGRES:-${POSTGRES_PASSWORD:-}}"

  if [[ -z "${db_password}" ]]; then
    echo "Missing DB password. Set DATABASE_URL or SERVICE_PASSWORD_POSTGRES/POSTGRES_PASSWORD."
    exit 1
  fi

  PGPASSWORD="${db_password}" psql \
    -h "${db_host}" \
    -p "${db_port}" \
    -U "${db_user}" \
    -d "${db_name}" \
    "$@"
}

sql_escape_literal() {
  # Escape single quotes for SQL string literals.
  printf "%s" "$1" | sed "s/'/''/g"
}

echo "Ensuring migration history table exists..."
psql_cmd -v ON_ERROR_STOP=1 <<'SQL'
create table if not exists public.schema_migrations (
  version text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
);
SQL

shopt -s nullglob
migration_files=("${MIGRATIONS_DIR}"/*.sql)
if [[ ${#migration_files[@]} -eq 0 ]]; then
  echo "No migration files found under ${MIGRATIONS_DIR}"
  exit 0
fi

mapfile -t sorted_files < <(printf "%s\n" "${migration_files[@]}" | sort)

echo "Running migrations from ${MIGRATIONS_DIR}..."
for migration in "${sorted_files[@]}"; do
  version="$(basename "${migration}")"
  version_sql="$(sql_escape_literal "${version}")"
  checksum="$(sha256sum "${migration}" | awk '{print $1}')"
  checksum_sql="$(sql_escape_literal "${checksum}")"

  # Optional escape hatch:
  # If a migration contains "-- no-transaction", run it without BEGIN/COMMIT.
  no_transaction=0
  if grep -Eqi '^[[:space:]]*--[[:space:]]*no-transaction[[:space:]]*$' "${migration}"; then
    no_transaction=1
  fi

  already_applied="$(
    psql_cmd -At -v ON_ERROR_STOP=1 \
      -c "select 1 from public.schema_migrations where version = '${version_sql}' limit 1;"
  )"

  if [[ "${already_applied}" == "1" ]]; then
    existing_checksum="$(
      psql_cmd -At -v ON_ERROR_STOP=1 \
        -c "select checksum from public.schema_migrations where version = '${version_sql}' limit 1;"
    )"
    if [[ "${existing_checksum}" != "${checksum}" ]]; then
      echo "Checksum mismatch for already-applied migration ${version}."
      echo "Do not edit historical migrations. Add a new migration file instead."
      exit 1
    fi
    echo "Skipping ${version} (already applied)."
    continue
  fi

  echo "Applying ${version}..."
  if [[ "${no_transaction}" -eq 1 ]]; then
    psql_cmd -v ON_ERROR_STOP=1 <<SQL
\i '${migration}'
insert into public.schema_migrations(version, checksum)
values ('${version_sql}', '${checksum_sql}');
SQL
  else
    psql_cmd -v ON_ERROR_STOP=1 <<SQL
begin;
\i '${migration}'
insert into public.schema_migrations(version, checksum)
values ('${version_sql}', '${checksum_sql}');
commit;
SQL
  fi
done

echo "Migration run completed successfully."
