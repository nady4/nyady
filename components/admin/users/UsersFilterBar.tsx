"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function UsersFilterBar({
  q,
  verified,
  hasOrders,
  archived,
}: {
  q: string;
  verified: string;
  hasOrders: string;
  archived: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState(q);

  const push = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`/admin/usuarios?${params.toString()}`);
  };

  return (
    <div className="admin-filter-bar">
      <form
        className="admin-filter-search"
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: draft.trim() });
        }}
      >
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Buscar por nombre de usuario o email"
        />
        <button type="submit" className="admin-button small">
          Buscar
        </button>
      </form>

      <label className="admin-filter-select">
        <span>Verificación</span>
        <select
          value={verified}
          onChange={(e) => push({ verified: e.target.value })}
        >
          <option value="">Todas</option>
          <option value="si">Verificadas</option>
          <option value="no">Sin verificar</option>
        </select>
      </label>

      <label className="admin-filter-select">
        <span>Pedidos</span>
        <select
          value={hasOrders}
          onChange={(e) => push({ hasOrders: e.target.value })}
        >
          <option value="">Todas</option>
          <option value="si">Con pedidos</option>
          <option value="no">Sin pedidos</option>
        </select>
      </label>

      <label className="admin-filter-select">
        <span>Estado</span>
        <select
          value={archived ? "1" : "0"}
          onChange={(e) => push({ archived: e.target.value === "1" ? "1" : null })}
        >
          <option value="0">Activos</option>
          <option value="1">Archivados</option>
        </select>
      </label>
    </div>
  );
}
