"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import "@/styles/Dropdown.scss";

export default function Dropdown() {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }, []);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      dropdownRef.current &&
      buttonRef.current &&
      event.target instanceof Element &&
      !dropdownRef.current.contains(event.target) &&
      !buttonRef.current.contains(event.target)
    ) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div className="dropdown-wrapper right-content" key={pathname}>
      <button
        ref={buttonRef}
        className="dropdown-switch"
        onClick={toggleDropdown}
      >
        <Image src="/assets/icons/menu.svg" alt="Menu" width={40} height={40} />
      </button>
      <div
        className={`dropdown-container ${isOpen ? "open" : "closed"}`}
        ref={dropdownRef}
      >
        <Link href="/wishlist">
          <Image
            src="/assets/icons/heart.svg"
            alt="Wishlist"
            width={30}
            height={30}
          />
          <h3>Favoritos</h3>
        </Link>
        <Link href="/cart">
          <Image
            src="/assets/icons/cart.svg"
            alt="Cart"
            width={30}
            height={30}
          />
          <h3>Carrito</h3>
        </Link>
        <Link href="/orders">
          <Image
            src="/assets/icons/truck.svg"
            alt="Orders"
            width={30}
            height={30}
          />
          <h3>Órdenes</h3>
        </Link>
        <Link href="/address">
          <Image
            src="/assets/icons/house.svg"
            alt="Address"
            width={30}
            height={30}
          />
          <h3>Dirección</h3>
        </Link>
        <Link href="/settings">
          <Image
            src="/assets/icons/gear.svg"
            alt="Settings"
            width={30}
            height={30}
          />
          <h3>Configuración</h3>
        </Link>
        <a onClick={() => signOut({ callbackUrl: "/" })}>
          <Image
            src="/assets/icons/logout.svg"
            alt="Logout"
            width={26}
            height={26}
          />
          <h3>Cerrar sesión</h3>
        </a>
      </div>
    </div>
  );
}
