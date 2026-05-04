"use client";
import { useEffect, useMemo, useState } from "react";
import { useFilterProducts } from "@/hooks/useFilterProducts";
import { useAppSelector, useAppDispatch } from "@/hooks/useStore";
import { setCategories } from "@/store/slices/categorySlice";
import { silkscreen } from "@/app/fonts";
import ProductCard from "./ProductCard";
import "@/styles/ProductList.scss";
import "@/styles/ProductCard.scss";

function ProductList({ isLoadingExternal }: { isLoadingExternal?: boolean }) {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state) => state.products);
  const [loading, setLoading] = useState(true);

  const filteredProducts = useFilterProducts(products);
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products]
  );

  useEffect(() => {
    if (products.length > 0) {
      setLoading(false);
    } else if (isLoadingExternal === false) {
      setLoading(false);
    }
  }, [products, isLoadingExternal]);

  useEffect(() => {
    dispatch(setCategories(categories));
  }, [categories, dispatch]);

  if (loading)
    return (
      <p className={`${silkscreen.className} status`}>Loading Products...</p>
    );

  if (!loading && filteredProducts.length === 0)
    return (
      <p className={`${silkscreen.className} status`}>No products found</p>
    );

  return (
    <div className="product-list">
      {filteredProducts.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
}

export default ProductList;