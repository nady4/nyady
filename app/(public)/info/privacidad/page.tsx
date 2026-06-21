import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Política de Privacidad - NYADY",
  description: "Política de privacidad de NYADY. Cómo protegemos tus datos."
};

export default function PrivacidadPage() {
  return (
    <InfoPage
      title="Política de Privacidad"
      description="En NYADY valoramos tu privacidad. Conocé cómo protegemos tus datos personales."
    >
      <h2>Recopilación de Datos</h2>
      <p>Recopilamos los siguientes datos para procesar tus pedidos:</p>
      <ul>
        <li>Nombre de usuario y email (para la cuenta)</li>
        <li>Contraseña (almacenada de forma cifrada, nunca en texto plano)</li>
        <li>
          Datos del destinatario: nombre, apellido, DNI y teléfono (necesarios
          para generar el envío)
        </li>
        <li>Dirección de envío (calle, ciudad, provincia y código postal)</li>
        <li>Historial de compras y cupones utilizados</li>
        <li>Datos de pago (procesados por Mercado Pago, no los almacenamos)</li>
      </ul>

      <h2>Uso de tus Datos</h2>
      <p>Usamos tus datos para:</p>
      <ul>
        <li>Procesar y despachar tus pedidos</li>
        <li>Crear el envío y enviarte el seguimiento por email</li>
        <li>Validar y aplicar los cupones de descuento</li>
        <li>Enviar actualizaciones sobre el estado de tus pedidos</li>
        <li>Mejorar nuestros servicios</li>
        <li>Enviar ofertas personalizadas (con tu consentimiento)</li>
      </ul>

      <h2>Compartición con Terceros</h2>
      <p>
        No vendemos tus datos. Compartimos únicamente la información necesaria
        para cumplir el servicio con:
      </p>
      <ul>
        <li>
          <strong>Mercado Pago</strong>: procesa los pagos de forma segura
        </li>
        <li>
          <strong>Zipnova</strong>: gestiona la cotización y el envío con los
          transportistas (Correo Argentino, OCA)
        </li>
      </ul>

      <h2>Protección de Datos</h2>
      <p>Tus datos están protegidos con:</p>
      <ul>
        <li>Encriptación SSL en la conexión</li>
        <li>Sesiones con token JWT (no almacenamos sesiones en el servidor)</li>
        <li>Contraseñas cifradas con bcrypt</li>
        <li>Almacenamiento seguro y acceso restringido</li>
        <li>
          No vendemos ni cedemos tus datos a terceros con fines comerciales
        </li>
      </ul>

      <h2>Tus Derechos</h2>
      <p>
        Según la Ley 25.326 de Protección de Datos Personales, tenés derecho a:
      </p>
      <ul>
        <li>Acceder a tus datos personales</li>
        <li>Rectificarlos si son inexactos</li>
        <li>Solicitar su eliminación</li>
        <li>Oponerte a su tratamiento</li>
      </ul>

      <div className="highlight">
        <p>
          <strong>Contacto:</strong> contacto@nyady.com
        </p>
      </div>
    </InfoPage>
  );
}
