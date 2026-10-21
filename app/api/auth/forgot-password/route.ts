import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail, getAppUrl } from "@/lib/email";

// POST /api/auth/forgot-password
// Always answers the same generic message so the endpoint can't be used to
// enumerate registered emails. Emails archived (soft-deleted) users too —
// resetting their password doesn't unarchive them, and lib/auth.ts still
// blocks the sign-in.
export async function POST(request: Request) {
  try {
    const { email } = await request.json().catch(() => ({ email: null }));

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Ingresá tu email", code: "MISSING_EMAIL" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { email: true, username: true },
    });

    if (user) {
      // Token + email failures must not turn into a "user exists" signal:
      // let the send throw silently and answer the generic message anyway.
      try {
        const token = await createPasswordResetToken(user.email);
        await sendPasswordResetEmail({
          to: user.email,
          username: user.username,
          url: `${getAppUrl(new URL(request.url).origin)}/reset-password?token=${token}`,
        });
      } catch (sendError) {
        console.error(
          "[forgot-password] could not create/send reset link:",
          sendError
        );
      }
    }

    return NextResponse.json({
      message:
        "Si la cuenta existe, te enviamos un email para elegir una contraseña nueva. Revisá tu bandeja de entrada (y el spam).",
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { error: "No se pudo procesar la solicitud. Intentá de nuevo más tarde." },
      { status: 500 }
    );
  }
}
