"use client";
import { useEffect, useState } from "react";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { AddressType } from "@/actions/shipping";
import { ShippingQuoteResult } from "@/types";
import Link from "next/link";
import "@/styles/CheckoutButton.scss";

interface CheckoutButtonProps {
  total: number;
  address: AddressType | null | undefined;
  selectedShipping: ShippingQuoteResult | null;
}

export default function CheckoutButton({ total, address, selectedShipping }: CheckoutButtonProps) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY as string, {
      locale: "es-AR",
    });
  }, []);

  useEffect(() => {
    setOrderId(null);
  }, [total]);

  const handleCheckout = async () => {
    if (!address) return;
    if (!selectedShipping) return;
    if (isLoading || total <= 0) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
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
            Add shipping address to checkout
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      {orderId ? (
        <div className="wallet-container">
          <Wallet initialization={{ preferenceId: orderId }} />
        </div>
      ) : (
        <div className="wallet-container">
          <button
            className="checkout-button"
            onClick={handleCheckout}
            disabled={isLoading || total <= 0 || !selectedShipping}
          >
            {isLoading ? "Creating order..." : selectedShipping ? "Generate payment link" : "Select shipping option"}
          </button>
        </div>
      )}
    </div>
  );
}