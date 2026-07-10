import { MeavoNavBar } from "@meavo/navigation";
import {
  getAccessibleTools,
  getNotifications,
  isMeavoAppKey,
  resolveCurrentToolId,
} from "@meavo/navigation/server";
import { signOutAction } from "@/app/actions/auth";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  refreshNotificationsAction,
} from "@/app/actions/notifications";
import { auth } from "@/lib/auth";
import { getManagedTeamIds, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const MEAVO_APP_KEY = isMeavoAppKey(process.env.MEAVO_APP_KEY)
  ? process.env.MEAVO_APP_KEY
  : "hols";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "https://meavo.app";

const links: { href: string; label: string; managerOnly?: boolean }[] = [
  { href: "/", label: "Calendar" },
  { href: "/requests", label: "My requests" },
  { href: "/approvals", label: "Approvals", managerOnly: true },
  { href: "/admin", label: "Admin" },
];

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  const [admin, managedTeams] = await Promise.all([
    isAdmin(session.user.id),
    getManagedTeamIds(session.user.id),
  ]);
  const isManager = managedTeams.length > 0;

  const visibleLinks = links.filter((link) => {
    if (link.href === "/admin" && !admin && !isManager) return false;
    if (link.managerOnly && !isManager && !admin) return false;
    return true;
  });

  const [toolOptions, notificationFeed] = await Promise.all([
    getAccessibleTools(prisma, {
      userId: session.user.id,
      isAdmin: admin,
      gatewayUrl: GATEWAY_URL,
    }),
    getNotifications(prisma, { userId: session.user.id }),
  ]);

  return (
    <MeavoNavBar
      links={visibleLinks}
      logoHref={GATEWAY_URL}
      toolSwitcher={{
        currentId: resolveCurrentToolId(toolOptions, MEAVO_APP_KEY),
        options: toolOptions,
      }}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      signOutAction={signOutAction}
      notifications={{
        initial: notificationFeed,
        refresh: refreshNotificationsAction,
        markRead: markNotificationReadAction,
        markAllRead: markAllNotificationsReadAction,
      }}
    />
  );
}
