import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRemainingDays } from "@/lib/allowance";
import { AllowanceSummary } from "@/components/allowance-summary";
import { RequestForm } from "@/components/request-form";
import { VacationCalendar } from "@/components/vacation-calendar";
import { PageHeader } from "@/components/ui";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const year = new Date().getFullYear();

  const [balance, teams] = await Promise.all([
    getRemainingDays(userId, year),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team calendar"
        description="See who is off and submit your own vacation requests."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AllowanceSummary year={year} {...balance} />
        </div>
        <div className="lg:col-span-2">
          <RequestForm />
        </div>
      </div>

      <VacationCalendar teams={teams} />
    </div>
  );
}
