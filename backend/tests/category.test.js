import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");
const Business = require("../src/models/Business");
const Membership = require("../src/models/Membership");
const Category = require("../src/models/Category");

let mongoServer;
let user;
let business;
let token;
let category;

function createToken(userId, businessId) {
  return jwt.sign(
    {
      sub: userId.toString(),
      businessId: businessId.toString(),
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "1h",
    },
  );
}

function categoryData(overrides = {}) {
  return {
    name: "Grocery",
    description: "Grocery products",
    ...overrides,
  };
}

describe("SmartStock Category API", () => {
  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET || "test-secret-for-category-tests";

    mongoServer = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
      },
    });

    await mongoose.connect(mongoServer.getUri());

    await Promise.all([
      User.init(),
      Business.init(),
      Membership.init(),
      Category.init(),
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([
      Category.deleteMany({}),
      Membership.deleteMany({}),
      Business.deleteMany({}),
      User.deleteMany({}),
    ]);

    user = await User.create({
      name: "Test Owner",
      email: "owner@example.com",
      passwordHash: "test-hash-only",
    });

    business = await Business.create({
      name: "Test Shop",
      slug: "test-shop",
      industry: "grocery",
      ownerId: user._id,
    });

    await Membership.create({
      userId: user._id,
      businessId: business._id,
      role: "owner",
    });

    token = createToken(user._id, business._id);
  });

  it("requires authentication to list categories", async () => {
    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(401);
  });

  it("creates a category successfully", async () => {
    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send(categoryData());

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Category created successfully");
    expect(response.body.category.name).toBe("Grocery");
    expect(response.body.category.description).toBe("Grocery products");
    expect(response.body.category.businessId).toBe(business._id.toString());
  });

  it("rejects invalid category details", async () => {
    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "A",
        description: "Invalid category",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid category details");
  });

  it("rejects a duplicate category name in the same business", async () => {
    await Category.create({
      ...categoryData(),
      businessId: business._id,
    });

    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send(categoryData());

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("This category already exists");
  });

  it("lists only the current business categories", async () => {
    await Category.create({
      ...categoryData(),
      businessId: business._id,
    });

    const otherUser = await User.create({
      name: "Other Owner",
      email: "other@example.com",
      passwordHash: "test-hash-only",
    });

    const otherBusiness = await Business.create({
      name: "Other Shop",
      slug: "other-shop",
      industry: "grocery",
      ownerId: otherUser._id,
    });

    await Category.create({
      name: "Electronics",
      description: "Electronic products",
      businessId: otherBusiness._id,
    });

    const response = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.categories[0].name).toBe("Grocery");
  });

  it("updates a category successfully", async () => {
    category = await Category.create({
      ...categoryData(),
      businessId: business._id,
    });

    const response = await request(app)
      .put(`/api/categories/${category._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Fresh Grocery",
        description: "Fresh grocery products",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Category updated successfully");
    expect(response.body.category.name).toBe("Fresh Grocery");
    expect(response.body.category.description).toBe("Fresh grocery products");
  });

  it("rejects invalid category update details", async () => {
    category = await Category.create({
      ...categoryData(),
      businessId: business._id,
    });

    const response = await request(app)
      .put(`/api/categories/${category._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "A",
        description: "Invalid",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid category details");
  });

  it("deletes a category successfully", async () => {
    category = await Category.create({
      ...categoryData(),
      businessId: business._id,
    });

    const response = await request(app)
      .delete(`/api/categories/${category._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Category deleted successfully");

    const deletedCategory = await Category.findById(category._id);

    expect(deletedCategory).toBeNull();
  });

  it("does not allow another business to update a category", async () => {
    category = await Category.create({
      ...categoryData(),
      businessId: business._id,
    });

    const otherUser = await User.create({
      name: "Other Owner",
      email: "other@example.com",
      passwordHash: "test-hash-only",
    });

    const otherBusiness = await Business.create({
      name: "Other Shop",
      slug: "other-shop",
      industry: "grocery",
      ownerId: otherUser._id,
    });

    await Membership.create({
      userId: otherUser._id,
      businessId: otherBusiness._id,
      role: "owner",
    });

    const otherToken = createToken(otherUser._id, otherBusiness._id);

    const response = await request(app)
      .put(`/api/categories/${category._id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({
        name: "Hacked Category",
        description: "Should not update",
      });

    expect(response.status).toBe(404);

    const unchangedCategory = await Category.findById(category._id);

    expect(unchangedCategory.name).toBe("Grocery");
  });

  it("does not allow another business to delete a category", async () => {
    category = await Category.create({
      ...categoryData(),
      businessId: business._id,
    });

    const otherUser = await User.create({
      name: "Other Owner",
      email: "other@example.com",
      passwordHash: "test-hash-only",
    });

    const otherBusiness = await Business.create({
      name: "Other Shop",
      slug: "other-shop",
      industry: "grocery",
      ownerId: otherUser._id,
    });

    await Membership.create({
      userId: otherUser._id,
      businessId: otherBusiness._id,
      role: "owner",
    });

    const otherToken = createToken(otherUser._id, otherBusiness._id);

    const response = await request(app)
      .delete(`/api/categories/${category._id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(response.status).toBe(404);

    const existingCategory = await Category.findById(category._id);

    expect(existingCategory).not.toBeNull();
    expect(existingCategory.name).toBe("Grocery");
  });

  it("rejects staff from creating categories", async () => {
    const staffUser = await User.create({
      name: "Test Staff",
      email: "staff@example.com",
      passwordHash: "test-hash-only",
    });

    await Membership.create({
      userId: staffUser._id,
      businessId: business._id,
      role: "staff",
      status: "active",
    });

    const staffToken = createToken(staffUser._id, business._id);

    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${staffToken}`)
      .send(categoryData({ name: "Staff Category" }));

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "You do not have permission to perform this action",
    );

    expect(
      await Category.findOne({
        name: "Staff Category",
        businessId: business._id,
      }),
    ).toBeNull();
  });

  it("allows staff to list categories", async () => {
    await Category.create({
      ...categoryData(),
      businessId: business._id,
    });

    const staffUser = await User.create({
      name: "Test Staff",
      email: "staff@example.com",
      passwordHash: "test-hash-only",
    });

    await Membership.create({
      userId: staffUser._id,
      businessId: business._id,
      role: "staff",
      status: "active",
    });

    const staffToken = createToken(staffUser._id, business._id);

    const response = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.categories[0].name).toBe("Grocery");
  });
});
