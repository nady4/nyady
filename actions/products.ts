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

export async function searchProducts(query: string): Promise<ProductType[]> {
  try {
    if (!query || query.trim().length === 0) {
      return getProducts();
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } }
        ]
      }
    });

    return products;
  } catch (error) {
    console.error("Error searching products:", error);
    return [];
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
