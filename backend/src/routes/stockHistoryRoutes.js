const express = require("express");

const { getStockHistory } = require("../controllers/stockHistoryController");

const authMiddleware = require("../middleware/authMiddleware");
const businessMiddleware = require("../middleware/businessMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, businessMiddleware);

router.get("/:id", allowRoles("owner", "manager", "staff"), getStockHistory);

module.exports = router;
