
const express = require("express");

const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const authMiddleware = require("../middleware/authMiddleware");
const businessMiddleware = require("../middleware/businessMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, businessMiddleware);

router.post("/", allowRoles("owner", "manager"), createCategory);

router.get("/", allowRoles("owner", "manager", "staff"), getCategories);

router.put("/:id", allowRoles("owner", "manager"), updateCategory);

router.delete("/:id", allowRoles("owner", "manager"), deleteCategory);

module.exports = router;
