"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import "@/styles/PaymentStatus.scss";

function FailureContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams?.get("payment_id") || null;
  const status = searchParams?.get("status") || null;
  const externalReference = searchParams?.get("external_reference") || null;

  return (
    <div className="payment-page failure-page">
      <h1>Payment rejected</h1>
      <p>The payment could not be completed. You can try again or use another payment method.</p>

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

export default function FailurePage() {
  return (
    <Suspense fallback={<div className="payment-page">Loading...</div>}>
      <FailureContent />
    </Suspense>
  );
}