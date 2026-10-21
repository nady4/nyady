import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  SESSION_TTL_MS,
  checkAdminCredentials,
  signAdminToken,
  verifyAdminToken,
} from "@/lib/admin-token";

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

/**
 * Guard for admin server actions: standard unauthorized result when the
 * session cookie is missing/invalid. Every mutation must call this.
 */
export async function ensureAdmin(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (await isAdmin()) return { ok: true };
  return { ok: false, error: "No autorizado" };
}

export async function signInAdmin(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!checkAdminCredentials(username, password)) {
    return { ok: false, error: "Usuario o contraseña incorrectos" };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, await signAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return { ok: true };
}

export async function signOutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
