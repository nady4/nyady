import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Términos y Condiciones - NYADY",
  description: "Términos y condiciones de NYADY. Rules y condiciones de uso.",
};

export default function TerminosPage() {
  return (
    <InfoPage
      title="Términos y Condiciones"
      description="Al usar NYADY, aceptás estos términos y condiciones."
    >
      <h2>Aceptación de Términos</h2>
      <p>
        Al acceder y usar NYADY, aceptás estos términos. Si no estás de acuerdo, por favor no uses el sitio.
      </p>

      <h2>Uso del Sitio</h2>
      <p>El sitio debe usarse para:</p>
      <ul>
        <li>Explorar y comprar productos</li>
        <li>Consultar información</li>
        <li>Gestionar tu cuenta</li>
      </ul>

      <h2>Cuenta de Usuario</h2>
      <p>Al crear una cuenta, aceptás:</p>
      <ul>
        <li>Proporcionar información veraz</li>
        <li>Mantener segura tu contraseña</li>
        <li>Ser responsable de tu cuenta</li>
      </ul>

      <h2>Pedidos y Pagos</h2>
      <ul>
        <li>Los precios pueden cambiar sin aviso</li>
        <li>Los pedidos requieren confirmación de pago</li>
        <li>Nos reservamos el derecho de cancelar pedidos</li>
      </ul>

      <h2>Propiedad Intelectual</h2>
      <p>
        Todo el contenido de NYADY es propiedad intelectual de NYADY. No se permite su reproducción sin autorización.
      </p>

      <h2>Limitación de Responsabilidad</h2>
      <p>
        NYADY no es responsable de daños directos o indirectos derivados del uso del sitio.
      </p>

      <h2>Modificaciones</h2>
      <p>Podemos modificar estos términos en cualquier momento. El uso continuo implica aceptación.</p>

      <div className="highlight">
        <p><strong>Contacto:</strong> legal@nyady.com</p>
      </div>
    </InfoPage>
  );
}