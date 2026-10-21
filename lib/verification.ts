import crypto from "crypto";
import prisma from "@/lib/prisma";

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// The raw token travels only in the email link; the DB stores its sha256 hash
// so a leaked database cannot be used to confirm accounts.
export async function createVerificationToken(
  identifier: string
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashToken(token),
      expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)
    }
  });

  return token;
}

// Single-use: a valid token is deleted on consumption. Returns the email it
// was issued for, or null if missing/expired.
export async function consumeVerificationToken(
  token: string
): Promise<string | null> {
  const hashed = hashToken(token);

  const record = await prisma.verificationToken.findUnique({
    where: { token: hashed }
  });

  if (!record) return null;

  await prisma.verificationToken.delete({ where: { token: hashed } });

  if (record.expires < new Date()) return null;

  return record.identifier;
}
