"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fraunces } from "@/app/fonts";
import {
  archiveProductAction,
  bulkProductAction,
  deleteProductPermanentlyAction,
  duplicateProductAction,
  restoreProductAction,
  toggleProductAvailabilityAction,
} from "@/actions/admin/products";
import type { AdminActionResult, AdminProductRow } from "@/types/admin";
import { formatARS, formatAdminDate } from "@/lib/admin/format";

function runWithFeedback(
  action: () => Promise<AdminActionResult>,
  onDone: (result: AdminActionResult | null) => void,
  onFinally: () => void
) {
  void (async () => {
    try {
      const result = await action();
      onDone(result.ok ? null : result);
    } catch {
      onDone({ ok: false, error: "Error de conexión. Reintentá." });
    } finally {
      onFinally();
    }
  })();
}

export default function ProductsTable({
  rows,
}: {
  rows: AdminProductRow[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<AdminActionResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const busy = useRef(false);

  const execute = (action: () => Promise<AdminActionResult>) => {
    if (busy.current) return;
    busy.current = true;
    runWithFeedback(
      action,
      (result) => {
        setMessage(result);
        if (!result) {
          setSelected(new Set());
          router.refresh();
        }
      },
      () => {
        busy.current = false;
      }
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === rows.length) return new Set();
      return new Set(rows.map((r) => r.id));
    });
  };

  const handleDelete = (row: AdminProductRow) => {
    if (
      !window.confirm(
        `¿Eliminar definitivamente "${row.name}"?\nSolo se puede eliminar si no tiene pedidos.`
      )
    ) {
      return;
    }
    execute(() => deleteProductPermanentlyAction(row.id));
  };

  const handleArchive = (row: AdminProductRow) => {
    if (
      !window.confirm(
        `¿Archivar "${row.name}"?\nSe oculta de la tienda y se quita de carritos y favoritos. El historial de pedidos se conserva.`
      )
    ) {
      return;
    }
    execute(() => archiveProductAction(row.id));
  };

  const handleBulkArchive = () => {
    if (
      !window.confirm(
        `¿Archivar ${selected.size} producto(s)?\nSe ocultan de la tienda y se quitan de carritos y favoritos.`
      )
    ) {
      return;
    }
    execute(() => bulkProductAction([...selected], "archive"));
  };

  const anySelected = selected.size > 0;

  return (
    <div className="admin-products-table-wrap">
      {message && (
        <div className={`admin-banner ${message.ok ? "ok" : "error"}`}>
          <span>
            {message.ok
              ? "Acción aplicada"
              : message.error || "Ocurrió un error"}
          </span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Cerrar">
            ×
          </button>
        </div>
      )}

      {anySelected && (
        <div className="admin-bulk-bar">
          <span>{selected.size} seleccionado(s)</span>
          <button
            type="button"
            className="admin-button small"
            onClick={() => execute(() => bulkProductAction([...selected], "activate"))}
          >
            Activar
          </button>
          <button
            type="button"
            className="admin-button small"
            onClick={() => execute(() => bulkProductAction([...selected], "deactivate"))}
          >
            Desactivar
          </button>
          <button
            type="button"
            className="admin-button small"
            onClick={handleBulkArchive}
          >
            Archivar
          </button>
          <button
            type="button"
            className="admin-button small"
            onClick={() => setSelected(new Set())}
          >
            Cancelar selección
          </button>
        </div>
      )}

      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-col-check">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="admin-col-photo" aria-label="Foto" />
              <th>Producto</th>
              <th>Categoría</th>
              <th className="admin-col-number">Precio</th>
              <th className="admin-col-number">Pedidos</th>
              <th className="admin-col-center">Estado</th>
              <th>Actualizado</th>
              <th className="admin-col-actions" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.archivedAt ? "archived" : ""}>
                <td className="admin-col-check">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar ${row.name}`}
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                  />
                </td>
                <td className="admin-col-photo">
                  <Image
                    src={row.photo}
                    alt={row.name}
                    width={48}
                    height={48}
                    className="admin-table-thumb"
                    unoptimized
                  />
                </td>
                <td>
                  <div className="admin-cell-name">
                    <span className={`admin-cell-title ${fraunces.className}`}>
                      {row.name}
                    </span>
                    {row.code && (
                      <span className="admin-cell-sub">{row.code}</span>
                    )}
                  </div>
                </td>
                <td>{row.category}</td>
                <td className="admin-cell-price">
                  {formatARS(row.price)}
                </td>
                <td>{row.orderItems}</td>
                <td className="admin-col-center">
                  <span
                    className={`admin-status-badge ${
                      row.archivedAt
                        ? "status-cancelled"
                        : row.available
                          ? "available"
                          : "unavailable"
                    }`}
                  >
                    {row.archivedAt ? "Archivado" : row.available ? "Disponible" : "Pausado"}
                  </span>
                </td>
                <td className="admin-cell-date">
                  {formatAdminDate(row.updatedAt)}
                </td>
                <td className="admin-col-actions">
                  {row.archivedAt ? (
                    <button
                      type="button"
                      className="admin-button small"
                      onClick={() => execute(() => restoreProductAction(row.id))}
                    >
                      Restaurar
                    </button>
                  ) : (
                    <>
                      <Link
                        href={`/admin/productos/${row.id}`}
                        className="admin-button small"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="admin-button small"
                        onClick={() =>
                          execute(() => toggleProductAvailabilityAction(row.id))
                        }
                      >
                        {row.available ? "Pausar" : "Activar"}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="admin-button small"
                    onClick={() => execute(() => duplicateProductAction(row.id))}
                    title="Crear una copia como no disponible"
                  >
                    Duplicar
                  </button>
                  {row.archivedAt ? (
                    row.orderItems === 0 && (
                      <button
                        type="button"
                        className="admin-button small danger"
                        onClick={() => handleDelete(row)}
                      >
                        Eliminar
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      className="admin-button small danger"
                      onClick={() => handleArchive(row)}
                    >
                      Archivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="admin-empty">No hay productos con estos filtros</p>
        )}
      </div>
    </div>
  );
}
