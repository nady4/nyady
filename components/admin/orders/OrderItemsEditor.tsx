"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrderItemsAction } from "@/actions/admin/orders";
import type { AdminActionResult, AdminProductOption, OrderItemEditInput } from "@/types/admin";

interface EditableItem {
  productId: string;
  quantity: number;
  selectedColor: string | null;
  selectedSize: string | null;
  selectedTacoOption: string | null;
}

const EMPTY_ROW: EditableItem = {
  productId: "",
  quantity: 1,
  selectedColor: null,
  selectedSize: null,
  selectedTacoOption: null,
};

/**
 * Item editor for pending orders. Rows are validated + snapped to current
 * product data server-side; totals (wholesale + coupon) recompute there too.
 */
export default function OrderItemsEditor({
  orderId,
  items,
  productOptions,
}: {
  orderId: string;
  items: EditableItem[];
  productOptions: AdminProductOption[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableItem[]>(items);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const productsById = new Map(productOptions.map((p) => [p.id, p]));

  const updateRow = (index: number, changes: Partial<EditableItem>) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...changes };
        if (changes.productId !== undefined) {
          // Reset variants when the product changes so stale selections
          // can't slip through.
          next.selectedColor = null;
          next.selectedSize = null;
          next.selectedTacoOption = null;
        }
        return next;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const payload: OrderItemEditInput[] = rows
      .filter((row) => row.productId)
      .map((row) => ({
        productId: row.productId,
        quantity: row.quantity,
        selectedColor: row.selectedColor || null,
        selectedSize: row.selectedSize || null,
        selectedTacoOption: row.selectedTacoOption || null,
      }));

    try {
      const result: AdminActionResult = await updateOrderItemsAction(orderId, payload);
      if (!result.ok) {
        setError(result.error ?? "No se pudo actualizar los items");
      } else {
        router.refresh();
      }
    } catch {
      setError("Error de conexión. Reintentá.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-order-items-editor" onSubmit={handleSubmit}>
      {rows.map((row, index) => {
        const product = productsById.get(row.productId);
        return (
          <div key={index} className="admin-order-item-editor">
            <label className="admin-field admin-field-wide">
              <span>Producto</span>
              <select
                value={row.productId}
                onChange={(e) => updateRow(index, { productId: e.target.value })}
              >
                <option value="">— Elegir producto —</option>
                {productOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Cantidad</span>
              <input
                type="number"
                min={1}
                max={100}
                value={row.quantity}
                onChange={(e) =>
                  updateRow(index, { quantity: Number(e.target.value) || 0 })
                }
              />
            </label>

            {product?.colors && (
              <label className="admin-field">
                <span>Color</span>
                <select
                  value={row.selectedColor ?? ""}
                  onChange={(e) =>
                    updateRow(index, { selectedColor: e.target.value || null })
                  }
                >
                  <option value="">—</option>
                  {product.colors.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {product?.sizes && (
              <label className="admin-field">
                <span>Talle</span>
                <select
                  value={row.selectedSize ?? ""}
                  onChange={(e) =>
                    updateRow(index, { selectedSize: e.target.value || null })
                  }
                >
                  <option value="">—</option>
                  {product.sizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {product?.tacoOptions && (
              <label className="admin-field">
                <span>Taco</span>
                <select
                  value={row.selectedTacoOption ?? ""}
                  onChange={(e) =>
                    updateRow(index, { selectedTacoOption: e.target.value || null })
                  }
                >
                  <option value="">—</option>
                  {product.tacoOptions.map((taco) => (
                    <option key={taco} value={taco}>
                      {taco}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              className="admin-button small danger"
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
            >
              Quitar
            </button>
          </div>
        );
      })}

      <button
        type="button"
        className="admin-button small"
        onClick={() => setRows((prev) => [...prev, { ...EMPTY_ROW }])}
      >
        + Agregar línea
      </button>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-form-actions">
        <button type="submit" className="admin-button primary" disabled={busy}>
          {busy ? "Recalculando..." : "Guardar items"}
        </button>
      </div>
    </form>
  );
}
