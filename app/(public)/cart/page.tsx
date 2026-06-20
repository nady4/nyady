"use client";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  getCartProducts,
  updateCartQuantity,
  removeFromCartById
} from "@/actions/cart";
import { getUserAddress } from "@/actions/address";
import CheckoutButton from "@/components/CheckoutButton";
import ShippingQuote from "@/components/ShippingQuote";
import { AddressType, ShippingQuoteItem } from "@/actions/shipping";
import { ProductType, ShippingQuoteResult } from "@/types";
import { getColorHex } from "@/components/ColorSelector";
import Link from "next/link";
import "@/styles/Cart.scss";

interface CartItem extends ProductType {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  selectedTacoOption?: string;
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

  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  const discountInfo = useMemo(() => {
    if (totalQuantity >= 20) {
      return { percent: 20, label: "MAYORISTA x20 - 20%", applied: true };
    } else if (totalQuantity >= 4) {
      return { percent: 10, label: "REVENDEDORA x4 - 10%", applied: true };
    }
    return { percent: 0, label: "", applied: false };
  }, [totalQuantity]);

  const subtotalBeforeDiscount = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const discountAmount = subtotalBeforeDiscount * (discountInfo.percent / 100);
  const subtotal = subtotalBeforeDiscount - discountAmount;
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
      <h2>Carrito</h2>
      {cart.map((item) => (
        <div key={item.cartId} className="cart-item">
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
              <span className="variant">Talle: {item.selectedSize}</span>
            )}
            {item.selectedColor && (
              <span className="variant">
                Color:
                <span
                  className="color-dot"
                  style={{ backgroundColor: getColorHex(item.selectedColor) }}
                />
              </span>
            )}
            {item.selectedTacoOption && (
              <span className="variant">Tipo: {item.selectedTacoOption}</span>
            )}
          </div>
          <div className="quantity">
            <button
              onClick={() =>
                handleDecreaseQuantity(item.cartId, item.id, item.quantity)
              }
            >
              -
            </button>
            <span>{item.quantity}</span>
            <button
              onClick={() =>
                handleIncreaseQuantity(item.cartId, item.id, item.quantity)
              }
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
          <div className="price-container">
            {item.quantity >= 4 && item.quantity < 20 ? (
              <>
                <span className="price-original">
                  ${(item.price * item.quantity).toLocaleString("es-AR")}
                </span>
                <span className="price-discounted discount-10">
                  ${(item.price * item.quantity * 0.9).toLocaleString("es-AR")}
                </span>
                <span className="discount-badge">10% DESCUENTO</span>
              </>
            ) : item.quantity >= 20 ? (
              <>
                <span className="price-original">
                  ${(item.price * item.quantity).toLocaleString("es-AR")}
                </span>
                <span className="price-discounted discount-20">
                  ${(item.price * item.quantity * 0.8).toLocaleString("es-AR")}
                </span>
                <span className="discount-badge">20% DESCUENTO</span>
              </>
            ) : (
              <span className="price">
                ${(item.price * item.quantity).toLocaleString("es-AR")}
              </span>
            )}
          </div>
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
        <div className="subtotal-line">
          Subtotal: ${subtotalBeforeDiscount.toLocaleString("es-AR")}
        </div>
        {discountInfo.percent > 0 && (
          <div className="discount-amount">
            <span className={`discount-badge discount-${discountInfo.percent}`}>
              {discountInfo.percent}% DESCUENTO
            </span>
            <span
              className={`discount-value price-discounted discount-${discountInfo.percent}`}
            >
              -${discountAmount.toLocaleString("es-AR")}
            </span>
          </div>
        )}
        {discountInfo.percent > 0 && (
          <div className="subtotal-after-discount">
            Subtotal: ${subtotal.toLocaleString("es-AR")}
          </div>
        )}
        {selectedShipping && (
          <div className="shipping-cost">
            {selectedShipping.service_type.name}: $
            {shippingCost.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          </div>
        )}
        <div className="total">Total: ${total.toLocaleString("es-AR")}</div>
        {selectedShipping &&
          (() => {
            const estimated = selectedShipping.delivery_time.estimated_delivery;
            const deliveryDate = new Date(estimated);
            deliveryDate.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const diffTime = deliveryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const minDate = new Date(today);
            minDate.setDate(minDate.getDate() + diffDays + 3);
            const maxDate = new Date(today);
            maxDate.setDate(maxDate.getDate() + diffDays + 7);

            const formatDate = (d: Date) => {
              const day = d.getDate().toString().padStart(2, "0");
              const month = (d.getMonth() + 1).toString().padStart(2, "0");
              return `${day}/${month}`;
            };

            return (
              <div className="shipping-date">
                Entrega estimada: {formatDate(minDate)} - {formatDate(maxDate)}
              </div>
            );
          })()}
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
