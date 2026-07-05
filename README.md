# Vacation Tracker

A simple company vacation tracker with teams, manager approvals, per-team and per-person yearly allowances, and a shared calendar. Sign in with email and password.

**Users and teams are managed on [meavo.app](https://meavo.app)** ([gateway repo](https://github.com/meavo-booths/meavo-gateway)) — hols uses the same database. Grant Vacation Tracker access on the gateway to allow login here.

## Shared database with meavo-gateway

Hol s and gateway share one Neon Postgres database:

- **Gateway** (`meavo.app`) — creates users, teams (name, colour, allowance), and tool access
- **Hols** (`hols.meavo.app`) — vacation requests, approvals, calendar, individual allowance overrides

Set hols `DATABASE_URL` to the **same connection string** as meavo-gateway on Vercel.

**Schema changes are managed exclusively in the [meavo-db repo](https://github.com/meavo-booths/meavo-db).**
This app consumes `@meavo/db` (the canonical schema) and only runs `prisma generate`.
`db:push` is disabled here — pushing from any single app's schema would drop the
other apps' tables in the shared database.

First-time setup after linking databases:

```bash
# From meavo-db (applies the canonical schema)
npm run db:push

# From meavo-gateway (seeds users, teams, tool cards)
npm run db:seed
```

Users need the **Vacation Tracker** tool card on gateway before they can sign in here.

## Features

- **Email & password sign-in** — admins create accounts for employees
- **Teams & managers** — group people into teams; managers approve/reject requests for their team
- **Allowances** — set a default yearly allowance per team, with optional per-person overrides
- **Vacation requests** — employees request time off; weekends are excluded from the day count
- **Central calendar** — month/week view of approved time off, filterable by team
- **Admin panel** — create users, teams, assign members/managers, manage allowances

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite path, e.g. `file:./dev.db` |
| `AUTH_SECRET` | Random secret: `openssl rand -base64 32` |
| `AUTH_URL` | App URL, e.g. `http://localhost:3000` |
| `ADMIN_EMAILS` | Comma-separated emails that get admin access |
| `ADMIN_PASSWORD` | Initial admin password (for seeding only) |

### 3. Initialize the database

```bash
# Apply the schema from the meavo-db repo first (npm run db:push there), then:
npm run db:generate
npm run db:seed
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the email and password from `ADMIN_EMAILS` / `ADMIN_PASSWORD`.

## Typical setup flow

1. **Admin signs in** — use the seeded admin account
2. **Create users** — in Admin, add employee accounts (email + password)
3. **Create teams** — e.g. Engineering (25 days), Sales (20 days)
4. **Add members** — assign users to teams; set some as **Manager**
5. **Optional overrides** — set a custom allowance for specific people
6. **Employees sign in** — with their email and password
7. **Employees request time off** — managers see pending items under **Approvals**
8. **Approved requests** — appear on the shared **Calendar**

## Roles

| Role | How assigned | Can do |
|------|----------------|--------|
| **Admin** | Checkbox when creating user, or email in `ADMIN_EMAILS` | Everything — users, teams, members, allowances |
| **Manager** | Team role in Admin | Approve/reject requests for their team |
| **Member** | Default team role | Request time off, view calendar |

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [NextAuth.js v5](https://authjs.dev/) with credentials provider
- [Prisma](https://www.prisma.io/) + SQLite
- [FullCalendar](https://fullcalendar.io/) for the calendar view
- [Tailwind CSS](https://tailwindcss.com/)

## Deploy to Vercel (custom domain)

The project is configured for PostgreSQL + Vercel out of the box.

### 1. Push to GitHub

```bash
git remote add origin https://github.com/meavo-booths/hols.git
git push -u origin main
```

### 2. Create the Vercel project

1. [vercel.com/new](https://vercel.com/new) → import your GitHub repo
2. **Storage** → add **Neon Postgres** and link it to the project
3. Add environment variables:

| Variable | Value |
|----------|--------|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://vacation.yourdomain.com` |
| `ADMIN_EMAILS` | your admin email |
| `ADMIN_PASSWORD` | temporary password for seeding |

4. Deploy

### 3. Initialize production database

```bash
chmod +x scripts/vercel-setup.sh
./scripts/vercel-setup.sh
```

Or manually:

```bash
vercel link
vercel env pull .env.production.local --environment=production
source .env.production.local
npm run db:push
npm run db:seed
vercel --prod
```

### 4. Add your domain

Vercel → **Settings → Domains** → add `vacation.yourdomain.com`

At your DNS provider, add the record Vercel shows (usually a `CNAME` to `cname.vercel-dns.com`).

### Production notes

- `DATABASE_URL` is auto-set when you link Neon on Vercel
- `AUTH_URL` must exactly match your live domain (HTTPS, no trailing slash)
- Remove `ADMIN_PASSWORD` from Vercel env vars after seeding
- Do not commit `.env` or `.env.production.local`

## Preview staging setup

Use a **separate Neon database** for Vercel Preview deployments so test requests never touch production data.

### Step 1 — Create a staging database in Neon

1. Open [console.neon.tech](https://console.neon.tech) and select your project.
2. Create a new database (e.g. `vacation_staging`) in the same project, or create a separate Neon project if you prefer.
3. Copy the **pooled** connection string (`postgresql://...?sslmode=require`).

Keep production and staging connection strings separate — label them clearly.

### Step 2 — Configure Vercel Preview environment variables

In Vercel → your project → **Settings** → **Environment Variables**, set:

| Variable | Environments | Value |
|----------|--------------|-------|
| `DATABASE_URL` | **Preview only** | Staging Neon connection string from Step 1 |
| `AUTH_SECRET` | Production + Preview | Same value as production (or generate a new one for preview) |
| `AUTH_URL` | **Production only** | `https://hols.meavo.app` |
| `ADMIN_EMAILS` | Production + Preview | Your admin email (or a dedicated staging email) |
| `ADMIN_PASSWORD` | **Preview only** | A known staging password (e.g. `staging-change-me`) |
| `SLACK_WEBHOOK_URL` | **Production only** | Your real Slack webhook |

Important:

- Edit the existing `DATABASE_URL` entry so it applies to **Production only**, not Preview.
- Do **not** set `AUTH_URL` or `SLACK_WEBHOOK_URL` on Preview — previews use Vercel’s dynamic URL and skip Slack when the webhook is unset.

### Step 3 — Link the project locally (if needed)

```bash
vercel link
```

Select your Vercel team and the Vacation Tracker project.

### Step 4 — Initialize the preview database

```bash
vercel env pull .env.preview.local --environment=preview
chmod +x scripts/setup-preview-db.sh
npm run db:setup:preview
```

This runs `db:push` and `db:seed` against the **staging** database only.

### Step 5 — Test with a feature branch

```bash
git checkout -b staging-test
git push -u origin staging-test
```

Vercel builds a preview URL (also shown on the GitHub PR). Sign in with `ADMIN_EMAILS` / your preview `ADMIN_PASSWORD`.

### Step 6 — Day-to-day workflow

1. Create a branch for each change.
2. Push and test on the preview URL.
3. Merge to `main` when ready — that updates production only.

### When the database schema changes

After merging schema changes to `main`, re-run preview DB setup so staging stays in sync:

```bash
vercel env pull .env.preview.local --environment=preview
npm run db:setup:preview
```

### Reset staging data (optional)

Re-run `npm run db:setup:preview` anytime to recreate tables and re-seed the admin user on the staging database. This does not affect production.
