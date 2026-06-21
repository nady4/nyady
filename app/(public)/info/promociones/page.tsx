import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Promociones y Descuentos - NYADY",
  description:
    "Conocé las promociones, descuentos y ofertas especiales de NYADY."
};

export default function PromocionesPage() {
  return (
    <InfoPage
      title="Promociones y Descuentos"
      description="¡Aprovechá nuestras promociones y descuentos exclusivos! Encontrá las mejores ofertas en NYADY."
    >
      <h2>Promociones Vigentes</h2>
      <p>
        Consultá regularmente esta página para ver las promociones actuales.
      </p>

      <h3>Descuentos por Cantidad</h3>
      <p>
        Se aplican automáticamente en el carrito según la cantidad total de
        unidades:
      </p>
      <ul>
        <li>4 o más productos: 10% de descuento (REVENDEDORA)</li>
        <li>20 o más productos: 20% de descuento (MAYORISTA)</li>
      </ul>
      <p>
        Estos descuentos son acumulables con los cupones de descuento.
      </p>

      <h2>Código de Descuento</h2>
      <p>Para usar un código de descuento:</p>
      <ol>
        <li>Agregá tus productos al carrito</li>
        <li>
          Ingresá el código de descuento y presioná <em>Aplicar</em>
        </li>
        <li>El descuento se sumará al total automáticamente</li>
      </ol>
      <p>
        Los cupones pueden ser de porcentaje o de monto fijo, y se validan al
        generar la orden.
      </p>

      <div className="highlight">
        <p>
          <strong>Nota:</strong> Algunos cupones son de un solo uso por usuario
          y pueden tener fecha de vencimiento o límite de usos. No se pueden
          combinar dos cupones en un mismo pedido.
        </p>
      </div>
    </InfoPage>
  );
}
