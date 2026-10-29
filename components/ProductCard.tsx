"use client";
import Image from "next/image";
import Link from "next/link";
import { cormorantGaramond, inter } from "@/app/fonts";
import { isBlackColor } from "@/lib/colors";
import { getWholesaleDiscountPercent } from "@/lib/discounts";
import { useWholesaleTiers } from "@/hooks/useWholesaleTiers";
import { ProductType } from "@/types";
import ProductCardHeart from "./ProductCardHeart";

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

export default function ProductCard({
  id,
  slug,
  name,
  price,
  photo,
  colors = [],
  photos,
  sizes = [],
  cartTotalQuantity = 0
}: ProductCardProps) {
  const tiers = useWholesaleTiers();
  const displayPhoto = getCardPhoto(photo, colors, photos);
  const wholesalePercent = getWholesaleDiscountPercent(cartTotalQuantity, tiers);
  const discountedPrice =
    (price ?? 0) * (1 - wholesalePercent / 100);

  return (
    <article className={"product-card"}>
      <div className="product-media">
        <Link href={`/products/${slug}`} className="product-link">
          <Image
            src={displayPhoto}
            alt={`${name} — sandalias artesanales`}
            width={400}
            height={400}
            sizes="(max-width: 768px) 45vw, 300px"
            className="product-image"
          />
        </Link>
        <ProductCardHeart productId={id} productName={name} />
      </div>
      <Link href={`/products/${slug}`} className="product-link-body">
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
      </Link>
    </article>
  );
}
