const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { hashPassword } = require("../src/services/authService");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seed...");

  try {
    // Create CSO Admin User
    const csoPassword = await hashPassword("admin123");
    const csoUser = await prisma.user.upsert({
      where: { email: "admin@kial.com" },
      update: {},
      create: {
        email: "admin@kial.com",
        passwordHash: csoPassword,
        fullName: "CSO",
        role: "CSO",
      },
    });
    console.log("✅ Created CSO admin user:", csoUser.email);

    // Create Entity Head User first (needed for entity link)
    const entityHeadPassword = await hashPassword("entity123");
    const entityHeadUser = await prisma.user.upsert({
      where: { email: "asco@sample-agency.com" },
      update: {},
      create: {
        email: "asco@sample-agency.com",
        passwordHash: entityHeadPassword,
        fullName: "ASCO Sample Agency",
        role: "ENTITY_HEAD",
      },
    });
    console.log("✅ Created entity head user:", entityHeadUser.email);

    // Create a sample entity
    const entity1 = await prisma.entity.upsert({
      where: { externalEntityCode: "k001" },
      update: {
        securityClearanceValidTo: new Date("2025-12-31"),
        securityProgramValidTo: new Date("2025-12-31"),
        qcpValidTo: new Date("2025-12-31"),
      },
      create: {
        name: "Sample Security Agency",
        externalEntityCode: "k001",
        category: "Private Security",
        contractValidFrom: new Date("2024-01-01"),
        contractValidTo: new Date("2025-12-31"),
        securityClearanceStatus: "ACTIVE",
        securityClearanceValidTo: new Date("2025-12-31"),
        securityProgramStatus: "ACTIVE",
        securityProgramValidTo: new Date("2025-12-31"),
        qcpStatus: "ACTIVE",
        qcpSubmissionDate: new Date("2024-01-15"),
        qcpValidTo: new Date("2025-12-31"),
        ascoName: "ASCO Manager",
        ascoEmail: "asco@sample-agency.com",
        ascoContactNo: "+91-9876543210",
        ascoTrainingValidFrom: new Date("2024-01-01"),
        ascoTrainingValidTo: new Date("2025-12-31"),
        kialPocName: "KIAL Security Manager",
        kialPocEmail: "security@kial.com",
        kialPocNumber: "+91-9999999999",
        ascoUserId: entityHeadUser.id,
      },
    });
    console.log("✅ Created sample entity:", entity1.name);

    // Create Sample Staff (aadhaarNumber not unique, use findFirst+create)
    let staff1 = await prisma.staff.findFirst({
      where: { aadhaarNumber: "123456789012", entityId: entity1.id },
    });
    if (!staff1) {
      staff1 = await prisma.staff.create({
        data: {
          fullName: "John Doe",
          designation: "Security Officer",
          aadhaarNumber: "123456789012",
          department: "Terminal Security",
          isKialStaff: false,
          entityId: entity1.id,
          aepNumber: "AEP001",
          terminals: "T1, T2",
          airportsGiven: "BLR",
          zones: ["A", "D", "Si"],
        },
      });
      console.log("✅ Created sample staff:", staff1.fullName);
    } else {
      console.log("⏭️  Staff already exists:", staff1.fullName);
    }

    // Create Staff User
    const staffPassword = await hashPassword("staff123");
    const staffUser = await prisma.user.upsert({
      where: { email: "john.doe@sample-agency.com" },
      update: {},
      create: {
        email: "john.doe@sample-agency.com",
        passwordHash: staffPassword,
        fullName: "John Doe",
        role: "STAFF",
      },
    });

    // Link Staff to User (only if not already linked)
    if (!staff1.userId) {
      try {
        await prisma.staff.update({
          where: { id: staff1.id },
          data: { userId: staffUser.id },
        });
      } catch (e) {
        // userId already assigned to another staff, skip
      }
    }
    console.log("✅ Staff user ready:", staffUser.email);

    // Create Certificates for Staff (skip if they already exist)
    const existingCerts = await prisma.certificate.count({
      where: { staffId: staff1.id },
    });

    if (existingCerts === 0) {
      await prisma.certificate.createMany({
        data: [
          {
            type: "AVSEC_BASIC",
            validFrom: new Date("2024-01-01"),
            validTo: new Date("2025-06-30"),
            docUrl: "/uploads/avsec-cert-001.pdf",
            status: "APPROVED",
            staffId: staff1.id,
          },
          {
            type: "PCC",
            validFrom: new Date("2024-02-01"),
            validTo: new Date("2025-01-31"),
            docUrl: "/uploads/pcc-001.pdf",
            status: "APPROVED",
            staffId: staff1.id,
          },
          {
            type: "AEP",
            issuedDate: new Date("2024-01-01"),
            validFrom: new Date("2024-01-01"),
            validTo: new Date("2025-12-31"),
            status: "APPROVED",
            staffId: staff1.id,
          },
          {
            type: "MEDICAL",
            issuedDate: new Date("2024-03-01"),
            validFrom: new Date("2024-03-01"),
            validTo: new Date("2025-03-01"),
            status: "APPROVED",
            staffId: staff1.id,
          },
        ],
      });
      console.log("✅ Created sample certificates");
    } else {
      console.log("⏭️  Certificates already exist, skipping");
    }

    // Create Entity Certificates (skip if they already exist)
    const existingEntityCerts = await prisma.entityCertificate.count({
      where: { entityId: entity1.id },
    });

    if (existingEntityCerts === 0) {
      await prisma.entityCertificate.createMany({
        data: [
          {
            type: "Security Clearance",
            validFrom: new Date("2024-01-01"),
            validTo: new Date("2025-12-31"),
            docUrl: "/uploads/security-clearance-001.pdf",
            status: "APPROVED",
            entityId: entity1.id,
          },
          {
            type: "QCP Certificate",
            validFrom: new Date("2024-01-15"),
            validTo: new Date("2025-06-30"),
            docUrl: "/uploads/qcp-cert-001.pdf",
            status: "APPROVED",
            entityId: entity1.id,
          },
        ],
      });
      console.log("✅ Created sample entity certificates");
    } else {
      console.log("⏭️  Entity certificates already exist, skipping");
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "Database seeded with initial data",
        userId: csoUser.id,
      },
    });

    console.log("\n🎉 Database seed completed successfully!");
    console.log("\n📝 Login Credentials:");
    console.log("CSO Admin:");
    console.log("  Email: admin@kial.com");
    console.log("  Password: admin123");
    console.log("\nEntity Head:");
    console.log("  Email: asco@sample-agency.com");
    console.log("  Password: entity123");
    console.log("\nStaff:");
    console.log("  Email: john.doe@sample-agency.com");
    console.log("  Password: staff123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
