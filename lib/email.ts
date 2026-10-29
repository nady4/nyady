import { Resend } from "resend";
import {
  emailShell,
  emailButton,
  emailInfoBox,
  emailLinkFallback,
  emailIntro,
  emailNote,
  emailBadge,
  emailField,
  escapeHtml
} from "@/lib/emails/templates";

const FROM = process.env.EMAIL_FROM ?? "Nyady <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

// NEXTAUTH_URL is the canonical public origin (custom domain on Vercel);
// the request origin is only a fallback for local/dev setups.
export function getAppUrl(requestOrigin?: string): string {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    requestOrigin ??
    "http://localhost:3000"
  );
}

export function hasEmailClient(): boolean {
  return Boolean(getClient());
}

/** Logs the email body in dev when no API key is configured. */
function withoutClientWarn(to: string, context: string, preview: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("RESEND_API_KEY is not configured");
  }
  console.warn(`[email] RESEND_API_KEY not set — ${context} for ${to}: ${preview}`);
}

interface VerificationEmailParams {
  to: string;
  username: string;
  url: string;
}

export async function sendVerificationEmail({
  to,
  username,
  url
}: VerificationEmailParams): Promise<void> {
  const resend = getClient();

  if (!resend) {
    withoutClientWarn(
      to,
      "verification link",
      url
    );
    return;
  }

  const html = emailShell({
    heading: "Confirmá tu email",
    body:
      emailIntro({
        username,
        paragraphs: [
          "Gracias por crear tu cuenta en NYADY. Para activarla, confirmá tu dirección de email con el siguiente botón:"
        ]
      }) +
      emailButton({ href: url, label: "Confirmar mi cuenta" }) +
      emailLinkFallback(url) +
      emailNote(
        "El enlace vence en 24 horas. Si no creaste esta cuenta, podés ignorar este email."
      )
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Confirmá tu cuenta de NYADY",
    text: [
      `¡Hola ${username}!`,
      "",
      "Gracias por crear tu cuenta en NYADY. Para activarla, confirmá tu email abriendo este enlace:",
      "",
      url,
      "",
      "El enlace vence en 24 horas. Si no creaste esta cuenta, podés ignorar este email."
    ].join("\n"),
    html
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

interface PasswordResetEmailParams {
  to: string;
  username: string;
  url: string;
}

export async function sendPasswordResetEmail({
  to,
  username,
  url
}: PasswordResetEmailParams): Promise<void> {
  const resend = getClient();

  if (!resend) {
    withoutClientWarn(
      to,
      "password reset link",
      url
    );
    return;
  }

  const html = emailShell({
    heading: "Recuperá tu contraseña",
    body:
      emailIntro({
        username,
        paragraphs: [
          "Nos pediste recuperar la contraseña de tu cuenta. Elegí una nueva con el siguiente botón:"
        ]
      }) +
      emailButton({ href: url, label: "Cambiar mi contraseña" }) +
      emailLinkFallback(url) +
      emailNote(
        "El enlace vence en 1 hora y se usa una sola vez. Si no pediste cambiar tu contraseña, ignorá este email: tu contraseña actual sigue siendo la misma."
      )
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Recuperá tu contraseña de NYADY",
    text: [
      `¡Hola ${username}!`,
      "",
      "Nos pediste recuperar la contraseña de tu cuenta de NYADY. Elegí una nueva con este enlace:",
      "",
      url,
      "",
      "El enlace vence en 1 hora y se puede usar una sola vez. Si no fuiste vos, ignorá este email: tu contraseña sigue la misma."
    ].join("\n"),
    html
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

interface OrderConfirmationItem {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
}

interface OrderEmailBaseParams {
  to: string;
  username: string;
  orderId: string;
}

interface OrderConfirmationParams extends OrderEmailBaseParams {
  items: OrderConfirmationItem[];
  subtotal: number;
  discountLabel: string | null;
  discountAmount: number;
  shippingCost: number | null;
  total: number;
  paymentLabel: string;
  address: string | null;
  recipientName: string | null;
  elaborationNote: string;
}

const ORDER_BUTTON_FONT = "'Inter',Helvetica,Arial,sans-serif";

/** Items table (shared by confirmation email). */
function itemsTable(items: OrderConfirmationItem[]): string {
  const money = (value: number) => `$${Math.round(value).toLocaleString("es-AR")}`;
  const rows = items
    .map(
      (item) => `
            <tr>
              <td style="padding:10px 24px;border-bottom:1px solid #e5ddd0;font-family:${ORDER_BUTTON_FONT};font-size:14px;color:#2c2416;">
                <strong>${escapeHtml(item.name)}</strong>${item.quantity > 1 ? ` × ${item.quantity}` : ""}
                ${item.variant ? `<br><span style="font-size:12px;color:#6b5d4d;">${escapeHtml(item.variant)}</span>` : ""}
              </td>
              <td style="padding:10px 24px;border-bottom:1px solid #e5ddd0;text-align:right;font-family:${ORDER_BUTTON_FONT};font-size:14px;color:#2c2416;">
                ${money(item.unitPrice * item.quantity)}
              </td>
            </tr>`
    )
    .join("");
  return `
            <tr>
              <td style="padding:24px 16px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                  ${rows}
                </table>
              </td>
            </tr>`;
}

function totalsTable({
  subtotal,
  discountLabel,
  discountAmount,
  shippingCost,
  total
}: {
  subtotal: number;
  discountLabel: string | null;
  discountAmount: number;
  shippingCost: number | null;
  total: number;
}): string {
  const money = (value: number) => `$${Math.round(value).toLocaleString("es-AR")}`;
  const rows = [
    emailField("Subtotal", money(subtotal)),
    discountAmount > 0
      ? emailField(
          `Descuento${discountLabel ? ` (${escapeHtml(discountLabel)})` : ""}`,
          `−${money(discountAmount)}`
        )
      : "",
    shippingCost ? emailField("Envío", money(shippingCost)) : "",
    emailField(
      "<strong>Total</strong>",
      `<strong style="color:#d4a632;">${money(total)}</strong>`
    )
  ]
    .filter(Boolean)
    .join("");
  return `
            <tr>
              <td style="padding:12px 16px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                  ${rows}
                </table>
              </td>
            </tr>`;
}

export async function sendOrderConfirmationEmail({
  to,
  username,
  orderId,
  items,
  subtotal,
  discountLabel,
  discountAmount,
  shippingCost,
  total,
  paymentLabel,
  address,
  recipientName,
  elaborationNote
}: OrderConfirmationParams): Promise<void> {
  const resend = getClient();

  if (!resend) {
    withoutClientWarn(to, "order confirmation", orderId);
    return;
  }

  const metaRows = [
    `
            <tr>
              <td style="padding:18px 40px 0;">
                <p style="margin:0;font-family:${ORDER_BUTTON_FONT};font-size:13px;line-height:1.7;color:#6b5d4d;">
                  <strong style="color:#2c2416;">Medio de pago:</strong> ${escapeHtml(paymentLabel)}<br>
                  ${address || recipientName ? `<strong style="color:#2c2416;">Entrega:</strong> ${escapeHtml(recipientName ?? "")}${address ? ` · ${escapeHtml(address)}` : ""}<br>` : ""}
                </p>
              </td>
            </tr>`
  ].join("");

  const html = emailShell({
    heading: `¡Gracias ${escapeHtml(username)}!`,
    body: `
            <tr>
              <td style="padding:16px 40px 0;">
                <p style="margin:0;font-family:${ORDER_BUTTON_FONT};font-size:15px;line-height:1.6;color:#6b5d4d;text-align:center;">
                  Confirmamos el pago de tu pedido
                  <strong style="color:#2c2416;">#${orderId.slice(0, 8)}</strong>.
                  Ya está en elaboración.
                </p>
              </td>
            </tr>
            ${itemsTable(items)}
            ${totalsTable({ subtotal, discountLabel, discountAmount, shippingCost, total })}
            ${metaRows}
            ${emailInfoBox(
              `<p style="margin:0;font-family:${ORDER_BUTTON_FONT};font-size:13px;line-height:1.7;color:#2c2416;">
                <strong>¿Cuándo llega?</strong><br>
                ${escapeHtml(elaborationNote)}
              </p>`
            )}`
  });

  const text = [
    `¡Hola ${username}!`,
    "",
    `Confirmamos tu pago del pedido #${orderId.slice(0, 8)} (total $${Math.round(total).toLocaleString("es-AR")}):`,
    ...items.map(
      (item) =>
        `- ${item.quantity}× ${item.name}${item.variant ? ` (${item.variant})` : ""} — $${Math.round(item.unitPrice * item.quantity).toLocaleString("es-AR")}`
    ),
    "",
    paymentLabel,
    address ? `Entrega en: ${address}` : "",
    "",
    elaborationNote
  ]
    .filter(Boolean)
    .join("\n");

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Pedido #${orderId.slice(0, 8)} confirmado — NYADY`,
    text,
    html
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

interface OrderStatusParams extends OrderEmailBaseParams {
  statusLabel: string;
  shipmentStatusLabel: string | null;
  trackingUrl: string | null;
}

export async function sendOrderStatusEmail({
  to,
  username,
  orderId,
  statusLabel,
  shipmentStatusLabel: shipment,
  trackingUrl
}: OrderStatusParams): Promise<void> {
  const resend = getClient();

  if (!resend) {
    withoutClientWarn(to, "status email", orderId);
    return;
  }

  const trackingBlock = trackingUrl
    ? emailButton({ href: trackingUrl, label: "Seguir mi pedido" })
    : "";

  const html = emailShell({
    heading: "Estado de tu pedido",
    body:
      emailBadge(
        `${statusLabel}${shipment ? ` · envío: ${shipment}` : ""}`
      ) +
      emailIntro({
        username,
        paragraphs: [
          `El pedido <strong style="color:${"#2c2416"};">#${orderId.slice(0, 8)}</strong> cambió de estado. Podés seguir el detalle desde tu cuenta, en <strong style="color:${"#2c2416"};">Mis Pedidos</strong>.`
        ]
      }) +
      trackingBlock
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Tu pedido #${orderId.slice(0, 8)}: ${statusLabel} — NYADY`,
    text: [
      `¡Hola ${username}!`,
      "",
      `Tu pedido #${orderId.slice(0, 8)} está ${statusLabel}${shipment ? ` (envío: ${shipment})` : ""}.`,
      trackingUrl ? `Seguilo acá: ${trackingUrl}` : ""
    ].filter(Boolean).join("\n"),
    html
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

interface OrderPendingParams extends OrderEmailBaseParams {
  paymentMethodLabel: string;
  paymentUrl: string | null;
  amount: number;
}

/**
 * "Instrucciones de pago" email: sent when a payment lands in `pending`
 * (offline methods like Rapipago/Pago Fácil or card contingencias). Shows the
 * payment voucher link when MP provides one.
 */
export async function sendOrderPendingEmail({
  to,
  username,
  orderId,
  paymentMethodLabel,
  paymentUrl,
  amount
}: OrderPendingParams): Promise<void> {
  const resend = getClient();

  if (!resend) {
    withoutClientWarn(to, "pending payment instructions", orderId);
    return;
  }

  const money = `$${Math.round(amount).toLocaleString("es-AR")}`;
  const voucherBlock = paymentUrl
    ? emailButton({ href: paymentUrl, label: "Ver cupón de pago" })
    : "";

  const html = emailShell({
    heading: "Tu pedido quedó registrado",
    body:
      emailBadge("Pago pendiente") +
      emailIntro({
        username,
        paragraphs: [
          `El pedido <strong style="color:#2c2416;">#${orderId.slice(0, 8)}</strong> por <strong style="color:#2c2416;">${money}</strong> quedó registrado con medio de pago <strong style="color:#2c2416;">${escapeHtml(paymentMethodLabel)}</strong>.`,
          paymentUrl
            ? "Entrá al cupón para ver dónde abonar. El detalle finaliza cuando completes el pago fuera de la tienda."
            : "Cuando completes el pago, el pedido se acredita automáticamente y arrancamos la elaboración."
        ]
      }) +
      voucherBlock +
      emailNote(
        "Si ya pagaste, es posible que la acreditación tarde unos minutos. Si no cambia de estado en el día, escribinos a contacto@nyady.com."
      )
  });

  const text = [
    `¡Hola ${username}!`,
    "",
    `El pedido #${orderId.slice(0, 8)} por ${money} quedó registrado con medio de pago ${paymentMethodLabel}.`,
    paymentUrl ? `Cupón de pago: ${paymentUrl}` : "",
    "Cuando completes el pago, el pedido se acredita automáticamente."
  ].filter(Boolean).join("\n");

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Pago pendiente del pedido #${orderId.slice(0, 8)} — NYADY`,
    text,
    html
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
