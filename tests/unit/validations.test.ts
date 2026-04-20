import { describe, it, expect } from "vitest";
import {
  emailSchema,
  passwordSignupSchema,
  phonePkSchema,
  cnicSchema,
  slugSchema,
} from "@/lib/validations/common.schema";
import { signupSchema } from "@/lib/validations/auth.schema";

describe("validations / common", () => {
  it("rejects bad email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
  it("accepts good email and lowercases", () => {
    const r = emailSchema.safeParse("OWNER@Cafe.com");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("owner@cafe.com");
  });

  it("password requires upper/lower/digit/symbol", () => {
    expect(passwordSignupSchema.safeParse("password").success).toBe(false);
    expect(passwordSignupSchema.safeParse("Password1").success).toBe(false);
    expect(passwordSignupSchema.safeParse("Password1!").success).toBe(true);
  });

  it("phone PK enforces 03xxxxxxxxx", () => {
    expect(phonePkSchema.safeParse("123").success).toBe(false);
    expect(phonePkSchema.safeParse("03001234567").success).toBe(true);
    expect(phonePkSchema.safeParse("04001234567").success).toBe(false);
  });

  it("cnic enforces XXXXX-XXXXXXX-X", () => {
    expect(cnicSchema.safeParse("123451234567X").success).toBe(false);
    expect(cnicSchema.safeParse("12345-1234567-1").success).toBe(true);
  });

  it("slug rejects reserved words", () => {
    expect(slugSchema.safeParse("admin").success).toBe(false);
    expect(slugSchema.safeParse("api").success).toBe(false);
    expect(slugSchema.safeParse("burger-hub").success).toBe(true);
  });
});

describe("validations / signup", () => {
  it("requires acceptTerms = true and matching passwords", () => {
    const bad = signupSchema.safeParse({
      name: "Demo Owner",
      email: "demo@cafe.com",
      password: "Password1!",
      confirmPassword: "Password2!",
      acceptTerms: true,
    });
    expect(bad.success).toBe(false);

    const ok = signupSchema.safeParse({
      name: "Demo Owner",
      email: "demo@cafe.com",
      password: "Password1!",
      confirmPassword: "Password1!",
      acceptTerms: true,
    });
    expect(ok.success).toBe(true);
  });
});
