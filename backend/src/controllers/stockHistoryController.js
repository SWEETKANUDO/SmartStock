
const mongoose = require("mongoose");

const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");

async function getStockHistory(req, res, next) {
  try {
    const productId = req.params.id;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      businessId: req.business._id,
    })
      .select("_id")
      .lean();

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const movements = await StockMovement.find({
      productId: product._id,
      businessId: req.business._id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      count: movements.length,
      history: movements,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getStockHistory };
