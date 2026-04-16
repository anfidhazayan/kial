const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Add unique constraints check before bulk operations
 */
async function checkDuplicates(staffData) {
  const duplicates = {
    aadhaar: [],
    empCode: [],
    email: [],
  };

  for (const staff of staffData) {
    if (staff.aadhaarNumber) {
      const existing = await prisma.staff.findFirst({
        where: { aadhaarNumber: staff.aadhaarNumber },
      });
      if (existing) {
        duplicates.aadhaar.push(staff.aadhaarNumber);
      }
    }

    if (staff.empCode) {
      const existing = await prisma.staff.findFirst({
        where: { empCode: staff.empCode },
      });
      if (existing) {
        duplicates.empCode.push(staff.empCode);
      }
    }

    if (staff.email) {
      const existing = await prisma.user.findUnique({
        where: { email: staff.email },
      });
      if (existing) {
        duplicates.email.push(staff.email);
      }
    }
  }

  return duplicates;
}

/**
 * Batch create certificates to avoid N+1 queries
 */
async function batchCreateCertificates(certificatesData) {
  if (certificatesData.length === 0) return;

  return await prisma.certificate.createMany({
    data: certificatesData,
    skipDuplicates: true,
  });
}

/**
 * Batch delete certificates by staff IDs
 */
async function batchDeleteCertificates(staffIds) {
  if (staffIds.length === 0) return;

  return await prisma.certificate.deleteMany({
    where: {
      staffId: { in: staffIds },
    },
  });
}

/**
 * Get compliance summary with efficient queries
 */
async function getComplianceSummary() {
  const [
    totalEntities,
    totalStaff,
    totalCertificates,
    pendingCertificates,
    approvedCertificates,
  ] = await Promise.all([
    prisma.entity.count(),
    prisma.staff.count(),
    prisma.certificate.count(),
    prisma.certificate.count({ where: { status: "PENDING" } }),
    prisma.certificate.count({ where: { status: "APPROVED" } }),
  ]);

  return {
    totalEntities,
    totalStaff,
    totalCertificates,
    pendingCertificates,
    approvedCertificates,
  };
}

/**
 * Export entities to Excel format
 */
async function exportEntitiesToExcel() {
  const entities = await prisma.entity.findMany({
    include: {
      ascoUser: true,
      staffMembers: {
        include: {
          certificates: true,
        },
      },
    },
  });

  return entities.map((entity) => ({
    "Entity Name": entity.name,
    Category: entity.category,
    "Contact Person": entity.contactPerson,
    "Contact Email": entity.contactEmail,
    "Contact Phone": entity.contactPhone,
    Address: entity.address,
    "Work Area": entity.workArea?.join(", "),
    "Zone Location": entity.zoneLocation?.join(", "),
    "Contract Valid From": entity.contractValidFrom?.toISOString().split("T")[0],
    "Contract Valid To": entity.contractValidTo?.toISOString().split("T")[0],
    "Security Clearance From": entity.securityClearanceFrom?.toISOString().split("T")[0],
    "Security Clearance To": entity.securityClearanceTo?.toISOString().split("T")[0],
    "Security Program From": entity.securityProgramFrom?.toISOString().split("T")[0],
    "Security Program To": entity.securityProgramTo?.toISOString().split("T")[0],
    "ASCO Email": entity.ascoUser?.email || "",
    "Total Staff": entity.staffMembers.length,
  }));
}

/**
 * Export staff to Excel format
 */
async function exportStaffToExcel(entityId = null) {
  const where = entityId ? { entityId: parseInt(entityId) } : {};

  const staff = await prisma.staff.findMany({
    where,
    include: {
      entity: true,
      certificates: true,
    },
  });

  return staff.map((s) => ({
    "Staff Name": s.fullName,
    "Entity Name": s.entity?.name || "KIAL",
    Designation: s.designation,
    Department: s.department,
    "Employee Code": s.empCode,
    "Aadhaar Number": s.aadhaarNumber,
    "Date of Birth": s.dateOfBirth?.toISOString().split("T")[0],
    Mobile: s.mobile,
    "Work Area": s.workArea?.join(", "),
    "Zone Location": s.zoneLocation?.join(", "),
    "Training Certificate": s.certificates.find((c) => c.type === "AVSEC Training")?.number || "",
    "Training Valid To": s.certificates.find((c) => c.type === "AVSEC Training")?.validTo?.toISOString().split("T")[0] || "",
    "PCC Number": s.certificates.find((c) => c.type === "Police Clearance")?.number || "",
    "PCC Valid To": s.certificates.find((c) => c.type === "Police Clearance")?.validTo?.toISOString().split("T")[0] || "",
  }));
}

module.exports = {
  checkDuplicates,
  batchCreateCertificates,
  batchDeleteCertificates,
  getComplianceSummary,
  exportEntitiesToExcel,
  exportStaffToExcel,
};
