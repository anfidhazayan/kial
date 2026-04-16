const express = require("express");
const router = express.Router();
const entityController = require("../controllers/entityController");
const { restrictTo } = require("../middleware/roleMiddleware");
const docUpload = require("../middleware/docUploadMiddleware");

// Dashboard for Entity Head
router.get(
  "/dashboard",
  restrictTo("ENTITY_HEAD"),
  entityController.getEntityDashboard
);

// Staff Management
router.get("/staff", restrictTo("ENTITY_HEAD"), entityController.getMyStaff);
router.post("/staff", restrictTo("ENTITY_HEAD"), entityController.upsertStaff);
router.put(
  "/staff/:id",
  restrictTo("ENTITY_HEAD"),
  entityController.upsertStaff
);
router.delete(
  "/staff/:id",
  restrictTo("ENTITY_HEAD"),
  entityController.deleteStaff
);

// Certificate Management - Full CRUD
router.get(
  "/certificates",
  restrictTo("ENTITY_HEAD"),
  entityController.getMyCertificates
);
router.post(
  "/certificates",
  restrictTo("ENTITY_HEAD"),
  docUpload.single("document"),
  entityController.createCertificate
);
router.put(
  "/certificates/:id",
  restrictTo("ENTITY_HEAD"),
  docUpload.single("document"),
  entityController.updateCertificate
);
router.delete(
  "/certificates/:id",
  restrictTo("ENTITY_HEAD"),
  entityController.deleteCertificate
);

// Certificate Renewal Requests
router.post(
  "/certificates/renew",
  restrictTo("ENTITY_HEAD"),
  entityController.requestCertificateRenewal
);

// Entity Certificate Management
router.post(
  "/entity-certificates",
  restrictTo("ENTITY_HEAD"),
  docUpload.single("document"),
  entityController.createEntityCertificate
);
router.put(
  "/entity-certificates/:id",
  restrictTo("ENTITY_HEAD"),
  docUpload.single("document"),
  entityController.updateEntityCertificate
);
router.delete(
  "/entity-certificates/:id",
  restrictTo("ENTITY_HEAD"),
  entityController.deleteEntityCertificate
);

// Exports
router.get(
  "/export/staff",
  restrictTo("ENTITY_HEAD"),
  entityController.exportStaff
);

module.exports = router;
