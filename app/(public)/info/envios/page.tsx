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
      <h2>Métodos de Envío</h2>
      <p>
        Realizamos envíos a todo el país, se puede elegir entre Correo Argentino
        y OCA.
      </p>

      <h3>Envío a domicilio</h3>
      <ul>
        <li>Entrega en 2-5 días hábiles</li>
      </ul>

      <h3>Retiro en Punto de Entrega</h3>
      <ul>
        <li>Retiro en punto de entrega cercano</li>
      </ul>

      <h2>Costos de Envío</h2>
      <p>Los costos de envío se calculan automáticamente según:</p>
      <ul>
        <li>Peso y dimensiones del paquete</li>
        <li>Ubicación de entrega</li>
        <li>Método de envío seleccionado</li>
      </ul>
    </InfoPage>
  );
}
