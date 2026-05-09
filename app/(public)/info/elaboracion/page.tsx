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
      description="Conocé nuestros plazos de entrega."
    >
      <h2>Tiempo Estimado: <strong>3 a 7 días hábiles</strong></h2>
      <p>El tiempo de elaboración varía según la demanda de nuestros clientes.</p>
      
      <h2>Proceso de Elaboración</h2>
      <p>
        En NYADY, cada producto es elaborado artesanalmente al detalle.
      </p>

      <h2>Notas Importantes</h2>
      <ul>
        <li>Te informaremos por email sobre el progreso de tu pedido</li>
        <li>Los tiempos de elaboración comienzan a contar desde la confirmación del pago</li>
        <li>Los tiempos de envío comienzan a contar cuando finalice su elaboración</li>
      </ul>
    </InfoPage>
  );
}
