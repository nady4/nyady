import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Política de Privacidad - NYADY",
  description: "Política de privacidad de NYADY. Cómo protegemos tus datos.",
};

export default function PrivacidadPage() {
  return (
    <InfoPage
      title="Política de Privacidad"
      description="En NYADY valoramos tu privacidad. Conoce cómo protegemos tus datos personales."
    >
      <h2>Recopilación de Datos</h2>
      <p>Recopilamos los siguientes datos:</p>
      <ul>
        <li>Nombre y apellido</li>
        <li>Email y teléfono</li>
        <li>Dirección de envío</li>
        <li>Historial de compras</li>
        <li>Datos de pago (procesados por Mercado Pago)</li>
      </ul>

      <h2>Uso de tus Datos</h2>
      <p>Usamos tus datos para:</p>
      <ul>
        <li>Procesar tus pedidos</li>
        <li>Enviar actualizaciones de pedidos</li>
        <li>Mejorar nuestros servicios</li>
        <li>Enviar ofertas personalizadas (con tu consentimiento)</li>
      </ul>

      <h2>Protección de Datos</h2>
      <p>Tus datos están protegidos con:</p>
      <ul>
        <li>Encriptación SSL</li>
        <li>Almacenamiento seguro</li>
        <li>Acceso restringido</li>
        <li>No vendemos tus datos a terceros</li>
      </ul>

      <h2>Tus Derechos</h2>
      <p>Tenés derecho a:</p>
      <ul>
        <li>Acceder a tus datos</li>
        <li>Rectificarlos</li>
        <li>Eliminarlos</li>
        <li>Oponerte a su uso</li>
      </ul>

      <div className="highlight">
        <p><strong>Contacto:</strong> privacidad@nyady.com</p>
      </div>
    </InfoPage>
  );
}