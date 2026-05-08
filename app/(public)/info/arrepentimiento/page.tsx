import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Botón de Arrepentimiento - NYADY",
  description: "Información sobre el botón de arrepentimiento según Ley 24240.",
};

export default function ArrepentimientoPage() {
  return (
    <InfoPage
      title="Botón de Arrepentimiento"
      description="Según la Ley 24240, tenés derecho a arrepentirte de tu compra."
    >
      <h2>¿Qué es el Botón de Arrepentimiento?</h2>
      <p>
        Es tu derecho a desistir de una compra realizada a distancia sin penalidad.
        Este derecho está respaldado por la Ley 24240 de Defensa del Consumidor.
      </p>

      <h2>Plazo para Ejercarlo</h2>
      <p>Tenés <strong>10 días corridos</strong> desde la compra para ejercer este derecho.</p>

      <h2>Cómo EJERCERLO</h2>
      <ol>
        <li>Contactános por email a contacto@nyady.com</li>
        <li>Indica tu número de pedido</li>
        <li>Explicitá tu decisión de arrepentirte</li>
        <li>Te enviaremos la confirmación</li>
      </ol>

      <h2>Condiciones</h2>
      <ul>
        <li>El producto debe estar sin usar</li>
        <li>Debés devolverlo en el mismo estado</li>
        <li>Los gastos de devolución son tu responsabilidad</li>
        <li>Te reembolsaremos en 10 días hábiles</li>
      </ul>

      <h2>Excepciones</h2>
      <p>El derecho de arrepentimiento no aplica para:</p>
      <ul>
        <li>Productos personalizados</li>
        <li>Productos en oferta (especificado)</li>
        <li>Productos digitales</li>
      </ul>

      <div className="highlight">
        <p>
          <strong>Importante:</strong> El reembolso se realizará por el mismo medio de pago usado.
        </p>
      </div>
    </InfoPage>
  );
}