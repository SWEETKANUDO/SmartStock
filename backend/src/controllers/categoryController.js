
const mongoose = require("mongoose");
const { z } = require("zod");

const Category = require("../models/Category");
const Product = require("../models/Product");

const categorySchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    description: z.string().trim().max(200).optional().default(""),
  })
  .strict();

async function createCategory(req, res, next) {
  try {
    const parsed = categorySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid category details",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const category = await Category.create({
      ...parsed.data,
      businessId: req.business._id,
    });

    return res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This category already exists",
      });
    }

    return next(error);
  }
}

async function getCategories(req, res, next) {
  try {
    const categories = await Category.find({
      businessId: req.business._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: categories.length,
      categories,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const categoryId = req.params.id;

    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({
        message: "Invalid category ID",
      });
    }

    const parsed = categorySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid category details",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const category = await Category.findOneAndUpdate(
      {
        _id: categoryId,
        businessId: req.business._id,
      },
      {
        $set: parsed.data,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    return res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This category name already exists",
      });
    }

    return next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const categoryId = req.params.id;

    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({
        message: "Invalid category ID",
      });
    }

    const category = await Category.findOne({
      _id: categoryId,
      businessId: req.business._id,
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    const hasProducts = await Product.exists({
      categoryId: category._id,
      businessId: req.business._id,
    });

    if (hasProducts) {
      return res.status(409).json({
        message: "Cannot delete a category that has products",
      });
    }

    await Category.deleteOne({
      _id: category._id,
      businessId: req.business._id,
    });

    return res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};
