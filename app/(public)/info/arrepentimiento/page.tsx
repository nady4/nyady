import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Botón de Arrepentimiento - NYADY",
  description: "Información sobre el botón de arrepentimiento según Ley 24.240.",
};

export default function ArrepentimientoPage() {
  return (
    <InfoPage
      title="Botón de Arrepentimiento"
      description="Según la Ley 24.240, tenés derecho a arrepentirte de tu compra."
    >
      <h2>¿Qué es el Botón de Arrepentimiento?</h2>
      <p>
        Es tu derecho a desistir de una compra realizada a distancia sin
        penalidad. Este derecho está respaldado por la Ley 24.240 de Defensa del
        Consumidor.
      </p>

      <h2>Plazo para Ejercerlo</h2>
      <p>
        Tenés <strong>10 días corridos</strong> desde la compra para ejercer
        este derecho.
      </p>

      <h2>Cómo Ejercerlo</h2>
      <ol>
        <li>Contactános por email a contacto@nyady.com</li>
        <li>Indicá tu número de pedido</li>
        <li>Explicitá tu decisión de arrepentirte</li>
        <li>Te enviaremos la confirmación y las instrucciones de devolución</li>
      </ol>

      <h2>Condiciones</h2>
      <ul>
        <li>El producto debe estar sin usar</li>
        <li>Debés devolverlo en su empaque original y con sus etiquetas</li>
        <li>Los gastos de devolución son tu responsabilidad</li>
        <li>Te reembolsaremos en 5 a 10 días hábiles desde que recibimos el producto</li>
      </ul>

      <h2>Excepciones</h2>
      <p>El derecho de arrepentimiento no aplica para:</p>
      <ul>
        <li>Productos personalizados o elaborados a pedido</li>
        <li>Productos en oferta cuando se especifique expresamente</li>
      </ul>

      <div className="highlight">
        <p>
          <strong>Importante:</strong> El reembolso se realizará por el mismo
          medio de pago usado en la compra. Para más detalle, ver la política de{" "}
          <a href="/info/reembolsos">reembolsos y devoluciones</a>.
        </p>
      </div>
    </InfoPage>
  );
}
