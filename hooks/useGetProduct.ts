"use client";
import { useEffect, useState } from "react";
import { ProductType } from "@/types";

export const useGetProduct = (id: string) => {
  const [product, setProduct] = useState<ProductType>({} as ProductType);
  const [relatedProducts, setRelatedProducts] = useState<ProductType[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error("Product not found");
        
        const productData = await res.json();
        setProduct(productData);
        
        const categoryRes = await fetch("/api/products");
        const allProducts: ProductType[] = await categoryRes.json();
        
        const sameCategory = allProducts.filter(
          (p) => p.category === productData.category && p.id !== id
        );

        let related: ProductType[] = [...sameCategory];

        if (related.length < 4) {
          const filler = allProducts
            .filter((p) => p.id !== id && !related.some((rp) => rp.id === p.id))
            .sort(() => 0.4 - Math.random())
            .slice(0, 4 - related.length);

          related = [...related, ...filler];
        } else {
          related = related.slice(0, 4);
        }

        setRelatedProducts(related);
      } catch (err) {
        const error = err as Error;
        console.error("Error fetching product:", error.message);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [id]);

  return { product, relatedProducts, error, loading };
};
