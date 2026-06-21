import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Envíos - NYADY",
  description:
    "Información sobre métodos de envío, costos y tiempos de entrega de NYADY."
};

export default function EnviosPage() {
  return (
    <InfoPage
      title="Envíos"
      description="Conocé las opciones de envío disponibles para tu pedido NYADY."
    >
      <h2>Tiempos de Entrega</h2>
      <p>
        Cada producto es elaborado a mano. El tiempo de{" "}
        <a href="/info/elaboracion">elaboración</a> es de{" "}
        <strong>3 a 7 días hábiles</strong> desde la confirmación del pago, y se
        suma al tiempo de envío que elijas a continuación.
      </p>

      <h2>Métodos de Envío</h2>
      <p>
        Realizamos envíos a todo el país. Podés elegir entre Correo Argentino y
        OCA al cotizar en el carrito.
      </p>

      <h3>Envío a domicilio</h3>
      <ul>
        <li>Entrega en 2 a 5 días hábiles una vez despachado</li>
      </ul>

      <h3>Retiro en punto de entrega</h3>
      <ul>
        <li>Retiro en un punto de entrega cercano a tu ubicación</li>
      </ul>

      <h2>Costos de Envío</h2>
      <p>Los costos de envío se calculan automáticamente según:</p>
      <ul>
        <li>Peso y dimensiones del paquete</li>
        <li>Ubicación de entrega</li>
        <li>Método de envío seleccionado</li>
      </ul>

      <h2>Seguimiento del Envío</h2>
      <p>
        Una vez que tu pedido está despachado, podés seguirlo desde la sección{" "}
        <em>Mis pedidos</em> con el número de seguimiento y el link del
        transporte. También te avisamos por email sobre el progreso de tu envío.
      </p>

      <div className="highlight">
        <p>
          <strong>¿Dudas?</strong> Mirá las{" "}
          <a href="/info/preguntas-frecuentes">preguntas frecuentes</a> o{" "}
          <a href="/info/contacto">contactános</a>.
        </p>
      </div>
    </InfoPage>
  );
}
