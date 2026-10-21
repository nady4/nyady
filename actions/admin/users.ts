"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { ensureAdmin } from "@/lib/admin";
import { createVerificationToken } from "@/lib/verification";
import { sendVerificationEmail, getAppUrl } from "@/lib/email";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";
import type {
  AdminActionResult,
  AdminUserCreateInput,
  AdminUserEditInput,
} from "@/types/admin";

const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function revalidateUsers(userId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  if (userId) revalidatePath(`/admin/usuarios/${userId}`);
}

/**
 * Send the confirmation email for an unverified user. Throws when Resend is
 * not configured in production, so callers can surface a friendly error.
 */
async function sendUserVerification(user: { email: string; username: string }) {
  const token = await createVerificationToken(user.email);
  await sendVerificationEmail({
    to: user.email,
    username: user.username,
    url: `${getAppUrl()}/api/auth/verify-email?token=${token}`,
  });
}

export async function createUserAction(
  input: AdminUserCreateInput
): Promise<AdminActionResult & { userId?: string }> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const username = (input.username ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const password = input.password ?? "";

  if (username.length < 3 || username.length > 40) {
    return { ok: false, error: "El nombre de usuario debe tener entre 3 y 40 caracteres" };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Ingresá un email válido" };
  }
  if (password.length < PASSWORD_MIN) {
    return { ok: false, error: `La contraseña necesita al menos ${PASSWORD_MIN} caracteres` };
  }

  try {
    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.user.findFirst({ where: { username }, select: { id: true } }),
    ]);
    if (existingEmail) {
      return { ok: false, error: "Ya existe una cuenta con ese email" };
    }
    if (existingUsername) {
      return { ok: false, error: "Ese nombre de usuario ya está en uso" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        emailVerified: input.verified ? new Date() : null,
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
        ...(input.street?.trim() &&
        input.city?.trim() &&
        input.state?.trim() &&
        input.postalCode?.trim()
          ? {
              address: {
                create: {
                  street: input.street.trim(),
                  city: input.city.trim(),
                  state: input.state.trim(),
                  postalCode: input.postalCode.trim(),
                  country: "AR",
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    revalidateUsers(user.id);
    return { ok: true, userId: user.id };
  } catch (error) {
    console.error("[admin/users] create failed:", error);
    return { ok: false, error: "No se pudo crear el usuario" };
  }
}

/**
 * Edit username/email. Changing the email clears verification (the new
 * address must be confirmed) — the admin can force-verify from the detail
 * page when needed. Sessions carry the old email until the user signs in
 * again; only username is read from JWT for UI purposes.
 */
export async function updateUserAction(
  userId: string,
  input: AdminUserEditInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const username = (input.username ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();

  if (username.length < 3 || username.length > 40) {
    return { ok: false, error: "El nombre de usuario debe tener entre 3 y 40 caracteres" };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Ingresá un email válido" };
  }

  try {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!current) return { ok: false, error: "Usuario no encontrado" };

    const emailChanged = current.email !== email;
    if (emailChanged) {
      const taken = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (taken) {
        return { ok: false, error: "Ese email ya pertenece a otra cuenta" };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        email,
        ...(emailChanged ? { emailVerified: null } : {}),
      },
    });

    revalidateUsers(userId);
    return { ok: true };
  } catch (error) {
    console.error("[admin/users] update failed:", error);
    return { ok: false, error: "No se pudo actualizar el usuario" };
  }
}

export async function setUserVerifiedAction(
  userId: string,
  verified: boolean
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) return { ok: false, error: "Usuario no encontrado" };

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: verified ? new Date() : null },
    });

    if (!verified) {
      // Pending confirmation links for a de-verified account are revoked.
      await prisma.verificationToken.deleteMany({
        where: { identifier: user.email },
      });
    }

    revalidateUsers(userId);
    return { ok: true };
  } catch (error) {
    console.error("[admin/users] verified toggle failed:", error);
    return { ok: false, error: "No se pudo actualizar la verificación" };
  }
}

export async function resendUserVerificationAction(
  userId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true, emailVerified: true },
  });
  if (!user) return { ok: false, error: "Usuario no encontrado" };
  if (user.emailVerified) {
    return { ok: false, error: "La cuenta ya está verificada" };
  }

  try {
    await sendUserVerification(user);
  } catch (error) {
    console.error("[admin/users] verification email failed:", error);
    return {
      ok: false,
      error: "No se pudo enviar el email: configurá RESEND_API_KEY o marcá la cuenta como verificada",
    };
  }

  revalidateUsers(userId);
  return { ok: true };
}

export async function resetUserPasswordAction(
  userId: string,
  newPassword: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  if (!newPassword || newPassword.length < PASSWORD_MIN) {
    return { ok: false, error: `La contraseña necesita al menos ${PASSWORD_MIN} caracteres` };
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  } catch (error) {
    console.error("[admin/users] password reset failed:", error);
    return { ok: false, error: "No se pudo actualizar la contraseña" };
  }

  revalidateUsers(userId);
  return { ok: true };
}

/**
 * Soft delete: archived users can't sign in (blocked in lib/auth.ts). Their
 * orders and history are preserved; carts/wishlists become meaningless and
 * are cleaned.
 */
export async function archiveUserAction(
  userId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { archivedAt: new Date() },
      }),
      prisma.cart.deleteMany({ where: { userId } }),
      prisma.wishList.deleteMany({ where: { userId } }),
    ]);
  } catch (error) {
    console.error("[admin/users] archive failed:", error);
    return { ok: false, error: "No se pudo archivar el usuario" };
  }

  revalidateUsers(userId);
  return { ok: true };
}

export async function restoreUserAction(
  userId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { archivedAt: null },
    });
  } catch (error) {
    console.error("[admin/users] restore failed:", error);
    return { ok: false, error: "No se pudo restaurar el usuario" };
  }

  revalidateUsers(userId);
  return { ok: true };
}

/**
 * Permanent delete — blocked for users with orders (their rows reference the
 * user; archiving is the safe path when there is history). Deletes the
 * address, tokens and the account itself.
 */
export async function deleteUserPermanentlyAction(
  userId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, addressId: true, _count: { select: { orders: true } } },
  });
  if (!user) return { ok: false, error: "Usuario no encontrado" };
  if (user._count.orders > 0) {
    return {
      ok: false,
      error: "El usuario tiene pedidos: usá archivar para conservar el historial",
    };
  }

  try {
    await prisma.$transaction([
      prisma.cart.deleteMany({ where: { userId } }),
      prisma.wishList.deleteMany({ where: { userId } }),
      prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
      prisma.passwordResetToken.deleteMany({ where: { identifier: user.email } }),
      ...(user.addressId
        ? [prisma.address.delete({ where: { id: user.addressId } })]
        : []),
      prisma.user.delete({ where: { id: userId } }),
    ]);
  } catch (error) {
    console.error("[admin/users] permanent delete failed:", error);
    return { ok: false, error: "No se pudo eliminar el usuario" };
  }

  revalidateUsers(userId);
  return { ok: true };
}

export async function updateUserAddressAction(
  userId: string,
  input: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  }
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) {
    return { ok: false, error: "No autorizado" };
  }

  const street = input.street?.trim() ?? "";
  const city = input.city?.trim() ?? "";
  const state = input.state?.trim() ?? "";
  const postalCode = input.postalCode?.trim() ?? "";

  if (!street || !city || !state || !postalCode) {
    return { ok: false, error: "Completá calle, ciudad, provincia y código postal" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { addressId: true },
    });
    if (!user) return { ok: false, error: "Usuario no encontrado" };

    const data = {
      street,
      city,
      state,
      postalCode,
      country: "AR",
    };

    if (user.addressId) {
      await prisma.address.update({ where: { id: user.addressId }, data });
    } else {
      const address = await prisma.address.create({ data });
      await prisma.user.update({
        where: { id: userId },
        data: { addressId: address.id },
      });
    }

    revalidateUsers(userId);
    return { ok: true };
  } catch (error) {
    console.error("[admin/users] address update failed:", error);
    return { ok: false, error: "No se pudo guardar la dirección" };
  }
}
