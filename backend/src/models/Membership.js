const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    role: {
      type: String,
      enum: ["owner", "manager", "staff"],
      required: true,
      default: "staff",
    },

    status: {
      type: String,
      enum: ["active", "invited", "disabled"],
      default: "active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

membershipSchema.index({ userId: 1, businessId: 1 }, { unique: true });

membershipSchema.index({ businessId: 1, status: 1, role: 1 });

module.exports = mongoose.model("Membership", membershipSchema);
