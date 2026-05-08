import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    await prisma.$disconnect();
    
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    return NextResponse.json(product);
  } catch (error) {
    await prisma.$disconnect();
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}