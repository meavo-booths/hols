import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRemainingDays } from "@/lib/allowance";
import { isAdmin } from "@/lib/permissions";
import {
  addTeamMember,
  clearUserAllowance,
  createTeam,
  createUser,
  removeTeamMember,
  resetUserPassword,
  setUserAllowance,
  updateTeam,
  updateTeamAllowance,
} from "@/app/actions/admin";
import { DeleteUserButton } from "@/components/delete-user-button";
import { TeamColorPicker } from "@/components/team-color-picker";
import { resolveTeamColor } from "@/lib/team-colors";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isAdmin(session.user.id))) redirect("/");

  const year = new Date().getFullYear();
  const [teams, allowances, users] = await Promise.all([
    prisma.team.findMany({
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.userAllowance.findMany({
      where: { year },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const memberUserIds = [
    ...new Set(teams.flatMap((team) => team.members.map((member) => member.user.id))),
  ];
  const allowanceByUserId = Object.fromEntries(
    await Promise.all(
      memberUserIds.map(async (userId) => [userId, await getRemainingDays(userId, year)] as const)
    )
  );

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin"
        description="Manage teams, members, managers, and individual yearly allowances."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Create user</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add employee accounts with email and password.
          </p>
          <form action={createUser} className="mt-4 space-y-4">
            <Input label="Email" name="email" type="email" required />
            <Input label="Name" name="name" placeholder="Jane Smith" />
            <Input
              label="Password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
            />
            <Select
              label="Team"
              name="teamId"
              defaultValue=""
              options={[{ value: "", label: "— No team —" }, ...teamOptions]}
            />
            <Select
              label="Team role"
              name="role"
              defaultValue="MEMBER"
              options={[
                { value: "MEMBER", label: "Member" },
                { value: "MANAGER", label: "Manager" },
              ]}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="makeAdmin" className="rounded border-slate-300" />
              Grant admin access
            </label>
            <Button type="submit">Create user</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Create team</h2>
          <form action={createTeam} className="mt-4 space-y-4">
            <Input label="Team name" name="name" required placeholder="Engineering" />
            <Input
              label="Yearly allowance (days)"
              name="yearlyAllowance"
              type="number"
              defaultValue={25}
              min={0}
              required
            />
            <TeamColorPicker />
            <Button type="submit">Create team</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Add team member</h2>
          <p className="mt-1 text-sm text-slate-500">
            Assign an existing user to a team.
          </p>
          <form action={addTeamMember} className="mt-4 space-y-4">
            <Input label="Email" name="email" type="email" required />
            <Select
              label="Team"
              name="teamId"
              required
              options={teamOptions}
            />
            <Select
              label="Role"
              name="role"
              defaultValue="MEMBER"
              options={[
                { value: "MEMBER", label: "Member" },
                { value: "MANAGER", label: "Manager" },
              ]}
            />
            <Button type="submit">Add member</Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Users</h2>
        {users.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No users yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {users.map((user) => {
              const label = user.name ? `${user.name} (${user.email})` : user.email;
              return (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-3"
                >
                  <span className="text-sm">{label}</span>
                  <div className="flex flex-wrap items-end gap-2">
                    <form action={resetUserPassword} className="flex items-end gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <Input
                        label="New password"
                        name="password"
                        type="password"
                        required
                        autoComplete="new-password"
                      />
                      <Button type="submit" variant="secondary">
                        Reset
                      </Button>
                    </form>
                    {user.id !== session.user.id && (
                      <DeleteUserButton userId={user.id} userLabel={label} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Individual allowance override</h2>
        <p className="mt-1 text-sm text-slate-500">
          Overrides the team default for a specific person and year.
        </p>
        <form action={setUserAllowance} className="mt-4 grid gap-4 sm:grid-cols-4">
          <Select
            label="User"
            name="email"
            required
            options={users.map((u) => ({
              value: u.email,
              label: u.name ? `${u.name} (${u.email})` : u.email,
            }))}
          />
          <Input label="Year" name="year" type="number" defaultValue={year} required />
          <Input label="Days" name="days" type="number" min={0} required />
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Save override
            </Button>
          </div>
        </form>

        {allowances.length > 0 && (
          <ul className="mt-6 divide-y divide-slate-100">
            {allowances.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                <span>
                  {a.user.name ?? a.user.email} — {a.year}: {a.days} days
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

      <div className="space-y-4">
        {teams.map((team) => (
          <Card key={team.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-5 w-5 shrink-0 rounded"
                    style={{ backgroundColor: resolveTeamColor(team.color) }}
                  />
                  <h2 className="text-lg font-semibold text-slate-900">{team.name}</h2>
                </div>
                <p className="text-sm text-slate-500">
                  Default allowance: {team.yearlyAllowance} days/year
                </p>
              </div>
              <form
                action={async (formData) => {
                  "use server";
                  await updateTeamAllowance(team.id, Number(formData.get("yearlyAllowance")));
                }}
                className="flex items-end gap-2"
              >
                <Input
                  label="Update allowance"
                  name="yearlyAllowance"
                  type="number"
                  defaultValue={team.yearlyAllowance}
                  min={0}
                />
                <Button type="submit" variant="secondary">
                  Save
                </Button>
              </form>
            </div>

            <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                Edit team name &amp; colour
              </summary>
              <form action={updateTeam} className="mt-4 space-y-4">
                <input type="hidden" name="teamId" value={team.id} />
                <Input label="Team name" name="name" defaultValue={team.name} required />
                <TeamColorPicker defaultColor={team.color} />
                <Button type="submit" variant="secondary">
                  Save changes
                </Button>
              </form>
            </details>

            {team.members.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No members yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {team.members.map((member) => {
                  const balance = allowanceByUserId[member.user.id];
                  return (
                    <li
                      key={member.id}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <span>
                        {member.user.name ?? member.user.email}{" "}
                        <span className="text-slate-400">
                          ({member.role === "MANAGER" ? "Manager" : "Member"})
                        </span>
                        {balance && (
                          <span className="ml-2 text-emerald-600">
                            · {balance.remaining} day{balance.remaining !== 1 ? "s" : ""}{" "}
                            remaining
                          </span>
                        )}
                      </span>
                      <form action={removeTeamMember.bind(null, member.id)}>
                        <Button type="submit" variant="ghost">
                          Remove
                        </Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
