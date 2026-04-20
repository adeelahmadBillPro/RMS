import { z } from "zod";
import { RESERVED_SLUGS } from "@/lib/config/app";

/**
 * Field-level Zod schemas (Addendum §7.2).
 * These are imported by per-module schemas — keep messages user-actionable.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Please enter your email")
  .max(254, "Email is too long")
  .email("Please enter a valid email (e.g., owner@cafe.com)");

export const passwordSignupSchema = z
  .string()
  .min(8, "Password needs 8+ chars with uppercase, lowercase, digit, and symbol")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password needs 8+ chars with uppercase, lowercase, digit, and symbol")
  .regex(/[a-z]/, "Password needs 8+ chars with uppercase, lowercase, digit, and symbol")
  .regex(/\d/, "Password needs 8+ chars with uppercase, lowercase, digit, and symbol")
  .regex(/[^A-Za-z0-9]/, "Password needs 8+ chars with uppercase, lowercase, digit, and symbol");

export const passwordLoginSchema = z.string().min(1, "Enter your password");

export const phonePkSchema = z
  .string()
  .trim()
  .regex(/^03\d{9}$/, "Phone must be 11 digits starting with 03 (e.g., 03001234567)");

export const cnicSchema = z
  .string()
  .trim()
  .regex(/^\d{5}-\d{7}-\d$/, "CNIC format: 12345-1234567-1");

export const personNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be 2–80 letters")
  .max(80, "Name must be 2–80 letters")
  .regex(/^[A-Za-z\u0600-\u06FF\s'\-]+$/, "Name must be 2–80 letters");

export const pinSchema = z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits");

/** Currency stored as integer paisa. Accept rupees from forms, convert at boundary. */
export const moneyRupeesSchema = z
  .number({ invalid_type_error: "Enter an amount" })
  .min(0, "Amount must be between 0 and 10,000,000 with up to 2 decimals")
  .max(10_000_000, "Amount must be between 0 and 10,000,000 with up to 2 decimals")
  .refine((n) => Number.isFinite(n) && Math.round(n * 100) === n * 100, {
    message: "Amount must be between 0 and 10,000,000 with up to 2 decimals",
  });

export const integerQtySchema = z
  .number()
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be 1 or more")
  .max(9999, "Quantity must be 9,999 or less");

export const decimalQtySchema = z
  .number()
  .min(0.001, "Minimum 0.001, up to 3 decimal places")
  .refine((n) => Number.isFinite(n) && Math.round(n * 1000) === n * 1000, {
    message: "Minimum 0.001, up to 3 decimal places",
  });

export const percentSchema = z
  .number()
  .min(0, "Must be between 0 and 100")
  .max(100, "Must be between 0 and 100");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "URL must be 3–40 characters (lowercase, numbers, hyphens)")
  .max(40, "URL must be 3–40 characters (lowercase, numbers, hyphens)")
  .regex(/^[a-z0-9-]+$/, "URL can only contain lowercase letters, numbers, and hyphens")
  .refine((s) => !s.startsWith("-") && !s.endsWith("-"), {
    message: "URL cannot start or end with a hyphen",
  })
  .refine((s) => !RESERVED_SLUGS.has(s), {
    message: "This URL is reserved — please choose another",
  });
