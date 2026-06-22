"use client";
import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useToggleWishlist } from "@/hooks/useToggleData";
import { fraunces, inter } from "@/app/fonts";
import { getColorHex } from "@/lib/colors";
import { ProductType } from "@/types";

interface ProductCardProps extends ProductType {
  cartIds?: string[];
}

const ProductCard = memo(function ProductCard({
  id,
  name,
  price,
  photo,
  sizes = [],
  colors = []
}: ProductCardProps) {
  const { isWishlisted, onHeartClick } = useToggleWishlist(id);

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