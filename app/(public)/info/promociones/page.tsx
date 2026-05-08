import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Promociones y Descuentos - NYADY",
  description: "Conoce las promociones, descuentos y ofertas especiales de NYADY.",
};

export default function PromocionesPage() {
  return (
    <InfoPage
      title="Promociones y Descuentos"
      description="¡Aprovecha nuestras promocioens y descuentos exclusivos! Encontrá las mejores ofertas en NYADY."
    >
      <h2>Promociones Vigentes</h2>
      <p>Consultá regularmente esta página para ver las promocioens actuales.</p>

      <h3>Descuentos por Cantidad</h3>
      <ul>
        <li>2 productos: 5% de descuento</li>
        <li>3 productos: 10% de descuento</li>
        <li>4+ productos: 15% de descuento</li>
      </ul>

      <h3>Descuentos por Método de Pago</h3>
      <ul>
        <li>Pago efectivo: 10% de descuento</li>
        <li>Transferencia bancaria: 10% de descuento</li>
      </ul>

      <h2>Programa de Descuentos</h2>

      <h3>Primera Compra</h3>
      <p>¡10% de descuento en tu primera compra! Utilizá el código: PRIMERA10</p>

      <h3>Cliente Frecuente</h3>
      <p>Como cliente frecuente, tendrás acceso a descuentos exclusivos y ventas privadas.</p>

      <h3>Newsletter</h3>
      <p>Suscribite a nuestro newsletter y recibí primero las ofertas y descuentos.</p>

      <h2>Código de Descuento</h2>
      <p>Para usar un código de descuento:</p>
      <ol>
        <li>Agregá tus productos al carrito</li>
        <li>En el checkout, ingresá el código en "Código de descuento"</li>
        <li>El descuento se aplicará automáticamente</li>
      </ol>

      <div className="highlight">
        <p><strong>Nota:</strong> Los códigos no son acumulables con otras promociones.</p>
      </div>
    </InfoPage>
  );
}