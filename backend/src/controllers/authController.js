const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { validationResult } = require("express-validator");
const AppError = require("../utils/AppError");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../services/authService");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Register new user
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, role, fullName } = req.body;

    // Validation
    if (!email || !password || !role || !fullName) {
      return next(new AppError("Please provide all required fields", 400));
    }

    if (!["CSO", "ENTITY_HEAD", "STAFF"].includes(role)) {
      return next(new AppError("Invalid role", 400));
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new AppError("User already exists with this email", 400));
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        fullName,
      },
    });

    // Generate token
    const token = generateToken(user.id, user.role);

    // Log action
    await prisma.auditLog.create({
      data: {
        action: `User registered: ${user.email}`,
        userId: user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((err) => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        staffProfile: true,
        managedEntity: true,
      },
    });

    if (!user) {
      return next(new AppError("Invalid email or password", 401));
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return next(new AppError("Invalid email or password", 401));
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Log action
    await prisma.auditLog.create({
      data: {
        action: `User logged in: ${user.email}`,
        userId: user.id,
      },
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          entityId: user.managedEntity?.id || user.staffProfile?.entityId || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user info
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        managedEntity: true,
        staffProfile: {
          include: {
            entity: true,
            certificates: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change user password
 */
exports.changePassword = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((err) => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return next(new AppError("Current password is incorrect", 401));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "Password changed",
        userId: userId,
        entityType: "User",
        entityId: userId,
      },
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get configured certificate types for dropdowns
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
