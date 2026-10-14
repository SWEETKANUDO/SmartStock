const express = require("express");
const {
  signup,
  login,
  getMe,
  getBusiness,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const businessMiddleware = require("../middleware/businessMiddleware");
const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);
router.get("/business", authMiddleware, businessMiddleware, getBusiness);

module.exports = router;
