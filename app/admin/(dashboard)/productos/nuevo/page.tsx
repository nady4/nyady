import prisma from "@/lib/prisma";
import ProductFormAdmin from "@/components/admin/products/ProductFormAdmin";

export const metadata = {
  title: "Nuevo producto",
};

export default async function NewProductPage() {
  const categoryRows = await prisma.product.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });

  return (
    <main className="admin-page admin-page-wide">
      <h1 className="admin-title">Nuevo producto</h1>
      <ProductFormAdmin
        categories={categoryRows.map((row) => row.category)}
      />
    </main>
  );
}
