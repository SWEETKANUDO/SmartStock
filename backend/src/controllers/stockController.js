const mongoose = require("mongoose");
const { z } = require("zod");

const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");

const stockSchema = z
  .object({
    type: z.enum(["in", "out"]),
    quantity: z.number().int().positive().safe(),
    note: z.string().trim().max(200).optional().default(""),
  })
  .strict();

async function updateStock(req, res, next) {
  let session;

  try {
    const productId = req.params.id;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const parsed = stockSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid stock details",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { type, quantity, note } = parsed.data;

    session = await mongoose.startSession();

    let result;

    await session.withTransaction(async () => {
      const product = await Product.findOne({
        _id: productId,
        businessId: req.business._id,
        status: "active",
      }).session(session);

      if (!product) {
        result = {
          status: 404,
          body: {
            message: "Product not found",
          },
        };

        return;
      }

      const previousQuantity = product.stockQuantity;

      const newQuantity =
        type === "in"
          ? previousQuantity + quantity
          : previousQuantity - quantity;

      if (!Number.isSafeInteger(newQuantity) || newQuantity < 0) {
        result = {
          status: 400,
          body: {
            message: "Insufficient stock or invalid quantity",
            availableStock: previousQuantity,
          },
        };

        return;
      }

      product.stockQuantity = newQuantity;

      await product.save({ session });

      await StockMovement.create(
        [
          {
            businessId: req.business._id,
            productId: product._id,
            type,
            quantity,
            previousQuantity,
            newQuantity,
            note,
            createdBy: req.userId,
          },
        ],
        { session },
      );

      result = {
        status: 200,
        body: {
          message: "Stock updated successfully",
          product: {
            id: product._id,
            name: product.name,
            previousQuantity,
            newQuantity,
            lowStock: newQuantity <= product.lowStockThreshold,
          },
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = { updateStock };
