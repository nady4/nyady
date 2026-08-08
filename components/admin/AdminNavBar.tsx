"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { fraunces } from "@/app/fonts";

const LINKS = [
  { href: "/admin", label: "Productos" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/usuarios", label: "Usuarios" },
];

export default function AdminNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  if (pathname === "/admin/login") return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  return (
    <nav className={`admin-navbar ${fraunces.className}`}>
      <div className="admin-navbar-inner">
        <div className="admin-brand">
          <span className="admin-brand-black">N</span>
          <span className="admin-brand-accent">Y</span>
          <span className="admin-brand-black">ADY</span>
          <span className="admin-brand-label">Admin</span>
        </div>

        <div className="admin-nav-links">
          {LINKS.map((link) => {
            const active =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`admin-nav-link ${active ? "active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="admin-nav-actions">
          <Link href="/catalog" className="admin-nav-store">
            Ver tienda
          </Link>
          <button
            type="button"
            className="admin-nav-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      </div>
    </nav>
  );
}
