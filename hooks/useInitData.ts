"use client";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "@/hooks/useStore";
import { initializeCart } from "@/store/slices/cartSlice";
import { initializeWishList } from "@/store/slices/wishListSlice";
import { getCartIds } from "@/actions/cart";
import { getWishlistIds } from "@/actions/wishlist";

/**
 * One-stop hydration of the cart + wishlist id slices for client surfaces
 * that don't get them from server props (product detail).
 */
export function useCartIdsInit(userId?: string) {
  const dispatch = useAppDispatch();
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId || initialized.current) return;
    initialized.current = true;

    const userIdValue = userId as string;

    getCartIds(userIdValue)
      .then((ids) => dispatch(initializeCart(ids)))
      .catch((error) =>
        console.error("[useCartIdsInit] cart init failed:", error)
      );

    getWishlistIds(userIdValue)
      .then((ids) => dispatch(initializeWishList(ids)))
      .catch((error) =>
        console.error("[useCartIdsInit] wishlist init failed:", error)
      );
  }, [dispatch, userId]);
}

export default useCartIdsInit;
