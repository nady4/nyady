"use client";

import Link from "next/link";
import { fraunces } from "@/app/fonts";
import { orderStatusLabel, shipmentStatusLabel } from "@/lib/order-status";
import { formatARS, formatAdminDate } from "@/lib/admin/format";
import type { AdminOrderRow } from "@/types/admin";

export default function OrdersTable({
  rows,
}: {
  rows: AdminOrderRow[];
}) {
  if (rows.length === 0) {
    return <p className="admin-empty">No hay pedidos con estos filtros</p>;
  }

  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th className="admin-col-number">Items</th>
            <th className="admin-col-number">Total</th>
            <th className="admin-col-center">Estado</th>
            <th className="admin-col-center">Envío</th>
            <th className="admin-col-center">Ver</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div className="admin-cell-name">
                  <span className={`admin-cell-title ${fraunces.className}`}>
                    #{row.id.slice(0, 8)}
                  </span>
                  <span className="admin-cell-sub">
                    {row.source === "manual" ? "Manual" : "Web"}
                    {row.couponCode ? ` · ${row.couponCode}` : ""}
                  </span>
                </div>
              </td>
              <td className="admin-cell-date">
                {formatAdminDate(row.createdAt)}
              </td>
              <td>
                <div className="admin-cell-name">
                  <span className="admin-cell-title">{row.user.username}</span>
                  <span className="admin-cell-sub">{row.user.email}</span>
                </div>
              </td>
              <td className="admin-col-number">{row.itemsCount}</td>
              <td className="admin-cell-price">{formatARS(row.total)}</td>
              <td className="admin-col-center">
                <span className={`admin-status-badge status-${row.status}`}>
                  {orderStatusLabel(row)}
                </span>
              </td>
              <td className="admin-col-center">
                {row.shipmentStatus ? (
                  <span
                    className={`admin-status-badge ${
                      row.shipmentStatus === "delivered" ? "available" : "status-approved"
                    }`}
                  >
                    {shipmentStatusLabel(row.shipmentStatus)}
                  </span>
                ) : row.shipmentId ? (
                  "—"
                ) : (
                  "—"
                )}
              </td>
              <td className="admin-col-center">
                <Link
                  href={`/admin/pedidos/${row.id}`}
                  className="admin-button small"
                >
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
