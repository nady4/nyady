import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createVerificationToken } from "@/lib/verification";
import { sendVerificationEmail, getAppUrl } from "@/lib/email";

import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rl = rateLimit({
    name: "resend-verification",
    identity: clientIp(request),
    limit: 5,
    windowMs: 15 * 60_000
  });
  if (!rl.ok) return tooManyRequests(rl);
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Falta el email", code: "MISSING_EMAIL" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Same response whether the account exists or not, to avoid revealing
    // which emails are registered.
    if (user && !user.emailVerified) {
      const token = await createVerificationToken(user.email);
      await sendVerificationEmail({
        to: user.email,
        username: user.username,
        url: `${getAppUrl(new URL(request.url).origin)}/api/auth/verify-email?token=${token}`
      });
    }

    return NextResponse.json({
      message: "Si la cuenta existe y no está confirmada, te enviamos un nuevo email."
    });
  } catch (error) {
    console.error("Error resending verification email:", error);
    return NextResponse.json(
      { error: "No pudimos reenviar el email. Intentá de nuevo más tarde." },
      { status: 500 }
    );
  }
}
