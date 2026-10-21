"use client";

import Link from "next/link";
import { fraunces } from "@/app/fonts";
import { formatAdminDate } from "@/lib/admin/format";
import type { AdminUserRow } from "@/types/admin";

export default function UsersTable({ rows }: { rows: AdminUserRow[] }) {
  if (rows.length === 0) {
    return <p className="admin-empty">No hay usuarios con estos filtros</p>;
  }

  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Email</th>
            <th className="admin-col-number">Pedidos</th>
            <th>Dirección</th>
            <th>Desde</th>
            <th className="admin-col-center">Estado</th>
            <th className="admin-col-center">Ver</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.archivedAt ? "archived" : ""}>
              <td>
                <div className="admin-user-cell">
                  <span
                    className={`admin-user-mini-avatar ${fraunces.className}`}
                  >
                    {row.username.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="admin-cell-title">{row.username}</span>
                </div>
              </td>
              <td className="admin-cell-sub">{row.email}</td>
              <td className="admin-col-number">{row.ordersCount}</td>
              <td className="admin-cell-sub">{row.addressSummary ?? "Sin dirección"}</td>
              <td className="admin-cell-date">{formatAdminDate(row.createdAt)}</td>
              <td className="admin-col-center">
                <span
                  className={`admin-status-badge ${
                    row.archivedAt
                      ? "status-cancelled"
                      : row.emailVerified
                        ? "available"
                        : "status-pending"
                  }`}
                >
                  {row.archivedAt
                    ? "Archivado"
                    : row.emailVerified
                      ? "Verificada"
                      : "Sin verificar"}
                </span>
              </td>
              <td className="admin-col-center">
                <Link href={`/admin/usuarios/${row.id}`} className="admin-button small">
                  Abrir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
