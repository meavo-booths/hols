import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedTeamIds, isAdmin } from "@/lib/permissions";
import { ApprovalActions } from "@/components/approval-actions";
import { Card, PageHeader } from "@/components/ui";
import { toDateInputValue } from "@/lib/dates";
import { formatDayLabel } from "@/lib/days-format";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const admin = await isAdmin(userId);
  const managedTeamIds = await getManagedTeamIds(userId);

  if (!admin && managedTeamIds.length === 0) {
    redirect("/");
  }

  const pending = await prisma.vacationRequest.findMany({
    where: {
      status: "PENDING",
      ...(admin
        ? {}
        : {
            user: {
              teamMemberships: { some: { teamId: { in: managedTeamIds } } },
            },
          }),
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          teamMemberships: { include: { team: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Pending approvals"
        description="Review and approve or reject vacation requests from your team."
      />

      {pending.length === 0 ? (
        <Card>
          <p className="text-slate-600">No pending requests right now.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((req) => (
            <Card key={req.id} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {req.user.name ?? req.user.email}
                </h3>
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
          ))}
        </div>
      )}
    </div>
  );
}
