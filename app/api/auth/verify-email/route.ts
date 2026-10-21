import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/verification";
import { getAppUrl } from "@/lib/email";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const appUrl = getAppUrl(origin);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${appUrl}/signin?verification_error=missing`);
  }

  try {
    const email = await consumeVerificationToken(token);

    if (!email) {
      return NextResponse.redirect(`${appUrl}/signin?verification_error=invalid`);
    }

    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() }
    });

    return NextResponse.redirect(`${appUrl}/signin?verified=1`);
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.redirect(`${appUrl}/signin?verification_error=unknown`);
  }
}
