const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffController");
const { restrictTo } = require("../middleware/roleMiddleware");

const docUpload = require("../middleware/docUploadMiddleware");

// Staff Profile
router.get("/profile", restrictTo("STAFF"), staffController.getMyProfile);
router.put("/profile", restrictTo("STAFF"), staffController.updateMyProfile);

// Certificates - CRUD operations
router.get(
  "/certificates",
  restrictTo("STAFF"),
  staffController.getMyCertificates
);
router.post(
  "/certificates",
  restrictTo("STAFF"),
  docUpload.single("document"),
  staffController.createCertificate
);
router.put(
  "/certificates/:id",
  restrictTo("STAFF"),
  docUpload.single("document"),
  staffController.updateCertificate
);
router.delete(
  "/certificates/:id",
  restrictTo("STAFF"),
  staffController.deleteCertificate
);

module.exports = router;
