"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { fraunces } from "@/app/fonts";
import Dropdown from "./Dropdown";
import "@/styles/Navbar.scss";

const INFO_OPTIONS = [
  { href: "/info/elaboracion", label: "Tiempos de Elaboración", icon: "/assets/icons/clock.svg" },
  { href: "/info/envios", label: "Envíos", icon: "/assets/icons/truck.svg" },
  { href: "/info/medios-de-pago", label: "Medios de Pago", icon: "/assets/icons/card.svg" },
  { href: "/info/reembolsos", label: "Reembolsos", icon: "/assets/icons/return.svg" },
  { href: "/info/promociones", label: "Promociones y Descuentos", icon: "/assets/icons/tag.svg" },
  { href: "/info/gift-cards", label: "Gift Cards", icon: "/assets/icons/gift.svg" },
  { href: "/info/preguntas-frecuentes", label: "Preguntas Frecuentes", icon: "/assets/icons/help.svg" },
  { href: "/info/contacto", label: "Contacto", icon: "/assets/icons/email.svg" },
  { href: "/info/privacidad", label: "Política de Privacidad", icon: "/assets/icons/shield.svg" },
  { href: "/info/terminos", label: "Términos y Condiciones", icon: "/assets/icons/file.svg" },
  { href: "/info/arrepentimiento", label: "Botón de Arrepentimiento", icon: "/assets/icons/cancel.svg" },
  { href: "/info/blog", label: "Blog", icon: "/assets/icons/blog.svg" },
];

function NavBar() {
  const { data: session } = useSession();
  const infoRef = useRef<HTMLDivElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const toggleInfo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setInfoOpen((prev) => !prev);
  }, []);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      infoRef.current &&
      event.target instanceof Element &&
      !infoRef.current.contains(event.target)
    ) {
      setInfoOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <nav className={`${fraunces.className} navbar-container`}>
      {session ? (
        <Dropdown />
      ) : (
        <div className="guest-navbar">
          <div className="left-content-guest">
            <Link href="/signin" className="text-link">
              <Image
                src="/assets/icons/signin.svg"
                alt="Iniciar sesión"
                width={26}
                height={26}
              />
              <span>INICIAR SESIÓN</span>
            </Link>
          </div>
          <div className="center-content">
            <Link href="/catalog">
              <h1>
                <span className="logo-text">N</span>
                <span className="logo-color">Y</span>
                <span className="logo-text">AD</span>
                <span className="logo-text">Y</span>
              </h1>
            </Link>
          </div>
          <div className="right-content-guest">
            <div className="info-wrapper navbar-info" ref={infoRef}>
              <button className="info-toggle" onClick={toggleInfo}>
                <span>INFORMACIÓN</span>
                <Image
                  src="/assets/icons/chevron-down.svg"
                  alt="Desplegar"
                  width={16}
                  height={16}
                  className={`chevron ${infoOpen ? "open" : ""}`}
                />
              </button>
              <div className={`info-dropdown ${infoOpen ? "open" : "closed"}`}>
                {INFO_OPTIONS.map((option) => (
                  <Link key={option.href} href={option.href} onClick={() => setInfoOpen(false)}>
                    <Image
                      src={option.icon}
                      alt={option.label}
                      width={18}
                      height={18}
                    />
                    <span>{option.label}</span>
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/signin" className="text-link">
              <Image
                src="/assets/icons/house.svg"
                alt="Dirección"
                width={26}
                height={26}
              />
            </Link>
            <Link href="/signin" className="icon-link">
              <Image
                src="/assets/icons/cart.svg"
                alt="Carrito"
                width={26}
                height={26}
              />
            </Link>
          </div>
        </div>
      )}

      {session && (
        <div className="center-content">
          <Link href="/catalog">
            <h1>
              <span className="logo-text">N</span>
              <span className="logo-color">Y</span>
              <span className="logo-text">AD</span>
              <span className="logo-text">Y</span>
            </h1>
          </Link>
        </div>
      )}
    </nav>
  );
}

export default NavBar;