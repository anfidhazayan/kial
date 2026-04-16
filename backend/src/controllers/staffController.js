const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const AppError = require("../utils/AppError");
const { isExpired, isExpiringSoon } = require("../utils/dateHelpers");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Get staff dashboard (for individual staff member)
 */
exports.getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const staff = await prisma.staff.findUnique({
      where: { userId },
      include: {
        entity: true,
        certificates: true,
        user: true,
      },
    });

    if (!staff) {
      return next(new AppError("Staff profile not found", 404));
    }

    // Add status to each certificate
    const certificatesWithStatus = staff.certificates.map((cert) => ({
      ...cert,
      isExpired: isExpired(cert.validTo),
      isExpiringSoon: isExpiringSoon(cert.validTo, 30),
    }));

    res.json({
      success: true,
      data: {
        ...staff,
        certificates: certificatesWithStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update staff profile
 */
exports.updateMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fullName, designation, aadhaarNumber, department } = req.body;

    const staff = await prisma.staff.findUnique({
      where: { userId },
    });

    if (!staff) {
      return next(new AppError("Staff profile not found", 404));
    }

    // Create an Approval Request instead of directly updating
    const request = await prisma.approvalRequest.create({
      data: {
        entityType: "Staff",
        entityId: staff.id,
        action: "UPDATE",
        payload: {
          fullName,
          designation,
          aadhaarNumber,
          department,
        },
        requestedBy: userId,
        status: "PENDING",
      }
    });

    // Mark staff as pending theoretically, though the main record stays active
    await prisma.staff.update({
      where: { id: staff.id },
      data: { status: "PENDING" }
    });

    res.json({
      success: true,
      message: "Profile update submitted for CSO approval",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get my certificates
 */
exports.getMyCertificates = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const staff = await prisma.staff.findUnique({
      where: { userId },
    });

    if (!staff) {
      return next(new AppError("Staff profile not found", 404));
    }

    const certificates = await prisma.certificate.findMany({
      where: { staffId: staff.id },
      include: {
        staff: {
          include: {
            entity: true,
          },
        },
      },
      orderBy: { validTo: "asc" },
    });

    const certificatesWithStatus = certificates.map((cert) => ({
      ...cert,
      isExpired: isExpired(cert.validTo),
      isExpiringSoon: isExpiringSoon(cert.validTo, 30),
    }));

    res.json({
      success: true,
      data: certificatesWithStatus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new certificate (submit for approval)
 */
exports.createCertificate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type, validFrom, validTo, department, docUrl: stringDocUrl } = req.body;

    // Fix handling of doc file from upload vs manual string url
    let finalDocUrl = stringDocUrl || null;
    if (req.file) {
      finalDocUrl = `/uploads/documents/${req.file.filename}`;
    }

    // Get staff profile
    const staff = await prisma.staff.findUnique({
      where: { userId },
    });

    if (!staff) {
      return next(new AppError("Staff profile not found", 404));
    }

    // Create certificate with PENDING status
    const certificate = await prisma.certificate.create({
      data: {
        staffId: staff.id,
        type,
        department,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        docUrl: finalDocUrl,
        status: "PENDING", 
      },
    });

    // Create an Approval Request for the CSO
    await prisma.approvalRequest.create({
      data: {
        entityType: "Certificate",
        entityId: certificate.id,
        action: "CREATE",
        requestedBy: userId,
        status: "PENDING",
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: `Certificate created: ${type}`,
        userId: userId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Certificate submitted for CSO approval",
      data: certificate,
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
    const userId = req.user.id;
    const { id } = req.params;
    const { type, validFrom, validTo, department, docUrl: stringDocUrl } = req.body;

    // Get staff profile
    const staff = await prisma.staff.findUnique({
      where: { userId },
    });

    if (!staff) {
      return next(new AppError("Staff profile not found", 404));
    }

    // Verify certificate belongs to this staff
    const existing = await prisma.certificate.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return next(new AppError("Certificate not found", 404));
    }

    if (existing.staffId !== staff.id) {
      return next(new AppError("You can only update your own certificates", 403));
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

    // Create an Approval Request for the update
    await prisma.approvalRequest.create({
      data: {
        entityType: "Certificate",
        entityId: parseInt(id),
        action: "UPDATE",
        requestedBy: userId,
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
    const userId = req.user.id;
    const { id } = req.params;

    // Get staff profile
    const staff = await prisma.staff.findUnique({
      where: { userId },
    });

    if (!staff) {
      return next(new AppError("Staff profile not found", 404));
    }

    // Verify certificate belongs to this staff
    const certificate = await prisma.certificate.findUnique({
      where: { id: parseInt(id) },
    });

    if (!certificate) {
      return next(new AppError("Certificate not found", 404));
    }

    if (certificate.staffId !== staff.id) {
      return next(new AppError("You can only delete your own certificates", 403));
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

    // Create Approval Request instead of deleting directly
    await prisma.approvalRequest.create({
      data: {
        entityType: "Certificate",
        entityId: parseInt(id),
        action: "DELETE",
        requestedBy: userId,
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
