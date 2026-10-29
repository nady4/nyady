import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { createVerificationToken } from "@/lib/verification";
import { sendVerificationEmail, getAppUrl } from "@/lib/email";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";

import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rl = rateLimit({
    name: "register",
    identity: clientIp(request),
    limit: 10,
    windowMs: 60 * 60_000
  });
  if (!rl.ok) return tooManyRequests(rl);

  try {
    const data = await request.json();

    if (!data.email || !data.username || !data.password) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    if (data.acceptTerms !== true) {
      return NextResponse.json(
        {
          error:
            "Tenés que aceptar los Términos y Condiciones y la Política de Privacidad",
          code: "TERMS_NOT_ACCEPTED"
        },
        { status: 400 }
      );
    }

    if (typeof data.password !== "string" || data.password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingEmail) {
      if (!existingEmail.emailVerified) {
        return NextResponse.json(
          {
            error:
              "Ya existe una cuenta con este email sin confirmar. Revisá tu bandeja de entrada (y el spam); si no te llegó, reenviá la confirmación acá abajo.",
            code: "EMAIL_EXISTS_UNVERIFIED"
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Ya existe una cuenta con este email", code: "EMAIL_EXISTS" },
        { status: 400 }
      );
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username: data.username }
    });

    if (existingUsername) {
      return NextResponse.json(
        {
          error: "Ese nombre de usuario ya está en uso",
          code: "USERNAME_EXISTS"
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
        // Opt-out checkbox: the UI defaults it to checked.
        marketingOptIn: data.marketingOptIn !== false
      }
    });

    // The account exists either way; if the email fails to go out, the user
    // can trigger a resend from the sign-in page.
    let emailSent = true;
    try {
      const token = await createVerificationToken(newUser.email);
      await sendVerificationEmail({
        to: newUser.email,
        username: newUser.username,
        url: `${getAppUrl(new URL(request.url).origin)}/api/auth/verify-email?token=${token}`
      });
    } catch (error) {
      emailSent = false;
      console.error("Error sending verification email:", error);
    }

    return NextResponse.json(
      {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt,
        emailSent
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "An error occurred while creating the user", details: message },
      { status: 500 }
    );
  }
}
