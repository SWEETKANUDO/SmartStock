import { describe, it, expect } from "vitest";
const mongoose = require("mongoose");
const buildTenantFilter = require("../src/utils/tenantQuery");

describe("Tenant query security", () => {
  it("always uses the authorized business ID", () => {
    const authorizedId = new mongoose.Types.ObjectId();
    const otherBusinessId = new mongoose.Types.ObjectId();

    const filter = buildTenantFilter(authorizedId, {
      name: "Milk",
      businessId: otherBusinessId,
    });

    expect(filter.businessId.toString()).toBe(authorizedId.toString());
  });

  it("rejects an invalid business ID", () => {
    expect(() => {
      buildTenantFilter("not-a-valid-id");
    }).toThrow("Invalid business ID");
  });
});
