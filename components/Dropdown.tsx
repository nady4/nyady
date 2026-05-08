"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/hooks/useStore";
import "@/styles/Dropdown.scss";

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
  { href: "/info/nady4", label: "Nady4", icon: "/assets/icons/code.svg" },
];

export default function Dropdown() {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const pathname = usePathname();
  const cartItems = useAppSelector((state) => state.cart);
  const totalQuantity = cartItems.length;

  const toggleInfo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setInfoOpen((prev) => !prev);
  }, []);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      dropdownRef.current &&
      event.target instanceof Element &&
      !dropdownRef.current.contains(event.target)
    ) {
      setInfoOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div className="navbar-wrapper" key={pathname}>
      <div className="left-content">
        <Link href="/cuenta" className="icon-link">
          <Image
            src="/assets/icons/user.svg"
            alt="Mi Cuenta"
            width={26}
            height={26}
          />
        </Link>
        <Link href="/orders" className="icon-link">
          <Image
            src="/assets/icons/truck.svg"
            alt="Mis Pedidos"
            width={26}
            height={26}
          />
        </Link>
        <Link href="/wishlist" className="icon-link favorite-link">
          <Image
            src="/assets/icons/heart.svg"
            alt="Mis Favoritos"
            width={26}
            height={26}
            className="favorite-icon"
          />
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

      <div className="right-content">
        <div className="info-wrapper navbar-info" ref={dropdownRef}>
          <button className="info-toggle" onClick={toggleInfo}>
            <Image
              src="/assets/icons/info.svg"
              alt="Información"
              width={26}
              height={26}
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
        <Link href="/address" className="icon-link">
          <Image
            src="/assets/icons/house.svg"
            alt="Dirección"
            width={26}
            height={26}
          />
        </Link>
        <Link href="/cart" className="icon-link cart-link">
          <div className="cart-icon-wrapper">
            <Image
              src="/assets/icons/cart.svg"
              alt="Carrito"
              width={26}
              height={26}
            />
            {totalQuantity > 0 && (
              <span className="cart-badge">{totalQuantity}</span>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}