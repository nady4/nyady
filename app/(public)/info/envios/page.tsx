import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Envíos - NYADY",
  description: "Información sobre métodos de envío, costos y tiempos de entrega de NYADY.",
};

export default function EnviosPage() {
  return (
    <InfoPage
      title="Envíos"
      description="Conocyó las opciones de envío disponibles para tu pedido NYADY."
    >
      <h2>Métodos de Envío</h2>
      <p>Realizamos envíos a todo el país mediante diferentes opciones:</p>
      
      <h3>Envío Estándar</h3>
      <ul>
        <li>Entrega en 5-10 días hábiles</li>
        <li>Costo configurable según zona</li>
        <li>Seguimiento online</li>
      </ul>

      <h3>Envío Express</h3>
      <ul>
        <li>Entrega en 2-5 días hábiles</li>
        <li>Costo adicional</li>
        <li>Prioridad en despacho</li>
      </ul>

      <h3>Retiro en Punto de Entrega</h3>
      <ul>
        <li>Retiro en punto de dropoff cercano</li>
        <li>Entrega en 3-7 días hábiles</li>
        <li>Costo reducido</li>
      </ul>

      <h2>Costos de Envío</h2>
      <p>Los costos de envío se calculan automáticamente en el checkout según:</p>
      <ul>
        <li>Peso y dimensiones del paquete</li>
        <li>Ubicación de entrega</li>
        <li>Método de envío seleccionado</li>
      </ul>

      <div className="highlight">
        <p><strong>Envío gratis:</strong> Para pedidos superiores a $50.000 aproximadamente.</p>
      </div>
    </InfoPage>
  );
}