import { describe, expect, it } from "vitest";

const { validateEnvironment } = require("../src/server");

describe("server environment validation", () => {
  const production = {
    NODE_ENV: "production",
    JWT_ACCESS_SECRET: "a".repeat(32),
    FRONTEND_URL: "https://smartstock.example.com",
  };

  it("rejects an unset or placeholder JWT secret", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        JWT_ACCESS_SECRET: "",
      }),
    ).toThrow("JWT_ACCESS_SECRET");
    expect(() =>
      validateEnvironment({
        ...production,
        JWT_ACCESS_SECRET: "replace_with_a_long_random_secret",
      }),
    ).toThrow("JWT_ACCESS_SECRET");
  });

  it("requires a strong JWT secret and HTTPS frontend origin in production", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        JWT_ACCESS_SECRET: "too-short",
      }),
    ).toThrow("JWT_ACCESS_SECRET");
    expect(() =>
      validateEnvironment({
        ...production,
        FRONTEND_URL: "http://smartstock.example.com",
      }),
    ).toThrow("HTTPS origin");
    expect(() =>
      validateEnvironment({
        ...production,
        FRONTEND_URL: "https://smartstock.example.com/path",
      }),
    ).toThrow("HTTPS origin");
    expect(() =>
      validateEnvironment({
        ...production,
        FRONTEND_URL: "",
      }),
    ).toThrow("FRONTEND_URL");
  });

  it("accepts a strong secret and HTTPS origin in production", () => {
    expect(() => validateEnvironment(production)).not.toThrow();
  });

  it("allows a local HTTP frontend origin outside production", () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: "development",
        JWT_ACCESS_SECRET: "development-secret",
        FRONTEND_URL: "http://localhost:5173",
      }),
    ).not.toThrow();
  });
});
