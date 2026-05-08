import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pago rechazado - NYADY",
  description: "El pago no pudo ser completado. Podés intentar nuevamente o usar otro medio de pago.",
};

export default function FailurePage() {
  return (
    <div className="payment-page failure-page">
      <h1>Pago rechazado</h1>
      <p>El pago no pudo ser completado. Podés intentar nuevamente o usar otro medio de pago.</p>

      <div className="payment-actions">
        <a href="/cart">Volver al carrito</a>
        <a href="/">Ir a inicio</a>
      </div>
    </div>
  );
}