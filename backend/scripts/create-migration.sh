#!/usr/bin/env bash
set -euo pipefail

backend_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$backend_root"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

migration_name="${1:-schema_update}"
timestamp="$(date +%Y%m%d%H%M%S)"
migrations_dir="$backend_root/prisma/migrations"
schema_path="$backend_root/prisma/schema.postgres.prisma"

if [[ -z "${SHADOW_DATABASE_URL:-}" && -z "${DIRECT_URL:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo "Set SHADOW_DATABASE_URL, DATABASE_URL, or DIRECT_URL in backend/.env to generate migrations safely." >&2
  exit 1
fi

declare -a candidate_urls=()
if [[ -n "${SHADOW_DATABASE_URL:-}" ]]; then
  candidate_urls+=("$SHADOW_DATABASE_URL")
fi
if [[ -n "${DIRECT_URL:-}" ]]; then
  candidate_urls+=("$DIRECT_URL")
fi
if [[ -n "${DATABASE_URL:-}" ]]; then
  candidate_urls+=("$DATABASE_URL")
fi

diff_output=""
selected_url=""
last_error=""

for candidate_url in "${candidate_urls[@]}"; do
  if diff_output="$(npx prisma migrate diff \
    --from-migrations "$migrations_dir" \
    --to-schema-datamodel "$schema_path" \
    --shadow-database-url "$candidate_url" \
    --script 2> >(cat >&2))"; then
    selected_url="$candidate_url"
    break
  fi
  last_error="Failed with configured shadow URL candidate."
done

if [[ -z "$selected_url" ]]; then
  echo "Unable to generate migration: all configured database URLs were unreachable or invalid." >&2
  echo "Checked SHADOW_DATABASE_URL, DIRECT_URL, then DATABASE_URL." >&2
  if [[ -n "$last_error" ]]; then
    echo "$last_error" >&2
  fi
  exit 1
fi

migration_dir="$migrations_dir/${timestamp}_${migration_name}"
mkdir -p "$migration_dir"
printf '%s\n' "$diff_output" > "$migration_dir/migration.sql"

echo "$migration_dir"