"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import "@/styles/PaymentStatus.scss";

export default function SuccessPage() {
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [externalReference, setExternalReference] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    setPaymentId(searchParams.get("payment_id"));
    setStatus(searchParams.get("status"));
    setExternalReference(searchParams.get("external_reference"));
  }, []);

  return (
    <div className="payment-page success-page">
      <h1>Payment successful!</h1>
      <p>Your payment was processed correctly.</p>

      <div className="payment-info">
        {paymentId && <p>Payment ID: {paymentId}</p>}
        {externalReference && <p>Order #: {externalReference}</p>}
        {status && <p>Status from Mercado Pago: {status}</p>}
      </div>

      <div className="payment-actions">
        <Link href="/orders">View my orders</Link>
        <Link href="/">Back to store</Link>
      </div>
    </div>
  );
}