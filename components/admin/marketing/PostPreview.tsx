"use client";

import Image from "next/image";

interface PreviewProps {
  channel: string;
  body: string;
  hashtags: string[];
  coverUrl: string;
  product: { name: string; price: string; photo: string } | null;
  instagramHandle: string | null;
  whatsappPhone: string | null;
  link: string;
}

function hashtagLine(hashtags: string[]): string {
  return hashtags.map((h) => `#${h}`).join(" ");
}

function Avatar({ letter }: { letter: string }) {
  return <span className="admin-mkt-preview-avatar">{letter}</span>;
}

/**
 * Lightweight live previews that mimic (roughly) how the post would look per
 * channel: an IG feed card, a FB page post, and a WhatsApp chat bubble.
 */

export default function PostPreview(props: PreviewProps) {
  const { channel, body, hashtags, coverUrl, product, instagramHandle, whatsappPhone, link } =
    props;
  const cover = coverUrl || product?.photo || "";
  const text = body.trim();

  if (channel === "instagram") {
    return (
      <div className="admin-mkt-preview admin-mkt-preview-ig">
        <div className="admin-mkt-preview-ighead">
          <Avatar letter="N" />
          <strong>{instagramHandle ? `@${instagramHandle}` : "NYADY"}</strong>
        </div>
        <div className="admin-mkt-preview-igmedia">
          {cover ? (
            <Image src={cover} alt="" width={400} height={400} unoptimized />
          ) : (
            <div className="admin-mkt-preview-igplaceholder">
              {product ? "Foto del producto" : "Sin imagen"}
            </div>
          )}
        </div>
        <div className="admin-mkt-preview-igactions" aria-hidden="true">
          <span className="ig-heart">♥</span>
          <span className="ig-comment">◌</span>
          <span className="ig-share">➤</span>
        </div>
        <p className="admin-mkt-preview-igcaption">
          {text || "Acá va el copy del post…"}
        </p>
        {/* Real output joins body and hashtags with a blank line (publisher) —
            keep them in separate paragraphs so the preview reflects that. */}
        {hashtags.length > 0 && (
          <p className="admin-mkt-preview-hashtags">{hashtagLine(hashtags)}</p>
        )}
        {text && (
          <p className="admin-field-hint">El link no es clickeable en captions: el CTA va con “link en bio”.</p>
        )}
      </div>
    );
  }

  if (channel === "facebook") {
    return (
      <div className="admin-mkt-preview admin-mkt-preview-fb">
        <div className="admin-mkt-preview-fbhead">
          <Avatar letter="N" />
          <div>
            <strong>NYADY</strong>
            <span>Ahora</span>
          </div>
        </div>
        <p className="admin-mkt-preview-fbtext">
          {text || "Acá va el copy del post…"}
        </p>
        {hashtags.length > 0 && (
          <p className="admin-mkt-preview-hashtags">{hashtagLine(hashtags)}</p>
        )}
        {cover ? (
          <Image className="admin-mkt-preview-fbmedia" src={cover} alt="" width={440} height={260} unoptimized />
        ) : null}
        {product && (
          <a className="admin-mkt-preview-fblink" href={link} onClick={(e) => e.preventDefault()}>
            <span>{product.name}</span>
            <em>{product.price}</em>
          </a>
        )}
        <div className="admin-mkt-preview-fbmeta" aria-hidden="true">
          <span>♥ · Me gusta</span>
          <span>Comentar · Compartir</span>
        </div>
      </div>
    );
  }

  const waTarget = whatsappPhone
    ? `https://wa.me/${whatsappPhone.replace(/[^\d]/g, "")}`
    : null;

  return (
    <div className="admin-mkt-preview admin-mkt-preview-wa">
      <div className="admin-mkt-preview-wahead">
        <Avatar letter="N" />
        <div>
          <strong>NYADY</strong>
          <span>en línea</span>
        </div>
        {waTarget && (
          <a href={waTarget} target="_blank" rel="noreferrer noopener" className="admin-mkt-waopen">
            Abrir chat
          </a>
        )}
      </div>
      <div className="admin-mkt-preview-wachat">
        {cover && (
          <Image className="admin-mkt-preview-wamedia" src={cover} alt="" width={220} height={150} unoptimized />
        )}
        <p className="admin-mkt-preview-wabubble">
          {text.replace(/[\r\n]{2,}/g, "\n") || "Acá va el mensaje de WhatsApp…"}
        </p>
        {hashtags.length > 0 && (
          <p className="admin-mkt-preview-hashtags">{hashtagLine(hashtags)}</p>
        )}
        {product && <span className="admin-mkt-preview-walink">{link}</span>}
      </div>
      <p className="admin-field-hint">
        En WhatsApp el texto va armado para copiar y pegar en tu WhatsApp Business (o compartir directo con el botón del composer).
      </p>
    </div>
  );
}
