"use client";
import { useCallback } from "react";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { addToCart, removeFromCart } from "@/store/slices/cartSlice";
import {
  addToWishList,
  removeFromWishList,
} from "@/store/slices/wishListSlice";
import { toggleCartProduct, addToCartWithDetails } from "@/actions/cart";
import { toggleWishlistProduct } from "@/actions/wishlist";

export function useToggleCartProduct(productId: string) {
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = status === "authenticated" ? session?.user?.id as string : undefined;
  const cartIds = useAppSelector((state) => state.cart);
  const isInCart = cartIds.includes(productId);

  const onCartClick = useCallback(
    (e?: React.MouseEvent, selectedSize?: string, selectedColor?: string, selectedTacoOption?: string, quantity: number = 1) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!userId) {
        router.push("/signin");
        return;
      }

      if (isInCart) {
        dispatch(removeFromCart(productId));
      } else {
        dispatch(addToCart(productId));
      }

      if (selectedSize || selectedColor || selectedTacoOption) {
        addToCartWithDetails(userId, productId, selectedSize, selectedColor, selectedTacoOption, quantity);
      } else {
        toggleCartProduct(userId, productId);
      }
    },
    [dispatch, isInCart, productId, userId, router]
  );

  return { isInCart, onCartClick };
}

export function useToggleWishlist(productId: string) {
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = status === "authenticated" ? session?.user?.id as string : undefined;
  const wishListIds = useAppSelector((state) => state.wishList);

  const isWishlisted = useMemo(
    () => wishListIds.includes(productId),
    [wishListIds, productId]
  );

  const onHeartClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!userId) {
        router.push("/signin");
        return;
      }

      if (isWishlisted) {
        dispatch(removeFromWishList(productId));
      } else {
        dispatch(addToWishList(productId));
      }

      toggleWishlistProduct(userId, productId);
    },
    [dispatch, isWishlisted, productId, userId, router]
  );

  return { isWishlisted, onHeartClick };
}