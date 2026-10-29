"use client";
import { useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useAppDispatch } from "@/hooks/useStore";
import { setProducts } from "@/store/slices/productsSlice";
import { initializeCart } from "@/store/slices/cartSlice";
import { initializeWishList } from "@/store/slices/wishListSlice";
import { initPriceFilter } from "@/store/slices/priceSlice";
import { seedWholesaleTiers } from "@/hooks/useWholesaleTiers";
import ProductList from "@/components/ProductList";
import { cormorantGaramond } from "@/app/fonts";
import { ProductType } from "@/types";
import type { WholesaleTier } from "@/lib/discounts";
import type { PriceBounds } from "@/lib/catalog";
import "@/styles/Catalog.scss";

interface WishlistClientProps {
  initialProducts: ProductType[];
  initialCartIds: string[];
  tiers: WholesaleTier[];
  hasSession: boolean;
  priceBounds: PriceBounds;
}

export default function WishlistClient({
  initialProducts,
  initialCartIds,
  tiers,
  hasSession,
  priceBounds,
}: WishlistClientProps) {
  const dispatch = useAppDispatch();
  const { status } = useSession();

  // The products slice persists across client navigations (e.g. arrived from
  // /catalog holding the whole catalog): seed it with THIS view's items
  // pre-paint so ProductList never renders stale catalog cards here.
  useLayoutEffect(() => {
    if (!hasSession) return;
    dispatch(setProducts(initialProducts));
    dispatch(initializeWishList(initialProducts.map((p) => p.id)));
    dispatch(initializeCart(initialCartIds));
    dispatch(initPriceFilter(priceBounds));
    if (tiers && tiers.length > 0) seedWholesaleTiers(tiers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasSession) return;
    if (status === "authenticated" && initialProducts) {
      dispatch(setProducts(initialProducts));
      dispatch(initializeWishList(initialProducts.map((p) => p.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (!hasSession || (status === "unauthenticated" && initialProducts.length === 0)) {
    return (
      <div className="home-container wishlist-empty">
        <h1 className={`${cormorantGaramond.className} catalog-title`}>
          Mis favoritos
        </h1>
        <p className="wishlist-empty-copy">
          Todavía no guardaste ningún favorito. Tocá corazón en los modelos que
          te gusten para verlos acá.
        </p>
        <Link href="/catalog" className="wishlist-empty-cta">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="home-container">
      <h1 className={`${cormorantGaramond.className} catalog-title`}>
        Mis favoritos
      </h1>
      <ProductList initialProducts={initialProducts} />
    </div>
  );
}
