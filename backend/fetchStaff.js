require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const staff = await prisma.staff.findMany({
    where: { isKialStaff: true },
    include: { user: true, certificates: true }
  });
  console.log(JSON.stringify(staff, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
