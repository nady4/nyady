import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Términos y Condiciones - NYADY",
  description: "Términos y condiciones de NYADY. Reglas y condiciones de uso."
};

export default function TerminosPage() {
  return (
    <InfoPage
      title="Términos y Condiciones"
      description="Al usar NYADY, aceptás estos términos y condiciones."
    >
      <h2>Aceptación de Términos</h2>
      <p>
        Al acceder y usar NYADY, aceptás estos términos. Si no estás de acuerdo,
        por favor no uses el sitio.
      </p>

      <h2>Uso del Sitio</h2>
      <p>El sitio debe usarse para:</p>
      <ul>
        <li>Explorar y comprar productos</li>
        <li>Consultar información</li>
        <li>Gestionar tu cuenta y pedidos</li>
      </ul>

      <h2>Cuenta de Usuario</h2>
      <p>Al crear una cuenta, aceptás:</p>
      <ul>
        <li>Proporcionar información veraz</li>
        <li>Mantener segura tu contraseña</li>
        <li>Ser responsable de los pedidos realizados desde tu cuenta</li>
      </ul>

      <h2>Productos y Elaboración</h2>
      <p>
        Todos nuestros productos son elaborados artesanalmente. El tiempo de
        elaboración es de <strong>3 a 7 días hábiles</strong> y comienza a
        contar desde la confirmación del pago. Los tiempos de envío se suman a
        partir de que finaliza la elaboración.
      </p>
      <ul>
        <li>Los productos pueden presentar variaciones propias de la artesanía</li>
        <li>El stock y la disponibilidad pueden variar</li>
        <li>Las imágenes son ilustrativas</li>
      </ul>

      <h2>Pedidos y Pagos</h2>
      <ul>
        <li>Los precios pueden cambiar sin aviso</li>
        <li>
          Los pedidos requieren confirmación de pago para iniciar la
          elaboración
        </li>
        <li>Los pagos se procesan a través de Mercado Pago</li>
        <li>
          Nos reservamos el derecho de cancelar pedidos en caso de error de
          stock o de precio
        </li>
      </ul>

      <h2>Descuentos y Cupones</h2>
      <ul>
        <li>
          Descuentos por cantidad automáticos: 10% llevando 4 o más unidades y
          20% llevando 20 o más unidades
        </li>
        <li>
          Los cupones de descuento se aplican en el carrito y se validan al
          generar la orden
        </li>
        <li>Los cupones pueden ser de porcentaje o monto fijo</li>
        <li>
          Algunos cupones son de un solo uso por usuario y pueden tener fecha de
          vencimiento
        </li>
      </ul>

      <h2>Envíos</h2>
      <p>
        Realizamos envíos a todo el país a través de Correo Argentino y OCA, con
        cotización automática según peso, dimensiones y ubicación. El
        seguimiento del envío está disponible en la sección{" "}
        <em>Mis pedidos</em> una vez despachado.
      </p>

      <h2>Devoluciones y Arrepentimiento</h2>
      <ul>
        <li>
          Botón de arrepentimiento: 10 días corridos desde la compra según la
          Ley 24.240
        </li>
        <li>
          Devoluciones: 10 días desde la recepción en condiciones originales
        </li>
        <li>
          Ver las políticas detalladas en{" "}
          <a href="/info/arrepentimiento">arrepentimiento</a> y{" "}
          <a href="/info/reembolsos">reembolsos</a>
        </li>
      </ul>

      <h2>Propiedad Intelectual</h2>
      <p>
        Todo el contenido de NYADY es propiedad intelectual de NYADY. No se
        permite su reproducción sin autorización.
      </p>

      <h2>Limitación de Responsabilidad</h2>
      <p>
        NYADY no es responsable de daños directos o indirectos derivados del uso
        del sitio ni de demoras imputables a los transportistas.
      </p>

      <h2>Modificaciones</h2>
      <p>
        Podemos modificar estos términos en cualquier momento. El uso continuo
        implica aceptación.
      </p>

      <div className="highlight">
        <p>
          <strong>Contacto:</strong> contacto@nyady.com
        </p>
      </div>
    </InfoPage>
  );
}
