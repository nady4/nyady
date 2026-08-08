export const ADMIN_COOKIE = "nyady_admin_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getAdminSecret(): string {
  return (
    process.env.NEXTAUTH_SECRET || process.env.ADMIN_SECRET || "nyady-admin-dev"
  );
}

function getCredentials(): { username: string; password: string } {
  return {
    username: process.env.ADMIN_USERNAME || "nyady",
    password: process.env.ADMIN_PASSWORD || "nyady",
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array | null {
  if (!str || str.length === 0 || str.length % 4 === 1) return null;
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return toBase64Url(new Uint8Array(signature));
}

export async function signAdminToken(): Promise<string> {
  const { username } = getCredentials();
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({ u: username, exp: Date.now() + SESSION_TTL_MS })
    )
  );
  return `${payload}.${await sign(payload, getAdminSecret())}`;
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = await sign(payload, getAdminSecret());
  const sigBytes = fromBase64Url(signature);
  const expBytes = fromBase64Url(expected);
  if (!sigBytes || !expBytes) return false;

  if (sigBytes.length !== expBytes.length) return false;

  let same = 0;
  for (let i = 0; i < sigBytes.length; i++) {
    same |= sigBytes[i] ^ expBytes[i];
  }
  if (same !== 0) return false;

  try {
    const decoded = fromBase64Url(payload);
    if (!decoded) return false;
    const data = JSON.parse(new TextDecoder().decode(decoded)) as {
      u?: string;
      exp?: number;
    };
    if (typeof data.exp !== "number" || data.exp < Date.now()) return false;
    return data.u === getCredentials().username;
  } catch {
    return false;
  }
}

export function checkAdminCredentials(
  username: string,
  password: string
): boolean {
  const { username: expectedUser, password: expectedPass } = getCredentials();
  return username === expectedUser && password === expectedPass;
}
