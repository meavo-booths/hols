# Contributing — hols (Vacation Tracker)

## Before you open a PR

- [ ] Changes are scoped to the request — no drive-by refactors
- [ ] `npm run lint` passes
- [ ] No test suite — document a manual check in the PR (sign in, exercise the changed flow at 375px and 1280px)
- [ ] Agent docs updated if you added routes, domain modules, crons, or auth rules
- [ ] Mutations call `revalidatePath()` for every affected route and enqueue outbox events for request lifecycle changes

## Branch naming

`feature/short-description`, `fix/short-description`, `docs/short-description`. Every change goes through a branch + Vercel preview; merge to `main` deploys production.

## Commit messages

Imperative mood, complete sentences: "Add half-day support to request form."

## Code placement

| Layer | Location |
|-------|----------|
| Pages / UI | `src/app/(app)/`, components in `src/components/` |
| Mutations | Server Actions in `src/app/actions/` |
| Business logic | `src/lib/` (allowance, dates, permissions, public-holidays) |
| Integrations | `src/lib/slack.ts`, `src/lib/notifications/enqueue.ts` |

## Cross-repo dependencies

`@meavo/db` and `@meavo/navigation` are pinned to git tags in `package.json`. To bump: update the ref (e.g. `#v0.1.1`), `npm install`, then `npm run db:generate` for `@meavo/db`.

## Schema changes

Only in [meavo-db](https://github.com/meavo-booths/meavo-db) — edit the schema there, tag a release, bump the `@meavo/db` ref here, redeploy. `npm run db:push` is disabled in this repo; never re-enable it (the shared database serves all Meavo apps).

## PR description

Include:

1. **What** changed (user-visible or API behaviour)
2. **Why** (link issue if any)
3. **How to verify** (commands or manual steps, including the preview URL)
4. **Out of scope** (what you intentionally did not change)

## Agent-assisted PRs

If an AI agent wrote the code:

- Verify paths and business rules against `docs/domain.md`
- Reject leftover template placeholder comments in merged files
- Ensure no secrets in diff
