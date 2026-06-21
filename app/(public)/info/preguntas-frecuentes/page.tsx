import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes - NYADY",
  description:
    "Preguntas frecuentes sobre NYADY: productos, elaboración, envíos, pagos, cupones y devoluciones.",
};

export default function PreguntasFrecuentesPage() {
  return (
    <InfoPage
      title="Preguntas Frecuentes"
      description="Respondemos las preguntas más frecuentes sobre NYADY."
    >
      <h2>Productos</h2>

      <h3>¿Qué productos venden?</h3>
      <p>
        Vendemos calzados artesanales (pantuflas, pantubotas, pantuflones,
        chinelas y hornitos) diseñados y elaborados a mano especialmente para
        vos.
      </p>

      <h3>¿Los productos son personalizados?</h3>
      <p>
        ¡Sí! Muchos de nuestros productos pueden personalizarse en talles,
        colores y opciones de taco. Elegí las variantes desde la página del
        producto.
      </p>

      <h3>¿Tienen tienda física?</h3>
      <p>Actualmente solo vendemos online para llegar a todo el país.</p>

      <h2>Elaboración y Envíos</h2>

      <h3>¿Cuánto tarda en llegar mi pedido?</h3>
      <p>
        La elaboración artesanal toma de <strong>3 a 7 días hábiles</strong>{" "}
        desde la confirmación del pago. A eso se suma el envío, de{" "}
        <strong>2 a 5 días hábiles</strong> a domicilio según tu ubicación y el
        transporte elegido (Correo Argentino u OCA). El total aproximado es de 5
        a 12 días hábiles.
      </p>

      <h3>¿A dónde envían?</h3>
      <p>Enviamos a todo el país, a domicilio o a punto de retiro.</p>

      <h3>¿Cuánto cuesta el envío?</h3>
      <p>
        El costo se calcula automáticamente en el carrito según el peso, las
        dimensiones del paquete y tu dirección de envío.
      </p>

      <h3>¿Puedo seguir mi pedido?</h3>
      <p>
        Sí. Una vez despachado, podés seguir el envío desde la sección{" "}
        <em>Mis pedidos</em> con el número de seguimiento y el link del
        transporte. También te avisamos por email.
      </p>

      <h2>Pagos y Cupones</h2>

      <h3>¿Qué medios de pago aceptan?</h3>
      <p>
        Aceptamos Mercado Pago: tarjetas de crédito y débito (Visa, Mastercard,
        American Express, Cabal), dinero en cuenta, Pago Fácil y Rapipago.
      </p>

      <h3>¿Es seguro pagar?</h3>
      <p>
        Sí, todos los pagos se procesan a través de Mercado Pago con los más
        altos estándares de seguridad.
      </p>

      <h3>¿Tienen descuentos por cantidad?</h3>
      <p>
        Sí, se aplican automáticamente: 10% llevando 4 o más unidades y 20%
        llevando 20 o más unidades.
      </p>

      <h3>¿Cómo uso un cupón de descuento?</h3>
      <p>
        Ingresá el código en el carrito y presioná <em>Aplicar</em>. El
        descuento puede ser por porcentaje o monto fijo, y se valida al generar
        la orden. Algunos cupones son de un solo uso por usuario.
      </p>

      <h2>Devoluciones</h2>

      <h3>¿Puedo arrepentirme de una compra?</h3>
      <p>
        Sí. Tenés <strong>10 días corridos</strong> desde la compra para
        ejercer el botón de arrepentimiento según la Ley 24.240. Ver{" "}
        <a href="/info/arrepentimiento">arrepentimiento</a>.
      </p>

      <h3>¿Puedo devolver un producto?</h3>
      <p>
        Sí, dentro de los <strong>10 días</strong> desde la recepción, siempre
        que esté sin uso y en su empaque original. Ver{" "}
        <a href="/info/reembolsos">reembolsos</a>.
      </p>

      <h3>¿Qué pasa si llega defectuoso?</h3>
      <p>
        Lo cambiamos sin costo. Contactános inmediatamente a
        contacto@nyady.com.
      </p>

      <h2>Contacto</h2>

      <h3>¿Cómo los contacto?</h3>
      <p>
        Podés escribirnos por email a contacto@nyady.com o por nuestras redes
        sociales (Instagram: @nyady, Facebook: NYADY). Respondemos en menos de
        24 horas en horario laboral.
      </p>
    </InfoPage>
  );
}
