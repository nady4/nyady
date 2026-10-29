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
import WholesaleNudge from "@/components/WholesaleNudge";
import { AddressType, ShippingQuoteItem } from "@/actions/shipping";
import { ProductType, ShippingQuoteResult } from "@/types";
import {
  computeDiscounts,
  getWholesaleDiscountPercent,
  type CouponLike
} from "@/lib/discounts";
import { useWholesaleTiers } from "@/hooks/useWholesaleTiers";
import { getColorHex } from "@/lib/colors";
import { getDeliveryWindow } from "@/lib/shipping";
import { formatARS } from "@/lib/money";
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

  // Coupon state. `appliedCoupon` holds a validated coupon (code + type +
  // value) once the user clicks "Aplicar" and the server confirms it. It is
  // cleared on any quantity change so the user re-validates against the new
  // subtotal — the server re-validates at checkout anyway, so this is purely
  // to keep the displayed discount honest.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponLike | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const userId = session?.user?.id;

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.ok && data.coupon) {
        setAppliedCoupon({
          code: data.coupon.code,
          type: data.coupon.type,
          value: data.coupon.value
        });
        setCouponInput(data.coupon.code);
      } else {
        setAppliedCoupon(null);
        setCouponError(data.error || "Cupón inválido");
      }
    } catch {
      setCouponError("No se pudo validar el cupón");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

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

  // Quantity is keyed on cartId (the specific size/color/taco row), never on
  // the product alone: the same product can sit in the cart as several
  // variants and a product-keyed update would bump whichever row comes first.
  const handleIncreaseQuantity = (cartId: string, currentQuantity: number) => {
    if (!userId) return;
    const newQuantity = currentQuantity + 1;

    setCart((prev) =>
      prev.map((item) =>
        item.cartId === cartId ? { ...item, quantity: newQuantity } : item
      )
    );

    // A quantity change can move the subtotal across wholesale tiers or change
    // a FIXED coupon's clamped amount, so clear the applied coupon and require
    // re-validation. The server re-validates at checkout regardless.
    if (appliedCoupon) handleRemoveCoupon();

    updateCartQuantity(cartId, newQuantity);
  };

  const handleDecreaseQuantity = (cartId: string, currentQuantity: number) => {
    if (!userId) return;
    const newQuantity = currentQuantity - 1;

    if (newQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.cartId !== cartId));
      if (appliedCoupon) handleRemoveCoupon();
      updateCartQuantity(cartId, newQuantity);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.cartId === cartId ? { ...item, quantity: newQuantity } : item
      )
    );

    if (appliedCoupon) handleRemoveCoupon();

    updateCartQuantity(cartId, newQuantity);
  };

  const handleRemoveItem = async (cartId: string) => {
    if (!userId) return;
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
    if (appliedCoupon) handleRemoveCoupon();
    await removeFromCartById(cartId);
  };

  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  const tiers = useWholesaleTiers();
  const wholesalePercent = getWholesaleDiscountPercent(totalQuantity, tiers);
  const appliedTier = tiers.find((tier) => tier.percent === wholesalePercent);
  const discountInfo = {
    percent: wholesalePercent,
    label: appliedTier
      ? `${appliedTier.label} x${appliedTier.units} - ${appliedTier.percent}%`
      : "",
    applied: wholesalePercent > 0
  };

  const subtotalBeforeDiscount = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Shared with the server (lib/discounts.ts) so the charged total matches.
  // The coupon stacks on top of the wholesale-discounted subtotal.
  const discounts = useMemo(
    () =>
      computeDiscounts({
        productsTotal: subtotalBeforeDiscount,
        totalQuantity,
        coupon: appliedCoupon,
        tiers
      }),
    [subtotalBeforeDiscount, totalQuantity, appliedCoupon, tiers]
  );

  const discountAmount = discounts.wholesaleAmount;
  const subtotal = discounts.subtotalAfterWholesale;
  const couponDiscount = discounts.couponAmount;
  const shippingCost = selectedShipping?.amounts.price_incl_tax || 0;
  const total = discounts.discountedSubtotal + shippingCost;

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
        <div className="cart-skeleton" aria-busy="true" aria-live="polite">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-cart-item">
              <div className="skeleton-image" />
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-price" />
            </div>
          ))}
          <span className="sr-only">Cargando tu carrito...</span>
        </div>
      </div>
    );

  if (cart.length === 0)
    return (
      <div className="cart">
        <h1>Carrito</h1>
        <div className="empty">
          <p>Tu carrito está vacío</p>
          <Link href="/catalog" className="empty-cta">
            Ver catálogo
          </Link>
        </div>
      </div>
    );

  return (
    <div className="cart">
      <h1>Carrito</h1>
      {cart.map((item) => (
        <div key={item.cartId} className="cart-item">
          <Image
            src={item.photo}
            alt={item.name}
            width={100}
            height={100}
            sizes="100px"
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
                  role="img"
                  aria-label={`Color ${item.selectedColor}`}
                />
              </span>
            )}
            {item.selectedTacoOption && (
              <span className="variant">Tipo: {item.selectedTacoOption}</span>
            )}
          </div>
          <div className="quantity">
            <button
              type="button"
              onClick={() =>
                handleDecreaseQuantity(item.cartId, item.quantity)
              }
              aria-label={`Restar una unidad de ${item.name}`}
            >
              −<span className="sr-only">Restar cantidad</span>
            </button>
            <span aria-live="polite">{item.quantity}</span>
            <button
              type="button"
              onClick={() =>
                handleIncreaseQuantity(item.cartId, item.quantity)
              }
              aria-label={`Sumar una unidad de ${item.name}`}
            >
              +<span className="sr-only">Sumar cantidad</span>
            </button>
          </div>
          <button
            type="button"
            className="remove-item"
            onClick={() => handleRemoveItem(item.cartId)}
            title="Eliminar"
            aria-label={`Eliminar ${item.name} del carrito`}
          >
            ×
          </button>
          <div className="price-container">
            {discounts.wholesalePercent > 0 ? (
              <>
                <span className="price-original">
                  ${(item.price * item.quantity).toLocaleString("es-AR")}
                </span>
                <span
                  className={`price-discounted discount-${discounts.wholesalePercent}`}
                >
                  $
                  {(
                    item.price *
                    item.quantity *
                    (1 - discounts.wholesalePercent / 100)
                  ).toLocaleString("es-AR")}
                </span>
                <span className="discount-badge">
                  {discounts.wholesalePercent}% DESCUENTO
                </span>
              </>
            ) : (
              <span className="price">
                ${(item.price * item.quantity).toLocaleString("es-AR")}
              </span>
            )}
          </div>
        </div>
      ))}

      <WholesaleNudge totalQuantity={totalQuantity} />

      {status === "authenticated" && (
        <div className="cart-shipping">
          <div className="address-section">
            {address ? (
              <div className="current-address">
                <p>
                  <strong>Enviar a:</strong> {address.street}, {address.city},{" "}
                  {address.state} {address.postalCode}
                </p>
                <Link
                  href="/address?next=/cart"
                  className="edit-address-link"
                >
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

      {status === "authenticated" && (
        <div className="coupon-section">
          {appliedCoupon ? (
            <div className="coupon-applied">
              <span className="coupon-applied-code">
                Cupón {appliedCoupon.code} aplicado
              </span>
              <button
                type="button"
                className="coupon-remove"
                onClick={handleRemoveCoupon}
              >
                Quitar
              </button>
            </div>
          ) : (
            <div className="coupon-input-row">
              <label htmlFor="coupon-code" className="sr-only">
                Código de cupón
              </label>
              <input
                id="coupon-code"
                type="text"
                className="coupon-input"
                placeholder="Código de cupón"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                className="coupon-apply"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponInput.trim()}
              >
                {couponLoading ? "..." : "Aplicar"}
              </button>
            </div>
          )}
          {couponError && (
            <p className="coupon-error" role="alert">
              {couponError}
            </p>
          )}
          {appliedCoupon && (
            <p className="sr-only" role="status">
              {`Cupón ${appliedCoupon.code} aplicado`}
            </p>
          )}
        </div>
      )}

      <div className="cart-total">
        <div className="subtotal-line">
          Subtotal: {formatARS(subtotalBeforeDiscount)}
        </div>
        {discountInfo.percent > 0 && (
          <div className="discount-amount">
            <span className={`discount-badge discount-${discountInfo.percent}`}>
              {discountInfo.percent}% DESCUENTO
            </span>
            <span
              className={`discount-value price-discounted discount-${discountInfo.percent}`}
            >
              -{formatARS(discountAmount)}
            </span>
          </div>
        )}
        {discountInfo.percent > 0 && (
          <div className="subtotal-after-discount">
            Subtotal: {formatARS(subtotal)}
          </div>
        )}
        {appliedCoupon && couponDiscount > 0 && (
          <div className="coupon-discount">
            <span className="coupon-discount-label">
              Cupón {appliedCoupon.code}
            </span>
            <span className="coupon-discount-value">
              -{formatARS(couponDiscount)}
            </span>
          </div>
        )}
        {selectedShipping && (
          <div className="shipping-cost">
            {selectedShipping.service_type.name}: {formatARS(shippingCost)}
          </div>
        )}
        <div className="total">Total: {formatARS(total)}</div>
        {selectedShipping &&
          (() => {
            const window = getDeliveryWindow(
              selectedShipping.delivery_time.estimated_delivery
            );

            return (
              <div className="shipping-date">
                Entrega estimada: {window.min} - {window.max}
              </div>
            );
          })()}
      </div>

      <div className="button-container">
        <CheckoutButton
          total={total}
          address={address}
          selectedShipping={selectedShipping}
          shippingItems={shippingItems}
          declaredValue={subtotal}
          couponCode={appliedCoupon?.code}
        />
      </div>
    </div>
  );
}
