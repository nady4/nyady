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

    const customOrder = [
      "pantubota-valkyria",
      "pantuflón",
      "pantubota-alpina",
      "chinela-plush",
      "pantubota-studs",
      "pantufla-aurora",
      "pantufla-fogata",
      "pantufla-lena",
      "pantubota-freya"
    ];

    return products.sort((a, b) => {
      const indexA = customOrder.indexOf(a.id);
      const indexB = customOrder.indexOf(b.id);
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      return posA - posB;
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}
