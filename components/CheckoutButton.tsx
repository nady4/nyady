"use client";
import { useEffect, useState } from "react";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { AddressType, ShippingSelection, ShippingQuoteItem } from "@/actions/shipping";
import { ShippingQuoteResult } from "@/types";
import Link from "next/link";
import "@/styles/CheckoutButton.scss";

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

  // Recipient data captured at checkout — Zipnova's create-shipment requires
  // name, document (DNI) and phone, none of which are stored on the user.
  const [recipientName, setRecipientName] = useState("");
  const [recipientDocument, setRecipientDocument] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  useEffect(() => {
    initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY as string, {
      locale: "es-AR"
    });
  }, []);

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
      if (data.id) setOrderId(data.id);
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
      {orderId ? (
        <div className="wallet-container">
          <Wallet initialization={{ preferenceId: orderId }} />
        </div>
      ) : (
        <div className="wallet-container">
          {showRecipientForm && (
            <div className="recipient-form">
              <p className="recipient-form-title">Datos del destinatario</p>
              <input
                type="text"
                placeholder="Nombre y apellido"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                autoComplete="name"
              />
              <input
                type="text"
                placeholder="DNI"
                value={recipientDocument}
                onChange={(e) => setRecipientDocument(e.target.value)}
                autoComplete="off"
              />
              <input
                type="tel"
                placeholder="Teléfono"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                autoComplete="tel"
              />
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
                ? "Selecciona un método de envío"
                : !recipientComplete
                  ? "Completá los datos del destinatario"
                  : "Generar orden"}
          </button>
        </div>
      )}
    </div>
  );
}
