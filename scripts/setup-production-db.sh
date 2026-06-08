#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE=".env.production.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run this first:"
  echo "  vercel env pull $ENV_FILE --environment=production"
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
  echo "ERROR: Neither DATABASE_URL nor DATABASE_URL_UNPOOLED is set."
  echo "Add DATABASE_URL in Vercel (see README) or link Neon to your project."
  exit 1
fi

echo "==> Creating tables (db:push)"
npm run db:push

echo "==> Seeding admin user and sample team (db:seed)"
npm run db:seed

echo ""
echo "Done. Check https://hols.meavo.app/api/health then sign in at /login"
