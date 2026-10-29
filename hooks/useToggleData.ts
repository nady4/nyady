"use client";
import { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { addToCart } from "@/store/slices/cartSlice";
import {
  addToWishList,
  removeFromWishList,
} from "@/store/slices/wishListSlice";
import { addToCartWithDetails } from "@/actions/cart";
import { toggleWishlistProduct } from "@/actions/wishlist";

interface ToastDetail {
  message: string;
  tone: "success" | "error";
}

/** Lightweight toast signal (rendered once by components/Toast.tsx). */
function announce(message: string, tone: ToastDetail["tone"]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>("nyady:toast", { detail: { message, tone } })
  );
}

export function useAddToCart(productId: string) {
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const cartIds = useAppSelector((state) => state.cart);
  const isInCart = useMemo(() => cartIds.includes(productId), [cartIds, productId]);

  /**
   * ALWAYS adds (incrementing quantity for the same variant) — it never
   * removes; the destructive toggle behaviour lives in the cart page.
   */
  const onAddToCart = useCallback(
    (
      selectedSize?: string,
      selectedColor?: string,
      selectedTacoOption?: string,
      quantity: number = 1
    ) => {
      if (status !== "authenticated" || !session?.user?.id) {
        router.push(`/signin?callbackUrl=${encodeURIComponent(pathname)}`);
        announce("Iniciá sesión para comprar", "success");
        return;
      }

      dispatch(addToCart(productId));

      addToCartWithDetails(
        session.user.id as string,
        productId,
        selectedSize,
        selectedColor,
        selectedTacoOption,
        quantity
      ).then((result) => {
        if (result?.error) {
          announce(result.error, "error");
        } else {
          announce(
            quantity === 1
              ? "Producto agregado al carrito"
              : `${quantity} productos agregados al carrito`,
            "success"
          );
        }
      });
    },
    [dispatch, productId, session, status, router, pathname]
  );

  return { isInCart, onAddToCart };
}

export function useToggleWishlist(productId: string) {
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const wishListIds = useAppSelector((state) => state.wishList);

  const isWishlisted = useMemo(
    () => wishListIds.includes(productId),
    [wishListIds, productId]
  );

  const onHeartClick = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (status !== "authenticated" || !session?.user?.id) {
        router.push(`/signin?callbackUrl=${encodeURIComponent(pathname)}`);
        announce("Iniciá sesión para guardar favoritos", "success");
        return;
      }

      if (isWishlisted) {
        dispatch(removeFromWishList(productId));
      } else {
        dispatch(addToWishList(productId));
      }

      announce(
        isWishlisted ? "Quitado de favoritos" : "Agregado a favoritos",
        "success"
      );

      toggleWishlistProduct(session.user.id as string, productId);
    },
    [dispatch, isWishlisted, productId, session, status, router, pathname]
  );

  return { isWishlisted, onHeartClick };
}
