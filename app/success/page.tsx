import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pago exitoso",
  description:
    "Tu pago fue procesado correctamente. Gracias por tu compra de sandalias artesanales.",
  robots: { index: false, follow: true },
};

export default function SuccessPage() {
  return (
    <div className="payment-page success-page">
      <h1>¡Pago exitoso!</h1>
      <p>Tu pago fue procesado correctamente.</p>

      <div className="payment-info">
        <p>
          Ya está en elaboración: te avisamos por email cuando salga hacia el
          envío (las sandalias artesanales necesitan 3 a 7 días hábiles).
        </p>
      </div>

      <div className="payment-actions">
        <Link href="/orders">Ver mis pedidos</Link>
        <Link href="/">Volver a la tienda</Link>
      </div>
    </div>
  );
}
