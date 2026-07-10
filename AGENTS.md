# Agent guide — hols (Vacation Tracker)

Quick orientation for AI agents working in this repo. Read this before exploring blindly.

**Cursor:** `.cursor/rules/core.mdc` and `.cursor/rules/security.mdc` are always applied. `ui.mdc`, `domain.mdc`, and `api.mdc` apply to matching paths.

## What this repo does

Company vacation tracker at **hols.meavo.app**: employees request time off, team managers approve/reject, everyone sees approved leave on a shared calendar. Users, teams, and app access are managed on [meavo.app](https://meavo.app) (gateway) — this app reads those shared tables and owns only vacation data.

## Stack

- Next.js 15 App Router, TypeScript strict, React 19
- Prisma 6 via `@meavo/db` (canonical schema) → shared Neon Postgres (same `DATABASE_URL` as gateway)
- NextAuth v5, JWT sessions — Credentials provider + invite-only Google OAuth
- Tailwind CSS 3, in-house UI kit (`src/components/ui.tsx`), `@meavo/navigation` top nav
- FullCalendar for the calendar view; date-fns for day math
- Vercel hosting + cron; Slack incoming webhook (optional); Nager.Date API for public holidays

## First files to read

| Task | Start here |
|------|------------|
| Request / approval flows | `src/app/actions/vacation.ts` |
| Allowance & day-count rules | `src/lib/allowance.ts`, `src/lib/dates.ts` |
| Calendar page + events feed | `src/app/(app)/page.tsx`, `src/app/api/calendar/route.ts`, `src/components/vacation-calendar.tsx` |
| Approvals page | `src/app/(app)/approvals/page.tsx`, `src/lib/approval-filters.ts` |
| Admin (allowance overrides, holiday country) | `src/app/(app)/admin/page.tsx`, `src/app/actions/admin.ts` |
| Roles / who can approve | `src/lib/permissions.ts` |
| Public holidays (sync + cache) | `src/lib/public-holidays.ts`, `src/app/api/cron/sync-holidays/route.ts` |
| Notifications (Slack + outbox) | `src/lib/slack.ts`, `src/lib/notifications/enqueue.ts` |
| UI kit & nav | `src/components/ui.tsx`, `src/components/nav.tsx` |
| Auth & access | `src/lib/access.ts`, `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/middleware.ts` |
| DB schema | `@meavo/db` package (canonical schema owned by the meavo-db repo) |
| Tests | N/A — no test suite; verify manually (see CONTRIBUTING.md) |

## Do NOT

- Edit the Prisma schema here — it lives in [meavo-db](https://github.com/meavo-booths/meavo-db); `npm run db:push` is intentionally disabled
- Create or edit users, teams, or tool access in this app — that is gateway's job; hols only reads them
- Skip `getHolsUser()` / `requireHolsUser()` in a Server Action or API route — sessions alone are not enough (tool-card revocation must bite immediately)
- Import `@/lib/auth` (Prisma-backed) in `src/middleware.ts` — edge runtime; use `@/lib/auth.config` only
- Add shadcn/Radix/MUI or replace `@meavo/navigation` with a custom header
- Send email from this app — enqueue to `NotificationOutbox`; only gateway sends
- Let a side effect (Slack, outbox) block or fail a mutation — fire-and-forget with `.catch`
- Commit secrets, `.env`, or `.env*.local`

## Commands

```bash
npm install        # runs prisma generate via postinstall
npm run dev
npm run lint
npm run build      # prisma generate && next build
# tests: N/A — no test suite
```

## Conventions

1. Mutations are Server Actions in `src/app/actions/` returning `{ error?: string }`; call `revalidatePath()` for every affected route after writes.
2. Business logic lives in `src/lib/` (flat — no separate domain subfolder) — keep actions and routes thin.
3. Allowance/overlap validation and the write happen inside one `prisma.$transaction(..., { isolationLevel: "Serializable" })`.
4. After request writes: `notifySlackNewVacationRequest()` (new requests) and `enqueueNotification()` with event types `hols.vacation.{requested|approved|rejected}` — both fire-and-forget.
5. Day counting always excludes weekends and, when the user has `holidayCountryCode` set, cached public holidays.

## Scoped task template (preferred from user)

```
Area/route: <!-- e.g. /approvals or src/lib/allowance.ts -->
Behaviour: [what should happen]
Reference: [existing page/action to mirror, if any]
Out of scope: [auth / gateway-owned data / schema changes]
```

## Related docs

- [docs/architecture.md](docs/architecture.md) — stack, siblings, data flow
- [docs/domain.md](docs/domain.md) — business rules, personas, mutation map
- [docs/data-model.md](docs/data-model.md) — database tables
- [CONTRIBUTING.md](CONTRIBUTING.md) — PR process
