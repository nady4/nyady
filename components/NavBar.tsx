"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import { fraunces } from "@/app/fonts";
import { getUserAddress } from "@/actions/address";
import { getCartIds } from "@/actions/cart";
import { useAppSelector } from "@/hooks/useStore";
import { Suspense } from "react";
import "@/styles/Navbar.scss";

const INFO_OPTIONS = [
  {
    href: "/info/elaboracion",
    label: "Tiempos de Elaboración",
    icon: "/assets/icons/clock.svg"
  },
  { href: "/info/envios", label: "Envíos", icon: "/assets/icons/truck.svg" },
  {
    href: "/info/medios-de-pago",
    label: "Medios de Pago",
    icon: "/assets/icons/card.svg"
  },
  {
    href: "/info/reembolsos",
    label: "Reembolsos",
    icon: "/assets/icons/return.svg"
  },
  {
    href: "/info/promociones",
    label: "Promociones y Descuentos",
    icon: "/assets/icons/tag.svg"
  },
  {
    href: "/info/preguntas-frecuentes",
    label: "Preguntas Frecuentes",
    icon: "/assets/icons/help.svg"
  },
  {
    href: "/info/contacto",
    label: "Contacto",
    icon: "/assets/icons/email.svg"
  },
  {
    href: "/info/privacidad",
    label: "Política de Privacidad",
    icon: "/assets/icons/shield.svg"
  },
  {
    href: "/info/terminos",
    label: "Términos y Condiciones",
    icon: "/assets/icons/file.svg"
  },
  {
    href: "/info/arrepentimiento",
    label: "Botón de Arrepentimiento",
    icon: "/assets/icons/cancel.svg"
  },
  { href: "/info/blog", label: "Blog", icon: "/assets/icons/blog.svg" },
  { href: "/info/nady4", label: "Nady4", icon: "/assets/icons/code.svg" }
];

interface AccountLink {
  href: string;
  label: string;
  icon: string;
}

const ACCOUNT_LINKS: AccountLink[] = [
  { href: "/cuenta", label: "Cuenta", icon: "/assets/icons/user.svg" },
  { href: "/orders", label: "Mis Pedidos", icon: "/assets/icons/truck.svg" },
  { href: "/wishlist", label: "Mis Favoritos", icon: "/assets/icons/heart.svg" },
  { href: "/address", label: "Dirección de envío", icon: "/assets/icons/house.svg" }
];

type AddressType = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
} | null;

function NavContent() {
  const { data: session, status } = useSession();
  const infoRef = useRef<HTMLDivElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [address, setAddress] = useState<AddressType>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduxCartIds = useAppSelector((state) => state.cart);
  const [fetchedCartHasItems, setFetchedCartHasItems] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      getUserAddress().then(setAddress).catch(console.error);
    } else {
      queueMicrotask(() => setAddress(null));
    }
  }, [status, session?.user?.email]);

  // Cart indicator: Redux ids (updated instantly by the add-to-cart islands)
  // OR a fetched value kept in sync on navigation (covers routes that never
  // initialize the Redux slice).
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      queueMicrotask(() => setFetchedCartHasItems(false));
      return;
    }
    getCartIds(session.user.id as string)
      .then((ids) => setFetchedCartHasItems(ids.length > 0))
      .catch(() => setFetchedCartHasItems(false));
  }, [status, session?.user?.id, pathname, searchParams]);

  const hasCartItems = reduxCartIds.length > 0 || fetchedCartHasItems;

  // Close open menus after every navigation.
  useEffect(() => {
    queueMicrotask(() => {
      setInfoOpen(false);
      setMenuOpen(false);
    });
  }, [pathname]);

  const toggleInfo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setInfoOpen((prev) => !prev);
  }, []);

  const closeMenus = useCallback(() => {
    setInfoOpen(false);
    setMenuOpen(false);
  }, []);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      const target = event.target;
      if (
        infoRef.current &&
        target instanceof Element &&
        !infoRef.current.contains(target)
      ) {
        setInfoOpen(false);
      }
      if (
        target instanceof Element &&
        !target.closest(".mobile-menu, .menu-toggle")
      ) {
        setMenuOpen(false);
      }
    },
    []
  );

  useEffect(() => {
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [handleClickOutside]);

  // Escape closes any open menu and returns focus to its trigger.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (infoOpen) {
        setInfoOpen(false);
      } else if (menuOpen) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [infoOpen, menuOpen]);

  const formatAddress = (addr: AddressType) => {
    if (!addr) return "Seleccionar dirección";
    return `${addr.street}, ${addr.city}, ${addr.state}, ${addr.postalCode}`;
  };

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className={`${fraunces.className} navbar-container`}>
      <div className="navbar-wrapper">
        <div className="left-content">
          {!session ? (
            <Link href="/signin" className="nav-link">
              <Image
                src="/assets/icons/signin.svg"
                alt=""
                aria-hidden="true"
                width={20}
                height={20}
              />
              <span>Iniciar sesión</span>
            </Link>
          ) : (
            <>
              {ACCOUNT_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link${
                    link.href === "/orders"
                      ? " orders-link"
                      : link.href === "/wishlist"
                        ? " wishlist-link"
                        : link.href === "/address"
                          ? " address-link"
                          : ""
                  }`}
                >
                  <Image
                    src={link.icon}
                    alt=""
                    aria-hidden="true"
                    width={20}
                    height={20}
                  />
                  <span>
                    {link.href === "/address" ? formatAddress(address) : link.label}
                  </span>
                </Link>
              ))}
            </>
          )}
        </div>

        <div className="center-content">
          <Link href="/catalog" className="logo-link" aria-label="NYADY — ir al catálogo">
            <div className="logo">
              <span className="logo-black">N</span>
              <span className="logo-accent">Y</span>
              <span className="logo-black">ADY</span>
            </div>
          </Link>
        </div>

        <div className="right-content">
          {session && (
            <Link href="/cart" className="cart-link" aria-label={`Carrito${hasCartItems ? ": tenés productos" : " (vacío)"}`}>
              <Image
                src="/assets/icons/cart_dark.svg"
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
              />
              {hasCartItems && <span className="cart-badge" aria-hidden="true" />}
            </Link>
          )}
          <div className="info-wrapper" ref={infoRef}>
            <button
              type="button"
              className="nav-link info-toggle"
              onClick={toggleInfo}
              aria-expanded={infoOpen}
              aria-haspopup="true"
              aria-controls="info-dropdown"
            >
              <span>Información</span>
              <Image
                src="/assets/icons/chevron-down.svg"
                alt=""
                aria-hidden="true"
                width={14}
                height={14}
                className={infoOpen ? "chevron open" : "chevron"}
              />
            </button>
            <div
              className={`info-dropdown ${infoOpen ? "open" : "closed"}`}
              id="info-dropdown"
            >
              {INFO_OPTIONS.map((option) => (
                <Link
                  key={option.href}
                  href={option.href}
                  onClick={() => setInfoOpen(false)}
                >
                  <Image
                    src={option.icon}
                    alt=""
                    aria-hidden="true"
                    width={18}
                    height={18}
                  />
                  <span>{option.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <button
            type="button"
            ref={menuButtonRef}
            className="nav-link menu-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            <Image
              src="/assets/icons/menu.svg"
              alt=""
              aria-hidden="true"
              width={22}
              height={22}
              className={menuOpen ? "menu-icon open" : "menu-icon"}
            />
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${menuOpen ? "open" : "closed"}`} id="mobile-menu">
        {session ? (
          <>
            {ACCOUNT_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMenus}>
                <Image
                  src={link.icon}
                  alt=""
                  aria-hidden="true"
                  width={18}
                  height={18}
                />
                <span>{link.label}</span>
              </Link>
            ))}
            <Link href="/cart" onClick={closeMenus}>
              <Image
                src="/assets/icons/cart_dark.svg"
                alt=""
                aria-hidden="true"
                width={18}
                height={18}
              />
              <span>Carrito{hasCartItems ? " (con productos)" : ""}</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/signin" onClick={closeMenus}>
              <Image
                src="/assets/icons/signin.svg"
                alt=""
                aria-hidden="true"
                width={18}
                height={18}
              />
              <span>Iniciar sesión</span>
            </Link>
            <Link href="/cart" onClick={closeMenus}>
              <Image
                src="/assets/icons/cart_dark.svg"
                alt=""
                aria-hidden="true"
                width={18}
                height={18}
              />
              <span>Carrito</span>
            </Link>
          </>
        )}
        <div className="mobile-menu-section">Información</div>
        {INFO_OPTIONS.map((option) => (
          <Link key={`m-${option.href}`} href={option.href} onClick={closeMenus}>
            <Image
              src={option.icon}
              alt=""
              aria-hidden="true"
              width={18}
              height={18}
            />
            <span>{option.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function NavBar() {
  return (
    <Suspense fallback={<div className="navbar-container" />}>
      <NavContent />
    </Suspense>
  );
}
