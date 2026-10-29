"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { AdminProductsFilters } from "@/types/admin";

/**
 * Filter bar for the admin products table. Updates the URL (server page
 * re-queries); keeps the browser history clean with a fresh navigation.
 */
export default function ProductsFilterBar({
  filters,
}: {
  filters: AdminProductsFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(filters.q);

  const push = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    if (!("page" in changes)) params.delete("page");
    router.push(`/admin/productos?${params.toString()}`);
  };

  return (
    <div className="admin-filter-bar">
      <form
        className="admin-filter-search"
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: q.trim(), page: null });
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, SKU o categoría"
          aria-label="Buscar productos por nombre, SKU o categoría"
        />
        <button type="submit" className="admin-button small">
          Buscar
        </button>
      </form>

      <label className="admin-filter-select">
        <span>Categoría</span>
        <select
          value={filters.category}
          onChange={(e) => push({ category: e.target.value })}
        >
          <option value="">Todas</option>
          {filters.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-filter-select">
        <span>Disponibilidad</span>
        <select
          value={filters.availability}
          onChange={(e) => push({ availability: e.target.value })}
        >
          <option value="all">Todas</option>
          <option value="available">Disponibles</option>
          <option value="unavailable">Pausados</option>
        </select>
      </label>

      <label className="admin-filter-select">
        <span>Estado</span>
        <select
          value={filters.archived ? "1" : "0"}
          onChange={(e) => push({ archived: e.target.value === "1" ? "1" : null })}
        >
          <option value="0">Activos</option>
          <option value="1">Archivados</option>
        </select>
      </label>

      <label className="admin-filter-select">
        <span>Orden</span>
        <select
          value={filters.sort}
          onChange={(e) => push({ sort: e.target.value })}
        >
          <option value="recent">Recientes</option>
          <option value="updated">Última edición</option>
          <option value="name">Nombre (A-Z)</option>
          <option value="price_asc">Precio (mayor a menor)</option>
          <option value="price_desc">Precio (menor a mayor)</option>
        </select>
      </label>
    </div>
  );
}
