"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToggleCartProduct, useToggleWishlist } from "@/hooks/useToggleData";
import { silkscreen, tomorrow } from "@/app/fonts";
import { ProductType } from "@/types";
import { getCartProducts, updateCartQuantity } from "@/actions/cart";

interface ProductCardProps extends ProductType {
  showRemoveButton?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  photo,
}) => {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const { isWishlisted, onHeartClick } = useToggleWishlist(id);
  const { onCartClick } = useToggleCartProduct(id);

  const [inCart, setInCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [quantityLoaded, setQuantityLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const safeUserId = userId;
    let cancelled = false;

    async function syncFromCart() {
      const products = await getCartProducts(safeUserId);
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

    if (!inCart) {
      onCartClick(e);
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
            src={isWishlisted ? "/assets/icons/heartFilled.svg" : "/assets/icons/heart.svg"}
            alt="heart"
            width={40}
            height={40}
            className="product-heart"
          />
        </button>
        <h2 className={`${tomorrow.className} product-title`}>{name}</h2>
        <p className={`${silkscreen.className} product-price`}>
          ${price?.toFixed(2)}
        </p>
        <div className="bottom">
          {inCart && (
            <div className="quantity-controls">
              <button onClick={handleDecreaseQuantity}>-</button>
              <span>{quantityLoaded ? quantity : "-"}</span>
              <button onClick={handleIncreaseQuantity}>+</button>
            </div>
          )}
          <button
            className={
              silkscreen.className + " button" + (inCart ? " isInCart" : "")
            }
            onClick={handleToggleCart}
          >
            <Image src="/assets/icons/cart.svg" className="button-icon" alt="cart icon" width={20} height={20} />
            {inCart ? "Remove from cart" : "Add to cart"}
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;