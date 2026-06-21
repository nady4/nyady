import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Tiempos de Elaboración - NYADY",
  description:
    "Conocé los tiempos de elaboración de tus productos NYADY. Cada par es hecho a mano con los mejores materiales."
};

export default function TiemposPage() {
  return (
    <InfoPage
      title="Tiempos de Elaboración"
      description="Conocé nuestros plazos de entrega."
    >
      <h2>
        Tiempo Estimado: <strong>3 a 7 días hábiles</strong>
      </h2>
      <p>El tiempo de elaboración varía según la demanda de nuestros clientes.</p>

      <h2>Proceso de Elaboración</h2>
      <p>
        En NYADY, cada producto es elaborado artesanalmente al detalle, a mano y
        con los mejores materiales.
      </p>

      <h2>Notas Importantes</h2>
      <ul>
        <li>Te informaremos por email sobre el progreso de tu pedido</li>
        <li>
          Los tiempos de elaboración comienzan a contar desde la confirmación
          del pago
        </li>
        <li>
          Los tiempos de <a href="/info/envios">envío</a> comienzan a contar
          cuando finaliza la elaboración
        </li>
      </ul>
    </InfoPage>
  );
}
