import prisma from "@/lib/prisma";
import ManualOrderForm from "@/components/admin/orders/ManualOrderForm";
import type { AdminProductOption, AdminUserOption } from "@/types/admin";
import { num } from "@/lib/money";

export const metadata = {
  title: "Nuevo pedido manual",
};

export default async function NewManualOrderPage() {
  const [users, products] = await Promise.all([
    prisma.user.findMany({
      where: { archivedAt: null },
      orderBy: { username: "asc" },
      select: { id: true, username: true, email: true },
      take: 200,
    }),
    prisma.product.findMany({
      where: { archivedAt: null, available: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        photo: true,
        colors: true,
        sizes: true,
        tacoOptions: true,
      },
    }),
  ]);

  const userOptions: AdminUserOption[] = users;
  const productOptions: AdminProductOption[] = products.map((product) => ({
    ...product,
    price: num(product.price),
    colors: [...product.colors],
    sizes: [...product.sizes],
    tacoOptions: [...product.tacoOptions],
  }));

  return (
    <main className="admin-page admin-page-wide">
      <h1 className="admin-title">Nuevo pedido manual</h1>
      <ManualOrderForm users={userOptions} productOptions={productOptions} />
    </main>
  );
}
