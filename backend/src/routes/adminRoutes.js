const router = require("express").Router();
const upload = require("../middleware/uploadMiddleware");
const docUpload = require("../middleware/docUploadMiddleware");
const importController = require("../controllers/importController");
const exportController = require("../controllers/exportController");
const adminController = require("../controllers/adminController");
const approvalController = require("../controllers/approvalController");
const globalApprovalController = require("../controllers/globalApprovalController");
const { restrictTo } = require("../middleware/roleMiddleware");
const {
  paginationQuery,
  idParam,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

// Dashboard
router.get("/dashboard", restrictTo("CSO"), adminController.getDashboardStats);

// Audit Logs
router.get(
  "/audit-logs",
  restrictTo("CSO"),
  paginationQuery,
  handleValidationErrors,
  adminController.getAuditLogs
);

// Entity Management
router.get(
  "/entities",
  restrictTo("CSO"),
  paginationQuery,
  handleValidationErrors,
  adminController.getAllEntities
);
router.get(
  "/entities/:id",
  restrictTo("CSO"),
  idParam,
  handleValidationErrors,
  adminController.getEntity
);
router.post("/entities", restrictTo("CSO"), adminController.upsertEntity);
router.put("/entities/:id", restrictTo("CSO"), adminController.upsertEntity);
router.delete("/entities/:id", restrictTo("CSO"), adminController.deleteEntity);
router.post("/entities/:id/reset-password", restrictTo("CSO"), adminController.resetEntityPassword);

// Entity Certificates
router.post(
  "/entity-certificates",
  restrictTo("CSO"),
  adminController.createEntityCertificate
);
router.put(
  "/entity-certificates/:id",
  restrictTo("CSO"),
  adminController.updateEntityCertificate
);
router.delete(
  "/entity-certificates/:id",
  restrictTo("CSO"),
  adminController.deleteEntityCertificate
);

// Staff Management
router.get(
  "/staff",
  restrictTo("CSO"),
  paginationQuery,
  handleValidationErrors,
  adminController.getAllStaff
);
router.delete("/staff/:id", restrictTo("CSO"), adminController.deleteStaff);
router.get("/staff/:id", restrictTo("CSO", "ENTITY_HEAD"), adminController.getStaffById);
router.post("/staff", restrictTo("CSO"), adminController.createStaff);
router.put("/staff/:id", restrictTo("CSO"), adminController.updateStaff);
router.post("/staff/:id/reset-password", restrictTo("CSO"), adminController.resetStaffPassword);

// Certificate Types Configuration
router.get("/certificate-types", restrictTo("CSO"), adminController.getCertificateTypes);
router.post("/certificate-types", restrictTo("CSO"), adminController.createCertificateType);
router.put("/certificate-types/:id", restrictTo("CSO"), adminController.updateCertificateType);
router.delete("/certificate-types/:id", restrictTo("CSO"), adminController.deleteCertificateType);

// Certificate Management (CSO Full Access)
router.get(
  "/certificates",
  restrictTo("CSO"),
  approvalController.getAllCertificates
);
router.post(
  "/certificates",
  restrictTo("CSO"),
  docUpload.single("document"),
  approvalController.createCertificate
);
router.put(
  "/certificates/:id",
  restrictTo("CSO"),
  docUpload.single("document"),
  approvalController.updateCertificate
);
router.delete(
  "/certificates/:id",
  restrictTo("CSO"),
  approvalController.deleteCertificate
);

// Approvals (using global approval controller for ApprovalRequest model)
router.get(
  "/approvals/pending",
  restrictTo("CSO"),
  globalApprovalController.getPendingRequests
);
router.get(
  "/approvals/history",
  restrictTo("CSO"),
  globalApprovalController.getRequestHistory
);
router.put(
  "/approvals/:id",
  restrictTo("CSO"),
  globalApprovalController.reviewApprovalRequest
);

// Data Import
router.post(
  "/import/entities",
  restrictTo("CSO"),
  upload.single("file"),
  importController.uploadEntityReport
);

router.post(
  "/import/kial-staff",
  restrictTo("CSO"),
  upload.single("file"),
  importController.uploadKialStaff
);

router.post(
  "/import/entity-staff/:entityCode",
  restrictTo("CSO"),
  upload.single("file"),
  importController.uploadEntityStaff
);

// Data Export
router.get("/export/entities", restrictTo("CSO"), exportController.exportEntities);
router.get("/export/staff", restrictTo("CSO"), exportController.exportStaff);

// Document Upload
router.post(
  "/upload/document",
  restrictTo("CSO", "ENTITY_HEAD"),
  docUpload.single("file"),
  adminController.uploadCertificateDoc
);

module.exports = router;
