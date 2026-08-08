"use client";

import { useState } from "react";
import { ProductType } from "@/types";

interface ProductFormProps {
  product?: ProductType;
  onCancel: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  submitLabel: string;
}

export default function ProductForm({
  product,
  onCancel,
  onSubmit,
  submitLabel,
}: ProductFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const photosJson = product?.photos
    ? JSON.stringify(product.photos, null, 2)
    : "";

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setPending(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setPending(false);
    }
  };

  return (
    <form
      action={handleSubmit}
      className="admin-product-form"
      onSubmit={() => {
        if (error) setError(null);
      }}
    >
      <div className="admin-form-grid">
        <label className="admin-field admin-field-wide">
          <span>Nombre</span>
          <input
            type="text"
            name="name"
            defaultValue={product?.name || ""}
            placeholder="Pantufla Ejemplo"
            required
          />
        </label>

        <label className="admin-field">
          <span>Precio ($)</span>
          <input
            type="number"
            name="price"
            step="0.01"
            min="0"
            defaultValue={product?.price ?? ""}
            placeholder="25000"
            required
          />
        </label>

        <label className="admin-field">
          <span>Categoría</span>
          <input
            type="text"
            name="category"
            defaultValue={product?.category || ""}
            placeholder="Pantuflas"
            required
          />
        </label>

        <label className="admin-field admin-field-wide">
          <span>Foto (URL)</span>
          <input
            type="text"
            name="photo"
            defaultValue={product?.photo || ""}
            placeholder="https://..."
            required
          />
        </label>

        <label className="admin-field admin-field-wide">
          <span>Código (SKU)</span>
          <input
            type="text"
            name="code"
            defaultValue={product?.code || ""}
            placeholder="SKU-..."
          />
        </label>

        <label className="admin-field admin-field-wide">
          <span>Descripción</span>
          <textarea
            name="description"
            defaultValue={product?.description || ""}
            placeholder="Descripción del producto"
            rows={3}
          />
        </label>

        <label className="admin-field">
          <span>Talles (separados por coma)</span>
          <input
            type="text"
            name="sizes"
            defaultValue={(product?.sizes || []).join(", ")}
            placeholder="21/22, 23/24, 25/26"
          />
        </label>

        <label className="admin-field">
          <span>Colores (separados por coma)</span>
          <input
            type="text"
            name="colors"
            defaultValue={(product?.colors || []).join(", ")}
            placeholder="Negro, Marrón, Beige"
          />
        </label>

        <label className="admin-field">
          <span>Opciones de taco (separadas por coma)</span>
          <input
            type="text"
            name="tacoOptions"
            defaultValue={(product?.tacoOptions || []).join(", ")}
            placeholder="Alto, Bajo"
          />
        </label>

        <label className="admin-field">
          <span>Fotos por color (JSON)</span>
          <textarea
            name="photos"
            defaultValue={photosJson}
            placeholder='{"Negro": ["https://..."]}'
            rows={4}
          />
        </label>

        <label className="admin-field admin-field-checkbox">
          <input
            type="checkbox"
            name="available"
            defaultChecked={product ? product.available : true}
          />
          <span>Disponible (hecho a pedido)</span>
        </label>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-form-actions">
        <button type="submit" className="admin-button primary" disabled={pending}>
          {pending ? "Guardando..." : submitLabel}
        </button>
        <button type="button" className="admin-button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
