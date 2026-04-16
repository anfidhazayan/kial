const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const AppError = require("../utils/AppError");
const { sendApprovalNotification } = require("../services/emailService");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Handle approving or rejecting an ApprovalRequest
 */
exports.reviewApprovalRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const reviewerId = req.user.id;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return next(new AppError("Invalid status. Must be APPROVED or REJECTED", 400));
    }

    const request = await prisma.approvalRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        requester: true,
      }
    });

    if (!request) {
      return next(new AppError("Approval request not found", 404));
    }

    if (request.status !== "PENDING") {
      return next(new AppError("Request is already " + request.status, 400));
    }

    const { entityType, entityId, action, payload } = request;

    // Begin Transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mark request as Reviewed
      await tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status,
          reviewedBy: reviewerId,
        }
      });

      // 2. Apply the action if APPROVED
      if (status === "APPROVED") {
        const modelName = entityType.charAt(0).toLowerCase() + entityType.slice(1);

        if (action === "CREATE") {
          // Record was already created in 'PENDING' state. Just mark it APPROVED.
          // We catch errors in case the underlying record was deleted independently.
          await tx[modelName].update({
            where: { id: entityId },
            data: { status: "APPROVED" }
          }).catch(() => {});
        } 
        else if (action === "UPDATE") {
          // Merge payload into existing record
          if(payload) {
             let updateData = typeof payload === 'string' ? JSON.parse(payload) : payload;
             
             // Special case for Staff: email belongs to the User table
             if (entityType === "Staff" && updateData.email !== undefined) {
               const newEmail = updateData.email;
               delete updateData.email;
               const staff = await tx.staff.findUnique({ where: { id: entityId } });
               if (staff && staff.userId && newEmail) {
                 await tx.user.update({
                   where: { id: staff.userId },
                   data: { email: newEmail }
                 });
               }
             }

             await tx[modelName].update({
              where: { id: entityId },
              data: updateData
            });
          }
        } 
        else if (action === "DELETE") {
          // Delete the record
          await tx[modelName].delete({
            where: { id: entityId }
          });
        }
      } 
      else if (status === "REJECTED" && action === "CREATE") {
        // If it was a CREATE request and rejected, we delete the pending record
         const modelName = entityType.charAt(0).toLowerCase() + entityType.slice(1);
         await tx[modelName].delete({
            where: { id: entityId }
         }).catch(() => {});
      }

      // Log it
      await tx.auditLog.create({
        data: {
          action: `${status} ${action} request for ${entityType} #${entityId}`,
          userId: reviewerId,
        }
      });
    });

    res.json({
      success: true,
      message: `Request ${status.toLowerCase()} successfully`,
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all pending approval requests
 */
exports.getPendingRequests = async (req, res, next) => {
  try {
    const pending = await prisma.approvalRequest.findMany({
      where: { status: "PENDING" },
      include: {
        requester: {
          select: { fullName: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Populate current data for contextual diffing
    const enriched = await Promise.all(pending.map(async (req) => {
       const modelName = req.entityType.charAt(0).toLowerCase() + req.entityType.slice(1);
       let currentData = null;
       try {
          // Build include based on entity type for richer context
          let include = undefined;
          if (req.entityType === 'Certificate') {
            include = { staff: { include: { entity: true } } };
          } else if (req.entityType === 'Staff') {
            include = { entity: true, user: { select: { email: true } } };
          } else if (req.entityType === 'EntityCertificate') {
            include = { entity: true };
          }

          currentData = await prisma[modelName].findUnique({
            where: { id: req.entityId },
            ...(include ? { include } : {})
          });
       } catch(e) { /* ignore missing */ }

       return { ...req, currentData };
    }));

    res.json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get history of approval requests
 */
exports.getRequestHistory = async (req, res, next) => {
  try {
    const history = await prisma.approvalRequest.findMany({
      where: { 
        status: { in: ["APPROVED", "REJECTED"] }
      },
      include: {
        requester: { select: { fullName: true, role: true } },
        reviewer: { select: { fullName: true, role: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
