"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fraunces } from "@/app/fonts";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [
      { href: "/admin", label: "Resumen", icon: "/assets/icons/house.svg", exact: true },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/admin/productos", label: "Productos", icon: "/assets/icons/product-box.svg" },
      { href: "/admin/categorias", label: "Categorías", icon: "/assets/icons/layout-grid.svg" },
    ],
  },
  {
    label: "Ventas",
    items: [
      { href: "/admin/pedidos", label: "Pedidos", icon: "/assets/icons/cart_dark.svg" },
      { href: "/admin/cupones", label: "Cupones", icon: "/assets/icons/gift.svg" },
      { href: "/admin/envios", label: "Envíos", icon: "/assets/icons/truck.svg" },
    ],
  },
  {
    label: "Clientes",
    items: [
      { href: "/admin/usuarios", label: "Usuarios", icon: "/assets/icons/user.svg" },
    ],
  },
  {
    label: "Análisis",
    items: [
      { href: "/admin/reportes", label: "Reportes", icon: "/assets/icons/portfolio.svg" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/marketing", label: "Marketing", icon: "/assets/icons/megaphone.svg" },
    ],
  },
  {
    label: "Sitio",
    items: [
      { href: "/admin/contenido", label: "Contenido", icon: "/assets/icons/blog.svg" },
      { href: "/admin/configuracion", label: "Configuración", icon: "/assets/icons/gear.svg" },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Close the mobile drawer whenever the route changes (state adjusted
  // during render instead of an effect, per react-hooks lint guidance).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  const currentSection = NAV_GROUPS.flatMap((g) => g.items).find((item) =>
    isActive(pathname, item)
  );

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  const renderNavItem = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      className={`admin-nav-item ${isActive(pathname, item) ? "active" : ""}`}
      aria-current={isActive(pathname, item) ? "page" : undefined}
      onClick={() => setMenuOpen(false)}
    >
      <Image src={item.icon} alt="" width={18} height={18} />
      <span>{item.label}</span>
    </Link>
  );

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="admin-sidebar-brand">
          <Link
            href="/admin"
            onClick={() => setMenuOpen(false)}
            className={fraunces.className}
          >
            <span className="admin-brand-black">N</span>
            <span className="admin-brand-accent">Y</span>
            <span className="admin-brand-black">ADY</span>
            <span className="admin-brand-label">Admin</span>
          </Link>
        </div>

        <nav className="admin-sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="admin-nav-group">
              <span className="admin-nav-group-label">{group.label}</span>
              {group.items.map(renderNavItem)}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/catalog" className="admin-nav-item">
            <Image src="/assets/icons/cart_dark.svg" alt="" width={18} height={18} />
            <span>Ver tienda</span>
          </Link>
          <button
            type="button"
            className="admin-nav-item admin-nav-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <Image src="/assets/icons/logout.svg" alt="" width={18} height={18} />
            <span>{loggingOut ? "Saliendo..." : "Cerrar sesión"}</span>
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="admin-body">
        <header className="admin-topbar">
          <button
            type="button"
            ref={menuButtonRef}
            className="admin-topbar-menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <Image src="/assets/icons/menu.svg" alt="" width={22} height={22} />
          </button>
          <span className={`admin-topbar-title ${fraunces.className}`}>
            {currentSection?.label ?? "Admin"}
          </span>
          <div className="admin-topbar-actions">
            <Link href="/catalog">Ver tienda</Link>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
