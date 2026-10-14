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
let product;

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
    categoryId: category._id.toString(),
    purchasePrice: 25,
    sellingPrice: 35,
    stockQuantity: 10,
    lowStockThreshold: 5,
    unit: "piece",
    ...overrides,
  };
}

describe("SmartStock Product API", () => {
  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET || "test-secret-for-product-tests";

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

    token = createToken(user._id, business._id);
  });

  it("requires authentication to list products", async () => {
    const response = await request(app).get("/api/products");

    expect(response.status).toBe(401);
  });

  it("creates a product and converts SKU to uppercase", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(productData({ sku: "milk-001" }));

    expect(response.status).toBe(201);
    expect(response.body.product.name).toBe("Test Milk");
    expect(response.body.product.sku).toBe("MILK-001");
    expect(response.body.product.stockQuantity).toBe(10);

    product = response.body.product;
  });

  it("rejects invalid product details", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(productData({ name: "A", purchasePrice: -1 }));

    expect(response.status).toBe(400);
  });

  it("rejects a category belonging to another business", async () => {
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

    const otherCategory = await Category.create({
      name: "Other Grocery",
      businessId: otherBusiness._id,
      status: "active",
    });

    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(productData({ categoryId: otherCategory._id.toString() }));

    expect(response.status).toBe(400);
  });

  it("lists only the current business products", async () => {
    await Product.create({
      ...productData(),
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

    await Product.create({
      ...productData({ sku: "OTHER-001" }),
      businessId: otherBusiness._id,
    });

    const response = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.products[0].sku).toBe("MILK-001");
  });

  it("updates a product", async () => {
    product = await Product.create({
      ...productData(),
      businessId: business._id,
    });

    const response = await request(app)
      .put(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ sellingPrice: 40, name: "Fresh Milk" });

    expect(response.status).toBe(200);
    expect(response.body.product.name).toBe("Fresh Milk");
    expect(response.body.product.sellingPrice).toBe(40);
  });

  it("rejects an empty product update", async () => {
    product = await Product.create({
      ...productData(),
      businessId: business._id,
    });

    const response = await request(app)
      .put(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it("deletes a product", async () => {
    product = await Product.create({
      ...productData(),
      businessId: business._id,
    });

    const response = await request(app)
      .delete(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(await Product.findById(product._id)).toBeNull();
  });

  it("does not allow another business to update a product", async () => {
    product = await Product.create({
      ...productData(),
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
      .put(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ sellingPrice: 999 });

    expect(response.status).toBe(404);

    const unchangedProduct = await Product.findById(product._id);
    expect(unchangedProduct.sellingPrice).toBe(35);
  });

  it("rejects staff from creating products", async () => {
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
      .post("/api/products")
      .set("Authorization", `Bearer ${staffToken}`)
      .send(productData({ sku: "STAFF-001" }));

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "You do not have permission to perform this action",
    );

    expect(await Product.findOne({ sku: "STAFF-001" })).toBeNull();
  });

  it("allows staff to list products", async () => {
    await Product.create({
      ...productData(),
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
      .get("/api/products")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
  });
});
