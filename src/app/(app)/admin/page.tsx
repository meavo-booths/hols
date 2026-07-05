import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRemainingDaysForUsers } from "@/lib/allowance";
import { getManagedTeamIds, isAdmin } from "@/lib/permissions";
import { clearUserAllowance, setUserAllowance } from "@/app/actions/admin";
import { resolveTeamColor } from "@/lib/team-colors";
import { VACATION_TRACKER_CARD_ID } from "@/lib/vacation-tracker";
import { HOLIDAY_COUNTRY_OPTIONS, holidayCountryLabel } from "@/lib/holiday-country-options";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const admin = await isAdmin(userId);
  const managedTeamIds = await getManagedTeamIds(userId);
  const isManager = managedTeamIds.length > 0;

  if (!admin && !isManager) redirect("/");

  const year = new Date().getFullYear();

  const teams = await prisma.team.findMany({
    where: admin ? undefined : { id: { in: managedTeamIds } },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, holidayCountryCode: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const [allowances, users] = admin
    ? await Promise.all([
        prisma.userAllowance.findMany({
          where: { year },
          include: {
            user: { select: { name: true, email: true, holidayCountryCode: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.user.findMany({
          where: {
            cardAccess: { some: { cardId: VACATION_TRACKER_CARD_ID } },
          },
          orderBy: { name: "asc" },
          select: { name: true, email: true, holidayCountryCode: true },
        }),
      ])
    : [[], []];

  const memberUserIds = [
    ...new Set(teams.flatMap((team) => team.members.map((member) => member.user.id))),
  ];
  const allowanceByUserId = await getRemainingDaysForUsers(memberUserIds, year);

  return (
    <div className="space-y-8">
      <PageHeader
        title={admin ? "Admin" : "My team"}
        description={
          admin
            ? "Manage individual allowance overrides. Teams and users are managed on meavo.app."
            : "View your team members and their remaining allowance."
        }
      />

      {admin && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Individual allowance override</h2>
          <p className="mt-1 text-sm text-slate-500">
            Overrides the team default for a specific person and year. Location excludes that
            country&apos;s national public holidays from day counts for new requests.
          </p>
          <form action={setUserAllowance} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              label="User"
              name="email"
              required
              options={users.map((u) => ({
                value: u.email,
                label: u.name ? `${u.name} (${u.email})` : u.email,
              }))}
            />
            <Select
              label="Location"
              name="holidayCountryCode"
              options={[
                { value: "", label: "None" },
                ...HOLIDAY_COUNTRY_OPTIONS.map((option) => ({
                  value: option.code,
                  label: `${option.code} — ${option.label}`,
                })),
              ]}
            />
            <Input label="Year" name="year" type="number" defaultValue={year} />
            <Input label="Days" name="days" type="number" min={0} placeholder="Team default" />
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Save
              </Button>
            </div>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            Leave Days empty to keep the team default allowance. Location is always saved for the
            selected user. Does not change already-approved requests.
          </p>

          {allowances.length > 0 && (
            <ul className="mt-6 divide-y divide-slate-100">
              {allowances.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                  <span>
                    {a.user.name ?? a.user.email} — {a.year}: {a.days} days
                    {a.user.holidayCountryCode && (
                      <span className="text-slate-500">
                        {" "}
                        · {holidayCountryLabel(a.user.holidayCountryCode)}
                      </span>
                    )}
                  </span>
                  <form action={clearUserAllowance.bind(null, a.id)}>
                    <Button type="submit" variant="ghost">
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="space-y-4">
        {teams.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No teams to show.</p>
          </Card>
        ) : (
          teams.map((team) => (
            <Card key={team.id}>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-5 w-5 shrink-0 rounded"
                    style={{ backgroundColor: resolveTeamColor(team.color) }}
                  />
                  <h2 className="text-lg font-semibold text-slate-900">{team.name}</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Default allowance: {team.yearlyAllowance} days/year
                </p>
                {admin && (
                  <p className="mt-1 text-xs text-slate-400">
                    Team name, colour, and allowance are managed on{" "}
                    <a href="https://meavo.app/admin" className="text-brand-600 hover:underline">
                      meavo.app
                    </a>
                    .
                  </p>
                )}
              </div>

              {team.members.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No members yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {team.members.map((member) => {
                    const balance = allowanceByUserId[member.user.id];
                    return (
                      <li key={member.id} className="py-3 text-sm">
                        {member.user.name ?? member.user.email}{" "}
                        <span className="text-slate-400">
                          ({member.role === "MANAGER" ? "Manager" : "Member"})
                        </span>
                        {member.user.holidayCountryCode && (
                          <span className="text-slate-400">
                            {" "}
                            · {holidayCountryLabel(member.user.holidayCountryCode)}
                          </span>
                        )}
                        {balance && (
                          <span className="ml-2 text-emerald-600">
                            · {balance.remaining} day{balance.remaining !== 1 ? "s" : ""} remaining
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
