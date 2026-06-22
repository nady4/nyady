import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pago en revisión - NYADY",
  description: "Tu pago está siendo procesado. Esto puede tomar unos minutos según el medio de pago elegido.",
};

export default function PendingPage() {
  return (
    <div className="payment-page pending-page">
      <h1>Pago en revisión</h1>
      <p>Tu pago está siendo procesado. Esto puede tomar unos minutos según el medio de pago elegido.</p>

      <div className="payment-actions">
        <Link href="/orders">Ver mis pedidos</Link>
        <Link href="/">Ir a inicio</Link>
      </div>
    </div>
  );
}