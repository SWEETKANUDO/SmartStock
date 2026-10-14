
const mongoose = require("mongoose");
const Membership = require("../models/Membership");
const Business = require("../models/Business");

async function businessMiddleware(req, res, next) {
  try {
    const userId = req.userId;
    const businessId = req.businessId;

    if (
      !mongoose.isValidObjectId(userId) ||
      !mongoose.isValidObjectId(businessId)
    ) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    const membership = await Membership.findOne({
      userId,
      businessId,
      status: "active",
    });

    if (!membership) {
      return res.status(403).json({
        message: "You do not have access to this business",
      });
    }

    const business = await Business.findOne({
      _id: businessId,
      status: "active",
    });

    if (!business) {
      return res.status(403).json({
        message: "Business is not active",
      });
    }

    req.membership = membership;
    req.business = business;

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = businessMiddleware;
