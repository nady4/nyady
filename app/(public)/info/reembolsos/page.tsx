import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Reembolsos - NYADY",
  description: "Política de reembolsos y devoluciones de NYADY. Cambio, devolución y restitución de dinero.",
};

export default function ReembolsosPage() {
  return (
    <InfoPage
      title="Reembolsos y Devoluciones"
      description="En NYADy tu satisfacción es nuestra prioridad. Conoce nuestra política de reembolsos y devoluciones."
    >
      <h2>Política de Devolución</h2>
      <p>
        Aceptamos devoluciones dentro de los 30 días posteriores a la recepción del producto, 
        siempre y cuando el producto esté en las condiciones originales.
      </p>

      <h3>Condiciones para Devolución</h3>
      <ul>
        <li>El producto debe estar sin uso y en su empaque original</li>
        <li>Todas las etiquetas deben estar adjuntas</li>
        <li>No se aceptan devoluciones de productos personalizados</li>
        <li>Presentar comprobante de compra</li>
      </ul>

      <h2>Proceso de Devolución</h2>
      <ol>
        <li>Contactános por email o WhatsApp</li>
        <li>Te indicaremos la dirección de retorno</li>
        <li>Envía el producto por el medio indicado</li>
        <li>Recibirás el reembolso en 5-10 días hábiles</li>
      </ol>

      <h2>Opciones de Reembolso</h2>
      <ul>
        <li><strong>Reembolso al mismo medio de pago:</strong> Recomendado</li>
        <li><strong>Crédito para próximo pedido:</strong> 10% adicional</li>
        <li><strong>Campo Gift Card:</strong> 15% adicional</li>
      </ul>

      <h2>Productos Defectuosos</h2>
      <p>
        Si recibiste un producto defectuoso, contáctanos inmediatamente y lo cambiaremos sin costo adicional.
      </p>

      <div className="highlight">
        <p><strong>Nota:</strong> Los gastos de envío en devoluciones son responsabilidad del cliente, excepto en casos de error nuestro.</p>
      </div>
    </InfoPage>
  );
}