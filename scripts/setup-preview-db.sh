#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE=".env.preview.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run this first:"
  echo "  vercel link"
  echo "  vercel env pull $ENV_FILE --environment=preview"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" && -n "${DATABASE_URL_UNPOOLED:-}" ]]; then
  echo "==> DATABASE_URL not set; using DATABASE_URL_UNPOOLED for setup"
  export DATABASE_URL="$DATABASE_URL_UNPOOLED"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: Neither DATABASE_URL nor DATABASE_URL_UNPOOLED is set for Preview."
  echo "Add DATABASE_URL to Vercel with the Preview environment checked."
  exit 1
fi

echo "==> Creating tables on PREVIEW database (db:push)"
npm run db:push

echo "==> Seeding preview admin user and sample team (db:seed)"
npm run db:seed

echo ""
echo "Done. Preview database is ready."
echo "Next: push a feature branch and open the Vercel preview URL to test."
