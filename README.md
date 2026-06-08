# Vacation Tracker

A simple company vacation tracker with teams, manager approvals, per-team and per-person yearly allowances, and a shared calendar. Sign in with email and password.

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
npm run db:push
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
git remote add origin https://github.com/YOUR_USERNAME/vacation-tracker.git
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
