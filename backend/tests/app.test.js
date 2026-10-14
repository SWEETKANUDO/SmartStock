import { describe, it, expect, beforeAll } from "vitest";
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");

describe("SmartStock API", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET || "test-secret-key";
  });

  it("returns a successful health response", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("returns 404 for unknown routes", async () => {
    const response = await request(app).get("/api/unknown-route");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Route not found");
  });

  it("rejects a request with an invalid token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("rejects a request with an expired token", async () => {
    const expiredToken = jwt.sign(
      { sub: "507f1f77bcf86cd799439011" },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "-1s" }
    );

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("rejects a request when the token is missing", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Access denied. Please login first."
    );
  });
});