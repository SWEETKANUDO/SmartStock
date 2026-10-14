
const express = require("express");

const { updateStock } = require("../controllers/stockController");
const authMiddleware = require("../middleware/authMiddleware");
const businessMiddleware = require("../middleware/businessMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, businessMiddleware);

router.patch(
  "/:id",
  allowRoles("owner", "manager", "staff"),
  updateStock,
);

module.exports = router;
