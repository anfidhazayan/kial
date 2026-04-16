const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");
const { isExpired, isExpiringSoon } = require("../utils/dateHelpers");
const { generatePassword } = require("../utils/passwordGenerator");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Get dashboard statistics for CSO
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Total counts
    const totalEntities = await prisma.entity.count();
    const totalStaff = await prisma.staff.count();
    const totalCertificates = await prisma.certificate.count();

    // Expiry analysis
    const allCertificates = await prisma.certificate.findMany({
      where: { status: "APPROVED" },
      include: {
        staff: {
          include: {
            entity: true,
          },
        },
      },
    });

    let expiredCount = 0;
    let expiringSoonCount = 0;
    let validCount = 0;

    const expiringStaffCertificates = [];
    
    allCertificates.forEach((cert) => {
      let isExp = false;
      let isExpSoon = false;

      if (isExpired(cert.validTo)) {
        expiredCount++;
        isExp = true;
      } else if (isExpiringSoon(cert.validTo, 30)) {
        expiringSoonCount++;
        isExpSoon = true;
      } else {
        validCount++;
      }

      if (isExp || isExpSoon) {
        expiringStaffCertificates.push({
          id: cert.id,
          type: cert.type,
          validTo: cert.validTo,
          status: isExp ? "Expired" : "Expiring Soon",
          staffId: cert.staff.id,
          staffName: cert.staff.fullName,
          department: cert.staff.department,
          isKialStaff: cert.staff.isKialStaff,
          entityName: cert.staff.isKialStaff ? "KIAL Staff" : cert.staff.entity?.name || "Unassigned",
        });
      }
    });

    // Check Entities for Expiry
    const allEntities = await prisma.entity.findMany();
    const expiringEntities = [];

    allEntities.forEach((entity) => {
      let expiredIssues = [];
      let expiringSoonIssues = [];

      if (isExpired(entity.contractValidTo)) expiredIssues.push("Contract");
      else if (isExpiringSoon(entity.contractValidTo, 30)) expiringSoonIssues.push("Contract");

      if (isExpired(entity.securityClearanceTo)) expiredIssues.push("Security Clearance");
      else if (isExpiringSoon(entity.securityClearanceTo, 30)) expiringSoonIssues.push("Security Clearance");

      if (isExpired(entity.securityProgramTo)) expiredIssues.push("Security Program");
      else if (isExpiringSoon(entity.securityProgramTo, 30)) expiringSoonIssues.push("Security Program");

      if (expiredIssues.length > 0 || expiringSoonIssues.length > 0) {
        expiringEntities.push({
          id: entity.id,
          name: entity.name,
          category: entity.category,
          expiredIssues,
          expiringSoonIssues,
        });
      }
    });

    // Generate Expiration Rankings
    const entityRankingMap = {};
    const kialRankingMap = {};
    
    expiringStaffCertificates.forEach((cert) => {
      if (cert.isKialStaff) {
        const deptName = cert.department || "Unassigned KIAL Department";
        if (!kialRankingMap[deptName]) {
          kialRankingMap[deptName] = { name: deptName, expired: 0, expiringSoon: 0, totalIssues: 0, type: "Internal Department" };
        }
        if (cert.status === "Expired") kialRankingMap[deptName].expired++;
        if (cert.status === "Expiring Soon") kialRankingMap[deptName].expiringSoon++;
        kialRankingMap[deptName].totalIssues++;
      } else {
        const orgName = cert.entityName || "Unknown Entity";
        if (!entityRankingMap[orgName]) {
          entityRankingMap[orgName] = { name: orgName, expired: 0, expiringSoon: 0, totalIssues: 0, type: "External Entity" };
        }
        if (cert.status === "Expired") entityRankingMap[orgName].expired++;
        if (cert.status === "Expiring Soon") entityRankingMap[orgName].expiringSoon++;
        entityRankingMap[orgName].totalIssues++;
      }
    });

    expiringEntities.forEach((entity) => {
      const orgName = entity.name;
      if (!entityRankingMap[orgName]) {
        entityRankingMap[orgName] = { name: orgName, expired: 0, expiringSoon: 0, totalIssues: 0, type: "External Entity" };
      }
      entityRankingMap[orgName].expired += entity.expiredIssues.length;
      entityRankingMap[orgName].expiringSoon += entity.expiringSoonIssues.length;
      entityRankingMap[orgName].totalIssues += (entity.expiredIssues.length + entity.expiringSoonIssues.length);
    });

    const expirationRankingsEntities = Object.values(entityRankingMap).sort((a, b) => b.totalIssues - a.totalIssues);
    const expirationRankingsKial = Object.values(kialRankingMap).sort((a, b) => b.totalIssues - a.totalIssues);

    // Sort the list descending by validTo (closest to far, assuming null mapped low)
    expiringStaffCertificates.sort((a, b) => new Date(a.validTo || 0) - new Date(b.validTo || 0));

    // Pending approvals
    const pendingApprovals = await prisma.certificate.count({
      where: { status: "PENDING" },
    });

    // Entity distribution by category
    const entities = await prisma.entity.findMany({
      include: { _count: { select: { staffMembers: true } } },
    });
    const categoryMap = {};
    entities.forEach((e) => {
      const cat = e.category || "Uncategorized";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const entityDistribution = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Staff distribution by entity (top entities + others)
    const staffByEntity = {};
    const allStaff = await prisma.staff.findMany({
      include: { entity: true },
    });
    allStaff.forEach((s) => {
      const entityName = s.isKialStaff ? "KIAL Staff" : (s.entity?.name || "Unassigned");
      staffByEntity[entityName] = (staffByEntity[entityName] || 0) + 1;
    });
    const sortedStaffDist = Object.entries(staffByEntity)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    // Show top 5, group rest as "Others"
    const topEntities = sortedStaffDist.slice(0, 5);
    const othersCount = sortedStaffDist.slice(5).reduce((sum, e) => sum + e.value, 0);
    const staffDistribution = othersCount > 0
      ? [...topEntities, { name: "Others", value: othersCount }]
      : topEntities;

    // Recent activities
    const recentLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: "desc" },
      include: {
        user: true,
      },
    });

    res.json({
      success: true,
      data: {
        totals: {
          entities: totalEntities,
          staff: totalStaff,
          certificates: totalCertificates,
        },
        compliance: {
          expired: expiredCount,
          expiringSoon: expiringSoonCount,
          valid: validCount,
        },
        pendingApprovals,
        entityDistribution,
        staffDistribution,
        recentActivities: recentLogs,
        expiringStaffCertificates,
        expiringEntities,
        expirationRankingsEntities,
        expirationRankingsKial,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all entities with their compliance status
 */
exports.getAllEntities = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.entity.count();

    const entities = await prisma.entity.findMany({
      skip,
      take: limit,
      include: {
        ascoUser: true,
        staffMembers: {
          include: {
            certificates: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Add compliance status to each entity
    const entitiesWithStatus = entities.map((entity) => {
      let expired = 0;
      let expiringSoon = 0;
      let valid = 0;

      // Check entity-level dates
      if (isExpired(entity.contractValidTo)) expired++;
      else if (isExpiringSoon(entity.contractValidTo, 30)) expiringSoon++;

      if (isExpired(entity.securityClearanceTo)) expired++;
      else if (isExpiringSoon(entity.securityClearanceTo, 30)) expiringSoon++;

      if (isExpired(entity.securityProgramTo)) expired++;
      else if (isExpiringSoon(entity.securityProgramTo, 30)) expiringSoon++;

      // Check staff certificates
      entity.staffMembers.forEach((staff) => {
        staff.certificates.forEach((cert) => {
          if (cert.status !== "APPROVED") return;
          if (isExpired(cert.validTo)) expired++;
          else if (isExpiringSoon(cert.validTo, 30)) expiringSoon++;
          else valid++;
        });
      });

      return {
        ...entity,
        complianceStatus: {
          expired,
          expiringSoon,
          valid,
          overallStatus:
            expired > 0 ? "RED" : expiringSoon > 0 ? "AMBER" : "GREEN",
        },
      };
    });

    res.json({
      success: true,
      data: entitiesWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all staff members with their details
 */
exports.getAllStaff = async (req, res, next) => {
  try {
    const { entityId, search, isKialStaff } = req.query;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const where = {};
    if (isKialStaff !== undefined) where.isKialStaff = isKialStaff === 'true';
    if (entityId) where.entityId = parseInt(entityId);
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { empCode: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count with same filters
    const total = await prisma.staff.count({ where });

    const staff = await prisma.staff.findMany({
      where,
      skip,
      take: limit,
      include: {
        entity: true,
        certificates: true,
        user: true,
      },
      orderBy: { fullName: "asc" },
    });

    res.json({
      success: true,
      data: staff,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single staff member by ID (CSO can view any, Entity Head can view own)
 */
exports.getStaffById = async (req, res, next) => {
  try {
    const staffId = parseInt(req.params.id);

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        entity: true,
        certificates: true,
        user: true,
      },
    });

    if (!staff) {
      return next(new AppError("Staff member not found", 404));
    }

    // Entity heads can only view their own staff
    if (req.user.role === "ENTITY_HEAD" && staff.entityId !== req.user.entityId) {
      return next(new AppError("You can only view your own staff", 403));
    }

    res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single entity by ID with all details
 */
exports.getEntity = async (req, res, next) => {
  try {
    const { id } = req.params;

    const entity = await prisma.entity.findUnique({
      where: { id: parseInt(id) },
      include: {
        ascoUser: true,
        certificates: {
          orderBy: { validTo: "asc" },
        },
        staffMembers: {
          include: {
            certificates: {
              orderBy: { validTo: "asc" },
            },
            user: true,
          },
          orderBy: { fullName: "asc" },
        },
      },
    });

    if (!entity) {
      return next(new AppError("Entity not found", 404));
    }

    res.json({
      success: true,
      data: entity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create entity certificate
 */
exports.createEntityCertificate = async (req, res, next) => {
  try {
    const { entityId, type, validFrom, validTo, docUrl } = req.body;

    const certificate = await prisma.entityCertificate.create({
      data: {
        entityId: parseInt(entityId),
        type,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        docUrl: docUrl || null,
        status: "APPROVED",
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        action: `Created entity certificate: ${type} for entity ID ${entityId}`,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: "Entity certificate created successfully",
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update entity
 */
exports.upsertEntity = async (req, res, next) => {
  try {
    const { id, ...data } = req.body;

    let entity;
    if (id) {
      entity = await prisma.entity.update({
        where: { id: parseInt(id) },
        data,
        include: { ascoUser: true },
      });
    } else {
      // Auto-generate password for new entities
      if (!data.password) {
        const plainPassword = generatePassword();
        data.password = plainPassword;
        
        // Create user account if ASCO email is provided
        if (data.ascoEmail && data.ascoEmail.includes("@")) {
          const hashedPassword = await bcrypt.hash(plainPassword, 10);
          const user = await prisma.user.upsert({
            where: { email: data.ascoEmail },
            update: {},
            create: {
              email: data.ascoEmail,
              fullName: data.ascoName || "Entity Head",
              role: "ENTITY_HEAD",
              passwordHash: hashedPassword,
            },
          });
          data.ascoUserId = user.id;
        }
      }

      entity = await prisma.entity.create({
        data,
        include: { ascoUser: true },
      });
    }

    // Log action
    await prisma.auditLog.create({
      data: {
        action: id
          ? `Updated entity: ${entity.name}`
          : `Created entity: ${entity.name}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      data: entity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset entity ASCO password (CSO only)
 */
exports.resetEntityPassword = async (req, res, next) => {
  try {
    const entityId = parseInt(req.params.id);
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      include: { ascoUser: true },
    });

    if (!entity) {
      return next(new AppError("Entity not found", 404));
    }

    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update entity password
    await prisma.entity.update({
      where: { id: entityId },
      data: { password: newPassword },
    });

    // Update user password if ASCO user exists
    if (entity.ascoUserId) {
      await prisma.user.update({
        where: { id: entity.ascoUserId },
        data: { passwordHash: hashedPassword },
      });
    }

    res.json({
      success: true,
      data: { password: newPassword },
      message: "Entity password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete entity
 */
exports.deleteEntity = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cascade delete: staff and certificates
    const entity = await prisma.entity.findUnique({
      where: { id: parseInt(id) },
      include: {
        staffMembers: true,
      },
    });

    if (!entity) {
      return next(new AppError("Entity not found", 404));
    }

    // Delete certificates for all staff
    for (const staff of entity.staffMembers) {
      await prisma.certificate.deleteMany({
        where: { staffId: staff.id },
      });
    }

    // Delete staff members
    await prisma.staff.deleteMany({
      where: { entityId: parseInt(id) },
    });

    // Delete Entity Certificates
    await prisma.entityCertificate.deleteMany({
      where: { entityId: parseInt(id) },
    });

    // Capture ascoUserId before deleting entity, to clean up the user later
    const ascoUserId = entity.ascoUserId;

    // Delete entity
    await prisma.entity.delete({
      where: { id: parseInt(id) },
    });

    // Delete the ASCO user account if it existed
    if (ascoUserId) {
      await prisma.user.delete({
        where: { id: ascoUserId },
      }).catch(() => {});
    }

    await prisma.auditLog.create({
      data: {
        action: `Deleted entity: ${entity.name} with ${entity.staffMembers.length} staff`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Entity and associated staff deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete staff member
 */
exports.deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({
      where: { id: parseInt(id) },
    });

    if (!staff) {
      return next(new AppError("Staff member not found", 404));
    }

    // Delete certificates
    await prisma.certificate.deleteMany({
      where: { staffId: parseInt(id) },
    });

    // Delete staff
    await prisma.staff.delete({
      where: { id: parseInt(id) },
    });

    await prisma.auditLog.create({
      data: {
        action: `Deleted staff: ${staff.fullName}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending approvals
 */
exports.getPendingApprovals = async (req, res, next) => {
  try {
    const pendingCertificates = await prisma.certificate.findMany({
      where: { status: "PENDING" },
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
      data: pendingCertificates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve or reject certificate
 */
exports.approveCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return next(new AppError("Invalid status", 400));
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

    // Update certificate
    const updateData = {
      status,
    };

    if (status === "APPROVED") {
      updateData.validFrom = certificate.proposedValidTo
        ? new Date()
        : certificate.validFrom;
      updateData.validTo = certificate.proposedValidTo || certificate.validTo;
      updateData.docUrl = certificate.proposedDocUrl || certificate.docUrl;
      updateData.proposedValidTo = null;
      updateData.proposedDocUrl = null;
    }

    const updatedCertificate = await prisma.certificate.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        action: `${status} certificate ${certificate.type} for ${certificate.staff.fullName}`,
        userId: req.user.id,
      },
    });

    // Send notification email
    const emailService = require("../services/emailService");
    if (certificate.staff.entity?.ascoEmail) {
      await emailService.sendApprovalNotification(
        certificate.staff.entity.ascoEmail,
        certificate.staff.fullName,
        certificate.type,
        status
      );
    }

    res.json({
      success: true,
      data: updatedCertificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset staff password (CSO only)
 */
exports.resetStaffPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({
      where: { id: parseInt(id) },
      include: { user: true },
    });

    if (!staff) {
      return next(new AppError("Staff member not found", 404));
    }

    // Generate new password
    const newPassword = generatePassword();

    // Update Staff.password (plaintext for CSO reference)
    await prisma.staff.update({
      where: { id: parseInt(id) },
      data: { password: newPassword },
    });

    // Update User.passwordHash if user account exists
    if (staff.userId) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: staff.userId },
        data: { passwordHash: hashedPassword },
      });
    }

    // Log action
    await prisma.auditLog.create({
      data: {
        action: `Password reset for staff: ${staff.fullName}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Password reset successfully",
      data: { password: newPassword },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create staff member (CSO)
 */
exports.createStaff = async (req, res, next) => {
  try {
    const {
      fullName, designation, department, empCode, aadhaarNumber,
      aepNumber, terminals, airportsGiven, zones, phoneNumber,
      entityId, isKialStaff, email,
    } = req.body;

    if (!fullName) {
      return next(new AppError("Full name is required", 400));
    }

    // Auto-generate password
    const plainPassword = generatePassword();

    // Create user account if email provided
    let userConnect = {};
    if (email && email.includes("@")) {
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          fullName,
          role: "STAFF",
          passwordHash: hashedPassword,
        },
      });
      userConnect = { user: { connect: { id: user.id } } };
    }

    const staff = await prisma.staff.create({
      data: {
        fullName,
        designation: designation || null,
        department: department || null,
        empCode: empCode || null,
        aadhaarNumber: aadhaarNumber || null,
        aepNumber: aepNumber || null,
        terminals: terminals || null,
        airportsGiven: airportsGiven || null,
        zones: zones || [],
        phoneNumber: phoneNumber || null,
        isKialStaff: isKialStaff ?? true,
        password: plainPassword,
        ...(entityId ? { entity: { connect: { id: parseInt(entityId) } } } : {}),
        ...userConnect,
      },
      include: {
        entity: true,
        certificates: true,
        user: true,
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        action: `Created staff: ${fullName}`,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update staff member (CSO)
 */
exports.updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      fullName, designation, department, empCode, aadhaarNumber,
      aepNumber, terminals, airportsGiven, zones, phoneNumber,
      entityId, isKialStaff, email,
    } = req.body;

    const existing = await prisma.staff.findUnique({
      where: { id: parseInt(id) },
      include: { user: true },
    });

    if (!existing) {
      return next(new AppError("Staff member not found", 404));
    }

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (designation !== undefined) updateData.designation = designation;
    if (department !== undefined) updateData.department = department;
    if (empCode !== undefined) updateData.empCode = empCode || null;
    if (aadhaarNumber !== undefined) updateData.aadhaarNumber = aadhaarNumber;
    if (aepNumber !== undefined) updateData.aepNumber = aepNumber;
    if (terminals !== undefined) updateData.terminals = terminals;
    if (airportsGiven !== undefined) updateData.airportsGiven = airportsGiven;
    if (zones !== undefined) updateData.zones = zones;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (isKialStaff !== undefined) updateData.isKialStaff = isKialStaff;
    if (entityId !== undefined) updateData.entityId = entityId ? parseInt(entityId) : null;

    // Handle Email / User account updates
    if (email !== undefined) {
      const cleanEmail = email.trim();
      if (cleanEmail && cleanEmail.includes("@")) {
        // If a valid email is provided
        if (existing.userId) {
          // Update existing user email
          await prisma.user.update({
            where: { id: existing.userId },
            data: { email: cleanEmail, fullName: fullName || existing.fullName },
          });
        } else {
          // Create new user account for this staff
          const plainPassword = existing.password || generatePassword();
          const hashedPassword = await bcrypt.hash(plainPassword, 10);
          
          const newUser = await prisma.user.upsert({
            where: { email: cleanEmail },
            update: { fullName: fullName || existing.fullName }, // Update if somehow exists
            create: {
              email: cleanEmail,
              fullName: fullName || existing.fullName,
              role: "STAFF",
              passwordHash: hashedPassword,
            },
          });
          
          updateData.userId = newUser.id;
          if (!existing.password) {
             updateData.password = plainPassword;
          }
        }
      }
    }

    const staff = await prisma.staff.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        entity: true,
        certificates: true,
        user: true,
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        action: `Updated staff: ${staff.fullName}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Staff member updated successfully",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update entity certificate (CSO)
 */
exports.updateEntityCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, validFrom, validTo, docUrl, status } = req.body;

    const certificate = await prisma.entityCertificate.update({
      where: { id: parseInt(id) },
      data: {
        ...(type && { type }),
        ...(validFrom !== undefined && { validFrom: validFrom ? new Date(validFrom) : null }),
        ...(validTo !== undefined && { validTo: validTo ? new Date(validTo) : null }),
        ...(docUrl !== undefined && { docUrl }),
        ...(status && { status }),
      },
      include: { entity: true },
    });

    await prisma.auditLog.create({
      data: {
        action: `Updated entity certificate: ${certificate.type}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Entity certificate updated successfully",
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete entity certificate (CSO)
 */
exports.deleteEntityCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const certificate = await prisma.entityCertificate.findUnique({
      where: { id: parseInt(id) },
    });

    if (!certificate) {
      return next(new AppError("Entity certificate not found", 404));
    }

    await prisma.entityCertificate.delete({
      where: { id: parseInt(id) },
    });

    await prisma.auditLog.create({
      data: {
        action: `Deleted entity certificate: ${certificate.type}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Entity certificate deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload certificate document file (CSO)
 * Returns the file URL after upload
 */
exports.uploadCertificateDoc = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError("No file uploaded", 400));
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;

    res.json({
      success: true,
      message: "File uploaded successfully",
      data: { url: fileUrl },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Configure Certificate Types (CSO)
 * Triggers restart
 */

exports.getCertificateTypes = async (req, res, next) => {
  try {
    const { applicableTo, department } = req.query;
    const where = {};
    if (applicableTo) {
      if (applicableTo !== 'ALL') {
        where.OR = [
          { applicableTo },
          { applicableTo: 'ALL' }
        ];
      } else {
        where.applicableTo = applicableTo;
      }
    }
    
    // Add department filtering if provided
    if (department && applicableTo === 'KIAL') {
      where.AND = [
        {
          OR: [
            { department: department },
            { department: 'ALL' },
            { department: null }
          ]
        }
      ];
    }

    const types = await prisma.configuredCertificateType.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    next(error);
  }
};

exports.createCertificateType = async (req, res, next) => {
  try {
    const { name, applicableTo, description, department } = req.body;

    if (!name) {
      return next(new AppError("Certificate type name is required", 400));
    }

    const type = await prisma.configuredCertificateType.create({
      data: {
        name,
        applicableTo: applicableTo || "ALL",
        description,
        department: applicableTo === "KIAL" ? (department || null) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: `Created certificate type: ${name}`,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: "Certificate type created successfully",
      data: type,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError("Certificate type with this name already exists", 400));
    }
    next(error);
  }
};

exports.updateCertificateType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, applicableTo, description, department } = req.body;

    const type = await prisma.configuredCertificateType.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(applicableTo && { applicableTo }),
        ...(description !== undefined && { description }),
        department: (applicableTo || 'KIAL') === 'KIAL' ? (department || null) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: `Updated certificate type: ${type.name}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Certificate type updated successfully",
      data: type,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError("Certificate type with this name already exists", 400));
    }
    next(error);
  }
};

exports.deleteCertificateType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await prisma.configuredCertificateType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!type) {
      return next(new AppError("Certificate type not found", 404));
    }

    await prisma.configuredCertificateType.delete({
      where: { id: parseInt(id) },
    });

    await prisma.auditLog.create({
      data: {
        action: `Deleted certificate type: ${type.name}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: "Certificate type deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Audit Logs
 */
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    
    const logs = await prisma.auditLog.findMany({
      take: parseInt(limit),
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    next(error);
  }
};
