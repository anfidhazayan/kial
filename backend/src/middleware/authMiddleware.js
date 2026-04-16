const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const AppError = require("../utils/AppError");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Protect routes - verify JWT token
 */
exports.protect = async (req, res, next) => {
  try {
    // 1. Get the token from the header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError("You are not logged in. Please log in to get access.", 401)
      );
    }

    // 2. Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
    );

    // 3. Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        staffProfile: true,
        managedEntity: true,
      },
    });

    if (!user) {
      return next(
        new AppError("The user belonging to this token no longer exists.", 401)
      );
    }

    // 4. Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      entityId: user.managedEntity?.id || user.staffProfile?.entityId || null,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Invalid token. Please log in again.", 401));
    }
    if (error.name === "TokenExpiredError") {
      return next(
        new AppError("Your token has expired. Please log in again.", 401)
      );
    }
    next(error);
  }
};
