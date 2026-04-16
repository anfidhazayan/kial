const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Starting cleanup of junk staff data...");

  const skipNames = [
    "add+ option",
    "scroll option",
    "other avsec functionaltrainings",
    "other avsec functional trainings",
  ];

  try {
    // 1. Find the junk staff entries
    const junkStaff = await prisma.staff.findMany({
      where: {
        fullName: {
          in: [
            "Add+ Option",
            "add+ option",
            "Scroll Option",
            "scroll option",
            "Other AvSec FunctionalTrainings",
            "Other AvSec Functional Trainings",
          ],
          mode: "insensitive", // Prisma Postgres supports mode
        },
      },
    });

    console.log(`Found ${junkStaff.length} junk staff records.`);

    if (junkStaff.length > 0) {
      const junkIds = junkStaff.map((s) => s.id);

      // 2. Delete associated certificates first (foreign key constraint)
      const deletedCerts = await prisma.certificate.deleteMany({
        where: {
          staffId: {
            in: junkIds,
          },
        },
      });
      console.log(`Deleted ${deletedCerts.count} associated certificates.`);

      // 3. Delete the staff records
      const deletedStaff = await prisma.staff.deleteMany({
        where: {
          id: {
            in: junkIds,
          },
        },
      });
      console.log(`Deleted ${deletedStaff.count} junk staff records.`);
    }

    console.log("✅ Cleanup complete.");
  } catch (error) {
    console.error("❌ Error cleaning up data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
