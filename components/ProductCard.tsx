"use client";
import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useToggleWishlist } from "@/hooks/useToggleData";
import { cormorantGaramond, inter } from "@/app/fonts";
import { isBlackColor } from "@/lib/colors";
import { getWholesaleDiscountPercent } from "@/lib/discounts";
import { ProductType } from "@/types";

interface ProductCardProps extends ProductType {
  cartIds?: string[];
  cartTotalQuantity?: number;
}

// The card shows a photo of a non-black color when the product has one, so
// colorful products stand out in the catalog. Keeps `photo` when it already
// belongs to a non-black color.
function getCardPhoto(
  photo: string,
  colors: string[],
  photos: ProductType["photos"]
): string {
  const nonBlackColors = colors.filter((color) => !isBlackColor(color));
  if (nonBlackColors.length === 0) return photo;
  if (!photos || typeof photos !== "object" || Array.isArray(photos)) {
    return photo;
  }
  const photoMap = photos as Record<string, string[]>;
  if (nonBlackColors.some((color) => photoMap[color]?.includes(photo))) {
    return photo;
  }
  for (const color of nonBlackColors) {
    const list = photoMap[color];
    if (Array.isArray(list) && list.length > 0) return list[0];
  }
  return photo;
}

const ProductCard = memo(function ProductCard({
  id,
  name,
  price,
  photo,
  colors = [],
  photos,
  sizes = [],
  cartTotalQuantity = 0
}: ProductCardProps) {
  const { isWishlisted, onHeartClick } = useToggleWishlist(id);
  const displayPhoto = getCardPhoto(photo, colors, photos);
  const wholesalePercent = getWholesaleDiscountPercent(cartTotalQuantity);
  const discountedPrice =
    (price ?? 0) * (1 - wholesalePercent / 100);

  return (
    <Link href={`/products/${id}`} passHref>
      <div className={"product-card"}>
        <Image
          src={displayPhoto}
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
        <h2 className={`${cormorantGaramond.className} product-title`}>{name}</h2>
        <p className={`${inter.className} product-price`}>
          {wholesalePercent > 0 ? (
            <>
              <span className="price-original">
                ${(price ?? 0).toLocaleString("es-AR")}
              </span>
              <span className={`price-discounted discount-${wholesalePercent}`}>
                ${discountedPrice.toLocaleString("es-AR")}
              </span>
            </>
          ) : (
            `$${(price ?? 0).toLocaleString("es-AR")}`
          )}
        </p>
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