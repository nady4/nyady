"use client";
import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToggleWishlist } from "@/hooks/useToggleData";
import { fraunces, inter } from "@/app/fonts";
import { ProductType } from "@/types";

const COLOR_HEX: Record<string, string> = {
  Negro: "#1a1a1a",
  Marrón: "#8b4513",
  Gris: "#6b7280",
  Beige: "#f5f5dc",
  "Rosa claro": "#ffb6c1",
  Fucsia: "#ff00ff",
  Bordó: "#800020",
  Caspeado: "#c4a35a",
  Camel: "#c19a6b",
  Violeta: "#8b00ff",
  "Animal Print": "#d2b48c"
};

function getColorHex(color: string): string {
  if (color.startsWith("#")) return color;
  const key = Object.keys(COLOR_HEX).find(
    (k) => k.toLowerCase() === color.toLowerCase()
  );
  return COLOR_HEX[key || ""] || "#cccccc";
}

interface ProductCardProps extends ProductType {
  cartIds?: string[];
}

const ProductCard = memo(function ProductCard({
  id,
  name,
  price,
  photo,
  sizes = [],
  colors = [],
  cartIds = []
}: ProductCardProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const { isWishlisted, onHeartClick } = useToggleWishlist(id);

  const inCart = userId ? cartIds.includes(id) : false;

  return (
    <Link href={`/products/${id}`} passHref>
      <div className={"product-card"}>
        <Image
          src={photo}
          alt={name}
          width={200}
          height={200}
          className="product-image"
        />
        <button className="product-heart-button" onClick={onHeartClick}>
          <Image
            src="/assets/icons/heartFilled.svg"
            alt="heart"
            width={24}
            height={24}
            className={`product-heart ${isWishlisted ? "active" : ""}`}
          />
        </button>
        <h2 className={`${inter.className} product-title`}>{name}</h2>
        <p className={`${fraunces.className} product-price`}>
          ${(price ?? 0).toLocaleString("es-AR")}
        </p>
        {colors.length > 0 && (
          <div className="product-colors">
            {colors.map((color, idx) => (
              <span
                key={idx}
                className="color-dot"
                style={{ backgroundColor: getColorHex(color) }}
                title={color}
              />
            ))}
          </div>
        )}
        {sizes.length > 0 && (
          <div className="product-sizes">
            {sizes.map((size, idx) => (
              <span key={idx} className="size-dot">
                {size}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;