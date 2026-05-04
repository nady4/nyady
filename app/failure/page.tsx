"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import "@/styles/PaymentStatus.scss";

export default function FailurePage() {
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
    <div className="payment-page failure-page">
      <h1>Payment rejected</h1>
      <p>
        The payment could not be completed. You can try again or use another
        payment method.
      </p>

      <div className="payment-info">
        {paymentId && <p>Payment ID: {paymentId}</p>}
        {externalReference && <p>Order #: {externalReference}</p>}
        {status && <p>Status from Mercado Pago: {status}</p>}
      </div>

      <div className="payment-actions">
        <Link href="/cart">Back to cart</Link>
        <Link href="/">Go to home</Link>
      </div>
    </div>
  );
}