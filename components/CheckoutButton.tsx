"use client";
import { useState } from "react";
import { AddressType, ShippingSelection, ShippingQuoteItem } from "@/actions/shipping";
import { ShippingQuoteResult } from "@/types";
import Link from "next/link";
import dynamic from "next/dynamic";
import "@/styles/CheckoutButton.scss";

// The MP wallet SDK ships ~50 KB (bundled+deps) and is only used after a
// successful "Generar orden": load it on demand, never on page load.
const Wallet = dynamic(
  () => import("@mercadopago/sdk-react").then((mod) => mod.Wallet),
  { ssr: false, loading: () => <p className="wallet-loading">Cargando el pago...</p> }
);

interface CheckoutButtonProps {
  total: number;
  address: AddressType | null | undefined;
  selectedShipping: ShippingQuoteResult | null;
  // Items used for the shipping quote — the same hardcoded dims the cart page
  // builds. Forwarded here so the chosen option + items can be snapshotted
  // onto the order for later shipment creation.
  shippingItems: ShippingQuoteItem[];
  // Products subtotal (post-wholesale-discount), used as the shipment's
  // declared_value.
  declaredValue: number;
  // Optional coupon code validated by the cart via /api/coupons/validate.
  // The server re-validates and applies it in /api/orders.
  couponCode?: string;
}

export default function CheckoutButton({
  total,
  address,
  selectedShipping,
  shippingItems,
  declaredValue,
  couponCode
}: CheckoutButtonProps) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recipient data captured at checkout — Zipnova's create-shipment requires
  // name, document (DNI) and phone, none of which are stored on the user.
  const [recipientName, setRecipientName] = useState("");
  const [recipientDocument, setRecipientDocument] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // The wallet (orderId) is generated on demand via "Generar orden" and is
  // intentionally not auto-reset when the total changes — React 19's lint
  // rules forbid setState-in-effect and ref-access-during-render, and a
  // stale wallet is harmless: re-clicking "Generar orden" creates a fresh
  // order/preference. If the cart changes after a wallet is shown, the user
  // simply regenerates.

  const recipientComplete =
    recipientName.trim() !== "" &&
    recipientDocument.trim() !== "" &&
    recipientPhone.trim() !== "";

  const handleCheckout = async () => {
    if (!address) return;
    if (!selectedShipping) return;
    if (!recipientComplete) return;
    if (isLoading || total <= 0) return;

    const shippingCost = selectedShipping.amounts.price_incl_tax;

    const shippingSelection: ShippingSelection = {
      serviceType: selectedShipping.service_type.code,
      logisticType: selectedShipping.logistic_type,
      carrierId: selectedShipping.carrier.id,
      pickupPointId: selectedShipping.pickup_points?.[0]?.point_id ?? null,
      declaredValue,
      shippingCost,
      items: shippingItems
    };

    setIsLoading(true);
    setError(null);

    const FRIENDLY_ERRORS: Record<number, string> = {
      401: "Iniciá sesión para finalizar tu compra.",
      409: "El cupón ya no es válido para esta compra.",
      422: "Falta información para completar la orden: revisá envío y datos."
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          recipientDocument: recipientDocument.trim(),
          recipientPhone: recipientPhone.trim(),
          shippingSelection,
          couponCode: couponCode || undefined
        })
      });

      const data = await res.json();
      if (data.id) {
        setOrderId(data.id);
        // initMercadoPago only matters when the wallet renders; dynamic import
        // keeps the SDK out of the initial cart bundle.
        try {
          const { initMercadoPago } = await import("@mercadopago/sdk-react");
          initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY as string, {
            locale: "es-AR"
          });
        } catch {
          setError(
            "No pudimos preparar el pago. Recargá la página e intentá de nuevo."
          );
          setOrderId(null);
        }
      } else {
        setError(
          (typeof data.error === "string" &&
            FRIENDLY_ERRORS[res.status]) ||
            data.error ||
            "No se pudo generar la orden. Volvé a intentar en unos minutos."
        );
      }
    } catch {
      setError(
        "Hubo un problema de conexión al crear la orden. Revisá tu conexión e intentá de nuevo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="checkout-container">
        <div className="wallet-container">
          <Link href="/address" className="checkout-button">
            Agregar dirección de envío para continuar
          </Link>
        </div>
      </div>
    );
  }

  const showRecipientForm = Boolean(selectedShipping);

  return (
    <div className="checkout-container">
      {error && !orderId && (
        <p className="checkout-error" role="alert" id="checkout-error-msg">
          {error}
        </p>
      )}
      {orderId ? (
        <div className="wallet-container">
          <Wallet initialization={{ preferenceId: orderId }} />
          <button
            type="button"
            className="checkout-button wallet-fallback"
            onClick={() => setOrderId(null)}
          >
            Cambiar los datos de la orden
          </button>
        </div>
      ) : (
        <div className="wallet-container">
          {showRecipientForm && (
            <div className="recipient-form">
              <p className="recipient-form-title">Datos del destinatario</p>
              <div className="recipient-field">
                <label htmlFor="recipient-name">Nombre y apellido</label>
                <input
                  id="recipient-name"
                  type="text"
                  placeholder="Ej: María Fernández"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="recipient-field">
                <label htmlFor="recipient-document">DNI</label>
                <input
                  id="recipient-document"
                  type="text"
                  inputMode="numeric"
                  placeholder="Solo números, sin puntos"
                  value={recipientDocument}
                  onChange={(e) =>
                    setRecipientDocument(e.target.value.replace(/\D/g, "").slice(0, 9))
                  }
                  autoComplete="off"
                  minLength={7}
                  maxLength={9}
                  required
                />
              </div>
              <div className="recipient-field">
                <label htmlFor="recipient-phone">Teléfono</label>
                <input
                  id="recipient-phone"
                  type="tel"
                  placeholder="Ej: 351 512-3456"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  autoComplete="tel"
                  required
                  aria-describedby={error && !orderId ? "checkout-error-msg" : undefined}
                />
              </div>
            </div>
          )}
          <button
            className="checkout-button"
            onClick={handleCheckout}
            disabled={
              isLoading ||
              total <= 0 ||
              !selectedShipping ||
              (showRecipientForm && !recipientComplete)
            }
          >
            {isLoading
              ? "Creando orden..."
              : !selectedShipping
                ? "Seleccioná un método de envío"
                : !recipientComplete
                  ? "Completá los datos del destinatario"
                  : "Generar orden"}
          </button>
        </div>
      )}
    </div>
  );
}
