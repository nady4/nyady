import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ProductFormAdmin from "@/components/admin/products/ProductFormAdmin";

export const metadata = {
  title: "Editar producto",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) notFound();

  const categoryRows = await prisma.product.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Editar producto</h1>
        <Link href="/admin/productos" className="admin-button">
          Volver
        </Link>
      </div>
      <ProductFormAdmin
        product={product}
        categories={categoryRows.map((row) => row.category)}
      />
    </main>
  );
}
