import { NextResponse } from "next/server";
import { signOutAdmin } from "@/lib/admin";

export async function POST() {
  await signOutAdmin();
  return NextResponse.json({ ok: true });
}
