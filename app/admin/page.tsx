import { getAllProducts } from "@/actions/products";
import AdminProducts from "@/components/admin/AdminProducts";

export const metadata = {
  title: "Productos",
};

export default async function AdminPage() {
  const products = await getAllProducts();

  return (
    <main className="admin-page">
      <h1 className="admin-title">Productos</h1>
      <AdminProducts products={products} />
    </main>
  );
}
