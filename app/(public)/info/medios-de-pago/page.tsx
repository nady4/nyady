import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Medios de Pago - NYADY",
  description: "Conoce todas las opciones de pago disponibles en NYADY: Mercado Pago, tarjetas, efectivo y más.",
};

export default function MediosDePagoPage() {
  return (
    <InfoPage
      title="Medios de Pago"
      description="En NYADY aceptamos múltiples formas de pago para tu comodidad. ¡Elige la que mejor te funcione!"
    >
      <h2>Métodos de Pago Disponibles</h2>
      
      <h3>Mercado Pago</h3>
      <ul>
        <li>Tarjetas de crédito y débito (Visa, Mastercard, American Express, Cabal)</li>
        <li>Dinero en cuenta Mercado Pago</li>
        <li>Pago fácil / Rapipago</li>
        <li>Cuotas sin interés</li>
      </ul>

      <h3>Tarjetas de Crédito</h3>
      <ul>
        <li>Visa - Hasta 12 cuotas</li>
        <li>Mastercard - Hasta 12 cuotas</li>
        <li>American Express - Hasta 12 cuotas</li>
        <li>Cuotas sin interés disponibles</li>
      </ul>

      <h3>Tarjetas de Débito</h3>
      <ul>
        <li>Visa Débito</li>
        <li>Mastercard Débito</li>
        <li>Maestro</li>
      </ul>

      <h3>Efectivo</h3>
      <ul>
        <li>Pago Fácil</li>
        <li>Rapipago</li>
        <li>Provincia Pagos</li>
      </ul>

      <h2>Seguridad en el Pago</h2>
      <p>
        Todos tus pagos están protegidos con los más altos estándares de seguridad. 
        Utilizamos Mercado Pago como procesador de pagos, garantizando la seguridad de tus datos.
      </p>

      <div className="highlight">
        <p><strong>Promociones:</strong> ¡Consultá las promociones vigentes en la sección de promociones!</p>
      </div>
    </InfoPage>
  );
}