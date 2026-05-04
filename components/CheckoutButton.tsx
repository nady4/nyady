"use client";
import { useEffect, useState } from "react";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import "@/styles/CheckoutButton.scss";

export default function CheckoutButton({ total }: { total: number }) {
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
            disabled={isLoading || total <= 0}
          >
            {isLoading ? "Creating order..." : "Generate payment link"}
          </button>
        </div>
      )}
    </div>
  );
}