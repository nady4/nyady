"use client";
import Image from "next/image";
import Link from "next/link";
import { fraunces } from "@/app/fonts";
import "@/styles/Footer.scss";

function Footer() {
  return (
    <footer className="footer-fixed">
      <span className={fraunces.className}>
        Hecho con{" "}
        <Image
          src="/assets/icons/heartFilled.svg"
          alt="Love"
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
        <a href="/info/elaboracion">Elaboración</a>
        <a href="/info/envios">Envíos</a>
        <a href="/info/medios-de-pago">Medios de Pago</a>
        <a href="/info/reembolsos">Reembolsos</a>
        <a href="/info/promociones">Promociones</a>
        <a href="/info/preguntas-frecuentes">Preguntas Frecuentes</a>
        <a href="/info/contacto">Contacto</a>
        <a href="/info/privacidad">Privacidad</a>
        <a href="/info/terminos">Términos</a>
        <a href="/info/arrepentimiento">Arrepentimiento</a>
        <a href="/info/nady4">nady4</a>
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
