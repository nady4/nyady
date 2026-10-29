"use client";
import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useAddToCart, useToggleWishlist } from "@/hooks/useToggleData";
import { useCartTotalQuantity } from "@/hooks/useCartTotalQuantity";
import { getWholesaleDiscountPercent } from "@/lib/discounts";
import { useWholesaleTiers } from "@/hooks/useWholesaleTiers";
import RelatedProducts from "@/components/RelatedProducts";
import ColorSelector from "@/components/ColorSelector";
import SizeSelector from "@/components/SizeSelector";
import ProductShippingEstimate from "@/components/ProductShippingEstimate";
import WholesaleNudge from "@/components/WholesaleNudge";
import { cormorantGaramond } from "@/app/fonts";
import { ProductType } from "@/types";
import "@/styles/ProductPage.scss";

interface ProductProps {
  product: ProductType;
  relatedProducts: ProductType[];
}

export default function Product({ product, relatedProducts }: ProductProps) {
  const id = product.id;
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const { isWishlisted, onHeartClick } = useToggleWishlist(id);
  const { onAddToCart } = useAddToCart(id);
  const cartTotalQuantity = useCartTotalQuantity();

  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedTacoOption, setSelectedTacoOption] = useState<string>("");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  const colors = useMemo(() => product.colors || [], [product.colors]);
  const sizes = useMemo(() => product.sizes || [], [product.sizes]);
  const tacoOptions = useMemo(() => product.tacoOptions || [], [product.tacoOptions]);

  const photosMap = useMemo(() => {
    if (!product.photos) return {};
    return product.photos as Record<string, string[]>;
  }, [product.photos]);

  const currentColorPhotos = useMemo(() => {
    const color = selectedColor || colors[0] || "";
    return photosMap[color] || [];
  }, [photosMap, selectedColor, colors]);

  const currentImage = useMemo(() => {
    if (currentColorPhotos.length === 0) return product.photo || "";
    return (
      currentColorPhotos[selectedImageIndex] ||
      currentColorPhotos[0] ||
      product.photo ||
      ""
    );
  }, [currentColorPhotos, selectedImageIndex, product.photo]);

  // The tier preview assumes the selected quantity will be added, so it counts
  // the whole cart (already fetched) plus what's about to go in.
  const tiers = useWholesaleTiers();
  const treatedQuantity = cartTotalQuantity + quantity;
  const wholesalePercent = getWholesaleDiscountPercent(treatedQuantity, tiers);

  const finalPrice = useMemo(() => {
    if (!product.price) return 0;
    return product.price * (1 - wholesalePercent / 100);
  }, [product.price, wholesalePercent]);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
    setSelectedImageIndex(0);
  }, []);

  const handleAddToCart = () => {
    const size = selectedSize || sizes[0] || undefined;
    const color = selectedColor || colors[0] || undefined;
    const tacoOption = selectedTacoOption || tacoOptions[0] || undefined;

    onAddToCart(size, color, tacoOption, quantity);
  };

  const photoCount = currentColorPhotos.length || 1;
  const effectiveIndex =
    currentColorPhotos.length > 0 ? selectedImageIndex : 0;

  return (
    <div className="product-page">
      <div className="product-detail">
        <figure className="product-image-container">
          <Image
            src={currentImage}
            alt={`${product.name}${selectedColor ? ` color ${selectedColor}` : ""} — sandalias artesanales`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="product-image"
            priority
          />
          <span className="sr-only" aria-live="polite">
            {`Foto ${Math.min(effectiveIndex + 1, photoCount)} de ${photoCount}`}
          </span>
          {currentColorPhotos.length > 1 && (
            <div className="image-navigation">
              <button
                type="button"
                className="nav-button prev"
                aria-label="Foto anterior"
                onClick={() =>
                  setSelectedImageIndex((i) =>
                    i > 0 ? i - 1 : currentColorPhotos.length - 1
                  )
                }
              >
                ‹
                <span className="sr-only">Foto anterior</span>
              </button>
              <div
                className="image-dots"
                role="tablist"
                aria-label="Fotos del producto"
              >
                {currentColorPhotos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={idx === selectedImageIndex}
                    aria-current={idx === selectedImageIndex}
                    className={`dot ${idx === selectedImageIndex ? "active" : ""}`}
                    onClick={() => setSelectedImageIndex(idx)}
                  >
                    <span className="sr-only">{`Foto ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="nav-button next"
                aria-label="Foto siguiente"
                onClick={() =>
                  setSelectedImageIndex((i) =>
                    i < currentColorPhotos.length - 1 ? i + 1 : 0
                  )
                }
              >
                ›<span className="sr-only">Foto siguiente</span>
              </button>
            </div>
          )}
        </figure>
        <div className="product-info">
          <h1 className={`${cormorantGaramond.className} product-name`}>{product.name}</h1>
          <p className="product-price">
            {wholesalePercent > 0 ? (
              <>
                <span className="price-original">
                  ${(product.price ?? 0).toLocaleString("es-AR")}
                </span>
                <span
                  className={`price-discounted discount-${wholesalePercent}`}
                >
                  ${finalPrice.toLocaleString("es-AR")}
                </span>
                <span className="discount-badge">
                  {wholesalePercent}% DESCUENTO APLICADO
                </span>
              </>
            ) : (
              <span>${(product.price ?? 0).toLocaleString("es-AR")}</span>
            )}
          </p>

          {product.code && (
            <p className="product-code">Código: {product.code}</p>
          )}

          <WholesaleNudge totalQuantity={treatedQuantity} />

          {sizes.length > 0 && (
            <div className="product-size">
              <span id="size-label" className="size-label">Talle:</span>
              <SizeSelector
                sizes={sizes}
                selectedSize={selectedSize || sizes[0]}
                onSizeChange={setSelectedSize}
              />
            </div>
          )}

          {colors.length > 0 && (
            <div className="product-color">
              <span id="color-label" className="color-label">Color:</span>
              <ColorSelector
                colors={colors}
                selectedColor={selectedColor || colors[0]}
                onColorChange={handleColorChange}
              />
            </div>
          )}

          {tacoOptions.length > 0 && (
            <div className="product-taco-option">
              <span className="taco-option-label">Tipo:</span>
              <div
                role="radiogroup"
                aria-label="Tipo de taco"
                className="taco-options"
              >
                {tacoOptions.map((option: string) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selectedTacoOption === option}
                    className={`taco-option ${selectedTacoOption === option ? "selected" : ""}`}
                    onClick={() => setSelectedTacoOption(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ProductShippingEstimate
            productName={product.name}
            price={product.price ?? 0}
          />

          <div className="product-actions">
            <button
              type="button"
              className={`wishlist-button ${isWishlisted ? "active" : ""}`}
              onClick={() => onHeartClick()}
              aria-pressed={isWishlisted}
              aria-label={
                isWishlisted
                  ? "Quitar de favoritos"
                  : "Agregar a favoritos"
              }
            >
              <Image
                src={
                  isWishlisted
                    ? "/assets/icons/heartFilled.svg"
                    : "/assets/icons/heart.svg"
                }
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
              />
              <span className="sr-only">
                {isWishlisted ? "Quitar de favoritos" : "Agregar a favoritos"}
              </span>
            </button>
            <div className="quantity-controls">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Restar cantidad"
                disabled={quantity <= 1}
              >
                −
                <span className="sr-only">Restar cantidad</span>
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Sumar cantidad"
              >
                +<span className="sr-only">Sumar cantidad</span>
              </button>
            </div>
            <button
              type="button"
              className="cart-button"
              onClick={handleAddToCart}
            >
              <Image
                src="/assets/icons/cart_light.svg"
                alt=""
                aria-hidden="true"
                width={20}
                height={20}
              />
              <span className="cart-button-text">
                {!userId ? "Iniciar sesión para comprar" : "Agregar al carrito"}
              </span>
            </button>
            {!userId && (
              <p className="product-signin-hint">
                Iniciá sesión con tu cuenta para completar la compra
              </p>
            )}
          </div>
        </div>
      </div>
      <RelatedProducts products={relatedProducts} />
    </div>
  );
}
