# Architecture — hols (Vacation Tracker)

Company vacation tracker at **https://hols.meavo.app**: vacation requests, manager approvals, allowances, and a shared calendar. A Meavo satellite app — identity (users, teams, tool access) is owned by the gateway; this app owns only vacation data.

**Further reading:**
- [domain.md](domain.md) — business rules, personas, mutation map
- [data-model.md](data-model.md) — database tables
- [AGENTS.md](../AGENTS.md) — quick orientation for AI agents

## Sibling repos (meavo-booths)

| Repo | Relationship |
|------|----------------|
| [meavo-gateway](https://github.com/meavo-booths/meavo-gateway) | Owns users, teams, tool cards, access; grants Vacation Tracker access; sends notification emails from the shared outbox |
| [meavo-db](https://github.com/meavo-booths/meavo-db) | Canonical Prisma schema (`@meavo/db`) — all schema changes happen there |
| [meavo-navigation](https://github.com/meavo-booths/meavo-navigation) | Shared top nav + tool switcher (`@meavo/navigation`) |

## Stack decisions

- **Shared Neon Postgres via `@meavo/db`** — one database for all Meavo apps; hols consumes the canonical schema (`package.json` points Prisma at `node_modules/@meavo/db/prisma/schema.prisma`) and only runs `prisma generate`. `db:push` is disabled here because pushing one app's stale schema would drop other apps' tables.
- **NextAuth v5, JWT sessions** — Credentials provider (bcryptjs) plus invite-only Google OAuth (button hidden unless `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` set). Login and every request are gated on the `seed-vacation-tracker` tool card.
- **Server Actions** as the primary mutation pattern; REST routes only for the calendar event feed, cron, health, and NextAuth.
- **Vercel** hosting with a daily cron; optional Slack webhook for manager notifications; Nager.Date public API for holiday data.

## Repository layout

```
src/
  app/
    (app)/            # authenticated routes: calendar (page.tsx), requests/, approvals/, admin/, profile/
    login/            # public login page
    actions/          # Server Actions: vacation.ts, admin.ts, auth.ts
    api/
      auth/[...nextauth]/   # NextAuth handlers
      calendar/             # authenticated event feed for FullCalendar
      cron/sync-holidays/   # daily public-holiday sync (CRON_SECRET)
      health/               # public SELECT 1 health check
  components/         # ui.tsx kit, nav.tsx, vacation-calendar.tsx, forms
  lib/                # domain logic: allowance, dates, permissions, public-holidays,
                      # access (tool-card gate), auth, login-throttle, slack, notifications/
  middleware.ts       # edge auth gate for pages (passes /api/* through)
  types/              # next-auth.d.ts session augmentation
prisma/seed.ts        # stub — real seeding happens in meavo-gateway
scripts/              # DB setup helpers (shared/preview/production) + holidays SQL
```

## Data flow

```
Employee submits request
  → createVacationRequest (Server Action)
  → getHolsUser(): session + ToolCardAccess check
  → Serializable $transaction: validateRequestDays (allowance, overlap,
    same-year, weekend/holiday-aware day count) + insert VacationRequest
  → fire-and-forget: Slack webhook + enqueueNotification("hols.vacation.requested")
  → revalidatePath("/", "/requests", "/approvals")

Manager reviews → reviewVacationRequest → canReviewRequest (admin or team manager)
  → status APPROVED/REJECTED → enqueue "hols.vacation.approved|rejected"

Calendar → FullCalendar fetches GET /api/calendar (approved requests, team colors,
  cached public holidays)

Vercel cron 04:15 UTC → GET /api/cron/sync-holidays (Bearer CRON_SECRET)
  → Nager.Date API → upsert PublicHoliday cache

Email → never sent from hols; gateway drains NotificationOutbox.
```

## API surface

- **Server Actions** (`src/app/actions/`): `createVacationRequest`, `updateVacationRequest`, `cancelVacationRequest`, `reviewVacationRequest`, `managerRevokeVacationRequest`, `setUserAllowance`, `clearUserAllowance`, `loginAction`, `signOutAction`. Return `{ error?: string }` / `{ success: true }`.
- **REST routes**:
  - `GET /api/calendar` — approved requests + public holidays as FullCalendar events (requires `requireHolsUser()`)
  - `GET /api/cron/sync-holidays` — cron only (`CRON_SECRET`)
  - `GET /api/health` — public health check
  - `/api/auth/[...nextauth]` — NextAuth handlers

## Scheduled jobs

| Path | Schedule (`vercel.json`) | Purpose |
|------|--------------------------|---------|
| `/api/cron/sync-holidays` | `15 4 * * *` (daily 04:15 UTC) | Refresh `PublicHoliday` cache from Nager.Date for countries in use |

## Environment variables

Document names only (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Shared Neon Postgres — same connection string as meavo-gateway |
| `AUTH_SECRET` | NextAuth JWT secret |
| `AUTH_URL` | Canonical app URL (`https://hols.meavo.app` in production) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional Google OAuth (button hidden if unset) |
| `ADMIN_EMAILS` | Comma-separated emails granted admin on sign-in |
| `ADMIN_PASSWORD` | Initial admin password — used only by gateway seeding; remove after |
| `MEAVO_APP_KEY` | `hols` — identifies this app to `@meavo/navigation` |
| `GATEWAY_URL` | `https://meavo.app` — tool switcher target |
| `CRON_SECRET` | Bearer token for `/api/cron/*` |
| `SLACK_WEBHOOK_URL` | Optional Slack notifications — production only |

## Deployment

Vercel project connected to this GitHub repo (`meavo-booths/hols`); `main` deploys to production at `hols.meavo.app`. Preview deployments use a separate staging Neon database (`DATABASE_URL` scoped to Preview) — see README "Preview staging setup". Build runs `prisma generate && next build`.
