"use client";
import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToggleWishlist, useToggleCartProduct } from "@/hooks/useToggleData";
import RelatedProducts from "@/components/RelatedProducts";
import ColorSelector from "@/components/ColorSelector";
import SizeSelector from "@/components/SizeSelector";
import { ProductType } from "@/types";
import "@/styles/ProductPage.scss";

interface ProductProps {
  product: ProductType;
  relatedProducts: ProductType[];
}

export default function Product({ product, relatedProducts }: ProductProps) {
  const id = product.id;
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const { isWishlisted, onHeartClick } = useToggleWishlist(id);
  const { onCartClick } = useToggleCartProduct(id);

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

  const discountInfo = useMemo(() => {
    if (quantity >= 20) {
      return { percent: 20, label: "MAYORISTA x20 - 20%", applied: true };
    } else if (quantity >= 4) {
      return { percent: 10, label: "REVENDEDORA x4 - 10%", applied: true };
    }
    return { percent: 0, label: "", applied: false };
  }, [quantity]);

  const finalPrice = useMemo(() => {
    if (!product.price) return 0;
    return product.price * (1 - discountInfo.percent / 100);
  }, [product.price, discountInfo.percent]);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
    setSelectedImageIndex(0);
  }, []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      router.push("/signin");
      return;
    }

    const size = selectedSize || sizes[0] || undefined;
    const color = selectedColor || colors[0] || undefined;
    const tacoOption = selectedTacoOption || tacoOptions[0] || undefined;

    onCartClick(e, size, color, tacoOption, quantity);
  };

  return (
    <div className="product-page">
      <div className="product-detail">
        <div className="product-image-container">
          <Image
            src={currentImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="product-image"
            priority
            loading="eager"
          />
          {currentColorPhotos.length > 1 && (
            <div className="image-navigation">
              <button
                className="nav-button prev"
                onClick={() =>
                  setSelectedImageIndex((i) =>
                    i > 0 ? i - 1 : currentColorPhotos.length - 1
                  )
                }
              >
                ‹
              </button>
              <div className="image-dots">
                {currentColorPhotos.map((_, idx) => (
                  <button
                    key={idx}
                    className={`dot ${idx === selectedImageIndex ? "active" : ""}`}
                    onClick={() => setSelectedImageIndex(idx)}
                  />
                ))}
              </div>
              <button
                className="nav-button next"
                onClick={() =>
                  setSelectedImageIndex((i) =>
                    i < currentColorPhotos.length - 1 ? i + 1 : 0
                  )
                }
              >
                ›
              </button>
            </div>
          )}
        </div>
        <div className="product-info">
          <h1 className="product-name">{product.name}</h1>
          <p className="product-price">
            {discountInfo.percent > 0 ? (
              <>
                <span
                  className={`price-discounted discount-${discountInfo.percent}`}
                >
                  ${finalPrice.toLocaleString("es-AR")}
                </span>
                <span className="discount-badge">
                  {discountInfo.percent}% DESCUENTO APLICADO
                </span>
              </>
            ) : (
              <span>${(product.price ?? 0).toLocaleString("es-AR")}</span>
            )}
          </p>

          {product.code && (
            <p className="product-code">Código: {product.code}</p>
          )}

          {sizes.length > 0 && (
            <div className="product-size">
              <span className="size-label">Talle:</span>
              <SizeSelector
                sizes={sizes}
                selectedSize={selectedSize || sizes[0]}
                onSizeChange={setSelectedSize}
              />
            </div>
          )}

          {colors.length > 0 && (
            <div className="product-color">
              <span className="color-label">Color:</span>
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
              <div className="taco-options">
                {tacoOptions.map((option: string) => (
                  <button
                    key={option}
                    className={`taco-option ${selectedTacoOption === option ? "selected" : ""}`}
                    onClick={() => setSelectedTacoOption(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="product-description">
            {product.description ||
              "A delightful selection of anime-inspired merchandise, carefully curated for collectors and fans alike."}
          </p>

          <div className="product-actions">
            <button
              className={`wishlist-button ${isWishlisted ? "active" : ""}`}
              onClick={onHeartClick}
            >
              <Image
                src={
                  isWishlisted
                    ? "/assets/icons/heartFilled.svg"
                    : "/assets/icons/heart.svg"
                }
                alt="heart"
                width={24}
                height={24}
              />
            </button>
            <div className="quantity-controls">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                -
              </button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)}>+</button>
            </div>
            <button className="cart-button" onClick={handleAddToCart}>
              <Image
                src="/assets/icons/cart_light.svg"
                alt="cart"
                width={20}
                height={20}
              />
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
      <RelatedProducts products={relatedProducts} />
    </div>
  );
}
