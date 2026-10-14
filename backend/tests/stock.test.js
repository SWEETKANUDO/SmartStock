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
const Product = require("../src/models/Product");
const StockMovement = require("../src/models/StockMovement");

let mongoServer;
let user;
let business;
let category;
let product;
let token;

function createToken(userId, businessId) {
  return jwt.sign(
    {
      sub: userId.toString(),
      businessId: businessId.toString(),
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "1h" },
  );
}

describe("SmartStock Stock API", () => {
  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET || "test-secret-for-stock-tests";

    mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });

    await mongoose.connect(mongoServer.getUri());

    await Promise.all([
      User.init(),
      Business.init(),
      Membership.init(),
      Category.init(),
      Product.init(),
      StockMovement.init(),
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
      StockMovement.deleteMany({}),
      Product.deleteMany({}),
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

    category = await Category.create({
      name: "Grocery",
      businessId: business._id,
      description: "Test category",
      status: "active",
    });

    product = await Product.create({
      name: "Test Milk",
      sku: "MILK-001",
      businessId: business._id,
      categoryId: category._id,
      purchasePrice: 25,
      sellingPrice: 35,
      stockQuantity: 10,
      lowStockThreshold: 5,
      unit: "piece",
      status: "active",
    });

    token = createToken(user._id, business._id);
  });

  it("requires authentication to update stock", async () => {
    const response = await request(app)
      .patch(`/api/stock/${product._id}`)
      .send({ type: "in", quantity: 2 });

    expect(response.status).toBe(401);
  });

  it("increases stock when stock is added", async () => {
    const response = await request(app)
      .patch(`/api/stock/${product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "in",
        quantity: 5,
        note: "Automated stock-in test",
      });

    expect(response.status).toBe(200);
    expect(response.body.product.previousQuantity).toBe(10);
    expect(response.body.product.newQuantity).toBe(15);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stockQuantity).toBe(15);
  });

  it("decreases stock when stock is removed", async () => {
    const response = await request(app)
      .patch(`/api/stock/${product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "out",
        quantity: 3,
        note: "Automated stock-out test",
      });

    expect(response.status).toBe(200);
    expect(response.body.product.previousQuantity).toBe(10);
    expect(response.body.product.newQuantity).toBe(7);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stockQuantity).toBe(7);
  });

  it("rejects stock removal when stock is insufficient", async () => {
    const response = await request(app)
      .patch(`/api/stock/${product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "out",
        quantity: 11,
      });

    expect(response.status).toBe(400);

    const unchangedProduct = await Product.findById(product._id);
    expect(unchangedProduct.stockQuantity).toBe(10);

    const movementCount = await StockMovement.countDocuments({
      businessId: business._id,
      productId: product._id,
    });

    expect(movementCount).toBe(0);
  });

  it("saves stock movement in history", async () => {
    const updateResponse = await request(app)
      .patch(`/api/stock/${product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "in",
        quantity: 4,
        note: "History test",
      });

    expect(updateResponse.status).toBe(200);

    const historyResponse = await request(app)
      .get(`/api/stock-history/${product._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.count).toBe(1);
    expect(historyResponse.body.history[0].type).toBe("in");
    expect(historyResponse.body.history[0].quantity).toBe(4);
    expect(historyResponse.body.history[0].previousQuantity).toBe(10);
    expect(historyResponse.body.history[0].newQuantity).toBe(14);
  });

  it("does not allow another business to update this product", async () => {
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
      .patch(`/api/stock/${product._id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({
        type: "in",
        quantity: 5,
      });

    expect(response.status).toBe(404);

    const unchangedProduct = await Product.findById(product._id);
    expect(unchangedProduct.stockQuantity).toBe(10);

    const movementCount = await StockMovement.countDocuments({
      productId: product._id,
    });

    expect(movementCount).toBe(0);
  });

  it("allows staff to update stock", async () => {
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
      .patch(`/api/stock/${product._id}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        type: "in",
        quantity: 2,
        note: "Staff stock update test",
      });

    expect(response.status).toBe(200);
    expect(response.body.product.previousQuantity).toBe(10);
    expect(response.body.product.newQuantity).toBe(12);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stockQuantity).toBe(12);
  });

  it("rejects stock updates from a user without business membership", async () => {
    const otherUser = await User.create({
      name: "Unrelated User",
      email: "unrelated@example.com",
      passwordHash: "test-hash-only",
    });

    const unrelatedToken = createToken(otherUser._id, business._id);

    const response = await request(app)
      .patch(`/api/stock/${product._id}`)
      .set("Authorization", `Bearer ${unrelatedToken}`)
      .send({
        type: "in",
        quantity: 5,
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "You do not have access to this business",
    );

    const unchangedProduct = await Product.findById(product._id);
    expect(unchangedProduct.stockQuantity).toBe(10);

    const movementCount = await StockMovement.countDocuments({
      productId: product._id,
    });

    expect(movementCount).toBe(0);
  });

  it("rejects stock history access without business membership", async () => {
    // Create a user without membership in this business
    const unrelatedUser = await User.create({
      name: "Unrelated User",
      email: "history-user@example.com",
      passwordHash: "test-hash-only",
    });

    // Generate a token for the unrelated user
    const unrelatedToken = createToken(unrelatedUser._id, business._id);

    // Try to access stock history
    const response = await request(app)
      .get(`/api/stock-history/${product._id}`)
      .set("Authorization", `Bearer ${unrelatedToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "You do not have access to this business",
    );
  });
});
