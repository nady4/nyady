import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pago exitoso - NYADY",
  description: "Tu pago fue procesado correctamente. Gracias por tu compra de pantuflas artesanales.",
};

export default function SuccessPage() {
  return (
    <div className="payment-page success-page">
      <h1>¡Pago exitoso!</h1>
      <p>Tu pago fue procesado correctamente.</p>

      <div className="payment-info">
        <p>Serás redirigido a tus pedidos.</p>
      </div>

      <div className="payment-actions">
        <Link href="/orders">Ver mis pedidos</Link>
        <Link href="/">Volver a la tienda</Link>
      </div>
    </div>
  );
}