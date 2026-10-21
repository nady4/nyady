"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fraunces } from "@/app/fonts";
import "@/styles/Footer.scss";

function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
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
  );
}

function FooterLinks() {
  return (
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
          href="https://www.instagram.com/nyady.store"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
        >
          <Image
            src="/assets/icons/instagram.svg"
            alt="Instagram"
            width={20}
            height={20}
          />
        </a>
        <a
          href="https://www.tiktok.com/@nady4"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TikTok"
        >
          <Image
            src="/assets/icons/tiktok.svg"
            alt="TikTok"
            width={20}
            height={20}
          />
        </a>
        <a
          href="https://github.com/nady4"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <Image
            src="/assets/icons/github.svg"
            alt="GitHub"
            width={20}
            height={20}
          />
        </a>
      </div>
      <div className="copyright">
        <span>© {new Date().getFullYear()} NYADY</span>
      </div>
    </footer>
  );
}

export { Footer, FooterLinks };
