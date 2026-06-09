import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedTeamIds, isAdmin } from "@/lib/permissions";
import { ApprovalActions } from "@/components/approval-actions";
import { RevokeRequestButton } from "@/components/revoke-request-button";
import { Badge, Card, PageHeader } from "@/components/ui";
import { toDateInputValue } from "@/lib/dates";
import { formatDayLabel } from "@/lib/days-format";
import { RequestStatus } from "@prisma/client";

const requestInclude = {
  user: {
    select: {
      name: true,
      email: true,
      teamMemberships: { include: { team: true } },
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
          teamMemberships: { some: { teamId: { in: managedTeamIds } } },
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

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const admin = await isAdmin(userId);
  const managedTeamIds = await getManagedTeamIds(userId);

  if (!admin && managedTeamIds.length === 0) {
    redirect("/");
  }

  const scope = teamScope(admin, managedTeamIds);

  const [pending, history] = await Promise.all([
    prisma.vacationRequest.findMany({
      where: { status: "PENDING", ...scope },
      include: requestInclude,
      orderBy: { createdAt: "asc" },
    }),
    prisma.vacationRequest.findMany({
      where: {
        status: { in: [RequestStatus.APPROVED, RequestStatus.REJECTED] },
        ...scope,
      },
      include: requestInclude,
      orderBy: { reviewedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Approvals"
        description="Review pending requests and manage your team's time-off history."
      />

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Pending</h2>
        {pending.length === 0 ? (
          <Card className="mt-4">
            <p className="text-slate-600">No pending requests right now.</p>
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
                      {req.user.teamMemberships.map((m) => m.team.name).join(", ") || "—"}
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
            <p className="text-slate-600">No reviewed requests yet.</p>
          </Card>
        ) : (
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
                      <Badge tone={badgeTone}>
                        {req.status.toLowerCase()}
                      </Badge>
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
                      {req.user.teamMemberships.map((m) => m.team.name).join(", ") || "—"}
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
        )}
      </section>
    </div>
  );
}
