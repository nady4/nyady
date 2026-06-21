import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Reembolsos - NYADY",
  description:
    "Política de reembolsos y devoluciones de NYADY. Cambio, devolución y restitución de dinero."
};

export default function ReembolsosPage() {
  return (
    <InfoPage
      title="Reembolsos y Devoluciones"
      description="En NYADY tu satisfacción es nuestra prioridad. Conocé nuestra política de reembolsos y devoluciones."
    >
      <h2>Devolución vs. Arrepentimiento</h2>
      <p>
        Son dos derechos distintos: el{" "}
        <a href="/info/arrepentimiento">botón de arrepentimiento</a> te permite
        desistir de una compra a distancia dentro de los <strong>10 días
        corridos</strong> desde la compra (Ley 24.240). La devolución, en cambio,
        aplica cuando ya recibiste el producto y querés devolverlo dentro de los{" "}
        <strong>10 días</strong> desde la recepción.
      </p>

      <h2>Política de Devolución</h2>
      <p>
        Aceptamos devoluciones dentro de los 10 días posteriores a la recepción
        del producto, siempre y cuando esté en las condiciones originales.
      </p>

      <h3>Condiciones para la Devolución</h3>
      <ul>
        <li>El producto debe estar sin uso y en su empaque original</li>
        <li>Todas las etiquetas deben estar adjuntas</li>
        <li>La caja del producto debe estar intacta</li>
      </ul>

      <h2>Proceso de Devolución</h2>
      <ol>
        <li>Contactános por email a contacto@nyady.com</li>
        <li>Indicanos si preferís un reembolso o un cambio del producto</li>
        <li>Te indicaremos la dirección de retorno</li>
        <li>Enviá el producto por el medio indicado</li>
        <li>
          Recibirás el reembolso en 5 a 10 días hábiles desde que recibimos el
          producto
        </li>
      </ol>

      <h2>Productos Defectuosos</h2>
      <p>
        Si recibiste un producto defectuoso, contactános inmediatamente y lo
        cambiaremos sin costo adicional.
      </p>

      <div className="highlight">
        <p>
          <strong>Nota:</strong> Los gastos de envío en devoluciones son
          responsabilidad del cliente, excepto en casos de error nuestro. El
          reembolso se realiza por el mismo medio de pago usado en la compra.
        </p>
      </div>
    </InfoPage>
  );
}
