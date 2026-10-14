import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");
const Business = require("../src/models/Business");
const Membership = require("../src/models/Membership");

let mongoServer;
let user;
let business;
let membership;
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

describe("Business Middleware Security", () => {
  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET || "test-secret-for-business-tests";

    mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });

    await mongoose.connect(mongoServer.getUri());

    await Promise.all([
      User.init(),
      Business.init(),
      Membership.init(),
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
      status: "active",
    });

    membership = await Membership.create({
      userId: user._id,
      businessId: business._id,
      role: "owner",
      status: "active",
    });

    token = createToken(user._id, business._id);
  });

  it("allows access when membership and business are active", async () => {
    const response = await request(app)
      .get("/api/auth/business")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it("rejects access when membership is disabled", async () => {
    membership.status = "disabled";
    await membership.save();

    const response = await request(app)
      .get("/api/auth/business")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "You do not have access to this business",
    );
  });

  it("rejects access when business is suspended", async () => {
    business.status = "suspended";
    await business.save();

    const response = await request(app)
      .get("/api/auth/business")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Business is not active");
  });
});