#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing dependencies"
npm install

if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
  echo "    Edit .env with your values before continuing."
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "==> Installing Vercel CLI"
  npm i -g vercel
fi

echo "==> Linking Vercel project (follow prompts)"
vercel link

echo "==> Pulling production environment variables"
vercel env pull .env.production.local --environment=production

echo "==> Pushing database schema to production"
set -a
source .env.production.local
set +a
npm run db:push
npm run db:seed

echo "==> Deploying to production"
vercel --prod

echo ""
echo "Done. Add your custom domain in the Vercel dashboard:"
echo "  Project -> Settings -> Domains"
echo "Set AUTH_URL to https://your-domain.com in Vercel env vars, then redeploy."
