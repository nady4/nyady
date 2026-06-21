"use client";
import { useEffect, useMemo } from "react";
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

  const filteredProducts = useFilterProducts(products);
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products]
  );

  // Loading is derived, not stored: we're loading until either products have
  // arrived or the page-level loader (isLoadingExternal) has finished. Keeping
  // this as derived state avoids a setState-in-effect and the cascading render
  // it would cause.
  const loading = isLoadingExternal !== false && products.length === 0;

  useEffect(() => {
    dispatch(setCategories(categories));
  }, [dispatch, categories]);

  if (loading)
    return (
      <div className="product-list-skeleton" aria-busy="true" aria-live="polite">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-image" />
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-price" />
            <div className="skeleton-dots" />
          </div>
        ))}
        <span className="sr-only">Cargando productos...</span>
      </div>
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
