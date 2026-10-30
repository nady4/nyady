import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

/**
 * At-rest encryption for Meta access tokens stored in SocialAccount.tokenEnc.
 * The key is derived from NEXTAUTH_SECRET (already a server secret), so no
 * second secret needs to be managed. Blob format: iv|authTag|ciphertext, all
 * base64url.
 */

const ALGO = "aes-256-gcm";
const SALT = "nyady-mkt-tokens-v1";

function key(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("Falta NEXTAUTH_SECRET: no se pueden cifrar tokens de Meta");
  }
  return scryptSync(secret, SALT, 32);
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const cipherText = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    cipherText.toString("base64url"),
  ].join("|");
}

/** Returns null when the blob is malformed, tampered with, or the secret changed. */
export function decryptToken(blob: string): string | null {
  if (!blob) return null;
  const parts = blob.split("|");
  if (parts.length !== 3) return null;
  try {
    const [iv, tag, cipherText] = parts.map(
      (part) => new Uint8Array(Buffer.from(part, "base64url"))
    );
    const decipher = createDecipheriv(ALGO, key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString("utf8");
  } catch (error) {
    console.error("[marketing/crypto] decrypt failed:", error);
    return null;
  }
}
