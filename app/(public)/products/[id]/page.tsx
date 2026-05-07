"use client";
import { usePathname } from "next/navigation";
import { useGetProduct } from "@/hooks/useGetProduct";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useToggleCartProduct, useToggleWishlist } from "@/hooks/useToggleData";
import { getCartProducts, updateCartQuantity } from "@/actions/cart";
import { useEffect, useState, useMemo, useCallback } from "react";
import RelatedProducts from "@/components/RelatedProducts";
import ColorSelector from "@/components/ColorSelector";
import SizeSelector from "@/components/SizeSelector";
import "@/styles/ProductPage.scss";

function ProductPage() {
  const id = usePathname().split("/")[2];
  const { product, relatedProducts, loading, error } = useGetProduct(id);

  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const { isWishlisted, onHeartClick } = useToggleWishlist(id);
  const { onCartClick } = useToggleCartProduct(id);

  const [inCart, setInCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [quantityLoaded, setQuantityLoaded] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  const colors = useMemo(() => product?.colors || [], [product?.colors]);
  const sizes = useMemo(() => product?.sizes || [], [product?.sizes]);

  const photosMap = useMemo(() => {
    if (!product?.photos) return {};
    return product.photos as Record<string, string[]>;
  }, [product?.photos]);

  const currentColorPhotos = useMemo(() => {
    const color = selectedColor || colors[0] || "";
    return photosMap[color] || [];
  }, [photosMap, selectedColor, colors]);

  const currentImage = useMemo(() => {
    if (currentColorPhotos.length === 0) return product?.photo || "";
    return (
      currentColorPhotos[selectedImageIndex] ||
      currentColorPhotos[0] ||
      product?.photo ||
      ""
    );
  }, [currentColorPhotos, selectedImageIndex, product?.photo]);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
    setSelectedImageIndex(0);
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function syncFromCart() {
      if (!userId) return;
      const products = await getCartProducts(userId);
      const item = products.find((p) => p.id === id);

      if (cancelled) return;

      if (item) {
        setInCart(true);
        setQuantity(item.quantity);
        setQuantityLoaded(true);
      } else {
        setInCart(false);
        setQuantity(1);
        setQuantityLoaded(false);
      }
    }

    syncFromCart();

    return () => {
      cancelled = true;
    };
  }, [userId, id]);

  const handleIncreaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) return;
    if (!inCart || !quantityLoaded) return;

    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    updateCartQuantity(userId, id, newQuantity);
  };

  const handleDecreaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) return;
    if (!inCart || !quantityLoaded) return;

    const newQuantity = quantity - 1;

    if (newQuantity <= 0) {
      onCartClick(e);
      setInCart(false);
      setQuantity(1);
      setQuantityLoaded(false);
      return;
    }

    setQuantity(newQuantity);
    updateCartQuantity(userId, id, newQuantity);
  };

  const handleToggleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) return;

    const size = selectedSize || sizes[0] || undefined;
    const color = selectedColor || colors[0] || undefined;

    if (!inCart) {
      onCartClick(e, size, color);
      setInCart(true);
      if (!quantityLoaded || quantity <= 0) {
        setQuantity(1);
      }
      setQuantityLoaded(true);
    } else {
      onCartClick(e);
      setInCart(false);
      setQuantity(1);
      setQuantityLoaded(false);
    }
  };

  if (loading || !product)
    return <div className="product-page">Cargando...</div>;
  if (error) return <div className="product-page">{error.message}</div>;

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
          <p className="product-price">${(product.price ?? 0).toLocaleString("es-AR")}</p>

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
            {inCart && (
              <div className="quantity-controls">
                <button onClick={handleDecreaseQuantity}>-</button>
                <span>{quantityLoaded ? quantity : "-"}</span>
                <button onClick={handleIncreaseQuantity}>+</button>
              </div>
            )}
            <button
              className={`cart-button ${inCart ? "in-cart" : ""}`}
              onClick={handleToggleCart}
            >
              <Image
                src="/assets/icons/cart.svg"
                alt="cart"
                width={20}
                height={20}
              />
              {inCart ? "Quitar del carrito" : "Agregar al carrito"}
            </button>
          </div>
        </div>
      </div>
      <RelatedProducts products={relatedProducts} />
    </div>
  );
}

export default ProductPage;
