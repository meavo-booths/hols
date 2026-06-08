import { PrismaClient, SystemRole, TeamRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAILS?.split(",")[0]?.trim()?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail) {
    console.log("Set ADMIN_EMAILS in .env to seed an admin user.");
    return;
  }
  if (!adminPassword) {
    console.log("Set ADMIN_PASSWORD in .env to seed the admin password.");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { systemRole: SystemRole.ADMIN, passwordHash },
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      systemRole: SystemRole.ADMIN,
    },
  });

  const engineering = await prisma.team.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", yearlyAllowance: 25, color: "#E1E9EC" },
  });

  await prisma.teamMember.upsert({
    where: {
      userId_teamId: { userId: admin.id, teamId: engineering.id },
    },
    update: { role: TeamRole.MANAGER },
    create: {
      userId: admin.id,
      teamId: engineering.id,
      role: TeamRole.MANAGER,
    },
  });

  console.log(`Seeded admin (${adminEmail}) and Engineering team.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
