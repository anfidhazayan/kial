const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv/config");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const entities = await prisma.entity.findMany({
    select: { id: true, name: true },
  });
  console.log("Entities in database:");
  console.log(JSON.stringify(entities, null, 2));
  
  if (entities.length === 0) {
    console.log("\n⚠️ No entities found in database!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
