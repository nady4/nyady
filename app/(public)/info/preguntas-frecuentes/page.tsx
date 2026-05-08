import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes - NYADY",
  description: "Preguntas frecuentes sobre NYADY: productos, envíos, pagos, devoluciones y más.",
};

export default function PreguntasFrecuentesPage() {
  return (
    <InfoPage
      title="Preguntas Frecuentes"
      description="Respondemos las preguntas más frecuentes sobre NYADY."
    >
      <h2>Productos</h2>
      
      <h3>¿Qué productos venden?</h3>
      <p>Vendemos productos exclusivos diseñados y elaborados especialmente para vos.</p>

      <h3>¿Los productos son personalizados?</h3>
      <p>¡Sí! Muchos de nuestros productos pueden ser personalizados. Contactános para más información.</p>

      <h3>¿Tienen tienda física?</h3>
      <p>Actualmente solo vendemos online para llegar a todo el país.</p>

      <h2>Envíos</h2>

      <h3>¿A dónde envían?</h3>
      <p>Enviamos a todo el país.</p>

      <h3>¿Cuánto tarda el envío?</h3>
      <p>Entre 5-15 días hábiles según tu ubicación y método de envío.</p>

      <h3>¿Puedo seguir mi pedido?</h3>
      <p>Sí, te enviaremos un link de seguimiento por email.</p>

      <h2>Pagos</h2>

      <h3>¿Qué medios de pago aceptan?</h3>
      <p>Aceptamos Mercado Pago, tarjetas de crédito/débito, transferencias y pago en efectivo.</p>

      <h3>¿Es seguro pagar?</h3>
      <p>Sí, usamos Mercado Pago con los mayores estándares de seguridad.</p>

      <h2>Devoluciones</h2>

      <h3>¿Puedo devolver un producto?</h3>
      <p>Sí, dentro de los 30 días si está en condiciones originales.</p>

      <h3>¿Qué pasa si llega defectuoso?</h3>
      <p>Lo更换amos sin costo. Contactános inmediatamente.</p>

      <h2>Contacto</h2>

      <h3>¿Cómo los contacto?</h3>
      <p>Podés escribirnos por email, WhatsApp o redes sociales.</p>
    </InfoPage>
  );
}