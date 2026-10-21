import crypto from "crypto";
import prisma from "@/lib/prisma";

// Credential-change links get a shorter window than email confirmation
// (24h): 60 minutes is plenty for "I just clicked the email".
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Same design as the email-verification token (lib/verification.ts): the raw
// token travels only in the email link; the DB stores its sha256 hash so a
// leaked database can't be used to reset accounts. One active token per
// email — a new request invalidates the previous link.
export async function createPasswordResetToken(
  identifier: string
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");

  await prisma.passwordResetToken.deleteMany({ where: { identifier } });
  await prisma.passwordResetToken.create({
    data: {
      identifier,
      token: hashToken(token),
      expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });

  return token;
}

// Single-use: a valid token is deleted on consumption. Returns the email it
// was issued for, or null when missing/expired.
export async function consumePasswordResetToken(
  token: string
): Promise<string | null> {
  const hashed = hashToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { token: hashed },
  });

  if (!record) return null;

  await prisma.passwordResetToken.delete({ where: { token: hashed } });

  if (record.expires < new Date()) return null;

  return record.identifier;
}
