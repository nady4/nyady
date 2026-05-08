import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Tiempos de Elaboración - NYADY",
  description: "Conoce los tiempos de elaboración de tus productos NYADY. Cada par es hecho a mano con los mejores materiales.",
};

export default function TiemposPage() {
  return (
    <InfoPage
      title="Tiempos de Elaboración"
      description="En NYADY, cada producto es elaborado con el máximo cuidado y atención al detalle. Conoce nuestros plazos de entrega."
    >
      <h2>Proceso de Elaboración</h2>
      <p>
        Todos nuestros productos son fabricados artesanalmente en nuestro taller. El tiempo de elaboración varía según el producto y la complejidad del diseño.
      </p>
      
      <h2>Tiempos Estimados</h2>
      <ul>
        <li><strong>Productos en stock:</strong> 2-5 días hábiles para el envío</li>
        <li><strong>Productos personalizados:</strong> 7-14 días hábiles para el envío</li>
        <li><strong>Pedidos especiales:</strong> 14-21 días hábiles (se informará al realizar el pedido)</li>
      </ul>

      <h2>Notas Importantes</h2>
      <ul>
        <li>Los tiempos comienzan a contar desde la confirmación del pago</li>
        <li>En temporada alta (festividades), los tiempos pueden extenderse</li>
        <li>Te mantendremos informado sobre el progreso de tu pedido</li>
      </ul>

      <div className="highlight">
        <p><strong>¿Necesitas urgentemente?</strong> Contáctanos y haremos lo posible por acomodar tu solicitud.</p>
      </div>
    </InfoPage>
  );
}