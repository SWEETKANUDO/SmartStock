
const express = require("express");

const {
  getDashboardSummary,
} = require("../controllers/dashboardController");

const authMiddleware = require("../middleware/authMiddleware");
const businessMiddleware = require("../middleware/businessMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, businessMiddleware);

router.get(
  "/",
  allowRoles("owner", "manager", "staff"),
  getDashboardSummary,
);

module.exports = router;
