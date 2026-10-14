const mongoose = require("mongoose");

function buildTenantFilter(businessId, filters = {}) {
  if (!mongoose.isValidObjectId(businessId)) {
    const error = new Error("Invalid business ID");
    error.statusCode = 400;
    throw error;
  }

  return {
    ...filters,
    businessId: new mongoose.Types.ObjectId(businessId),
  };
}

module.exports = buildTenantFilter;
