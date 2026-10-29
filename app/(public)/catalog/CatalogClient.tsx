"use client";
import { useEffect, useLayoutEffect, useRef } from "react";

// useLayoutEffect on the client (pre-paint store sync, no stale-list flash);
// SSR falls back to useEffect.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { useAppDispatch } from "@/hooks/useStore";
import { setProducts } from "@/store/slices/productsSlice";
import { setCategories } from "@/store/slices/categorySlice";
import { initializeCart } from "@/store/slices/cartSlice";
import { initializeWishList } from "@/store/slices/wishListSlice";
import { initPriceFilter } from "@/store/slices/priceSlice";
import { setSearch } from "@/store/slices/searchSlice";
import ProductList from "@/components/ProductList";
import Filters from "@/components/Filters";
import { seedWholesaleTiers } from "@/hooks/useWholesaleTiers";
import { ProductType } from "@/types";
import type { WholesaleTier } from "@/lib/discounts";
import type { PriceBounds } from "@/lib/catalog";
import "@/styles/Catalog.scss";

interface CatalogClientProps {
  initialProducts: ProductType[];
  categories: string[];
  initialWishlistIds: string[];
  initialCartIds: string[];
  tiers: WholesaleTier[];
  priceBounds: PriceBounds;
  /** ?q= from the URL: mirrors into Redux so client filters agree with SSR. */
  query: string;
  /** Precomputed "no matches" query (SSR renders the empty state directly). */
  noResultsQuery: string;
}

/**
 * Server-fed catalog shell: products/categories/live cart+wishlist ids arrive
 * as RSC props and hydrate the Redux store once. Interactivity (filters,
 * search, hearts, badge) keeps working against the same slices — without the
 * old client waterfall of sequential server-action round-trips.
 */
export default function CatalogClient({
  initialProducts,
  categories,
  initialWishlistIds,
  initialCartIds,
  tiers,
  priceBounds,
  query,
  noResultsQuery,
}: CatalogClientProps) {
  const dispatch = useAppDispatch();
  const firstRun = useRef(true);

  useIsoLayoutEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      dispatch(setProducts(initialProducts));
      dispatch(setCategories(categories));
      dispatch(initializeCart(initialCartIds));
      dispatch(initializeWishList(initialWishlistIds));
      dispatch(initPriceFilter(priceBounds));
      dispatch(setSearch(query));
      if (tiers && tiers.length > 0) seedWholesaleTiers(tiers);
      return;
    }
    // Subsequent navigations to /catalog?q=... SSR a new filtered grid:
    // refresh the list + mirror the URL query (filters/user edits persist).
    dispatch(setProducts(initialProducts));
    dispatch(setCategories(categories));
    dispatch(setSearch(query));
  }, [query]);

  return (
    <div className="home-container">
      <Filters />
      <ProductList
        initialProducts={initialProducts}
        noResultsQuery={noResultsQuery}
      />
    </div>
  );
}
