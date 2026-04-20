import { describe, it, expect } from "vitest";
import { branchCreateSchema, branchUpdateSchema } from "@/lib/validations/branch.schema";

describe("validations / branch", () => {
  const valid = {
    name: "Main branch",
    address: "Plot 7",
    phone: "03001234567",
    isPrimary: true,
    taxBps: 1700,
    serviceBps: 0,
  };

  it("accepts a clean payload", () => {
    expect(branchCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects too-short name", () => {
    expect(branchCreateSchema.safeParse({ ...valid, name: "X" }).success).toBe(false);
  });

  it("rejects out-of-range tax", () => {
    expect(branchCreateSchema.safeParse({ ...valid, taxBps: 10_001 }).success).toBe(false);
  });

  it("update requires id and isActive", () => {
    expect(branchUpdateSchema.safeParse({ ...valid, isActive: true }).success).toBe(false);
    expect(
      branchUpdateSchema.safeParse({ ...valid, id: "ckxxxxxxxxxxxxxxxxxxxxxxx", isActive: true })
        .success,
    ).toBe(true);
  });

  it("treats blank phone as optional", () => {
    expect(branchCreateSchema.safeParse({ ...valid, phone: "" }).success).toBe(true);
    expect(branchCreateSchema.safeParse({ ...valid, phone: undefined }).success).toBe(true);
  });
});
