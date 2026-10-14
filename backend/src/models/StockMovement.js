
const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["in", "out", "adjustment"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Quantity must be a whole number",
      },
    },

    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Previous quantity must be a safe whole number",
      },
    },

    newQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "New quantity must be a safe whole number",
      },
    },

    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

stockMovementSchema.index({
  businessId: 1,
  productId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("StockMovement", stockMovementSchema);
