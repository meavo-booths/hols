import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log(
    "Vacation Tracker uses the meavo-gateway database for users and teams."
  );
  console.log("Run npm run db:seed in meavo-gateway to create admin users and teams.");
  console.log("");
  console.log("This seed only ensures vacation-specific tables exist via db:push.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
