"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import "@/styles/PaymentStatus.scss";

function PendingContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams?.get("payment_id") || null;
  const status = searchParams?.get("status") || null;
  const externalReference = searchParams?.get("external_reference") || null;

  return (
    <div className="payment-page pending-page">
      <h1>Payment under review</h1>
      <p>Your payment is being processed. This may take a few minutes depending on the payment method chosen.</p>

      <div className="payment-info">
        {paymentId && <p>Payment ID: {paymentId}</p>}
        {externalReference && <p>Order #: {externalReference}</p>}
        {status && <p>Status from Mercado Pago: {status}</p>}
      </div>

      <div className="payment-actions">
        <Link href="/orders">View my orders</Link>
        <Link href="/">Go to home</Link>
      </div>
    </div>
  );
}

export default function PendingPage() {
  return (
    <Suspense fallback={<div className="payment-page">Loading...</div>}>
      <PendingContent />
    </Suspense>
  );
}