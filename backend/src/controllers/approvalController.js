const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const AppError = require("../utils/AppError");
const { sendApprovalNotification } = require("../services/emailService");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Approve or reject certificate renewal request
 */
exports.approveCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return next(
        new AppError("Invalid status. Must be APPROVED or REJECTED", 400)
      );
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id: parseInt(id) },
      include: {
        staff: {
          include: {
            entity: {
              include: {
                ascoUser: true,
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      return next(new AppError("Certificate not found", 404));
    }

    if (certificate.status !== "PENDING") {
      return next(new AppError("Certificate is not pending approval", 400));
    }

    // Update certificate based on approval status
    const updateData = {
      status,
    };

    if (status === "APPROVED") {
      // Move proposed values to actual values
      if (certificate.proposedValidTo) {
        updateData.validFrom = new Date();
        updateData.validTo = certificate.proposedValidTo;
      }
      if (certificate.proposedDocUrl) {
        updateData.docUrl = certificate.proposedDocUrl;
      }
      // Clear proposed fields
      updateData.proposedValidTo = null;
      updateData.proposedDocUrl = null;
    } else if (status === "REJECTED") {
      // Clear proposed fields on rejection
      updateData.proposedValidTo = null;
      updateData.proposedDocUrl = null;
    }

    const updatedCertificate = await prisma.certificate.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        staff: {
          include: {
            entity: true,
          },
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: `${status} certificate renewal for ${certificate.staff.fullName} - ${certificate.type}`,
        userId: req.user.id,
      },
    });

    // Send notification email to entity ASCO
    if (certificate.staff.entity?.ascoEmail) {
      await sendApprovalNotification(
        certificate.staff.entity.ascoEmail,
        certificate.staff.fullName,
        certificate.type,
        status
      );
    }

    res.json({
      success: true,
      message: `Certificate ${status.toLowerCase()} successfully`,
      data: updatedCertificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all pending approval requests
 */
exports.getPendingApprovals = async (req, res, next) => {
  try {
    const pendingCertificates = await prisma.certificate.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        staff: {
          include: {
            entity: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json({
      success: true,
      count: pendingCertificates.length,
      data: pendingCertificates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get approval history
 */
exports.getApprovalHistory = async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;

    const where = {};
    if (status && ["APPROVED", "REJECTED"].includes(status)) {
      where.status = status;
    } else {
      where.status = {
        in: ["APPROVED", "REJECTED"],
      };
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        staff: {
          include: {
            entity: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
      take: parseInt(limit),
    });

    res.json({
      success: true,
      count: certificates.length,
      data: certificates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all certificates (CSO)
 */
exports.getAllCertificates = async (req, res, next) => {
  try {
    const certificates = await prisma.certificate.findMany({
      include: {
        staff: {
          include: {
            entity: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json({
      success: true,
      count: certificates.length,
      data: certificates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create certificate (CSO)
 */
exports.createCertificate = async (req, res, next) => {
  try {
    const { staffId, type, validFrom, validTo, docUrl } = req.body;

    let finalDocUrl = docUrl || null;
    if (req.file) {
      finalDocUrl = `/uploads/documents/${req.file.filename}`;
    }

    const certificate = await prisma.certificate.create({
      data: {
        staffId: parseInt(staffId),
        type,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        docUrl: finalDocUrl,
        status: "APPROVED",
      },
      include: {
        staff: {
          include: {
            entity: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Certificate created successfully",
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update certificate (CSO)
 */
exports.updateCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, validFrom, validTo, docUrl, status } = req.body;

    let finalDocUrl = docUrl || undefined;
    if (req.file) {
      finalDocUrl = `/uploads/documents/${req.file.filename}`;
    }

    const certificate = await prisma.certificate.update({
      where: { id: parseInt(id) },
      data: {
        ...(type && { type }),
        ...(validFrom && { validFrom: new Date(validFrom) }),
        ...(validTo && { validTo: new Date(validTo) }),
        ...(finalDocUrl !== undefined && { docUrl: finalDocUrl }),
        ...(status && { status }),
      },
      include: {
        staff: {
          include: {
            entity: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Certificate updated successfully",
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete certificate (CSO)
 */
exports.deleteCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.certificate.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: "Certificate deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
