"use client";
import { useCallback } from "react";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { addToCart, removeFromCart } from "@/store/slices/cartSlice";
import {
  addToWishList,
  removeFromWishList,
} from "@/store/slices/wishListSlice";
import { toggleCartProduct } from "@/actions/cart";
import { toggleWishlistProduct } from "@/actions/wishlist";

export function useToggleCartProduct(productId: string) {
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const userId = session?.user?.id as string;
  const cartIds = useAppSelector((state) => state.cart);
  const isInCart = cartIds.includes(productId);

  const onCartClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isInCart) {
        dispatch(removeFromCart(productId));
      } else {
        dispatch(addToCart(productId));
      }

      toggleCartProduct(userId, productId);
    },
    [dispatch, isInCart, productId, userId]
  );

  return { isInCart, onCartClick };
}

export function useToggleWishlist(productId: string) {
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const userId = session?.user?.id as string;
  const wishListIds = useAppSelector((state) => state.wishList);

  const isWishlisted = useMemo(
    () => wishListIds.includes(productId),
    [wishListIds, productId]
  );

  const onHeartClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isWishlisted) {
        dispatch(removeFromWishList(productId));
      } else {
        dispatch(addToWishList(productId));
      }

      toggleWishlistProduct(userId, productId);
    },
    [dispatch, isWishlisted, productId, userId]
  );

  return { isWishlisted, onHeartClick };
}