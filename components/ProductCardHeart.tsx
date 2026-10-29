"use client";
import Image from "next/image";
import { useToggleWishlist } from "@/hooks/useToggleData";

interface ProductCardHeartProps {
  productId: string;
  productName: string;
}

/**
 * Wishlist heart as an isolated client island: ProductCard stays a plain
 * component (server-friendly), and the heart keeps its own state.
 */
export default function ProductCardHeart({
  productId,
  productName,
}: ProductCardHeartProps) {
  const { isWishlisted, onHeartClick } = useToggleWishlist(productId);

  return (
    <button
      className={`product-heart-button ${isWishlisted ? "active" : ""}`}
      onClick={onHeartClick}
      aria-pressed={isWishlisted}
      aria-label={
        isWishlisted
          ? `Quitar ${productName} de favoritos`
          : `Agregar ${productName} a favoritos`
      }
      title={isWishlisted ? "Quitar de favoritos" : "Agregar a favoritos"}
    >
      <Image
        src="/assets/icons/heartFilled.svg"
        alt=""
        aria-hidden="true"
        width={24}
        height={24}
        className="product-heart"
      />
    </button>
  );
}
