import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelVacationRequest } from "@/app/actions/vacation";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { toDateInputValue } from "@/lib/dates";
import { formatDayLabel } from "@/lib/days-format";

const statusTone = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
} as const;

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const requests = await prisma.vacationRequest.findMany({
    where: { userId: session.user.id },
    include: { reviewedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="My requests"
        description="Track the status of your submitted time-off requests."
      />

      {requests.length === 0 ? (
        <Card>
          <p className="text-slate-600">You have not submitted any requests yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {toDateInputValue(req.startDate)}
                    {toDateInputValue(req.startDate) !== toDateInputValue(req.endDate) &&
                      ` → ${toDateInputValue(req.endDate)}`}
                  </h3>
                  <Badge tone={statusTone[req.status]}>{req.status.toLowerCase()}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {formatDayLabel(req.days)}
                  {req.note ? ` · ${req.note}` : ""}
                </p>
                {req.reviewedBy && (
                  <p className="mt-1 text-xs text-slate-500">
                    Reviewed by {req.reviewedBy.name ?? req.reviewedBy.email}
                    {req.reviewNote ? ` — ${req.reviewNote}` : ""}
                  </p>
                )}
              </div>
              {req.status === "PENDING" && (
                <form action={cancelVacationRequest.bind(null, req.id)}>
                  <Button type="submit" variant="secondary">
                    Cancel
                  </Button>
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
