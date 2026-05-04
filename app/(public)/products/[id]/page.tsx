"use client";
import { usePathname } from "next/navigation";
import { useGetProduct } from "@/hooks/useGetProduct";
import ProductCard from "@/components/ProductCard";
import RelatedProducts from "@/components/RelatedProducts";
import "@/styles/ProductPage.scss";
import "@/styles/ProductCard.scss";

function ProductPage() {
  const id = usePathname().split("/")[2];
  const { product, relatedProducts, loading, error } = useGetProduct(id);

  if (loading || !product) return <div className="item">Loading...</div>;
  if (error) return <div className="item">{error.message}</div>;

  return (
    <div className="product-page">
      <ProductCard key={product.id} {...product} />
      <RelatedProducts products={relatedProducts} />
    </div>
  );
}

export default ProductPage;