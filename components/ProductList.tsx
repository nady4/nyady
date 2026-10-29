"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFilterProducts } from "@/hooks/useFilterProducts";
import { useCartTotalQuantity } from "@/hooks/useCartTotalQuantity";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { setCategories } from "@/store/slices/categorySlice";
import { resetFilters } from "@/store/slices/filterSlice";
import { resetSearch } from "@/store/slices/searchSlice";
import { resetPriceFilter } from "@/store/slices/priceSlice";
import { cormorantGaramond } from "@/app/fonts";
import ProductCard from "./ProductCard";
import { ProductType } from "@/types";
import "@/styles/ProductList.scss";
import "@/styles/ProductCard.scss";

interface ProductListProps {
  /** Server-provided first render (SSR), used until the store hydrates. */
  initialProducts?: ProductType[];
  isLoadingExternal?: boolean;
  /** Precomputed by the catalog server page: ?q= found 0 products. */
  noResultsQuery?: string;
}

function ProductList({
  initialProducts,
  isLoadingExternal,
  noResultsQuery,
}: ProductListProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const storeProducts = useAppSelector((state) => state.products);
  const cartTotalQuantity = useCartTotalQuantity();
  const activeSizes = useAppSelector((state) => state.filters.activeSizes);
  const activeColors = useAppSelector((state) => state.filters.activeColors);
  const searchQuery = useAppSelector((state) => state.search.query);
  // Fallback to the server props while the store hydrates (and always if a
  // route never dispatched products).
  const products = storeProducts.length > 0 ? storeProducts : initialProducts ?? [];
  const loading =
    isLoadingExternal !== false &&
    storeProducts.length === 0 &&
    (initialProducts ?? []).length === 0;

  // only used to keep the store's categories current after hydration
  useEffect(() => {
    if (storeProducts.length > 0) {
      const categories = [...new Set(storeProducts.map((p) => p.category))];
      dispatch(setCategories(categories));
    }
  }, [storeProducts, dispatch]);

  const filteredProducts = useFilterProducts(products);
  const hasAnyActive =
    Object.values(activeSizes).some(Boolean) ||
    Object.values(activeColors).some(Boolean);
  const cleanQuery = searchQuery.trim();
  const emptyQuery = (noResultsQuery ?? "").trim();
  const hasQuery = cleanQuery.length > 0 || emptyQuery.length > 0;

  const clearSearch = () => {
    dispatch(resetSearch());
    router.push("/catalog");
  };

  const resetAllFilters = () => {
    dispatch(resetFilters());
    dispatch(resetPriceFilter());
  };

  // Empty-by-URL (server precomputed): skip the skeleton entirely.
  if (emptyQuery)
    return (
      <div className="product-list-empty">
        <p className={`${cormorantGaramond.className} status`}>
          Sin resultados para “{emptyQuery}”
        </p>
        <button type="button" className="reset-filters" onClick={clearSearch}>
          Limpiar búsqueda
        </button>
      </div>
    );

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

  if (filteredProducts.length === 0)
    return (
      <div className="product-list-empty">
        <p className={`${cormorantGaramond.className} status`}>
          {hasQuery
            ? `Sin resultados para “${cleanQuery || emptyQuery}”`
            : hasAnyActive
              ? "No hay productos con esos filtros"
              : "No se encontraron productos"}
        </p>
        {hasQuery && (
          <button type="button" className="reset-filters" onClick={clearSearch}>
            Limpiar búsqueda
          </button>
        )}
        {!hasQuery && hasAnyActive && (
          <button type="button" className="reset-filters" onClick={resetAllFilters}>
            Limpiar filtros
          </button>
        )}
      </div>
    );

  return (
    <div className="product-list" aria-label="Listado de productos">
      {hasQuery && (
        <p className="search-status" role="status">
          {filteredProducts.length} resultado
          {filteredProducts.length === 1 ? "" : "s"} para{" "}
          <strong>“{cleanQuery}”</strong>{" "}
          <button
            type="button"
            className="clear-search"
            onClick={clearSearch}
            aria-label="Limpiar búsqueda"
          >
            (quitar)
          </button>
        </p>
      )}
      {filteredProducts.map((product) => (
        <ProductCard
          key={product.id}
          {...product}
          cartTotalQuantity={cartTotalQuantity}
        />
      ))}
    </div>
  );
}

export default ProductList;
