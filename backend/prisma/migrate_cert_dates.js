/**
 * Data Migration Script: Move Staff date fields into Certificate records
 *
 * Run this AFTER `npx prisma migrate dev` but the migration itself
 * should be done in two steps:
 *   Step 1: Add new fields (Entity fields, Certificate.issuedDate, CertificateType enum)
 *   Step 2: Run THIS script to migrate data
 *   Step 3: Drop old Staff columns via another migration
 *
 * Usage: node prisma/migrate_cert_dates.js
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrateCertificateDates() {
  console.log("Starting certificate date migration...\n");

  // We need to use raw SQL to read the old columns since they may
  // already be removed from the Prisma schema.
  // If running BEFORE dropping columns, we can use raw queries.

  const staffRows = await prisma.$queryRaw`
    SELECT id, "fullName", "avsecTrainingValidity", "pccValidity", 
           "medicalFitnessValidity", "aepValidFrom", "aepValidTo"
    FROM "Staff"
    WHERE "avsecTrainingValidity" IS NOT NULL
       OR "pccValidity" IS NOT NULL
       OR "medicalFitnessValidity" IS NOT NULL
       OR "aepValidFrom" IS NOT NULL
       OR "aepValidTo" IS NOT NULL
  `;

  console.log(`Found ${staffRows.length} staff records with date fields to migrate.\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const staff of staffRows) {
    const certEntries = [];

    if (staff.avsecTrainingValidity) {
      certEntries.push({
        type: "AVSEC_BASIC",
        validTo: staff.avsecTrainingValidity,
        validFrom: null,
        issuedDate: null,
      });
    }

    if (staff.pccValidity) {
      certEntries.push({
        type: "PCC",
        validTo: staff.pccValidity,
        validFrom: null,
        issuedDate: null,
      });
    }

    if (staff.medicalFitnessValidity) {
      certEntries.push({
        type: "MEDICAL",
        validTo: staff.medicalFitnessValidity,
        validFrom: null,
        issuedDate: null,
      });
    }

    if (staff.aepValidFrom || staff.aepValidTo) {
      certEntries.push({
        type: "AEP",
        validFrom: staff.aepValidFrom || null,
        validTo: staff.aepValidTo || null,
        issuedDate: null,
      });
    }

    for (const cert of certEntries) {
      try {
        // Check if a certificate of this type already exists for this staff
        const existing = await prisma.certificate.findFirst({
          where: {
            staffId: staff.id,
            type: cert.type,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.certificate.create({
          data: {
            type: cert.type,
            validFrom: cert.validFrom,
            validTo: cert.validTo,
            issuedDate: cert.issuedDate,
            status: "APPROVED",
            staffId: staff.id,
          },
        });
        created++;
      } catch (err) {
        errors++;
        console.error(`Error migrating ${cert.type} for staff ${staff.id} (${staff.fullName}): ${err.message}`);
      }
    }
  }

  console.log("\n--- Migration Summary ---");
  console.log(`Created: ${created} certificate records`);
  console.log(`Skipped: ${skipped} (already existed)`);
  console.log(`Errors:  ${errors}`);
  console.log("Done.\n");

  await prisma.$disconnect();
  await pool.end();
}

migrateCertificateDates().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
