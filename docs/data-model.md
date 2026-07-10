# Data model — hols (Vacation Tracker)

Canonical schema lives in [meavo-db](https://github.com/meavo-booths/meavo-db) (`prisma/schema.prisma`), consumed here as `@meavo/db`.

Local reference: `node_modules/@meavo/db/prisma/schema.prisma`

**Do not edit schema in this repo** — this repo is *not* the schema owner. Change meavo-db, tag a release, bump the `@meavo/db` git ref in `package.json`, then `npm install && npm run db:generate`. `npm run db:push` is intentionally disabled here. Targeted data fixes go through idempotent `scripts/*.sql` (see `scripts/add-public-holidays.sql`).

Pinned version: `@meavo/db` `#v0.1.0` in `package.json`.

## Entity relationship

```
User (gateway-owned) ──< TeamMember >── Team (gateway-owned)
  │                        role: MANAGER|MEMBER   yearlyAllowance
  ├──< ToolCardAccess >── ToolCard (seed-vacation-tracker)
  ├──< UserAllowance          (hols: per-user yearly override)
  ├──< VacationRequest        (hols: as requester)
  └──< VacationRequest        (hols: as reviewer)

PublicHoliday   (hols: holiday cache, keyed countryCode+date)
LoginThrottle   (shared: login rate limiting)
NotificationOutbox / NotificationEventSetting (shared: hols enqueues, gateway sends)
```

## Core tables / models

Hols owns the `// ---- Hols ----` section of the schema; everything else is read-only from this app.

### `VacationRequest`

A time-off request and its review outcome.

| Field | Notes |
|-------|-------|
| `userId` | Requester (FK to shared `User`, cascade delete) |
| `startDate` / `endDate` | Inclusive range; must be within one calendar year |
| `days` | `Float` — working days consumed (0.5 for half days); computed at write time, never recomputed on read |
| `status` | `RequestStatus`: `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED` |
| `reviewedById` / `reviewedAt` / `reviewNote` | Set by `reviewVacationRequest`; reviewer FK is `SetNull` on delete |

### `UserAllowance`

Per-user yearly allowance override (admin-set); unique on `(userId, year)`. Absent → team default → 25.

### `PublicHoliday`

Cached public holidays from Nager.Date, unique on `(countryCode, date)`; refreshed by the daily cron. GB entries are filtered to England (`GB-ENG`).

### Shared models hols reads (never writes structure)

- `User` — identity, `passwordHash`, `systemRole`, `holidayCountryCode` (hols updates only `holidayCountryCode` and Google profile fields)
- `Team` / `TeamMember` — team membership, `MANAGER`/`MEMBER` role, `yearlyAllowance`
- `ToolCard` / `ToolCardAccess` — access gating on card `seed-vacation-tracker`
- `LoginThrottle` — shared login rate limiting (keys prefixed `hols-login:`)
- `NotificationOutbox` / `NotificationEventSetting` — event enqueueing

## Sync / external copies

- `NotificationOutbox` — hols enqueues `hols.vacation.{requested|approved|rejected}` (with idempotency keys); gateway sends the emails.
- Slack — direct webhook on new requests (`src/lib/slack.ts`), fire-and-forget, not persisted.
- `PublicHoliday` — cache of the Nager.Date API; safe to re-sync anytime.

## Queries agents should reuse

- Allowance / used / remaining days: `getYearlyAllowance`, `getRemainingDays`, `getRemainingDaysForUsers` (batched, for admin/team pages) in `src/lib/allowance.ts`.
- Request validation: `validateRequestDays` — always inside the same transaction as the write.
- Holiday lookups: `getPublicHolidayDateSet`, `getCachedPublicHolidaysInRange` in `src/lib/public-holidays.ts`.
- Role checks: `isAdmin`, `isTeamManager`, `getManagedTeamIds`, `canReviewRequest` in `src/lib/permissions.ts`.
- No raw SQL in app code — one-off fixes via `scripts/*.sql` + `prisma db execute`.
