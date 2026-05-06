"use client";
import { useEffect, useMemo, useState } from "react";
import { useFilterProducts } from "@/hooks/useFilterProducts";
import { useAppSelector, useAppDispatch } from "@/hooks/useStore";
import { setCategories } from "@/store/slices/categorySlice";
import { fraunces } from "@/app/fonts";
import ProductCard from "./ProductCard";
import "@/styles/ProductList.scss";
import "@/styles/ProductCard.scss";

function ProductList({ isLoadingExternal }: { isLoadingExternal?: boolean }) {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state) => state.products);
  const cartIds = useAppSelector((state) => state.cart);
  const [loading, setLoading] = useState(true);

  const filteredProducts = useFilterProducts(products);
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products]
  );

  useEffect(() => {
    if (products.length > 0 || isLoadingExternal === false) {
      setLoading(false);
    }
  }, [products.length, isLoadingExternal]);

  useEffect(() => {
    dispatch(setCategories(categories));
  }, [dispatch, categories]);

  if (loading)
    return (
      <p className={`${fraunces.className} status`}>Cargando productos...</p>
    );

  if (!loading && filteredProducts.length === 0)
    return (
      <p className={`${fraunces.className} status`}>
        No se encontraron productos
      </p>
    );

  return (
    <div className="product-list">
      {filteredProducts.map((product) => (
        <ProductCard key={product.id} {...product} cartIds={cartIds} />
      ))}
    </div>
  );
}

export default ProductList;
