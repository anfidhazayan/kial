const xlsx = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { isExpired, isExpiringSoon } = require("../utils/dateHelpers");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Format date for Excel display
 */
const formatDateForExcel = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Helper: Find a certificate of a specific type from a staff's certificates
 */
const findCertByType = (certificates, type) => {
  if (!certificates) return null;
  return certificates.find((c) => c.type === type && c.status === "APPROVED") || null;
};

/**
 * Export all entities as Excel
 */
exports.exportEntities = async (req, res, next) => {
  try {
    const { category, status, compliance, searchTerm } = req.query;

    const where = {};

    // 1. Search (name, code, ASCO details)
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { externalEntityCode: { contains: searchTerm, mode: "insensitive" } },
        { ascoName: { contains: searchTerm, mode: "insensitive" } },
        { ascoEmail: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // 2. Category
    if (category) {
      where.category = category;
    }

    // 3. Status
    if (status) {
      where.status = status;
    }

    // Fetch Base Entities
    let entities = await prisma.entity.findMany({
      where,
      include: {
        staffMembers: true,
        ascoUser: true,
      },
      orderBy: { name: "asc" },
    });

    // 4. Compliance Filtering (Post-Query)
    if (compliance) {
      entities = entities.filter((entity) => {
        let hasExpired = false;
        let hasExpiringSoon = false;

        const checkDate = (date) => {
          if (!date) return;
          if (isExpired(date)) hasExpired = true;
          else if (isExpiringSoon(date, 30)) hasExpiringSoon = true;
        };

        checkDate(entity.contractValidTo);
        checkDate(entity.securityClearanceValidTo);
        checkDate(entity.securityProgramValidTo);

        if (compliance === "expired") return hasExpired;
        if (compliance === "expiring") return hasExpiringSoon;
        if (compliance === "valid") return !hasExpired && !hasExpiringSoon;
        return true;
      });
    }

    // Build rows
    const rows = entities.map((entity) => ({
      "Entity Code": entity.externalEntityCode || "",
      "Entity Name": entity.name || "",
      "Category": entity.category || "",
      "Security Clearance Status": entity.securityClearanceStatus || "",
      "Security Clearance Expiry": formatDateForExcel(entity.securityClearanceValidTo),
      "Security Programme Status": entity.securityProgramStatus || "",
      "Security Programme Expiry": formatDateForExcel(entity.securityProgramValidTo),
      "QCP Status": entity.qcpStatus || "",
      "QCP Expiry": formatDateForExcel(entity.qcpValidTo),
      "QCP Submission Date": formatDateForExcel(entity.qcpSubmissionDate),
      "Contract Valid From": formatDateForExcel(entity.contractValidFrom),
      "Contract Valid To": formatDateForExcel(entity.contractValidTo),
      "ASCO Name": entity.ascoName || "",
      "ASCO Contact No": entity.ascoContactNo || "",
      "ASCO Email": entity.ascoEmail || "",
      "ASCO Training Valid From": formatDateForExcel(entity.ascoTrainingValidFrom),
      "ASCO Training Valid To": formatDateForExcel(entity.ascoTrainingValidTo),
      "KIAL PoC Name": entity.kialPocName || "",
      "KIAL PoC Contact": entity.kialPocNumber || "",
      "KIAL PoC Email": entity.kialPocEmail || "",
      "Total Staff": entity.staffMembers?.length || 0,
    }));

    // Create workbook
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows);

    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    worksheet["!cols"] = colWidths;

    xlsx.utils.book_append_sheet(workbook, worksheet, "Entities");

    // Write to buffer
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Send as download
    const filename = `KIAL_Entities_${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Export all staff as Excel
 */
exports.exportStaff = async (req, res, next) => {
  try {
    const { entity, department, status, certificateStatus, searchTerm, role, zone } = req.query;

    const where = {};

    // 1. Search term
    if (searchTerm) {
      where.OR = [
        { fullName: { contains: searchTerm, mode: "insensitive" } },
        { empCode: { contains: searchTerm, mode: "insensitive" } },
        { designation: { contains: searchTerm, mode: "insensitive" } },
        { department: { contains: searchTerm, mode: "insensitive" } },
        { aadhaarNumber: { contains: searchTerm, mode: "insensitive" } },
        { aepNumber: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // 2. Entity filter
    if (entity) {
      if (entity === "KIAL") {
        where.isKialStaff = true;
      } else {
        where.entity = { name: entity };
      }
    }

    // 3. Department filter
    if (department) {
      where.department = { equals: department, mode: "insensitive" };
    }

    // 4. Role/Designation filter
    if (role) {
      where.designation = role;
    }

    // 5. Zone filter (PostgreSQL array contains)
    if (zone) {
      where.zones = { has: zone };
    }

    // 6. Status filter (ACTIVE vs INACTIVE, etc.)
    if (status) {
      where.status = status;
    }

    let staff = await prisma.staff.findMany({
      where,
      include: {
        entity: true,
        certificates: true,
      },
      orderBy: { fullName: "asc" },
    });

    // 7. Certificate Status Filtering (Post-Query)
    if (certificateStatus) {
      staff = staff.filter((s) => {
        let validCerts = 0;
        let expiredCerts = 0;
        let expiringSoonCerts = 0;

        s.certificates?.forEach((cert) => {
          if (cert.status !== "APPROVED") return;
          if (isExpired(cert.validTo)) expiredCerts++;
          else if (isExpiringSoon(cert.validTo, 30)) expiringSoonCerts++;
          else validCerts++;
        });

        if (certificateStatus === "expired") return expiredCerts > 0;
        if (certificateStatus === "expiring") return expiringSoonCerts > 0;
        if (certificateStatus === "valid") return validCerts > 0 && expiringSoonCerts === 0 && expiredCerts === 0;
        if (certificateStatus === "none") return validCerts === 0 && expiringSoonCerts === 0 && expiredCerts === 0;
        
        return true;
      });
    }

    // Build rows
    const rows = staff.map((s) => {
      // Find certificates by type
      const aepCert = findCertByType(s.certificates, "AEP");
      const avsecCert = findCertByType(s.certificates, "AVSEC_BASIC");
      const pccCert = findCertByType(s.certificates, "PCC");
      const medicalCert = findCertByType(s.certificates, "MEDICAL");

      // Count certificate statuses
      let validCerts = 0;
      let expiredCerts = 0;
      let expiringSoonCerts = 0;

      s.certificates?.forEach((cert) => {
        if (isExpired(cert.validTo)) expiredCerts++;
        else if (isExpiringSoon(cert.validTo, 30)) expiringSoonCerts++;
        else validCerts++;
      });

      return {
        "Full Name": s.fullName || "",
        "Designation": s.designation || "",
        "Type": s.isKialStaff ? "KIAL Staff" : "Contract Staff",
        "Entity": s.entity?.name || (s.isKialStaff ? "KIAL" : "N/A"),
        "Department": s.department || "",
        "Employee Code": s.empCode || "",
        "Aadhaar Number": s.aadhaarNumber || "",
        "AEP Number": s.aepNumber || "",
        "AEP Issued Date": formatDateForExcel(aepCert?.issuedDate),
        "AEP Valid From": formatDateForExcel(aepCert?.validFrom),
        "AEP Valid To": formatDateForExcel(aepCert?.validTo),
        "AVSEC Training Valid To": formatDateForExcel(avsecCert?.validTo),
        "PCC Issued Date": formatDateForExcel(pccCert?.issuedDate),
        "PCC Valid To": formatDateForExcel(pccCert?.validTo),
        "Medical Issued Date": formatDateForExcel(medicalCert?.issuedDate),
        "Medical Valid To": formatDateForExcel(medicalCert?.validTo),
        "Phone Number": s.phoneNumber || "",
        "Terminals": s.terminals || "",
        "Airports": s.airportsGiven || "",
        "Zones": Array.isArray(s.zones) ? s.zones.join(", ") : "",
        "Total Certificates": s.certificates?.length || 0,
        "Valid Certs": validCerts,
        "Expiring Soon": expiringSoonCerts,
        "Expired Certs": expiredCerts,
      };
    });

    // Create workbook
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows);

    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, 14),
    }));
    worksheet["!cols"] = colWidths;

    xlsx.utils.book_append_sheet(workbook, worksheet, "Staff");

    // Write to buffer
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Send as download
    const filename = `KIAL_Staff_${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
