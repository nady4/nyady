"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function updateUser(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const email = formData.get("email") as string;
  const username = formData.get("username") as string;
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string | null;

  if (!currentPassword) throw new Error("Current password required");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) throw new Error("User not found");

  if (user.password !== currentPassword)
    throw new Error("Invalid current password");

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      email,
      username,
      ...(newPassword && { password: newPassword }),
    },
  });

  revalidatePath("/catalog");
  return { success: true, updatedUser };
}