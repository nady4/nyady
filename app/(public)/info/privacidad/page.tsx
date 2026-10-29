import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Política de Privacidad",
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
        <li>Contraseña (almacenada cifrada con bcrypt, nunca en texto plano)</li>
        <li>
          Datos del destinatario: nombre, DNI y teléfono (necesarios para
          generar el envío)
        </li>
        <li>Dirección de envío (calle, ciudad, provincia y código postal)</li>
        <li>Historial de compras, cupones utilizados y lista de favoritos</li>
        <li>
          Consentimientos: Términos y Condiciones (con versión) y opt-in de
          marketing
        </li>
        <li>Datos de pago (procesados por Mercado Pago, no los almacenamos)</li>
      </ul>

      <h2>Uso de tus Datos</h2>
      <p>Usamos tus datos para:</p>
      <ul>
        <li>Procesar, elaborar y despachar tus pedidos</li>
        <li>Crear el envío y enviarte el seguimiento por email</li>
        <li>Validar y aplicar los cupones de descuento</li>
        <li>Enviar emails transaccionales (verificación, confirmación de pago pendiente, cambios de estado, recuperación de contraseña)</li>
        <li>Atender consultas y reclamos</li>
        <li>Enviar ofertas promocionales solo si marcaste el opt-in (podés pedir el alta borrarte de la lista en cualquier momento)</li>
      </ul>

      <h2>Compartición con Terceros</h2>
      <p>
        No vendemos tus datos. Compartimos únicamente la información necesaria
        para cumplir el servicio con:
      </p>
      <ul>
        <li>
          <strong>Mercado Pago</strong>: procesa los pagos y emite los comprobantes de pago offline (el DNI del destinatario viaja con la orden — MP/transportista lo requieren para operar)
        </li>
        <li>
          <strong>Zipnova</strong>: gestiona la cotización, la creación del envío y el tracking con los transportistas (Correo Argentino, OCA, Cabify, Chazki, entre otros)
        </li>
        <li>
          <strong>Resend</strong>: entrega los emails transaccionales (sin sending de marketing por defecto)
        </li>
        <li>
          <strong>Base de datos (Neon PostgreSQL, EE.UU.)</strong>: alojamiento de los datos. La transferencia internacional se realiza conforme a la Ley 25.326
        </li>
      </ul>

      <h2>Cookies y Sesiones</h2>
      <ul>
        <li>
          Cookie de sesión JWT (<em>next-auth</em>): necesaria para mantener tu sesión; no persistimos sesiones en el servidor
        </li>
        <li>
          No usamos cookies publicitarias ni de tracking de terceros
        </li>
      </ul>

      <h2>Terceros y Menores</h2>
      <p>
        El servicio está orientado a personas mayores de 18 años. Si detectamos
        cuentas de menores crearemos se cancelan, se archivan y se eliminan
        tras una reclamo previa.
      </p>

      <h2>Cómo Protegemos tus Datos</h2>
      <ul>
        <li>Encriptación SSL/HTTPS en toda la navegación</li>
        <li>Sesiones con token JWT firmado (NextAuth) sin estado servidor</li>
        <li>Contraseñas cifradas con bcrypt (coste moderado)</li>
        <li>
          Rate limiting y validación de entrada en todos los endpoints
          autorizables
        </li>
        <li>Acceso restringido a la base por credenciales únicas del servidor</li>
        <li>
          Los pagos nunca pasan por nuestros servidores: MP administra la información
          de tarjeta y nos devuelve solo resultados (id, monto, estado)
        </li>
      </ul>

      <h2>Conservación de Datos</h2>
      <ul>
        <li>
          Datos de pedidos: se conservan para facturación y reclamos
          (mínimo 5 años, conforme a normativa fiscal/tributaria) y como
          historial para tu cuenta
        </li>
        <li>
          Cuenta borrada: aplica archivado (soft delete) para cuidar la
          trazabilidad de pedidos históricos; el email se anonimiza a pedido.
          Escribinos a contacto@nyady.com para eliminar definitivamente tus
          datos
        </li>
      </ul>

      <h2>Tus Derechos</h2>
      <p>
        Según la Ley 25.326 de Protección de Datos Personales, tenés derecho a:
      </p>
      <ul>
        <li>Acceder a tus datos personales</li>
        <li>Rectificarlos o actualizarlos</li>
        <li>Solicitar su eliminación/anonimización</li>
        <li>Oponerte a su tratamiento</li>
        <li>Revocar el consentimiento de marketing</li>
        <li>
          Presentar un reclamo ante el órgano de control (AAIP) si tu solicitud no se satisface
        </li>
      </ul>

      <div className="highlight">
        <p>
          <strong>Contacto:</strong> contacto@nyady.com
        </p>
      </div>
    </InfoPage>
  );
}
