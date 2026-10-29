"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createManualOrderAction } from "@/actions/admin/orders";
import { useWholesaleTiers } from "@/hooks/useWholesaleTiers";
import type {
  AdminProductOption,
  AdminUserOption,
} from "@/types/admin";

interface ManualItemRow {
  productId: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  selectedTacoOption: string;
}

const EMPTY_ROW: ManualItemRow = {
  productId: "",
  quantity: 1,
  selectedColor: "",
  selectedSize: "",
  selectedTacoOption: "",
};

/**
 * Manual order creation for phone/WhatsApp sales: existing user + catalog
 * items + optional coupon + shipping cost. Totals/descounts are computed
 * server-side so the stored total always matches the discount rules.
 */
export default function ManualOrderForm({
  users,
  productOptions,
}: {
  users: AdminUserOption[];
  productOptions: AdminProductOption[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState<ManualItemRow[]>([{ ...EMPTY_ROW }]);
  const [couponCode, setCouponCode] = useState("");
  const [shippingCost, setShippingCost] = useState("0");
  const [status, setStatus] = useState<"pending" | "approved">("approved");
  const [recipientName, setRecipientName] = useState("");
  const [recipientDocument, setRecipientDocument] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const productsById = new Map(productOptions.map((p) => [p.id, p]));
  const tiers = useWholesaleTiers();

  const updateRow = (index: number, changes: Partial<ManualItemRow>) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...changes };
        if (changes.productId !== undefined) {
          next.selectedColor = "";
          next.selectedSize = "";
          next.selectedTacoOption = "";
        }
        return next;
      })
    );
  };

  const approxProductsTotal = rows.reduce(
    (acc, row) => acc + (productsById.get(row.productId)?.price ?? 0) * row.quantity,
    0
  );
  const approxUnits = rows.reduce(
    (acc, row) => acc + (row.productId ? Number(row.quantity) || 0 : 0),
    0
  );
  // Highest tier reached by the estimated unit count.
  const approxPercent = tiers.reduce(
    (acc, tier) => (approxUnits >= tier.units ? tier.percent : acc),
    0
  );
  const approxWholesale = approxPercent / 100;
  const approxShipping = Math.max(0, Number(shippingCost.replace(",", ".")) || 0);
  const approxTotal = Math.round(
    (approxProductsTotal * (1 - approxWholesale) + approxShipping) * 100
  ) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId) {
      setError("Elegí el cliente del pedido");
      return;
    }
    if (rows.every((row) => !row.productId)) {
      setError("Agregá al menos un producto");
      return;
    }
    if (rows.some((row) => row.productId && row.quantity < 1)) {
      setError("Las cantidades deben ser 1 o más");
      return;
    }

    setBusy(true);
    try {
      const result = await createManualOrderAction({
        userId,
        status,
        shippingCost: approxShipping,
        couponCode: couponCode.trim() || null,
        notes: notes.trim() || null,
        recipientName: recipientName.trim() || null,
        recipientDocument: recipientDocument.trim() || null,
        recipientPhone: recipientPhone.trim() || null,
        items: rows
          .filter((row) => row.productId)
          .map((row) => ({
            productId: row.productId,
            quantity: row.quantity,
            selectedColor: row.selectedColor || null,
            selectedSize: row.selectedSize || null,
            selectedTacoOption: row.selectedTacoOption || null,
          })),
      });

      if (!result.ok || !result.orderId) {
        setError(result.error ?? "No se pudo crear el pedido");
        setBusy(false);
        return;
      }

      router.push(`/admin/pedidos/${result.orderId}`);
      router.refresh();
    } catch {
      setError("Error de conexión. Reintentá.");
      setBusy(false);
    }
  };

  return (
    <form className="admin-product-form" onSubmit={handleSubmit}>
      <div className="admin-form-section">
        <h2 className="admin-form-section-title">Cliente</h2>
        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            <span>Cliente (cuenta existente)</span>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">— Elegir cliente —</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} · {user.email}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>Estado</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "pending" | "approved")}
            >
              <option value="approved">Aprobado (pagó / paga al recibir)</option>
              <option value="pending">Pendiente de pago</option>
            </select>
          </label>

          <label className="admin-field">
            <span>Cupón (opcional)</span>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="BIENVENIDA10"
            />
          </label>
        </div>
      </div>

      <div className="admin-form-section">
        <h2 className="admin-form-section-title">Productos</h2>
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
                      {option.name} · ${option.price.toLocaleString("es-AR")}
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
                    value={row.selectedColor}
                    onChange={(e) =>
                      updateRow(index, { selectedColor: e.target.value })
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
                    value={row.selectedSize}
                    onChange={(e) =>
                      updateRow(index, { selectedSize: e.target.value })
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
                    value={row.selectedTacoOption}
                    onChange={(e) =>
                      updateRow(index, { selectedTacoOption: e.target.value })
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

              {rows.length > 1 && (
                <button
                  type="button"
                  className="admin-button small danger"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                >
                  Quitar
                </button>
              )}
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

        <p className="admin-field-hint">
          {approxUnits} unidad(es) · descuento mayorista estimado{" "}
          {Math.round(approxWholesale * 100)}% · cupón y tope por usuario se
          validan al confirmar
        </p>
      </div>

      <div className="admin-form-section">
        <h2 className="admin-form-section-title">Entrega</h2>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Costo de envío ($)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>Destinatario</span>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Nombre y apellido (para Zipnova)"
            />
          </label>
          <label className="admin-field">
            <span>Documento (DNI)</span>
            <input
              type="text"
              value={recipientDocument}
              onChange={(e) => setRecipientDocument(e.target.value)}
              placeholder="40123456"
            />
          </label>
          <label className="admin-field">
            <span>Teléfono</span>
            <input
              type="text"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="+549…"
            />
          </label>
          <label className="admin-field admin-field-wide">
            <span>Notas internas</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: vende por IG, entrega en CABA"
            />
          </label>
        </div>
        {recipientName && !recipientDocument && (
          <p className="admin-field-hint">
            Para crear el envío Zipnova después necesitás también DNI y
            teléfono del destinatario.
          </p>
        )}
      </div>

      <div className="admin-manual-order-summary">
        <span>Estimación sin cupón:</span>
        <strong>${approxTotal.toLocaleString("es-AR")}</strong>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <div className="admin-form-actions">
        <button type="submit" className="admin-button primary" disabled={busy}>
          {busy ? "Creando pedido..." : "Crear pedido manual"}
        </button>
        <button
          type="button"
          className="admin-button"
          onClick={() => router.back()}
          disabled={busy}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
