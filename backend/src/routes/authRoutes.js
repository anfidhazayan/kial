const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Validation middleware
const registerValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required"),
  body("role")
    .isIn(["CSO", "ENTITY_HEAD", "STAFF"])
    .withMessage("Invalid role"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

// Public routes
router.post("/register", registerValidation, authController.register);
router.post("/login", loginValidation, authController.login);

// Password change validation
const passwordChangeValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("Passwords do not match"),
];

// Protected routes
router.get("/me", authMiddleware.protect, authController.getMe);
router.post(
  "/change-password",
  authMiddleware.protect,
  passwordChangeValidation,
  authController.changePassword
);

// Get configured certificate types for dropdowns (accessible to all logged-in users)
router.get("/certificate-types", authMiddleware.protect, authController.getCertificateTypes);

module.exports = router;
