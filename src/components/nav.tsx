import { auth } from "@/lib/auth";
import { getManagedTeamIds } from "@/lib/permissions";
import { NavBar } from "@/components/nav-bar";

const links: { href: string; label: string; managerOnly?: boolean }[] = [
  { href: "/", label: "Calendar" },
  { href: "/requests", label: "My requests" },
  { href: "/approvals", label: "Approvals", managerOnly: true },
  { href: "/admin", label: "Admin" },
];

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  const managedTeams = await getManagedTeamIds(session.user.id);
  const isManager = managedTeams.length > 0;
  const isAdmin = session.user.systemRole === "ADMIN";

  const visibleLinks = links.filter((link) => {
    if (link.href === "/admin" && !isAdmin && !isManager) return false;
    if (link.managerOnly && !isManager && !isAdmin) return false;
    return true;
  });

  return (
    <NavBar
      links={visibleLinks}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
    />
  );
}
