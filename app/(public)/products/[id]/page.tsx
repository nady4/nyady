import { getProduct, getProducts } from "@/actions/products";
import Product from "./page.client";
import { notFound } from "next/navigation";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  const product = await getProduct(decodedId);

  if (!product) {
    notFound();
  }

  const allProducts = await getProducts();
  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== decodedId)
    .slice(0, 4);

  return <Product product={product} relatedProducts={relatedProducts} />;
}