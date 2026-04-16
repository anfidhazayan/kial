const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const xlsx = require("xlsx");
const AppError = require("../utils/AppError");
const { isExpired, isExpiringSoon } = require("../utils/dateHelpers");
const { generatePassword } = require("../utils/passwordGenerator");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Get entity dashboard (for Entity Head)
 */
exports.getEntityDashboard = async (req, res, next) => {
  try {
    const entityId = req.user.entityId;

    if (!entityId) {
      return next(new AppError("No entity associated with this user", 404));
    }

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        certificates: true,
        staffMembers: {
          include: {
            certificates: true,
          },
        },
        ascoUser: true,
      },
    });

    if (!entity) {
      return next(new AppError("Entity not found", 404));
    }

    // Calculate compliance stats
    let staffCompliance = { expired: 0, expiringSoon: 0, valid: 0, pending: 0 };
    let entityCompliance = { expired: 0, expiringSoon: 0, valid: 0, pending: 0 };
    let expiringStaffCertificates = [];
    let expiringEntityCertificates = [];

    entity.staffMembers.forEach((staff) => {
      staff.certificates.forEach((cert) => {
        if (cert.status === "PENDING") {
          staffCompliance.pending++;
        } else if (cert.status === "APPROVED") {
          let hasIssue = false;
          let issueType = '';
          if (isExpired(cert.validTo)) {
            staffCompliance.expired++;
            hasIssue = true;
            issueType = 'Expired';
          } else if (isExpiringSoon(cert.validTo, 30)) {
            staffCompliance.expiringSoon++;
            hasIssue = true;
            issueType = 'Expiring Soon';
          } else {
            staffCompliance.valid++;
          }
          if (hasIssue) {
            expiringStaffCertificates.push({
               id: cert.id,
               type: cert.type,
               validTo: cert.validTo,
               staffName: staff.fullName,
               status: issueType
            });
          }
        }
      });
    });

    entity.certificates.forEach((cert) => {
        if (cert.status === "PENDING") {
          entityCompliance.pending++;
        } else if (cert.status === "APPROVED") {
          let hasIssue = false;
          let issueType = '';
          if (isExpired(cert.validTo)) {
            entityCompliance.expired++;
            hasIssue = true;
            issueType = 'Expired';
          } else if (isExpiringSoon(cert.validTo, 30)) {
            entityCompliance.expiringSoon++;
            hasIssue = true;
            issueType = 'Expiring Soon';
          } else {
            entityCompliance.valid++;
          }
          if (hasIssue) {
            expiringEntityCertificates.push({
               id: cert.id,
               type: cert.type,
               validTo: cert.validTo,
               status: issueType
            });
          }
        }
    });

    expiringStaffCertificates.sort((a, b) => new Date(a.validTo || 0) - new Date(b.validTo || 0));
    expiringEntityCertificates.sort((a, b) => new Date(a.validTo || 0) - new Date(b.validTo || 0));

    res.json({
      success: true,
      data: {
        entity,
        compliance: staffCompliance, // backwards compatible
        staffCompliance,
        entityCompliance,
        expiringStaffCertificates,
        expiringEntityCertificates,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all staff for entity
 */
exports.getMyStaff = async (req, res, next) => {
  try {
    const entityId = req.user.entityId;

    if (!entityId) {
      return next(new AppError("No entity associated with this user", 404));
    }

    const staff = await prisma.staff.findMany({
      where: { entityId },
      include: {
        certificates: true,
        user: true,
      },
      orderBy: { fullName: "asc" },
    });

    res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add or update staff member
 */
exports.upsertStaff = async (req, res, next) => {
  try {
    const entityId = req.user.entityId;
    const data = { ...req.body };
    const id = req.params.id || data.id;
    delete data.id;

    // Ensure staff belongs to this entity
    data.entityId = entityId;

    let staff;
    if (id) {
      // Verify ownership
      const existing = await prisma.staff.findUnique({
        where: { id: parseInt(id) },
      });

      if (existing.entityId !== entityId) {
        return next(new AppError("You can only edit your own staff", 403));
      }

      // Create Approval Request rather than updating directly
      const request = await prisma.approvalRequest.create({
        data: {
          entityType: "Staff",
          entityId: parseInt(id),
          action: "UPDATE",
          payload: data,
          requestedBy: req.user.id,
          status: "PENDING",
        }
      });

      // Keep staff active but flag as PENDING changes
      staff = await prisma.staff.update({
        where: { id: parseInt(id) },
        data: { status: "PENDING" },
        include: { certificates: true },
      });
    } else {
      // Auto-generate password for new staff
      const plainPassword = generatePassword();
      data.password = plainPassword;

      // If email is provided, create a User account
      if (data.email && data.email.includes("@")) {
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        const userRecord = await prisma.user.upsert({
          where: { email: data.email },
          update: {},
          create: {
            email: data.email,
            fullName: data.fullName || "Staff",
            role: "STAFF",
            passwordHash: hashedPassword,
          },
        });

        // Check if user already has a staff profile
        const existingStaff = await prisma.staff.findFirst({
          where: { userId: userRecord.id }
        });
        
        if (existingStaff) {
          return next(new AppError("This email is already associated with an existing staff member.", 400));
        }

        data.userId = userRecord.id;
        delete data.email; // email is not a Staff field
      }

      staff = await prisma.staff.create({
        data: { ...data, status: "PENDING" },
        include: { certificates: true },
      });

      // Create Approval Request for CREATE
      await prisma.approvalRequest.create({
        data: {
          entityType: "Staff",
          entityId: staff.id,
          action: "CREATE",
          requestedBy: req.user.id,
          status: "PENDING",
        }
      });
    }

    res.json({
      success: true,
      message: "Staff member request submitted for CSO approval",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all certificates for entity staff
 */
exports.getMyCertificates = async (req, res, next) => {
  try {
    const entityId = req.user.entityId;

    if (!entityId) {
      return next(new AppError("No entity associated with this user", 404));
    }

    const certificates = await prisma.certificate.findMany({
      where: {
        staff: {
          entityId,
        },
      },
      include: {
        staff: {
          include: {
            entity: true,
          },
        },
      },
      orderBy: { id: "desc" },
    });

    res.json({
      success: true,
      data: certificates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create certificate for entity staff (submit for approval)
 */
exports.createCertificate = async (req, res, next) => {
  try {
    const entityId = req.user.entityId;
    const { staffId, type, validFrom, validTo, department, docUrl: stringDocUrl } = req.body;

    if (!entityId) {
      return next(new AppError("No entity associated with this user", 404));
    }

    // Verify staff belongs to this entity
    const staff = await prisma.staff.findUnique({
      where: { id: parseInt(staffId) },
    });

    if (!staff || staff.entityId !== entityId) {
      return next(new AppError("Staff not found or doesn't belong to your entity", 403));
    }

    let finalDocUrl = stringDocUrl || null;
    if (req.file) {
      finalDocUrl = `/uploads/documents/${req.file.filename}`;
    }

    // Create certificate with PENDING status
    const certificate = await prisma.certificate.create({
      data: {
        staffId: parseInt(staffId),
        type,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        docUrl: finalDocUrl,
        status: "PENDING",
      },
    });

    // Create Approval Request
    await prisma.approvalRequest.create({
      data: {
        entityType: "EntityCertificate",
        entityId: certificate.id,
        action: "CREATE",
        requestedBy: req.user.id,
        status: "PENDING",
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: `Entity certificate creation requested: ${type}`,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: "Entity certificate submitted for CSO approval",
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update entity certificate (resubmit for approval)
 */
exports.updateEntityCertificate = async (req, res, next) => {
  try {
    const entityId = req.user.entityId;
    const { id } = req.params;
    const { type, validFrom, validTo, docUrl: stringDocUrl } = req.body;

    if (!entityId) {
      return next(new AppError("No entity associated with this user", 404));
    }

    const existing = await prisma.entityCertificate.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return next(new AppError("Entity certificate not found", 404));
    }

    if (existing.entityId !== entityId) {
      return next(new AppError("You can only update certificates for your entity", 403));
    }

    let finalDocUrl = stringDocUrl || existing.docUrl;
    if (req.file) {
      finalDocUrl = `/uploads/documents/${req.file.filename}`;
    }

    // Set existing certificate to PENDING
    await prisma.entityCertificate.update({
      where: { id: parseInt(id) },
      data: { status: "PENDING" },
    });

    // Create Approval Request
    await prisma.approvalRequest.create({
      data: {
        entityType: "EntityCertificate",
        entityId: parseInt(id),
        action: "UPDATE",
        requestedBy: req.user.id,
        status: "PENDING",
        payload: {
          type: type || existing.type,
          validFrom: validFrom ? new Date(validFrom) : existing.validFrom,
          validTo: validTo ? new Date(validTo) : existing.validTo,
          docUrl: finalDocUrl,
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: `Entity certificate update requested: ${existing.type}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Entity certificate update submitted for CSO approval",
      data: existing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete entity certificate
 */
exports.deleteEntityCertificate = async (req, res, next) => {
  try {
    const entityId = req.user.entityId;
    const { id } = req.params;

    if (!entityId) {
      return next(new AppError("No entity associated with this user", 404));
    }

    const certificate = await prisma.entityCertificate.findUnique({
      where: { id: parseInt(id) },
    });

    if (!certificate) {
      return next(new AppError("Entity certificate not found", 404));
    }

    if (certificate.entityId !== entityId) {
      return next(new AppError("You can only delete certificates for your entity", 403));
    }

    // If certificate was REJECTED, allow direct deletion without approval
    if (certificate.status === "REJECTED") {
      await prisma.entityCertificate.delete({ where: { id: parseInt(id) } });

      await prisma.auditLog.create({
        data: {
          action: `Rejected entity certificate deleted: ${certificate.type}`,
          userId: req.user.id,
        },
      });

      return res.json({
        success: true,
        message: "Rejected entity certificate deleted successfully",
      });
    }

    // Set existing certificate to PENDING
    await prisma.entityCertificate.update({
      where: { id: parseInt(id) },
      data: { status: "PENDING" },
    });

    // Create Approval Request
    await prisma.approvalRequest.create({
      data: {
        entityType: "EntityCertificate",
        entityId: parseInt(id),
        action: "DELETE",
        requestedBy: req.user.id,
        status: "PENDING",
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: `Entity certificate deletion requested: ${certificate.type}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Entity certificate deletion submitted for CSO approval",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update certificate (resubmit for approval)
 */
exports.updateCertificate = async (req, res, next) => {
  try {
    const entityId = req.user.entityId;
    const { id } = req.params;
    const { type, validFrom, validTo, department, docUrl: stringDocUrl } = req.body;

    if (!entityId) {
      return next(new AppError("No entity associated with this user", 404));
    }

    // Verify certificate belongs to entity staff
    const existing = await prisma.certificate.findUnique({
      where: { id: parseInt(id) },
      include: {
        staff: true,
      },
    });

    if (!existing) {
      return next(new AppError("Certificate not found", 404));
    }

    if (existing.staff.entityId !== entityId) {
      return next(new AppError("You can only update certificates for your entity staff", 403));
    }

    let finalDocUrl = stringDocUrl || existing.docUrl;
    if (req.file) {
      finalDocUrl = `/uploads/documents/${req.file.filename}`;
    }

    // Set existing certificate to PENDING
    await prisma.certificate.update({
      where: { id: parseInt(id) },
      data: { status: "PENDING" },
    });

    // Create Approval Request
    await prisma.approvalRequest.create({
      data: {
        entityType: "Certificate",
        entityId: parseInt(id),
        action: "UPDATE",
        requestedBy: req.user.id,
        status: "PENDING",
        payload: {
          type: type || existing.type,
          department: department !== undefined ? department : existing.department,
          validFrom: validFrom ? new Date(validFrom) : existing.validFrom,
          validTo: validTo ? new Date(validTo) : existing.validTo,
          docUrl: finalDocUrl,
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: `Certificate update requested: ${existing.type}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Certificate update submitted for CSO approval",
      data: existing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete certificate
 */
exports.deleteCertificate = async (req, res, next) => {
  try {
    const entityId = req.user.entityId;
    const { id } = req.params;

    if (!entityId) {
      return next(new AppError("No entity associated with this user", 404));
    }

    // Verify certificate belongs to entity staff
    const certificate = await prisma.certificate.findUnique({
      where: { id: parseInt(id) },
      include: {
        staff: true,
      },
    });

    if (!certificate) {
      return next(new AppError("Certificate not found", 404));
    }

    if (certificate.staff.entityId !== entityId) {
      return next(new AppError("You can only delete certificates for your entity staff", 403));
    }

    // If certificate was REJECTED, allow direct deletion without approval
    if (certificate.status === "REJECTED") {
      await prisma.certificate.delete({ where: { id: parseInt(id) } });

      await prisma.auditLog.create({
        data: {
          action: `Rejected certificate deleted: ${certificate.type}`,
          userId: req.user.id,
        },
      });

      return res.json({
        success: true,
        message: "Rejected certificate deleted successfully",
      });
    }

    // Set existing certificate to PENDING
    await prisma.certificate.update({
      where: { id: parseInt(id) },
      data: { status: "PENDING" },
    });

    // Create Approval Request
    await prisma.approvalRequest.create({
      data: {
        entityType: "Certificate",
        entityId: parseInt(id),
        action: "DELETE",
        requestedBy: req.user.id,
        status: "PENDING",
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: `Certificate deletion requested: ${certificate.type}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Certificate deletion submitted for CSO approval",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request certificate renewal
 */
exports.requestCertificateRenewal = async (req, res, next) => {
  try {
    const { certificateId, proposedValidTo, proposedDocUrl } = req.body;

    const certificate = await prisma.certificate.findUnique({
      where: { id: parseInt(certificateId) },
      include: {
        staff: true,
      },
    });

    if (!certificate) {
      return next(new AppError("Certificate not found", 404));
    }

    // Verify staff belongs to this entity
    if (certificate.staff.entityId !== req.user.entityId) {
      return next(new AppError("Unauthorized", 403));
    }

    const updated = await prisma.certificate.update({
      where: { id: parseInt(certificateId) },
      data: {
        proposedValidTo: new Date(proposedValidTo),
        proposedDocUrl,
        status: "PENDING",
      },
    });

    res.json({
      success: true,
      data: updated,
      message: "Renewal request submitted for approval",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete staff member (Entity Head only, own staff)
 */
exports.deleteStaff = async (req, res, next) => {
  try {
    const entityId = req.user.entityId;
    const staffId = parseInt(req.params.id);

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      return next(new AppError("Staff member not found", 404));
    }

    if (staff.entityId !== entityId) {
      return next(new AppError("You can only delete your own staff", 403));
    }

    // Delete certificates first, then staff
    await prisma.certificate.deleteMany({ where: { staffId } });
    
    // Unlink and delete user account if linked
    if (staff.userId) {
      await prisma.staff.update({ where: { id: staffId }, data: { userId: null } });
      await prisma.user.delete({ where: { id: staff.userId } }).catch(() => {});
    }

    await prisma.staff.delete({ where: { id: staffId } });

    res.json({
      success: true,
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

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
 * Export staff as Excel for Entity Head
 */
exports.exportStaff = async (req, res, next) => {
  try {
    const entityId = req.user.entityId;
    if (!entityId) {
      return next(new AppError("No entity associated with this user", 404));
    }

    const { department, status, certificateStatus, searchTerm, role, zone } = req.query;

    const where = {
      entityId: entityId, // Restrict to the requesting entity's staff
    };

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

    // 2. Department filter
    if (department) {
      where.department = { equals: department, mode: "insensitive" };
    }

    // 3. Role/Designation filter
    if (role) {
      where.designation = role;
    }

    // 4. Zone filter
    if (zone) {
      where.zones = { has: zone };
    }

    // 5. Status filter
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

    // 6. Certificate Status Filtering (Post-Query)
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
      const aepCert = findCertByType(s.certificates, "AEP");
      const avsecCert = findCertByType(s.certificates, "AVSEC_BASIC");
      const pccCert = findCertByType(s.certificates, "PCC");
      const medicalCert = findCertByType(s.certificates, "MEDICAL");

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

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, 14),
    }));
    worksheet["!cols"] = colWidths;

    xlsx.utils.book_append_sheet(workbook, worksheet, "Staff");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    const filename = `Staff_${new Date().toISOString().split("T")[0]}.xlsx`;
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

// Entity Certificate Management
exports.createEntityCertificate = async (req, res, next) => {
  try {
    console.log("createEntityCertificate req.body:", req.body);
    console.log("createEntityCertificate req.file:", req.file);
    const { type, validFrom, validTo, customType, docUrl: bodyDocUrl } = req.body;
    const finalType = type === "Other" && customType ? customType : type;
    const docUrl = req.file ? `/uploads/documents/${req.file.filename}` : (bodyDocUrl || null);


    // Create the certificate with PENDING status
    const certificate = await prisma.entityCertificate.create({
      data: {
        entityId: req.user.entityId,
        type: finalType,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        docUrl,
        status: "PENDING",
      },
    });

    // Create an Approval Request for the CSO to review
    await prisma.approvalRequest.create({
      data: {
        entityType: "EntityCertificate",
        entityId: certificate.id,
        action: "CREATE",
        requestedBy: req.user.id,
        status: "PENDING",
        payload: JSON.stringify({ type: finalType, validFrom, validTo, docUrl }),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: `Requested creation of entity certificate: ${finalType}`,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      data: certificate,
      message: "Entity certificate creation requested successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.updateEntityCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, validFrom, validTo, customType, isRenewal, docUrl: bodyDocUrl } = req.body;
    let updateData = {};
    if (type) updateData.type = type === "Other" && customType ? customType : type;
    if (validFrom) updateData.validFrom = new Date(validFrom);
    if (validTo) updateData.validTo = new Date(validTo);

    if (req.file) {
      updateData.docUrl = `/uploads/documents/${req.file.filename}`;
    } else if (bodyDocUrl) {
      updateData.docUrl = bodyDocUrl;
    }

    const certificate = await prisma.entityCertificate.findFirst({
      where: { id: parseInt(id), entityId: req.user.entityId },
    });

    if (!certificate) {
      return next(new AppError("Entity certificate not found or unauthorized", 404));
    }

    updateData.status = "PENDING";

    const updatedCert = await prisma.entityCertificate.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await prisma.approvalRequest.create({
      data: {
        entityType: "EntityCertificate",
        entityId: updatedCert.id,
        action: "UPDATE",
        requestedBy: req.user.id,
        status: "PENDING",
        payload: JSON.stringify({ ...updateData, isRenewal: !!isRenewal }),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: `Requested update for entity certificate: ${updatedCert.type}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      data: updatedCert,
      message: "Entity certificate update requested successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteEntityCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;

    

    const certificate = await prisma.entityCertificate.findFirst({
      where: { id: parseInt(id), entityId: req.user.entityId },
    });

    if (!certificate) {
      return next(new AppError("Entity certificate not found or unauthorized", 404));
    }

    await prisma.entityCertificate.update({
      where: { id: parseInt(id) },
      data: { status: "PENDING" },
    });

    await prisma.approvalRequest.create({
      data: {
        entityType: "EntityCertificate",
        entityId: certificate.id,
        action: "DELETE",
        requestedBy: req.user.id,
        status: "PENDING",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: `Requested deletion of entity certificate: ${certificate.type}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Entity certificate deletion requested successfully",
    });
  } catch (error) {
    next(error);
  }
};
