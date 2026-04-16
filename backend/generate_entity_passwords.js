/**
 * Migration script: Generate passwords for existing entities that don't have one.
 * Run with: node generate_entity_passwords.js
 */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { generatePassword } = require("./src/utils/passwordGenerator");

require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const entities = await prisma.entity.findMany({
    where: { password: null },
    include: { ascoUser: true },
  });

  console.log(`Found ${entities.length} entities without passwords.\n`);

  for (const entity of entities) {
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update entity record with plaintext password
    await prisma.entity.update({
      where: { id: entity.id },
      data: { password: newPassword },
    });

    // Update the ASCO user's passwordHash if they exist
    if (entity.ascoUserId) {
      await prisma.user.update({
        where: { id: entity.ascoUserId },
        data: { passwordHash: hashedPassword },
      });
    }

    console.log(`✅ ${entity.name} → ASCO Email: ${entity.ascoEmail || 'N/A'} | Password: ${newPassword}`);
  }

  console.log(`\nDone! ${entities.length} entities updated.`);
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
