"use server";
import prisma from "@/lib/prisma";
import { ProductType } from "@/types";

export async function getProduct(id: string): Promise<ProductType | null> {
  try {
    if (!id) {
      console.error("Error fetching product: Missing id");
      return null;
    }
    const product = await prisma.product.findUnique({ where: { id } });
    return product;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

export async function getProducts(): Promise<ProductType[]> {
  try {
    const products = await prisma.product.findMany();
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}