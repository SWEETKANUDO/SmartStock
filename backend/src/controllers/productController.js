const { z } = require("zod");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");

const productSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    sku: z.string().trim().min(1).max(50),
    categoryId: z
      .string()
      .refine((id) => mongoose.isValidObjectId(id), "Invalid category ID"),
    purchasePrice: z.number().finite().min(0),
    sellingPrice: z.number().finite().min(0),
    stockQuantity: z.number().int().min(0),
    lowStockThreshold: z.number().int().min(0).optional().default(5),
    unit: z
      .enum(["piece", "kg", "gram", "litre", "ml", "pack", "box"])
      .optional()
      .default("piece"),
  })
  .strict();

async function createProduct(req, res, next) {
  try {
    const parsed = productSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid product details",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const category = await Category.findOne({
      _id: parsed.data.categoryId,
      businessId: req.business._id,
      status: "active",
    });

    if (!category) {
      return res.status(400).json({
        message: "Category not found in your business",
      });
    }

    const product = await Product.create({
      ...parsed.data,
      sku: parsed.data.sku.toUpperCase(),
      businessId: req.business._id,
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This SKU already exists in your business",
      });
    }

    return next(error);
  }
}

async function getProducts(req, res, next) {
  try {
    const products = await Product.find({
      businessId: req.business._id,
    })
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: products.length,
      products,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const productId = req.params.id;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const body = req.body;

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length === 0
    ) {
      return res.status(400).json({
        message: "At least one field is required to update a product",
      });
    }

    const parsed = productSchema.partial().safeParse(body);

    if (!parsed.success || Object.keys(parsed.data || {}).length === 0) {
      return res.status(400).json({
        message: "Invalid product details",
        errors: parsed.success
          ? []
          : parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
      });
    }

    const updateData = { ...parsed.data };

    if (updateData.sku !== undefined) {
      updateData.sku = updateData.sku.toUpperCase();
    }

    if (updateData.categoryId !== undefined) {
      const category = await Category.findOne({
        _id: updateData.categoryId,
        businessId: req.business._id,
        status: "active",
      });

      if (!category) {
        return res.status(400).json({
          message: "Category not found in your business",
        });
      }
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: productId,
        businessId: req.business._id,
      },
      {
        $set: updateData,
      },
      { returnDocument: "after", runValidators: true },
    ).populate("categoryId", "name");

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This SKU already exists in your business",
      });
    }

    return next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const productId = req.params.id;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOneAndDelete({
      _id: productId,
      businessId: req.business._id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    return next(error);
  }
}

async function getLowStockProducts(req, res, next) {
  try {
    const products = await Product.find({
      businessId: req.business._id,
      status: "active",
      $expr: {
        $lte: ["$stockQuantity", "$lowStockThreshold"],
      },
    }).sort({ stockQuantity: 1 });

    return res.status(200).json({
      count: products.length,
      products,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
};
