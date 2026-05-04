"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { getCartProducts, updateCartQuantity } from "@/actions/cart";
import CheckoutButton from "@/components/CheckoutButton";
import { ProductType } from "@/types";
import "@/styles/Cart.scss";

interface CartItem extends ProductType {
  quantity: number;
}

export default function CartPage() {
  const { data: session, status } = useSession();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id;

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!userId) return;

    let cancelled = false;

    async function loadCart(currentUserId: string) {
      setLoading(true);
      try {
        const products = await getCartProducts(currentUserId);
        if (!cancelled) {
          setCart(products);
        }
      } catch (error) {
        console.error("Error loading cart:", error);
        if (!cancelled) {
          setCart([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCart(userId);

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  const handleIncreaseQuantity = (
    productId: string,
    currentQuantity: number
  ) => {
    if (!userId) return;
    const newQuantity = currentQuantity + 1;

    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );

    updateCartQuantity(userId, productId, newQuantity);
  };

  const handleDecreaseQuantity = (
    productId: string,
    currentQuantity: number
  ) => {
    if (!userId) return;
    const newQuantity = currentQuantity - 1;

    if (newQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== productId));
      updateCartQuantity(userId, productId, newQuantity);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );

    updateCartQuantity(userId, productId, newQuantity);
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (loading || status === "loading")
    return (
      <div className="cart">
        <p className="empty">Loading...</p>
      </div>
    );

  if (cart.length === 0)
    return (
      <div className="cart">
        <p className="empty">Your cart is empty</p>
      </div>
    );

  return (
    <div className="cart">
      <h2>Purchase Order</h2>
      {cart.map((item) => (
        <div key={item.id} className="cart-item">
          <Image
            src={item.photo}
            alt={item.name}
            width={100}
            height={100}
            style={{ borderRadius: "8px" }}
          />
          <span className="name">{item.name}</span>
          <div className="quantity">
            <button
              onClick={() => handleDecreaseQuantity(item.id, item.quantity)}
            >
              -
            </button>
            <span>{item.quantity}</span>
            <button
              onClick={() => handleIncreaseQuantity(item.id, item.quantity)}
            >
              +
            </button>
          </div>
          <span className="price">
            ${(item.price * item.quantity).toFixed(2)}
          </span>
        </div>
      ))}

      <div className="cart-total">Total: ${total.toFixed(2)}</div>

      <div className="button-container">
        <CheckoutButton total={total} />
      </div>
    </div>
  );
}