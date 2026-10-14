
const Product = require("../models/Product");

async function getDashboardSummary(req, res, next) {
  try {
    const businessId = req.business._id;

    const summary = await Product.aggregate([
      {
        $match: {
          businessId,
          status: "active",
        },
      },
      {
        $group: {
          _id: null,

          totalProducts: {
            $sum: 1,
          },

          totalStockUnits: {
            $sum: "$stockQuantity",
          },

          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $lte: ["$stockQuantity", "$lowStockThreshold"],
                },
                1,
                0,
              ],
            },
          },

          totalPurchaseValue: {
            $sum: {
              $multiply: ["$purchasePrice", "$stockQuantity"],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalProducts: 1,
          totalStockUnits: 1,
          lowStockCount: 1,
          totalPurchaseValue: 1,
        },
      },
    ]);

    const data = summary[0] || {
      totalProducts: 0,
      totalStockUnits: 0,
      lowStockCount: 0,
      totalPurchaseValue: 0,
    };

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboardSummary };
