import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedTeamIds, isAdmin } from "@/lib/permissions";
import {
  buildApprovalRequestWhere,
  parseApprovalSearch,
} from "@/lib/approval-filters";
import { ApprovalActions } from "@/components/approval-actions";
import { ApprovalSearch } from "@/components/approval-search";
import { RevokeRequestButton } from "@/components/revoke-request-button";
import { ListPagination } from "@/components/list-pagination";
import { Badge, Card, PageHeader } from "@/components/ui";
import { toDateInputValue } from "@/lib/dates";
import { formatDayLabel } from "@/lib/days-format";
import { RequestStatus } from "@prisma/client";

const PAGE_SIZE = 25;

const requestInclude = {
  user: {
    select: {
      name: true,
      email: true,
      teamMembers: { include: { team: true } },
    },
  },
  reviewedBy: {
    select: { name: true, email: true },
  },
} as const;

function teamScope(admin: boolean, managedTeamIds: string[]) {
  return admin
    ? {}
    : {
        user: {
          teamMembers: { some: { teamId: { in: managedTeamIds } } },
        },
      };
}

function formatReviewedAt(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const admin = await isAdmin(userId);
  const managedTeamIds = await getManagedTeamIds(userId);

  if (!admin && managedTeamIds.length === 0) {
    redirect("/");
  }

  const params = await searchParams;
  const q = parseApprovalSearch(params);
  const scope = teamScope(admin, managedTeamIds);

  const pendingWhere = buildApprovalRequestWhere(scope, "PENDING", q);
  const historyWhere = buildApprovalRequestWhere(
    scope,
    { in: [RequestStatus.APPROVED, RequestStatus.REJECTED] },
    q
  );

  const requestedPage = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const totalHistory = await prisma.vacationRequest.count({ where: historyWhere });
  const totalPages = Math.max(1, Math.ceil(totalHistory / PAGE_SIZE));
  const page = Math.min(
    totalPages,
    Number.isInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1
  );

  const [pending, history] = await Promise.all([
    prisma.vacationRequest.findMany({
      where: pendingWhere,
      include: requestInclude,
      orderBy: { createdAt: "asc" },
    }),
    prisma.vacationRequest.findMany({
      where: historyWhere,
      include: requestInclude,
      orderBy: { reviewedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `/approvals?${qs}` : "/approvals";
  };

  const pendingEmptyMessage = q
    ? "No pending requests match your search."
    : "No pending requests right now.";
  const historyEmptyMessage = q
    ? "No reviewed requests match your search."
    : "No reviewed requests yet.";

  return (
    <div className="space-y-10">
      <PageHeader
        title="Approvals"
        description="Review pending requests and manage your team's time-off history."
      />

      <Suspense fallback={null}>
        <ApprovalSearch initialQuery={q} />
      </Suspense>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Pending</h2>
        {pending.length === 0 ? (
          <Card className="mt-4">
            <p className="text-slate-600">{pendingEmptyMessage}</p>
          </Card>
        ) : (
          <div className="mt-4 space-y-4">
            {pending.map((req) => {
              const userLabel = req.user.name ?? req.user.email;
              return (
                <Card
                  key={req.id}
                  className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">{userLabel}</h3>
                    <p className="text-sm text-slate-600">
                      {toDateInputValue(req.startDate)}
                      {toDateInputValue(req.startDate) !== toDateInputValue(req.endDate) &&
                        ` → ${toDateInputValue(req.endDate)}`}
                      {" · "}
                      {formatDayLabel(req.days)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Team:{" "}
                      {req.user.teamMembers.map((m) => m.team.name).join(", ") || "—"}
                    </p>
                    {req.note && <p className="mt-1 text-sm text-slate-600">{req.note}</p>}
                  </div>
                  <ApprovalActions requestId={req.id} />
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">History</h2>
        <p className="mt-1 text-sm text-slate-500">
          Approved and rejected requests. Cancelling removes them from the calendar and history.
        </p>
        {history.length === 0 ? (
          <Card className="mt-4">
            <p className="text-slate-600">{historyEmptyMessage}</p>
          </Card>
        ) : (
          <>
            <div className="mt-4 space-y-4">
              {history.map((req) => {
                if (req.status !== "APPROVED" && req.status !== "REJECTED") return null;

                const userLabel = req.user.name ?? req.user.email;
                const reviewerLabel = req.reviewedBy
                  ? req.reviewedBy.name ?? req.reviewedBy.email
                  : null;
                const badgeTone = req.status === "APPROVED" ? "success" : "danger";

                return (
                  <Card
                    key={req.id}
                    className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{userLabel}</h3>
                        <Badge tone={badgeTone}>{req.status.toLowerCase()}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {toDateInputValue(req.startDate)}
                        {toDateInputValue(req.startDate) !== toDateInputValue(req.endDate) &&
                          ` → ${toDateInputValue(req.endDate)}`}
                        {" · "}
                        {formatDayLabel(req.days)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Team:{" "}
                        {req.user.teamMembers.map((m) => m.team.name).join(", ") || "—"}
                      </p>
                      {req.note && <p className="mt-1 text-sm text-slate-600">{req.note}</p>}
                      <p className="mt-1 text-xs text-slate-500">
                        Reviewed {formatReviewedAt(req.reviewedAt)}
                        {reviewerLabel ? ` by ${reviewerLabel}` : ""}
                        {req.reviewNote ? ` — ${req.reviewNote}` : ""}
                      </p>
                    </div>
                    <RevokeRequestButton
                      requestId={req.id}
                      userLabel={userLabel}
                      status={req.status}
                    />
                  </Card>
                );
              })}
            </div>
            <ListPagination
              page={page}
              totalPages={totalPages}
              totalCount={totalHistory}
              pageHref={pageHref}
              countLabel="request"
            />
          </>
        )}
      </section>
    </div>
  );
}
