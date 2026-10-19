import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";

const mongoose = require("mongoose");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");
const Business = require("../src/models/Business");
const Membership = require("../src/models/Membership");

let mongoServer;

describe("SmartStock Authentication API", () => {
  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET || "test-secret-for-auth-tests";

    mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });

    await mongoose.connect(mongoServer.getUri());

    await Promise.all([User.init(), Business.init(), Membership.init()]);
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
  });

  const signupData = {
    name: "Test Owner",
    email: "owner@example.com",
    password: "test123",
    businessName: "Test Shop",
  };

  it("creates an account successfully", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send(signupData);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Account created successfully");
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.email).toBe("owner@example.com");
    expect(response.body.business.name).toBe("Test Shop");

    expect(await User.countDocuments()).toBe(1);
    expect(await Business.countDocuments()).toBe(1);
    expect(await Membership.countDocuments()).toBe(1);
  });

  it("rolls back account creation when membership creation fails", async () => {
    const createMembership = vi
      .spyOn(Membership, "create")
      .mockRejectedValueOnce(new Error("Membership write failed"));

    try {
      const response = await request(app)
        .post("/api/auth/signup")
        .send(signupData);

      expect(response.status).toBe(500);
      expect(await User.countDocuments()).toBe(0);
      expect(await Business.countDocuments()).toBe(0);
      expect(await Membership.countDocuments()).toBe(0);
    } finally {
      createMembership.mockRestore();
    }
  });

  it("stores a hashed password instead of plain text", async () => {
    await request(app).post("/api/auth/signup").send(signupData);

    const user = await User.findOne({
      email: "owner@example.com",
    }).select("+passwordHash");

    expect(user.passwordHash).not.toBe(signupData.password);

    const passwordMatches = await bcrypt.compare(
      signupData.password,
      user.passwordHash,
    );

    expect(passwordMatches).toBe(true);
  });

  it("rejects duplicate email registration", async () => {
    await request(app).post("/api/auth/signup").send(signupData);

    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        ...signupData,
        businessName: "Another Shop",
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Email is already registered");
  });

  it("rejects invalid signup details", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        ...signupData,
        email: "invalid-email",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Please check your input");
  });

  it("logs in with the correct password", async () => {
    await request(app).post("/api/auth/signup").send(signupData);

    const response = await request(app).post("/api/auth/login").send({
      email: signupData.email,
      password: signupData.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful");
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.email).toBe("owner@example.com");
    expect(response.body.business.name).toBe("Test Shop");
  });

  it("rejects an incorrect password", async () => {
    await request(app).post("/api/auth/signup").send(signupData);

    const response = await request(app).post("/api/auth/login").send({
      email: signupData.email,
      password: "wrong123",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("rejects login for a disabled user", async () => {
    await request(app).post("/api/auth/signup").send(signupData);

    await User.updateOne(
      { email: signupData.email },
      { $set: { status: "disabled" } },
    );

    const response = await request(app).post("/api/auth/login").send({
      email: signupData.email,
      password: signupData.password,
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("rejects login when the owner's membership is disabled", async () => {
    await request(app).post("/api/auth/signup").send(signupData);

    const user = await User.findOne({
      email: signupData.email,
    });

    await Membership.updateOne(
      { userId: user._id },
      { $set: { status: "disabled" } },
    );

    const response = await request(app).post("/api/auth/login").send({
      email: signupData.email,
      password: signupData.password,
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("No active business membership found");
  });
});
