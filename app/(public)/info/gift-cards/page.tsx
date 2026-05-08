import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Gift Cards - NYADY",
  description: "Gift Cards NYADY: Regala gift cards de $10, $30, $50, $100 o cualquier valor. El regalo perfecto.",
};

export default function GiftCardsPage() {
  return (
    <InfoPage
      title="Gift Cards NYADY"
      description="Regala el regalo perfecto. Una Gift Card NYADY es el detalle perfeito para cualquier ocasión."
    >
      <h2>Gift Cards Predefinidas</h2>
      <p>Elige el monto perfecto para tu regalo:</p>
      <ul>
        <li><strong>Gift Card $10:</strong> Ideal para un pequeño detalle</li>
        <li><strong>Gift Card $30:</strong> Perfecto para un accesorio</li>
        <li><strong>Gift Card $50:</strong> Un regalo sustancial</li>
        <li><strong>Gift Card $100:</strong> El regalo perfecto</li>
      </ul>

      <h2>Gift Cards Personalizadas</h2>
      <p>También podés elegir cualquier monto entre $10 y $500.</p>

      <h2>Cómo Usar una Gift Card</h2>
      <ol>
        <li>Seleccioná tus productos</li>
        <li>En el checkout, elegí "Usar Gift Card"</li>
        <li>Ingresá el código de la Gift Card</li>
        <li>El saldo se aplicará a tu compra</li>
      </ol>

      <h2>Información Importante</h2>
      <ul>
        <li>Las Gift Cards no expiran</li>
        <li>Se puede usar total o parcialmente</li>
        <li>El saldo restante queda guardado para futuras compras</li>
        <li>No es acumulable con otros descuentos</li>
      </ul>

      <div className="highlight">
        <p><strong>¿Necesitás ayuda?</strong> Contactános y te ayudamos con tu Gift Card.</p>
      </div>
    </InfoPage>
  );
}