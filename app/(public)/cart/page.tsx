"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { getCartProducts, updateCartQuantity, removeFromCartById } from "@/actions/cart";
import { getUserAddress } from "@/actions/address";
import CheckoutButton from "@/components/CheckoutButton";
import ShippingQuote from "@/components/ShippingQuote";
import { AddressType, ShippingQuoteItem } from "@/actions/shipping";
import { ProductType, ShippingQuoteResult } from "@/types";
import Link from "next/link";
import "@/styles/Cart.scss";

interface CartItem extends ProductType {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  cartId: string;
}

export default function CartPage() {
  const { data: session, status } = useSession();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<AddressType | null>(null);
  const [selectedShipping, setSelectedShipping] =
    useState<ShippingQuoteResult | null>(null);

  const userId = session?.user?.id;

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!userId) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [products, addr] = await Promise.all([
          getCartProducts(userId as string),
          getUserAddress()
        ]);
        if (!cancelled) {
          setCart(products);
          if (addr) {
            setAddress({
              id: addr.id,
              street: addr.street,
              city: addr.city,
              state: addr.state,
              postalCode: addr.postalCode
            });
          } else {
            setAddress(null);
          }
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

    loadData();

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  const handleIncreaseQuantity = (
    cartId: string,
    productId: string,
    currentQuantity: number
  ) => {
    if (!userId) return;
    const newQuantity = currentQuantity + 1;

    setCart((prev) =>
      prev.map((item) =>
        item.cartId === cartId ? { ...item, quantity: newQuantity } : item
      )
    );

    updateCartQuantity(userId, productId, newQuantity);
  };

  const handleDecreaseQuantity = (
    cartId: string,
    productId: string,
    currentQuantity: number
  ) => {
    if (!userId) return;
    const newQuantity = currentQuantity - 1;

    if (newQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.cartId !== cartId));
      updateCartQuantity(userId, productId, newQuantity);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.cartId === cartId ? { ...item, quantity: newQuantity } : item
      )
    );

    updateCartQuantity(userId, productId, newQuantity);
  };

  const handleRemoveItem = async (cartId: string) => {
    if (!userId) return;
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
    await removeFromCartById(cartId);
  };

  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const shippingCost = selectedShipping?.amounts.price_incl_tax || 0;
  const total = subtotal + shippingCost;

  const shippingItems: ShippingQuoteItem[] = cart.map((item) => ({
    weight: 200,
    height: 10,
    width: 10,
    length: 10,
    description: item.name
  }));

  if (loading || status === "loading")
    return (
      <div className="cart">
        <p className="empty">Cargando...</p>
      </div>
    );

  if (cart.length === 0)
    return (
      <div className="cart">
        <p className="empty">Tu carrito está vacío</p>
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
          <div className="item-details">
            <span className="name">{item.name}</span>
            {item.selectedSize && (
              <span className="variant">Size: {item.selectedSize}</span>
            )}
            {item.selectedColor && (
              <span className="variant">
                Color:
                <span
                  className="color-dot"
                  style={{ backgroundColor: item.selectedColor }}
                />
              </span>
            )}
          </div>
          <div className="quantity">
            <button
              onClick={() => handleDecreaseQuantity(item.cartId, item.id, item.quantity)}
            >
              -
            </button>
            <span>{item.quantity}</span>
            <button
              onClick={() => handleIncreaseQuantity(item.cartId, item.id, item.quantity)}
            >
              +
            </button>
          </div>
          <button
            className="remove-item"
            onClick={() => handleRemoveItem(item.cartId)}
            title="Eliminar"
          >
            ×
          </button>
          <span className="price">
            ${(item.price * item.quantity).toLocaleString("es-AR")}
          </span>
        </div>
      ))}

      {status === "authenticated" && (
        <div className="cart-shipping">
          <div className="address-section">
            {address ? (
              <div className="current-address">
                <p>
                  <strong>Enviar a:</strong> {address.street}, {address.city},{" "}
                  {address.state} {address.postalCode}
                </p>
                <Link href="/address" className="edit-address-link">
                  Editar dirección de envío
                </Link>
              </div>
            ) : (
              <div className="no-address">
                <p>Agregá una dirección de envío</p>
                <Link href="/address" className="add-address-button">
                  Agregar dirección de envío
                </Link>
              </div>
            )}
          </div>
          {address && (
            <ShippingQuote
              address={address}
              items={shippingItems}
              declaredValue={subtotal}
              selectedOption={selectedShipping}
              onSelectOption={setSelectedShipping}
            />
          )}
        </div>
      )}

      {status !== "authenticated" && (
        <div className="login-prompt">
          <Link href="/signin" className="login-button">
            Iniciá sesión para calcular envío y finalizar tu compra
          </Link>
        </div>
      )}

      <div className="cart-total">
        <div className="subtotal">Subtotal: ${subtotal.toLocaleString("es-AR")}</div>
        {selectedShipping && (
          <div className="shipping-cost">
            Envío ({selectedShipping.service_type.name}): $
            {shippingCost.toLocaleString("es-AR")}
          </div>
        )}
        <div className="total">Total: ${total.toLocaleString("es-AR")}</div>
      </div>

      <div className="button-container">
        <CheckoutButton
          total={total}
          address={address}
          selectedShipping={selectedShipping}
        />
      </div>
    </div>
  );
}
