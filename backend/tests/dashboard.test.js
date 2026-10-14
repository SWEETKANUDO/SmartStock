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

let mongoServer;
let user;
let business;
let category;
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

function productData(overrides = {}) {
  return {
    name: "Test Milk",
    sku: "MILK-001",
    businessId: business._id,
    categoryId: category._id,
    purchasePrice: 20,
    sellingPrice: 30,
    stockQuantity: 10,
    lowStockThreshold: 5,
    unit: "piece",
    status: "active",
    ...overrides,
  };
}

describe("SmartStock Dashboard API", () => {
  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET || "test-secret-for-dashboard-tests";

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
      Product.deleteMany({}),
      Category.deleteMany({}),
      Membership.deleteMany({}),
      Business.deleteMany({}),
      User.deleteMany({}),
    ]);

    user = await User.create({
      name: "Test Owner",
      email: "dashboard-owner@example.com",
      passwordHash: "test-hash-only",
    });

    business = await Business.create({
      name: "Dashboard Shop",
      slug: "dashboard-shop",
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
      description: "Grocery products",
      businessId: business._id,
    });

    token = createToken(user._id, business._id);
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/dashboard");

    expect(response.status).toBe(401);
  });

  it("returns zero values when no products exist", async () => {
    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalProducts: 0,
      totalStockUnits: 0,
      lowStockCount: 0,
      totalPurchaseValue: 0,
    });
  });

  it("calculates the dashboard summary correctly", async () => {
    await Product.create([
      productData({
        name: "Milk",
        sku: "MILK-001",
        purchasePrice: 20,
        stockQuantity: 10,
        lowStockThreshold: 5,
      }),
      productData({
        name: "Rice",
        sku: "RICE-001",
        purchasePrice: 40,
        stockQuantity: 3,
        lowStockThreshold: 5,
      }),
    ]);

    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalProducts: 2,
      totalStockUnits: 13,
      lowStockCount: 1,
      totalPurchaseValue: 320,
    });
  });

  it("ignores inactive products", async () => {
    await Product.create([
      productData({
        name: "Active Milk",
        sku: "MILK-001",
        stockQuantity: 10,
        purchasePrice: 20,
      }),
      productData({
        name: "Inactive Rice",
        sku: "RICE-001",
        stockQuantity: 50,
        purchasePrice: 100,
        status: "inactive",
      }),
    ]);

    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.totalProducts).toBe(1);
    expect(response.body.totalStockUnits).toBe(10);
    expect(response.body.lowStockCount).toBe(0);
    expect(response.body.totalPurchaseValue).toBe(200);
  });

  it("returns only the current business summary", async () => {
    await Product.create(
      productData({
        name: "My Milk",
        sku: "MILK-001",
        stockQuantity: 10,
        purchasePrice: 20,
      }),
    );

    const otherUser = await User.create({
      name: "Other Owner",
      email: "dashboard-other@example.com",
      passwordHash: "test-hash-only",
    });

    const otherBusiness = await Business.create({
      name: "Other Shop",
      slug: "dashboard-other-shop",
      industry: "grocery",
      ownerId: otherUser._id,
    });

    const otherCategory = await Category.create({
      name: "Other Grocery",
      businessId: otherBusiness._id,
    });

    await Product.create({
      name: "Other Rice",
      sku: "RICE-001",
      businessId: otherBusiness._id,
      categoryId: otherCategory._id,
      purchasePrice: 100,
      sellingPrice: 150,
      stockQuantity: 100,
      lowStockThreshold: 5,
      unit: "piece",
      status: "active",
    });

    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.totalProducts).toBe(1);
    expect(response.body.totalStockUnits).toBe(10);
    expect(response.body.totalPurchaseValue).toBe(200);
  });

  it("rejects dashboard access without business membership", async () => {
    const unrelatedUser = await User.create({
      name: "Unrelated User",
      email: "dashboard-unrelated@example.com",
      passwordHash: "test-hash-only",
    });

    const unrelatedToken = createToken(unrelatedUser._id, business._id);

    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${unrelatedToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "You do not have access to this business",
    );
  });

  it("allows staff to view the dashboard", async () => {
    await Product.create(
      productData({
        name: "Staff View Milk",
        sku: "STAFF-MILK-001",
        stockQuantity: 10,
        purchasePrice: 20,
      }),
    );

    const staffUser = await User.create({
      name: "Dashboard Staff",
      email: "dashboard-staff@example.com",
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
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.totalProducts).toBe(1);
    expect(response.body.totalStockUnits).toBe(10);
    expect(response.body.totalPurchaseValue).toBe(200);
  });
});
