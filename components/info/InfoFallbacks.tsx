/**
 * Fallback content for the editable info pages, faithful to the original
 * hardcoded JSX. When an InfoPage row exists for a slug it wins; deleting it
 * from the admin restores this content.
 */
export interface InfoFallback {
  title: string;
  description: string;
  content: string;
}

export const EDITABLE_INFO_SLUGS = [
  "elaboracion",
  "envios",
  "medios-de-pago",
  "promociones",
  "preguntas-frecuentes",
  "reembolsos",
  "contacto",
] as const;

export type EditableInfoSlug = (typeof EDITABLE_INFO_SLUGS)[number];

export const INFO_FALLBACKS: Record<EditableInfoSlug, InfoFallback> = {
  elaboracion: {
    title: "Tiempos de Elaboración",
    description: "Conocé nuestros plazos de entrega.",
    content: `## Tiempo Estimado: **3 a 7 días hábiles**
El tiempo de elaboración varía según la demanda de nuestros clientes.

## Proceso de Elaboración
En NYADY, cada producto es elaborado artesanalmente al detalle, a mano y con los mejores materiales.

## Notas Importantes
- Te informaremos por email sobre el progreso de tu pedido
- Los tiempos de elaboración comienzan a contar desde la confirmación del pago
- Los tiempos de [envío](/info/envios) comienzan a contar cuando finaliza la elaboración`,
  },
  envios: {
    title: "Envíos",
    description: "Conocé las opciones de envío disponibles para tu pedido NYADY.",
    content: `## Tiempos de Entrega
Cada producto es elaborado a mano. El tiempo de [elaboración](/info/elaboracion) es de **3 a 7 días hábiles** desde la confirmación del pago, y se suma al tiempo de envío que elijas a continuación.

## Métodos de Envío
Realizamos envíos a todo el país. Podés elegir entre Correo Argentino y OCA al cotizar en el carrito.

### Entrega en 2 a 5 días hábiles una vez despachado
- Envío a domicilio
- Retiro en punto de entrega

## Costos de Envío
Los costos de envío se calculan automáticamente según:
- Peso y dimensiones del paquete
- Ubicación de entrega
- Método de envío seleccionado

## Seguimiento del Envío
Una vez que tu pedido está despachado, podés seguirlo desde la sección _Mis pedidos_ con el número de seguimiento y el link del transporte. También te avisamos por email sobre el progreso de tu envío.

> **¿Dudas?** Mirá las [preguntas frecuentes](/info/preguntas-frecuentes) o [contactános](/info/contacto).`,
  },
  "medios-de-pago": {
    title: "Medios de Pago",
    description:
      "En NYADY aceptamos múltiples formas de pago para tu comodidad. ¡Elegí la que mejor te funcione!",
    content: `## Métodos de Pago Disponibles

### Mercado Pago
- Tarjetas de crédito y débito (Visa, Mastercard, American Express, Cabal)
- Dinero en cuenta Mercado Pago
- Pago Fácil / Rapipago
- Cuotas sin interés según promociones vigentes

### Tarjetas de Crédito
- Visa - Hasta 12 cuotas
- Mastercard - Hasta 12 cuotas
- American Express - Hasta 12 cuotas
- Cuotas sin interés disponibles según promociones vigentes

### Tarjetas de Débito
- Visa Débito
- Mastercard Débito
- Maestro

### Efectivo
- Pago Fácil
- Rapipago
- Provincia Pagos

## Seguridad en el Pago
Todos tus pagos están protegidos con los más altos estándares de seguridad. Utilizamos Mercado Pago como procesador de pagos, garantizando la seguridad de tus datos.

> **Promociones:** ¡Consultá las [promociones vigentes](/info/promociones) para ver cuotas sin interés y descuentos actuales!`,
  },
  promociones: {
    title: "Promociones y Descuentos",
    description:
      "¡Aprovechá nuestras promociones y descuentos exclusivos! Encontrá las mejores ofertas en NYADY.",
    content: `## Promociones Vigentes
Consultá regularmente esta página para ver las promociones actuales.

### Descuentos por Cantidad
Se aplican automáticamente en el carrito según la cantidad total de unidades (podés combinar talles y colores):
- **4 a 19 productos**: 10% de descuento (REVENDEDORA)
- **20 o más productos**: 20% de descuento (MAYORISTA)

Estos descuentos son acumulables con los cupones de descuento.

## Código de Descuento
Para usar un código de descuento:
1. Agregá tus productos al carrito
2. Ingresá el código de descuento y presioná _Aplicar_
3. El descuento se sumará al total automáticamente

Los cupones pueden ser de porcentaje o de monto fijo, y se validan al generar la orden.

> **Nota:** Algunos cupones son de un solo uso por usuario y pueden tener fecha de vencimiento o límite de usos. No se pueden combinar dos cupones en un mismo pedido.`,
  },
  "preguntas-frecuentes": {
    title: "Preguntas Frecuentes",
    description: "Respondemos las preguntas más frecuentes sobre NYADY.",
    content: `## Productos

### ¿Qué productos venden?
Vendemos sandalias artesanales diseñadas y elaboradas a mano especialmente para vos, con foco en comodidad, diseño y calidad.

### ¿Los productos son personalizados?
¡Sí! Muchos de nuestros productos pueden personalizarse en talles, colores y opciones de taco. Elegí las variantes desde la página del producto.

### ¿Tienen tienda física?
Actualmente solo vendemos online para llegar a todo el país.

## Elaboración y Envíos

### ¿Cuánto tarda en llegar mi pedido?
La elaboración artesanal toma de **3 a 7 días hábiles** desde la confirmación del pago. A eso se suma el envío, de **2 a 5 días hábiles** a domicilio según tu ubicación y el transporte elegido (Correo Argentino u OCA). El total aproximado es de 5 a 12 días hábiles.

### ¿A dónde envían?
Enviamos a todo el país, a domicilio o a punto de retiro.

### ¿Cuánto cuesta el envío?
El costo se calcula automáticamente en el carrito según el peso, las dimensiones del paquete y tu dirección de envío.

### ¿Puedo seguir mi pedido?
Sí. Una vez despachado, podés seguir el envío desde la sección _Mis pedidos_ con el número de seguimiento y el link del transporte. También te avisamos por email.

## Pagos y Cupones

### ¿Qué medios de pago aceptan?
Aceptamos Mercado Pago: tarjetas de crédito y débito (Visa, Mastercard, American Express, Cabal), dinero en cuenta, Pago Fácil y Rapipago.

### ¿Es seguro pagar?
Sí, todos los pagos se procesan a través de Mercado Pago con los más altos estándares de seguridad.

### ¿Tienen descuentos por cantidad?
Sí, se aplican automáticamente: 10% llevando 4 o más unidades y 20% llevando 20 o más unidades.

### ¿Cómo uso un cupón de descuento?
Ingresá el código en el carrito y presioná _Aplicar_. El descuento puede ser por porcentaje o monto fijo, y se valida al generar la orden. Algunos cupones son de un solo uso por usuario.

## Devoluciones

### ¿Puedo arrepentirme de una compra?
Sí. Tenés **10 días corridos** desde la compra para ejercer el botón de arrepentimiento según la Ley 24.240. Ver [arrepentimiento](/info/arrepentimiento).

### ¿Puedo devolver un producto?
Sí, dentro de los **10 días** desde la recepción, siempre que esté sin uso y en su empaque original. Ver [reembolsos](/info/reembolsos).

### ¿Qué pasa si llega defectuoso?
Lo cambiamos sin costo. Contactános inmediatamente a contacto@nyady.com.

## Contacto

### ¿Cómo los contacto?
Podés escribirnos por email a contacto@nyady.com o por nuestras redes sociales (Instagram: @nyady, Facebook: NYADY). Respondemos en menos de 24 horas en horario laboral.`,
  },
  reembolsos: {
    title: "Reembolsos",
    description:
      "Conocé la política de reembolsos, cambios y devoluciones de NYADY.",
    content: `## Cambios y Devoluciones
Aceptamos devoluciones dentro de los **10 días** desde que recibís tu pedido, siempre que el producto esté sin uso y en su empaque original.

## Botón de Arrepentimiento
Tenés **10 días corridos** desde tu compra para arrepentirte según la Ley 24.240, sin necesidad de justificarlo. Ingresá al [botón de arrepentimiento](/info/arrepentimiento).

## Proceso de Devolución
1. Contactános por email a contacto@nyady.com
2. Indicános si preferís un reembolso o un cambio del producto
3. Te indicaremos la dirección de retorno
4. Enviá el producto por el medio indicado
5. Recibirás el reembolso en 5 a 10 días hábiles desde que recibimos el producto

## Productos Defectuosos
Si recibiste un producto defectuoso, contactános inmediatamente y lo cambiaremos sin costo adicional.

> **Nota:** Los gastos de envío en devoluciones son responsabilidad del cliente, excepto en casos de error nuestro. El reembolso se realiza por el mismo medio de pago usado en la compra.`,
  },
  contacto: {
    title: "Contacto",
    description: "Encontrá todas las formas de contactar al equipo de NYADY.",
    content: `## Canales de Contacto

### Email
contacto@nyady.com

### Redes Sociales
- Instagram: [@nyady.store](https://www.instagram.com/nyady.store)
- Facebook: [@nyady.arg](https://facebook.com/nyady.arg)

## Respondemos Rápido
Nos caracteriza nuestra velocidad de respuesta. En horario laboral, respondemos en menos de 24 horas.

> **Antes de escribirnos:** quizás tu duda ya esté resuelta en las [preguntas frecuentes](/info/preguntas-frecuentes). Si querés conocer quién está detrás de NYADY, visitá la página de [nady4](/info/nady4).`,
  },
};

export function getInfoFallback(
  slug: string
): { fallback: InfoFallback; slug: EditableInfoSlug } | null {
  if ((EDITABLE_INFO_SLUGS as readonly string[]).includes(slug)) {
    return {
      fallback: INFO_FALLBACKS[slug as EditableInfoSlug],
      slug: slug as EditableInfoSlug,
    };
  }
  return null;
}