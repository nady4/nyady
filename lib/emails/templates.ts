/**
 * NYADY email template system — reusable shell + generic building blocks.
 * All emails share the brand palette, header (logotype) and footer, and are
 * table-based + inline-styled so they render correctly across Gmail, Outlook
 * and mobile clients.
 *
 * Usage:
 *   import { emailShell, emailButton, emailInfoBox, escapeHtml } from "@/lib/emails/templates";
 *   const html = emailShell({ heading: "Título", body: emailButton({...}) });
 */

/** Brand constants (single source of truth for all transactional emails). */
export const BRAND = {
  logo: "NYADY",
  site: "nyady.com",
  url: "https://nyady.com",
  palette: {
    bg: "#f9f2e7",
    card: "#fcfcf9",
    border: "#e5ddd0",
    ink: "#2c2416",
    muted: "#6b5d4d",
    accent: "#D4AF37",
    link: "#d4a632"
  }
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT_SERIF = "'Fraunces',Georgia,serif";
const FONT_SANS = "'Inter',Helvetica,Arial,sans-serif";

/** NYADY logotype: ink letters with a gold "Y". */
export function emailLogo(): string {
  return `
            <tr>
              <td align="center" style="padding:36px 40px 0;">
                <span style="font-family:${FONT_SERIF};font-size:26px;letter-spacing:6px;font-weight:600;">
                  <span style="color:${BRAND.palette.ink};">N</span><span style="color:${BRAND.palette.accent};">Y</span><span style="color:${BRAND.palette.ink};">ADY</span>
                </span>
              </td>
            </tr>`;
}

/** Primary CTA button. */
export function emailButton({
  href,
  label
}: {
  href: string;
  label: string;
}): string {
  return `
            <tr>
              <td align="center" style="padding:26px 40px 0;">
                <a href="${escapeHtml(href)}" style="display:inline-block;background-color:${BRAND.palette.ink};color:${BRAND.palette.card};font-family:${FONT_SANS};font-size:15px;font-weight:500;text-decoration:none;padding:14px 32px;border-radius:8px;">
                  ${escapeHtml(label)}
                </a>
              </td>
            </tr>`;
}

const BUTTON_TEXT_HEIGHT = `
            <tr>
              <td style="padding:24px 40px 0;">
                <p style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:${BRAND.palette.muted};">
                  Si el botón no funciona, copiá y pegá este enlace en tu navegador:
                </p>
                <p style="margin:8px 0 0;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${BRAND.palette.muted};word-break:break-all;">
                  <a href="{{$HREF}}" style="color:${BRAND.palette.link};">{{$HREF}}</a>
                </p>
              </td>
            </tr>`;

/** Fallback link (shown below a button). */
export function emailLinkFallback(href: string): string {
  return BUTTON_TEXT_HEIGHT.replace(/\{\{\$HREF\}\}/g, escapeHtml(href));
}

/** Tinted highlight box for supporting info (courtesy copy, expiration...). */
export function emailInfoBox(html: string): string {
  return `
            <tr>
              <td style="padding:20px 40px 8px;">
                <div style="background-color:${BRAND.palette.bg};border:1px solid ${BRAND.palette.border};border-radius:8px;padding:14px 18px;">
                  ${html}
                </div>
              </td>
            </tr>`;
}

/** Centered pill describing a state (status badge). */
export function emailBadge(text: string): string {
  return `
            <tr>
              <td align="center" style="padding:18px 40px 0;">
                <span style="display:inline-block;background-color:rgba(236,188,59,0.2);color:${BRAND.palette.ink};font-family:${FONT_SANS};font-size:15px;font-weight:600;padding:10px 22px;border-radius:999px;letter-spacing:0.5px;">
                  ${escapeHtml(text)}
                </span>
              </td>
            </tr>`;
}

/** A key/value row inside the default paddings. */
export function emailField(label: string, value: string): string {
  return `
            <tr>
              <td style="padding:6px 24px;font-family:${FONT_SANS};font-size:14px;color:${BRAND.palette.muted};">${label}</td>
              <td style="padding:6px 24px;text-align:right;font-family:${FONT_SANS};font-size:14px;color:${BRAND.palette.ink};font-weight:500;">${value}</td>
            </tr>`;
}

/** Closing note under the content (e.g. link expiry warning). */
export function emailNote(text: string, padTop = "24px"): string {
  return `
            <tr>
              <td style="padding:${padTop} 40px 30px;">
                <p style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:${BRAND.palette.muted};">
                  ${text}
                </p>
              </td>
            </tr>`;
}

/** Brand footer (link to the site). */
export function emailFooter(): string {
  return `
            <tr>
              <td style="padding:20px 40px;background-color:${BRAND.palette.bg};border-top:1px solid ${BRAND.palette.border};">
                <p style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${BRAND.palette.muted};text-align:center;">
                  <a href="${BRAND.url}" style="color:${BRAND.palette.muted};text-decoration:none;">${BRAND.site}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

interface ShellOptions {
  /** H1 title (centered). */
  heading: string;
  /** Main content HTML (rows already opened inside the card container). */
  body: string;
}

/**
 * Full document. `body` must contain top-level `<tr>...` blocks (the shell
 * opens a 520px card <table>). Use {{emailField|emailButton|emailInfoBox}}
 * helpers to compose it.
 */
export function emailShell({ heading, body }: ShellOptions): string {
  return `
<!DOCTYPE html>
<html lang="es">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background-color:${BRAND.palette.bg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.palette.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:${BRAND.palette.card};border:1px solid ${BRAND.palette.border};border-radius:16px;overflow:hidden;">
            ${emailLogo()}
            <tr>
              <td style="padding:28px 40px 0;">
                <h1 style="margin:0;font-family:${FONT_SERIF};font-size:24px;line-height:1.3;color:${BRAND.palette.ink};text-align:center;font-weight:600;">
                  ${heading}
                </h1>
              </td>
            </tr>
${body}
${emailFooter()}
  </html>`.trim();
}

/** Greeting + intro paragraph block. */
export function emailIntro({
  greeting,
  username,
  paragraphs
}: {
  greeting?: string;
  username: string;
  paragraphs: string[];
}): string {
  const intro = [
    greeting ? `<p style="margin:16px 0 0;font-family:${FONT_SANS};font-size:15px;line-height:1.6;color:${BRAND.palette.ink};">¡Hola ${escapeHtml(username)}!</p>` : "",
    ...paragraphs.map(
      (p) => `<p style="margin:12px 0 0;font-family:${FONT_SANS};font-size:15px;line-height:1.6;color:${BRAND.palette.muted};">${p}</p>`
    )
  ].join("");
  return `
            <tr>
              <td style="padding:16px 40px 0;">
                ${intro}
              </td>
            </tr>`;
}
