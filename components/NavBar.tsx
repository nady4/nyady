"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { fraunces } from "@/app/fonts";
import { getUserAddress } from "@/actions/address";
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
  { href: "/info/nady4", label: "Nady4", icon: "/assets/icons/code.svg" },
];

type AddressType = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
} | null;

export default function NavBar() {
  const { data: session, status } = useSession();
  const infoRef = useRef<HTMLDivElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [address, setAddress] = useState<AddressType>(null);

  const loadAddress = useCallback(async () => {
    if (status === "authenticated" && session?.user?.email) {
      try {
        const userAddress = await getUserAddress();
        setAddress(userAddress);
      } catch (error) {
        console.error("Error loading address:", error);
      }
    }
  }, [status, session?.user?.email]);

  useEffect(() => {
    loadAddress();
  }, [loadAddress]);

  const toggleInfo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setInfoOpen((prev) => !prev);
  }, []);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (infoRef.current && event.target instanceof Element && !infoRef.current.contains(event.target)) {
      setInfoOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const formatAddress = (addr: AddressType) => {
    if (!addr) return "Seleccionar dirección";
    return `${addr.street}, ${addr.city}, ${addr.state}, ${addr.postalCode}`;
  };

  return (
    <nav className={`${fraunces.className} navbar-container`}>
      <div className="navbar-wrapper">
        <div className="left-content">
          {!session ? (
            <Link href="/signin" className="nav-link">
              <Image src="/assets/icons/signin.svg" alt="Sign in" width={20} height={20} />
              <span>Sign in</span>
            </Link>
          ) : (
            <>
              <Link href="/cuenta" className="nav-link">
                <Image src="/assets/icons/user.svg" alt="Cuenta" width={20} height={20} />
                <span>Cuenta</span>
              </Link>
              <Link href="/orders" className="nav-link">
                <Image src="/assets/icons/truck.svg" alt="Mis Pedidos" width={20} height={20} />
                <span>Mis Pedidos</span>
              </Link>
              <Link href="/wishlist" className="nav-link">
                <Image src="/assets/icons/heart.svg" alt="Mis Favoritos" width={20} height={20} />
                <span>Mis Favoritos</span>
              </Link>
            </>
          )}
        </div>

        <div className="center-content">
          <Link href="/catalog">
            <h1>
              <span className="logo-black">NY</span>
              <span className="logo-gold">ADY</span>
            </h1>
          </Link>
        </div>

        <div className="right-content">
          <div className="info-wrapper" ref={infoRef}>
            <button className="nav-link info-toggle" onClick={toggleInfo}>
              <span>Información</span>
              <Image src="/assets/icons/chevron-down.svg" alt="Desplegar" width={14} height={14} className={infoOpen ? "chevron open" : "chevron"} />
            </button>
            <div className={`info-dropdown ${infoOpen ? "open" : "closed"}`}>
              {INFO_OPTIONS.map((option) => (
                <Link key={option.href} href={option.href} onClick={() => setInfoOpen(false)}>
                  <Image src={option.icon} alt={option.label} width={18} height={18} />
                  <span>{option.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {session && (
            <Link href="/address" className="nav-link address-link">
              <Image src="/assets/icons/house.svg" alt="Dirección" width={20} height={20} />
              <span className="address-text" title={formatAddress(address)}>
                {formatAddress(address)}
              </span>
            </Link>
          )}

          <Link href="/cart" className="cart-link">
            <Image src="/assets/icons/cart.svg" alt="Carrito" width={24} height={24} />
          </Link>
        </div>
      </div>
    </nav>
  );
}