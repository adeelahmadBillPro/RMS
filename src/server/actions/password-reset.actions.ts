"use server";

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/client";
import { passwordResetEmail } from "@/lib/email/templates/password-reset";
import { audit } from "@/lib/audit/log";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth.schema";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const TOKEN_BYTES = 32;
const TOKEN_TTL_MINUTES = 30;
const REQUEST_THROTTLE_SECONDS = 60; // refuse to issue more than one token/min per user

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function safeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Step 1 — User submits their email. We always return success, even if the
 * email isn't registered, to prevent account enumeration. If the user does
 * exist (and has a password — pure-OAuth users have no password to reset),
 * a one-time token is created and emailed to them.
 */
export async function requestPasswordReset(input: unknown): Promise<ActionResult<null>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please enter a valid email address.",
      fieldErrors: { email: parsed.error.issues[0]?.message ?? "Invalid email" },
    };
  }
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true },
  });

  // Don't reveal whether the email exists. But if it does, send the email.
  if (user && user.passwordHash) {
    // Throttle: refuse if a token was issued in the last REQUEST_THROTTLE_SECONDS
    const recent = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - REQUEST_THROTTLE_SECONDS * 1000) },
      },
      select: { id: true },
    });
    if (!recent) {
      const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

      // Invalidate older unused tokens for this user — only the newest link works.
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const appUrl = process.env.APP_URL ?? "http://localhost:3100";
      const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
      const tpl = passwordResetEmail({
        resetUrl,
        recipientName: user.name,
        expiresInMinutes: TOKEN_TTL_MINUTES,
      });
      const emailResult = await sendEmail({
        to: user.email,
        subject: "Reset your EasyMenu password",
        html: tpl.html,
        text: tpl.text,
      });
      if (!emailResult.ok) {
        // Log but don't surface (still return generic success to caller).
        console.error("[password-reset] email send failed:", emailResult.error);
      }
      await audit({ action: "PASSWORD_RESET_REQUESTED", userId: user.id });
    }
  }

  return { ok: true, data: null };
}

/**
 * Step 2 — User clicks the email link, lands on /reset-password?token=...,
 * and submits a new password. We verify the token, mark it used, and update
 * the user's password hash atomically.
 */
export async function resetPassword(input: unknown): Promise<ActionResult<null>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true, tokenHash: true },
  });
  if (!record) {
    return { ok: false, error: "This reset link is invalid or has already been used." };
  }
  // Constant-time compare against what we just hashed (defense in depth)
  if (!safeEquals(record.tokenHash, tokenHash)) {
    return { ok: false, error: "This reset link is invalid." };
  }
  if (record.usedAt) {
    return { ok: false, error: "This reset link has already been used." };
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This reset link has expired. Request a new one." };
  }

  const newHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: newHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other outstanding tokens for this user
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  await audit({ action: "PASSWORD_RESET_COMPLETED", userId: record.userId });
  return { ok: true, data: null };
}
