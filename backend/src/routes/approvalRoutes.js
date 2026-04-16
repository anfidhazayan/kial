const express = require("express");
const router = express.Router();
const globalApprovalController = require("../controllers/globalApprovalController");
const { restrictTo } = require("../middleware/roleMiddleware");

// Get pending approvals
router.get(
  "/pending",
  restrictTo("CSO"),
  globalApprovalController.getPendingRequests
);

// Get approval history
router.get(
  "/history",
  restrictTo("CSO"),
  globalApprovalController.getRequestHistory
);

// Approve or reject any request
router.put("/:id", restrictTo("CSO"), globalApprovalController.reviewApprovalRequest);

module.exports = router;
