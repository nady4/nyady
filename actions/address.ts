"use server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getUserAddress() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { address: true },
  });

  return user?.address || null;
}

export async function updateAddress(formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const street = formData.get("street") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const postalCode = formData.get("postalCode") as string;
  const country = "Argentina";

  if (!street || !city || !postalCode)
    throw new Error("Missing required fields");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { address: true },
  });

  if (!user) throw new Error("User not found");

  if (user.addressId) {
    await prisma.address.update({
      where: { id: user.addressId },
      data: { street, city, state, postalCode, country },
    });
  } else {
    const address = await prisma.address.create({
      data: { street, city, state, postalCode, country },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { addressId: address.id },
    });
  }

  revalidatePath("/address");
}