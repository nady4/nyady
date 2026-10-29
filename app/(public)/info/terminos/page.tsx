import { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
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
        <li>Los productos se elaboran &laquo;a pedido&raquo;: no operamos con stock permanente</li>
        <li>Las imágenes son ilustrativas</li>
      </ul>

      <h2>Pedidos y Pagos</h2>
      <ul>
        <li>Los precios pueden cambiar sin aviso</li>
        <li>
          Los pedidos requieren confirmación de pago para iniciar la
          elaboración
        </li>
        <li>
          Los pagos se procesan a través de Mercado Pago (tarjetas, cuenta de
          MP, Rapipago/Pago Fácil, transferencias) y se acreditan &laquo;para la
          tienda&raquo; al estado <em>aprobado</em>
        </li>
        <li>
          Los pagos offline (Rapipago/Pago Fácil) quedan <em>pendientes</em>{" "}
          hasta que se abonen en el establecimiento. Si el cupón no se paga
          dentro de la fecha indicada, MP lo cancela y el pedido no se elabora
        </li>
        <li>
          Las contingencias de tarjeta (pago <em>pendiente</em>) esperan
          autorización del banco emisor; el pedido no arranca hasta que el
          pago quede aprobado
        </li>
        <li>
          Nos reservamos el derecho de cancelar pedidos en caso de error de
          stock o de precio, reembolsando lo abonado
        </li>
      </ul>

      <h2>Descuentos y Cupones</h2>
      <ul>
        <li>
          Los cupones de descuento se aplican en el carrito y se validan al
          generar la orden
        </li>
        <li>Los cupones pueden ser de porcentaje o monto fijo</li>
        <li>
          Algunos cupones son de un solo uso por usuario, pueden renunciar por
          fecha o tener un límite total de usos
        </li>
        <li>
          El descuento se aplica al detalle de productos (no al costo de
          envío) salvo indicación contraria del cupón
        </li>
      </ul>

      <h2>Envíos</h2>
      <p>
        Realizamos envíos a todo el país a través de transportes gestionados
        con la plataforma Zipnova (por ejemplo Correo Argentino, OCA, Cabify
        Logistics, Chazki, QX Logística, Toparco). La cotización es automática
        según peso, dimensiones y ubicación de destino y se muestra antes de
        generar la orden.
      </p>
      <ul>
        <li>
          Podés elegir a domicilio o retiro en un punto de entrega
          (sucursales) según la disponibilidad de tu zona
        </li>
        <li>
          El seguimiento del envío está disponible en la sección{" "}
          <em>Mis pedidos</em> una vez despachado
        </li>
        <li>
          En pedidos a domicilio, la persona destinataria debe poder recibirlo
          en el horario de entrega del transporte
        </li>
      </ul>

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
          <Link href="/info/arrepentimiento">arrepentimiento</Link> y{" "}
          <Link href="/info/reembolsos">reembolsos</Link>
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
        del sitio ni de demoras imputables a los transportistas. Para
        pérdida/daño en el tránsito, aplicar los términos del transportista y
        coordinamos con vos la reposición o el reembolso según corresponda.
      </p>

      <h2>Ley Aplicable y Jurisdicción</h2>
      <p>
        Estos términos se rigen por la ley de la República Argentina. Cualquier
        controversia se somete a los tribunales ordinarios en materia
        comercial de la Ciudad Autónoma de Buenos Aires, salvo jurisdicción
        alternativamente aplicable según el Derecho de consumo (Ley 24.240):
        el comprador puede elegir el tribunal de su domicilio.
      </p>

      <h2>Modificaciones</h2>
      <p>
        Podemos modificar estos términos en cualquier momento. El uso continuo
        implica aceptación. Te avisaremos por email de cambios sustanciales a
        estos términos.
      </p>

      <div className="highlight">
        <p>
          <strong>Contacto:</strong> contacto@nyady.com
        </p>
      </div>
    </InfoPage>
  );
}
