const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * Hash password
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
function generateToken(userId, role) {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || "your-secret-key-change-in-production",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  return jwt.verify(
    token,
    process.env.JWT_SECRET || "your-secret-key-change-in-production"
  );
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};
