const { validationResult } = require("express-validator");

/**
 * Middleware to handle validation errors from express-validator
 */
exports.handleValidationErrors = (req, res, next) => {
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
  
  next();
};

/**
 * Common validation rules
 */
const { body, param, query } = require("express-validator");

exports.idParam = param("id").isInt().withMessage("ID must be a valid integer");

exports.paginationQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

exports.entityValidation = [
  body("name").trim().notEmpty().withMessage("Entity name is required"),
  body("category")
    .isIn(["Airline", "Ground Handling", "Cargo", "Other"])
    .withMessage("Invalid category"),
  body("contactPerson").trim().notEmpty().withMessage("Contact person is required"),
  body("contactEmail")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid contact email is required"),
  body("contactPhone")
    .matches(/^[0-9]{10}$/)
    .withMessage("Contact phone must be 10 digits"),
];

exports.staffValidation = [
  body("fullName").trim().notEmpty().withMessage("Full name is required"),
  body("entityId").isInt().withMessage("Valid entity ID is required"),
  body("empCode").optional().trim(),
  body("aadhaarNumber")
    .optional()
    .matches(/^[0-9]{12}$/)
    .withMessage("Aadhaar number must be 12 digits"),
  body("mobile")
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage("Mobile number must be 10 digits"),
];

exports.certificateValidation = [
  body("staffId").isInt().withMessage("Valid staff ID is required"),
  body("type")
    .isIn(["AVSEC Training", "Police Clearance"])
    .withMessage("Invalid certificate type"),
  body("number").trim().notEmpty().withMessage("Certificate number is required"),
  body("validFrom").isISO8601().withMessage("Valid from date is required"),
  body("validTo").isISO8601().withMessage("Valid to date is required"),
];

exports.approvalValidation = [
  body("certificateId").isInt().withMessage("Valid certificate ID is required"),
  body("action")
    .isIn(["APPROVED", "REJECTED"])
    .withMessage("Action must be APPROVED or REJECTED"),
  body("remarks").optional().trim(),
];

module.exports = exports;
