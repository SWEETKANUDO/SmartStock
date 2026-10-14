import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const User = require("../src/models/User");
const Business = require("../src/models/Business");
const Membership = require("../src/models/Membership");

let mongoServer;

describe("SmartStock models", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(mongoServer.getUri());

    await Promise.all([User.init(), Business.init(), Membership.init()]);
  });

  afterEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Business.deleteMany({}),
      Membership.deleteMany({}),
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

  it("creates a business membership", async () => {
    const user = await User.create({
      name: "Test Owner",
      email: "owner@example.com",
      passwordHash: "test-hash-only",
    });

    const business = await Business.create({
      name: "Test Shop",
      slug: "test-shop",
      industry: "grocery",
      ownerId: user._id,
    });

    const membership = await Membership.create({
      userId: user._id,
      businessId: business._id,
      role: "owner",
    });

    expect(membership.role).toBe("owner");
    expect(membership.status).toBe("active");
  });

  it("rejects duplicate memberships", async () => {
    const user = await User.create({
      name: "Test Owner",
      email: "owner@example.com",
      passwordHash: "test-hash-only",
    });

    const business = await Business.create({
      name: "Test Shop",
      slug: "test-shop",
      industry: "grocery",
      ownerId: user._id,
    });

    const membership = {
      userId: user._id,
      businessId: business._id,
      role: "owner",
    };

    await Membership.create(membership);

    await expect(Membership.create(membership)).rejects.toMatchObject({
      code: 11000,
    });
  });
});
