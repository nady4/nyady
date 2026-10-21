"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function OrdersFilterBar({
  status,
  q,
  archived,
}: {
  status: string;
  q: string;
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
    router.push(`/admin/pedidos?${params.toString()}`);
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
          placeholder="Buscar por ID de pedido, cliente, email o destinatario"
        />
        <button type="submit" className="admin-button small">
          Buscar
        </button>
      </form>

      <label className="admin-filter-select">
        <span>Estado</span>
        <select value={status} onChange={(e) => push({ status: e.target.value })}>
          <option value="">Todos</option>
          <option value="pending">Pendientes</option>
          <option value="preparing">En preparación</option>
          <option value="shipped">En envío</option>
          <option value="approved">Aprobados</option>
          <option value="rejected">Rechazadas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </label>

      <label className="admin-filter-select">
        <span>Archivo</span>
        <select
          value={archived ? "1" : "0"}
          onChange={(e) => push({ archived: e.target.value === "1" ? "1" : null })}
        >
          <option value="0">Activos</option>
          <option value="1">Archivados</option>
        </select>
      </label>

      <a
        href={`/api/admin/export/orders?${
          new URLSearchParams({
            ...(status ? { status } : {}),
            ...(q ? { q } : {}),
            ...(archived ? { archived: "1" } : {}),
          }).toString()
        }`}
        className="admin-button small"
        download
      >
        Exportar CSV
      </a>
    </div>
  );
}
