import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { getManagedTeamIds } from "@/lib/permissions";
import { Button } from "@/components/ui";

const links = [
  { href: "/", label: "Calendar" },
  { href: "/requests", label: "My requests" },
  { href: "/approvals", label: "Approvals", managerOnly: true },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  const managedTeams = await getManagedTeamIds(session.user.id);
  const isManager = managedTeams.length > 0;
  const isAdmin = session.user.systemRole === "ADMIN";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold text-brand-700">
            Vacation Tracker
          </Link>
          <nav className="flex gap-1">
            {links
              .filter((link) => {
                if (link.adminOnly && !isAdmin) return false;
                if (link.managerOnly && !isManager && !isAdmin) return false;
                return true;
              })
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="font-medium text-slate-900">{session.user.name}</p>
            <p className="text-slate-500">{session.user.email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
