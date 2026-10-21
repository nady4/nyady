import { Resend } from "resend";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
}: VerificationEmailParams): Promise<void> {  const resend = getClient();

  // Without an API key (local dev), print the link instead of failing the
  // registration; the account can still be verified from the console.
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured");
    }
    console.warn(
      `[email] RESEND_API_KEY not set — verification link for ${to}: ${url}`
    );
    return;
  }

  const safeUsername = escapeHtml(username);

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
    html: `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f9f2e7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f2e7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#fcfcf9;border:1px solid #e5ddd0;border-radius:16px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:36px 40px 0;">
                <span style="font-family:'Fraunces',Georgia,serif;font-size:26px;letter-spacing:6px;font-weight:600;">
                  <span style="color:#2c2416;">N</span><span style="color:#D4AF37;">Y</span><span style="color:#2c2416;">ADY</span>
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 0;">
                <h1 style="margin:0;font-family:'Fraunces',Georgia,serif;font-size:24px;line-height:1.3;color:#2c2416;text-align:center;font-weight:600;">
                  Confirmá tu email
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 40px 0;">
                <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#2c2416;">
                  ¡Hola ${safeUsername}!
                </p>
                <p style="margin:12px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#6b5d4d;">
                  Gracias por crear tu cuenta en NYADY. Para activarla, confirmá tu dirección de email con el siguiente botón:
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 40px 0;">
                <a href="${url}" style="display:inline-block;background-color:#2c2416;color:#fcfcf9;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:500;text-decoration:none;padding:14px 32px;border-radius:8px;">
                  Confirmar mi cuenta
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 0;">
                <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6b5d4d;">
                  Si el botón no funciona, copiá y pegá este enlace en tu navegador:
                </p>
                <p style="margin:8px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b5d4d;word-break:break-all;">
                  <a href="${url}" style="color:#d4a632;">${url}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 36px;">
                <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6b5d4d;">
                  El enlace vence en 24 horas. Si no creaste esta cuenta, podés ignorar este email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;background-color:#f9f2e7;border-top:1px solid #e5ddd0;">
                <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b5d4d;text-align:center;">
                  <a href="https://nyady.com" style="color:#6b5d4d;text-decoration:none;">nyady.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim()
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
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured");
    }
    console.warn(
      `[email] RESEND_API_KEY not set — password reset link for ${to}: ${url}`
    );
    return;
  }

  const safeUsername = escapeHtml(username);

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
    html: `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f9f2e7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f2e7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#fcfcf9;border:1px solid #e5ddd0;border-radius:16px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:36px 40px 0;">
                <span style="font-family:'Fraunces',Georgia,serif;font-size:26px;letter-spacing:6px;font-weight:600;">
                  <span style="color:#2c2416;">N</span><span style="color:#D4AF37;">Y</span><span style="color:#2c2416;">ADY</span>
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 0;">
                <h1 style="margin:0;font-family:'Fraunces',Georgia,serif;font-size:24px;line-height:1.3;color:#2c2416;text-align:center;font-weight:600;">
                  Recuperá tu contraseña
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 40px 0;">
                <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#2c2416;">
                  ¡Hola ${safeUsername}!
                </p>
                <p style="margin:12px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#6b5d4d;">
                  Nos pediste recuperar la contraseña de tu cuenta. Elegí una nueva con el siguiente botón:
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 40px 0;">
                <a href="${url}" style="display:inline-block;background-color:#2c2416;color:#fcfcf9;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:500;text-decoration:none;padding:14px 32px;border-radius:8px;">
                  Cambiar mi contraseña
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 0;">
                <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6b5d4d;">
                  Si el botón no funciona, copiá y pegá este enlace en tu navegador:
                </p>
                <p style="margin:8px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b5d4d;word-break:break-all;">
                  <a href="${url}" style="color:#d4a632;">${url}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 24px;">
                <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6b5d4d;">
                  El enlace vence en 1 hora y se usa una sola vez. Si no pediste
                  cambiar tu contraseña, ignorá este email: tu contraseña
                  actual sigue siendo la misma.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;background-color:#f9f2e7;border-top:1px solid #e5ddd0;">
                <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b5d4d;text-align:center;">
                  <a href="https://nyady.com" style="color:#6b5d4d;text-decoration:none;">nyady.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim()
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

const ORDER_BRAND_HEADER = `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f9f2e7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f2e7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#fcfcf9;border:1px solid #e5ddd0;border-radius:16px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:36px 40px 0;">
                <span style="font-family:'Fraunces',Georgia,serif;font-size:26px;letter-spacing:6px;font-weight:600;">
                  <span style="color:#2c2416;">N</span><span style="color:#D4AF37;">Y</span><span style="color:#2c2416;">ADY</span>
                </span>
              </td>
            </tr>`;

const ORDER_BRAND_FOOTER = `
            <tr>
              <td style="padding:20px 40px;background-color:#f9f2e7;border-top:1px solid #e5ddd0;">
                <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b5d4d;text-align:center;">
                  <a href="https://nyady.com" style="color:#6b5d4d;text-decoration:none;">nyady.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const emailRow = (label: string, value: string) => `
            <tr>
              <td style="padding:6px 24px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;color:#6b5d4d;">${label}</td>
              <td style="padding:6px 24px;text-align:right;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;color:#2c2416;font-weight:500;">${value}</td>
            </tr>`;

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
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured");
    }
    console.warn(`[email] RESEND_API_KEY not set — order confirmation for ${to} skipped`);
    return;
  }

  const money = (value: number) => `$${Math.round(value).toLocaleString("es-AR")}`;
  const safeUsername = escapeHtml(username);

  const itemsRows = items
    .map(
      (item) => `
            <tr>
              <td style="padding:10px 24px;border-bottom:1px solid #e5ddd0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;color:#2c2416;">
                <strong>${escapeHtml(item.name)}</strong>${item.quantity > 1 ? ` × ${item.quantity}` : ""}
                ${item.variant ? `<br><span style="font-size:12px;color:#6b5d4d;">${escapeHtml(item.variant)}</span>` : ""}
              </td>
              <td style="padding:10px 24px;border-bottom:1px solid #e5ddd0;text-align:right;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;color:#2c2416;">
                ${money(item.unitPrice * item.quantity)}
              </td>
            </tr>`
    )
    .join("");

  const totalsRows = [
    emailRow("Subtotal", money(subtotal)),
    discountAmount > 0
      ? emailRow(`Descuento${discountLabel ? ` (${escapeHtml(discountLabel)})` : ""}`, `−${money(discountAmount)}`)
      : "",
    shippingCost ? emailRow("Envío", money(shippingCost)) : "",
    emailRow("<strong>Total</strong>", `<strong style="color:#d4a632;">${money(total)}</strong>`)
  ]
    .filter(Boolean)
    .join("");

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Pedido #${orderId.slice(0, 8)} confirmado — NYADY`,
    text: [
      `¡Hola ${username}!`,
      "",
      `Confirmamos tu pago del pedido #${orderId.slice(0, 8)} (total ${money(total)}):`,
      ...items.map((item) => `- ${item.quantity}× ${item.name}${item.variant ? ` (${item.variant})` : ""} — ${money(item.unitPrice * item.quantity)}`),
      "",
      paymentLabel,
      address ? `Entrega en: ${address}` : "",
      "",
      elaborationNote
    ].filter(Boolean).join("\n"),
    html: `
${ORDER_BRAND_HEADER}
            <tr>
              <td style="padding:28px 40px 0;">
                <h1 style="margin:0;font-family:'Fraunces',Georgia,serif;font-size:24px;line-height:1.3;color:#2c2416;text-align:center;font-weight:600;">
                  ¡Gracias ${safeUsername}!
                </h1>
                <p style="margin:10px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#6b5d4d;text-align:center;">
                  Confirmamos el pago de tu pedido
                  <strong style="color:#2c2416;">#${orderId.slice(0, 8)}</strong>.
                  Ya está en elaboración.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 16px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                  ${itemsRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                  ${totalsRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 40px 0;">
                <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#6b5d4d;">
                  <strong style="color:#2c2416;">Medio de pago:</strong> ${escapeHtml(paymentLabel)}<br>
                  ${address || recipientName ? `<strong style="color:#2c2416;">Entrega:</strong> ${escapeHtml(recipientName ?? "")}${address ? ` · ${escapeHtml(address)}` : ""}<br>` : ""}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 40px 8px;">
                <div style="background-color:#f9f2e7;border:1px solid #e5ddd0;border-radius:8px;padding:14px 18px;">
                  <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#2c2416;">
                    <strong>¿Cuándo llega?</strong><br>
                    ${escapeHtml(elaborationNote)}
                  </p>
                </div>
              </td>
            </tr>` + ORDER_BRAND_FOOTER
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
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured");
    }
    console.warn(`[email] RESEND_API_KEY not set — status email for ${to} skipped`);
    return;
  }

  const safeUsername = escapeHtml(username);
  const safeStatus = escapeHtml(statusLabel);
  const trackingBlock = trackingUrl
    ? `
            <tr>
              <td align="center" style="padding:20px 40px 0;">
                <a href="${trackingUrl}" style="display:inline-block;background-color:#2c2416;color:#fcfcf9;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:500;text-decoration:none;padding:12px 28px;border-radius:8px;">
                  Seguir mi pedido
                </a>
              </td>
            </tr>`
    : "";

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
    html: `
${ORDER_BRAND_HEADER}
            <tr>
              <td style="padding:28px 40px 0;">
                <h1 style="margin:0;font-family:'Fraunces',Georgia,serif;font-size:24px;line-height:1.3;color:#2c2416;text-align:center;font-weight:600;">
                  Estado de tu pedido
                </h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 40px 0;">
                <span style="display:inline-block;background-color:rgba(236,188,59,0.2);color:#2c2416;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;padding:10px 22px;border-radius:999px;letter-spacing:0.5px;">
                  ${safeStatus}${shipment ? ` · envío: ${escapeHtml(shipment)}` : ""}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 40px 0;">
                <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#6b5d4d;text-align:center;">
                  ¡Hola ${safeUsername}! El pedido <strong style="color:#2c2416;">#${orderId.slice(0, 8)}</strong>
                  cambió de estado. Podés seguir el detalle desde tu cuenta, en
                  <strong style="color:#2c2416;">Mis Pedidos</strong>.
                </p>
              </td>
            </tr>${trackingBlock}` + ORDER_BRAND_FOOTER
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
