const express = require("express");

const {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
} = require("../controllers/productController");

const authMiddleware = require("../middleware/authMiddleware");
const businessMiddleware = require("../middleware/businessMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, businessMiddleware);

router.post("/", allowRoles("owner", "manager"), createProduct);
router.get("/", allowRoles("owner", "manager", "staff"), getProducts);
router.put("/:id", allowRoles("owner", "manager"), updateProduct);
router.delete("/:id", allowRoles("owner", "manager"), deleteProduct);
router.get(
  "/low-stock",
  allowRoles("owner", "manager", "staff"),
  getLowStockProducts,
);

module.exports = router;