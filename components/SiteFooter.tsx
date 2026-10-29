"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fraunces } from "@/app/fonts";
import "@/styles/Footer.scss";

/**
 * Full site footer: link columns (legales, info, contacto), socials and the
 * fixed "Hecho con ❤" bar. Rendered from the root layout so orders/payment
 * pages keep the botón de arrepentimiento reachable (Ley 24.240), hidden only
 * inside the admin dashboard.
 */
export default function SiteFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <footer className="footer-links">
        <div className="links">
          <Link href="/info/elaboracion">Elaboración</Link>
          <Link href="/info/envios">Envíos</Link>
          <Link href="/info/medios-de-pago">Medios de Pago</Link>
          <Link href="/info/reembolsos">Reembolsos</Link>
          <Link href="/info/promociones">Promociones</Link>
          <Link href="/info/preguntas-frecuentes">Preguntas Frecuentes</Link>
          <Link href="/info/contacto">Contacto</Link>
          <Link href="/info/privacidad">Privacidad</Link>
          <Link href="/info/terminos">Términos</Link>
          <Link href="/info/arrepentimiento">Arrepentimiento</Link>
          <Link href="/info/nady4">nady4</Link>
        </div>
        <div className="socials">
          <a
            href="https://facebook.com/nyady.arg"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook (se abre en una nueva pestaña)"
          >
            <Image
              src="/assets/icons/facebook.svg"
              alt=""
              aria-hidden="true"
              width={20}
              height={20}
            />
          </a>
          <a
            href="https://www.instagram.com/nyady.arg"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram (se abre en una nueva pestaña)"
          >
            <Image
              src="/assets/icons/instagram.svg"
              alt=""
              aria-hidden="true"
              width={20}
              height={20}
            />
          </a>
          <a
            href="https://wa.me/5491178120252"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp (se abre en una nueva pestaña)"
          >
            <Image
              src="/assets/icons/whatsapp.svg"
              alt=""
              aria-hidden="true"
              width={20}
              height={20}
            />
          </a>
        </div>
        <div className="copyright">
          <span>© {new Date().getFullYear()} NYADY</span>
        </div>
      </footer>
      <footer className="footer-fixed">
        <span className={fraunces.className}>
          Hecho con{" "}
          <Image
            src="/assets/icons/heartFilled.svg"
            alt=""
            width={14}
            height={14}
          />{" "}
          por <Link href="/info/nady4">nady4</Link>
        </span>
      </footer>
    </>
  );
}
