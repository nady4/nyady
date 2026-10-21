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
}: VerificationEmailParams): Promise<void> {
  const resend = getClient();

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
