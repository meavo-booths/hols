#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

load_env() {
  for file in .env.local .env.production.local .env; do
    if [[ -f "$file" ]] && grep -q '^DATABASE_URL=' "$file" 2>/dev/null; then
      if [[ $(awk -F= '/^DATABASE_URL=/{gsub(/"/,"",$2); print length($2)}' "$file") -gt 2 ]]; then
        echo "==> Using DATABASE_URL from $file"
        set -a
        # shellcheck disable=SC1090
        source "$file"
        set +a
        return 0
      fi
    fi
  done
  return 1
}

if ! load_env; then
  echo "ERROR: No DATABASE_URL found."
  echo ""
  echo "Hols must use the same database as meavo-gateway."
  echo "Add to .env.local:"
  echo '  DATABASE_URL="postgresql://..."  # copy from Vercel → meavo-gateway → DATABASE_URL'
  echo ""
  echo "Then re-run: npm run db:push"
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is empty."
  exit 1
fi

echo "==> Creating vacation tables on shared database (db:push)"
npm run db:push

echo ""
echo "Done. Check https://hols.meavo.app/api/health — vacationSchemaReady should be true."
