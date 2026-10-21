"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrderDetailsAction } from "@/actions/admin/orders";
import { SHIPMENT_STATUS_LABELS } from "@/lib/order-status";
import type { AdminOrderDetailView } from "@/types/admin";

/**
 * Editable recipient data, internal notes and manual tracking fields
 * (tracking number/url/status — useful for manual orders or follow-ups when
 * the carrier sends a different id).
 */
export default function OrderDetailsEditor({ order }: { order: AdminOrderDetailView }) {
  const router = useRouter();
  const [recipientName, setRecipientName] = useState(order.recipientName ?? "");
  const [recipientDocument, setRecipientDocument] = useState(order.recipientDocument ?? "");
  const [recipientPhone, setRecipientPhone] = useState(order.recipientPhone ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl ?? "");
  const [shipmentStatus, setShipmentStatus] = useState(order.shipmentStatus ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);

    const input = {
      recipientName: recipientName.trim() || null,
      recipientDocument: recipientDocument.trim() || null,
      recipientPhone: recipientPhone.trim() || null,
      notes: notes.trim() || null,
      trackingNumber: trackingNumber.trim() || null,
      trackingUrl: trackingUrl.trim() || null,
      shipmentStatus: shipmentStatus.trim() || null,
    };

    try {
      const result = await updateOrderDetailsAction(order.id, input);
      if (result.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error ?? "No se pudo actualizar el pedido");
      }
    } catch {
      setError("Error de conexión. Reintentá.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-order-details-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Nombre del destinatario</span>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Nombre y apellido"
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
        <label className="admin-field">
          <span>Número de seguimiento (manual)</span>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="TRK…"
          />
        </label>
        <label className="admin-field admin-field-wide">
          <span>URL de seguimiento (manual)</span>
          <input
            type="text"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label className="admin-field admin-field-wide">
          <span>Estado del envío (manual)</span>
          <select
            value={shipmentStatus}
            onChange={(e) => setShipmentStatus(e.target.value)}
          >
            <option value="">— Sin estado manual —</option>
            {Object.entries(SHIPMENT_STATUS_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field admin-field-wide">
          <span>Notas internas (no las ve el cliente)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ej: abona al recibir, coordinar entrega con ^^"
          />
        </label>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-form-actions">
        {saved && <span className="admin-saved-hint">Guardado</span>}
        <button type="submit" className="admin-button primary" disabled={busy}>
          {busy ? "Guardando..." : "Guardar datos del pedido"}
        </button>
      </div>
    </form>
  );
}
