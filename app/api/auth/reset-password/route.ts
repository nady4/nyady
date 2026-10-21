import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { consumePasswordResetToken } from "@/lib/password-reset";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt truncates beyond 72 bytes

// POST /api/auth/reset-password
// Consumes the single-use hashed token, updates the hashed password and
// leaves any active JWT session untouched (NextAuth JWTs don't store the
// password, so old sessions keep working — acceptable for a storefront).
// The response never leaks whether the token existed or was expired: both
// cases answer 400 with the same es-AR message shape.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token) {
      return NextResponse.json(
        { error: "Falta el token del enlace", code: "MISSING_TOKEN" },
        { status: 400 }
      );
    }
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      return NextResponse.json(
        {
          error: `La contraseña necesita entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`,
          code: "INVALID_PASSWORD",
        },
        { status: 400 }
      );
    }

    const email = await consumePasswordResetToken(token);
    if (!email) {
      return NextResponse.json(
        {
          error:
            "El enlace no es válido o ya venció. Pedí uno nuevo desde «¿Olvidaste tu contraseña?».",
          code: "TOKEN_INVALID",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      // The email was deleted between request and reset (rare). The token is
      // already consumed; nothing else to do.
      return NextResponse.json(
        {
          error:
            "El enlace no es válido o ya venció. Pedí uno nuevo desde «¿Olvidaste tu contraseña?».",
          code: "TOKEN_INVALID",
        },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(password, 10) },
    });

    return NextResponse.json({
      message: "¡Listo! Tu contraseña quedó actualizada. Ya podés iniciar sesión.",
    });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { error: "No se pudo cambiar la contraseña. Intentá de nuevo más tarde." },
      { status: 500 }
    );
  }
}
