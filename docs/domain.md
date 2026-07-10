# Domain reference — hols (Vacation Tracker)

Business rules and **where to change what**. For stack see [architecture.md](architecture.md). For tables see [data-model.md](data-model.md).

## Glossary

| Term | Meaning |
|------|---------|
| Allowance | Yearly vacation days for a user: per-user override (`UserAllowance`) → team default (`Team.yearlyAllowance`) → fallback 25 |
| Working day | Weekday that is not a cached public holiday for the user's `holidayCountryCode` |
| Half day | Single working-day request counted as 0.5 days (`days` is a `Float`) |
| Tool card | Gateway access grant (`ToolCardAccess` for `seed-vacation-tracker`) required to sign in and stay signed in |
| Outbox | Shared `NotificationOutbox` table — hols enqueues events, gateway sends the emails |

## Status / state values

`VacationRequest.status` (`RequestStatus` enum in `@meavo/db`):

| From | To | Trigger |
|------|----|---------|
| — | `PENDING` | `createVacationRequest` |
| `PENDING` | `PENDING` (edited) | `updateVacationRequest` — requester only, re-validated |
| `PENDING` | `APPROVED` / `REJECTED` | `reviewVacationRequest` — admin or team manager |
| `PENDING` | `CANCELLED` | `cancelVacationRequest` — requester only |
| `APPROVED` / `REJECTED` | `CANCELLED` | `managerRevokeVacationRequest` — admin or team manager |

Key invariants (enforced in `src/lib/allowance.ts` inside a Serializable transaction):

- A request cannot span two calendar years.
- `days` = working days excluding weekends and the user's public holidays; half days must be a single working day.
- Pending requests reserve allowance; approved + pending days can never exceed the year's allowance.
- Dates cannot overlap another `PENDING`/`APPROVED` request by the same user.

## Roles / personas

Resolved in `src/lib/permissions.ts`; roles are assigned on the gateway (system role) or in this app's Admin page (team role).

| Role | Scope | Permissions |
|------|-------|-------------|
| Admin (`User.systemRole = ADMIN`) | Everywhere | Everything: review any request (including their own), allowance overrides, holiday country; bypasses tool-card check |
| Manager (`TeamMember.role = MANAGER`) | Their team(s) | Approve/reject/revoke requests from team members (not their own); sees Approvals nav item |
| Member (`TeamMember.role = MEMBER`) | Self | Create/edit/cancel own requests, view shared calendar |

## Mutation map

| Change | Domain module | Action / API | Notes |
|--------|---------------|--------------|-------|
| Submit vacation request | `src/lib/allowance.ts` (`validateRequestDays`) | `createVacationRequest` in `src/app/actions/vacation.ts` | Serializable txn; Slack + outbox after commit |
| Edit pending request | `src/lib/allowance.ts` | `updateVacationRequest` | Requester only; excludes itself from overlap/allowance checks |
| Cancel own pending request | — | `cancelVacationRequest` | Requester only |
| Approve / reject | `src/lib/permissions.ts` (`canReviewRequest`) | `reviewVacationRequest` | Enqueues `hols.vacation.approved|rejected` |
| Revoke reviewed request | `src/lib/permissions.ts` | `managerRevokeVacationRequest` | APPROVED/REJECTED → CANCELLED |
| Allowance override / holiday country | — | `setUserAllowance`, `clearUserAllowance` in `src/app/actions/admin.ts` | Admin only |
| Day-count rules | `src/lib/dates.ts` | — | Weekend + holiday exclusion, half-day rules |
| Public holiday cache | `src/lib/public-holidays.ts` | `GET /api/cron/sync-holidays` | Nager.Date; GB filtered to England (`GB-ENG`) |
| Login / throttling | `src/lib/login-throttle.ts` | `loginAction` in `src/app/actions/auth.ts` | 10 failures / 15 min per email |

## Authorization

- Resolved in: `src/lib/access.ts` (session + tool-card gate) and `src/lib/permissions.ts` (role checks).
- Every Server Action and API route starts with `getHolsUser()` / `requireHolsUser()` — a session alone is **not** enough; tool-card revocation on the gateway must take effect immediately.
- Managers cannot review their own requests (`canReviewRequest` returns false for self); admins can.
- Users and teams are created on the gateway — this app's Admin page only manages allowance overrides and holiday country.
