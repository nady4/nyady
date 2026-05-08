"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useAppSelector } from "@/hooks/useStore";
import { getUserAddress } from "@/actions/address";
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
];

type AddressType = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
} | null;

export default function Dropdown() {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [address, setAddress] = useState<AddressType>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const pathname = usePathname();
  const { data: session } = useSession();
  const cartItems = useAppSelector((state) => state.cart);
  const totalQuantity = cartItems.length;

  useEffect(() => {
    const loadAddress = async () => {
      if (session?.user?.email) {
        try {
          const userAddress = await getUserAddress();
          setAddress(userAddress);
        } catch (error) {
          console.error("Error loading address:", error);
        }
      }
      setLoadingAddress(false);
    };
    loadAddress();
  }, [session?.user?.email]);

  const formatAddress = (addr: AddressType) => {
    if (!addr) return "Agregar dirección";
    return `Enviar a ${addr.street}, ${addr.city}, ${addr.state}, ${addr.postalCode}`;
  };

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
        <a onClick={() => signOut({ callbackUrl: "/" })} className="icon-link">
          <Image
            src="/assets/icons/logout.svg"
            alt="Cerrar sesión"
            width={26}
            height={26}
          />
        </a>
        <Link href="/cuenta" className="text-link">
          <Image
            src="/assets/icons/user.svg"
            alt="Cuenta"
            width={26}
            height={26}
          />
          <span>Cuenta</span>
        </Link>
        <Link href="/orders" className="text-link">
          <Image
            src="/assets/icons/truck.svg"
            alt="Mis Pedidos"
            width={26}
            height={26}
          />
          <span>Mis Pedidos</span>
        </Link>
        <Link href="/wishlist" className="text-link favorite-link">
          <Image
            src="/assets/icons/heart.svg"
            alt="Mis Favoritos"
            width={26}
            height={26}
            className="favorite-icon"
          />
          <span>Mis Favoritos</span>
        </Link>
      </div>

      <div className="right-content">
        <div className="info-wrapper navbar-info" ref={dropdownRef}>
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
        <Link href="/address" className="text-link address-button">
          <Image
            src="/assets/icons/house.svg"
            alt="Dirección"
            width={26}
            height={26}
          />
          <span>{loadingAddress ? "Cargando..." : formatAddress(address)}</span>
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