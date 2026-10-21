"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TagInput from "@/components/admin/ui/TagInput";
import ImageManager from "@/components/admin/ui/ImageManager";
import { createProductAction, updateProductAction } from "@/actions/admin/products";
import type { AdminActionResult, ProductInput } from "@/types/admin";
import type { ProductType } from "@/types";

function sanitizePhotos(value: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, list] of Object.entries(value as Record<string, unknown>)) {
      if (Array.isArray(list)) {
        const urls = list.filter((u): u is string => typeof u === "string" && u.trim() !== "");
        if (key.trim() && urls.length > 0) result[key.trim()] = urls;
      }
    }
  }
  return result;
}

interface ProductFormAdminProps {
  product?: ProductType;
  categories: string[];
}

export default function ProductFormAdmin({
  product,
  categories,
}: ProductFormAdminProps) {
  const router = useRouter();

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [code, setCode] = useState(product?.code ?? "");
  const [purchaseName, setPurchaseName] = useState(product?.purchaseName ?? "");
  const [available, setAvailable] = useState<boolean>(product?.available ?? true);
  const [sizes, setSizes] = useState<string[]>(product?.sizes ?? []);
  const [colors, setColors] = useState<string[]>(product?.colors ?? []);
  const [tacoOptions, setTacoOptions] = useState<string[]>(
    product?.tacoOptions ?? []
  );
  const [photos, setPhotos] = useState<Record<string, string[]>>(() => {
    const initial = sanitizePhotos(product?.photos);
    // Products created before the manager only had the cover URL: show it as
    // the single image of the first bucket instead of an empty grid.
    if (product?.photo && Object.keys(initial).length === 0) {
      initial[(product.colors?.[0] ?? "General").trim() || "General"] = [
        product.photo,
      ];
    }
    return initial;
  });
  const [cover, setCover] = useState(
    typeof product?.photo === "string" ? product.photo : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const effectiveCover = useMemo(() => {
    if (cover) return cover;
    // Auto-adopt the first uploaded image so "Hacer portada" errors can't
    // block saving a product that already has images.
    return Object.values(photos).flat()[0] ?? "";
  }, [cover, photos]);

  const buildPayload = (): ProductInput => ({
    name,
    description: description.trim() || null,
    price: Number(price.replace(",", ".")),
    category,
    code: code.trim() || null,
    purchaseName: purchaseName.trim() || null,
    available,
    sizes,
    colors,
    tacoOptions,
    photo: effectiveCover,
    photos,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Ingresá el nombre del producto");
      return;
    }
    if (!effectiveCover) {
      setError("Subí al menos una imagen y elegí una portada");
      return;
    }

    setPending(true);
    try {
      let result: AdminActionResult;
      if (product?.id) {
        result = await updateProductAction(product.id, buildPayload());
      } else {
        result = await createProductAction(buildPayload());
      }

      if (!result.ok) {
        setError(result.error ?? "No se pudo guardar");
        setPending(false);
        return;
      }

      router.push("/admin/productos");
      router.refresh();
    } catch {
      setError("Error al guardar. Reintentá en un momento.");
      setPending(false);
    }
  };

  return (
    <form className="admin-product-form" onSubmit={handleSubmit}>
      <div className="admin-form-section">
        <h2 className="admin-form-section-title">Datos del producto</h2>
        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            <span>Nombre</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pantufla Ejemplo"
              maxLength={120}
              required
            />
          </label>

          <label className="admin-field">
            <span>Precio ($)</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.01"
              min="0"
              placeholder="25000"
              required
            />
          </label>

          <label className="admin-field">
            <span>Categoría</span>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="admin-product-categories"
              placeholder="Pantuflas"
              required
            />
            <datalist id="admin-product-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <label className="admin-field">
            <span>Código (SKU)</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SKU-..."
            />
          </label>

          <label className="admin-field admin-field-wide">
            <span>Nombre interno (admin, no visible al cliente)</span>
            <input
              type="text"
              value={purchaseName}
              onChange={(e) => setPurchaseName(e.target.value)}
              placeholder="Nombre de compra / interno"
            />
          </label>

          <label className="admin-field admin-field-wide">
            <span>Descripción</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del producto"
              rows={3}
            />
          </label>

          <TagInput
            label="Talles (Enter para agregar)"
            values={sizes}
            onChange={setSizes}
            placeholder="21/22"
          />

          <TagInput
            label="Colores (Enter para agregar — definen las fotos por color)"
            values={colors}
            onChange={setColors}
            placeholder="Negro"
            datalistId="admin-product-color-names"
          />
          <datalist id="admin-product-color-names">
            {["Negro", "Marrón", "Gris", "Beige", "Bordó", "Camel", "Nevado", "Fucsia", "Rosa claro", "Violeta", "Nude", "Blanco", "Plata", "Caspeado", "Animal Print"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <TagInput
            label="Opciones de taco (Enter para agregar)"
            values={tacoOptions}
            onChange={setTacoOptions}
            placeholder="Alto"
          />

          <label className="admin-field admin-field-checkbox">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            <span>Disponible (visible en la tienda)</span>
          </label>
        </div>
      </div>

      <div className="admin-form-section">
        <h2 className="admin-form-section-title">Imágenes</h2>
        <ImageManager
          colors={colors}
          photos={photos}
          cover={cover}
          onPhotosChange={setPhotos}
          onCoverChange={setCover}
        />
        {colors.length === 0 && (
          <p className="admin-field-hint">
            Sin colores definidos las fotos van al grupo «General». Agregá
            colores para ordenarlas por variante.
          </p>
        )}
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-form-actions">
        <button type="submit" className="admin-button primary" disabled={pending}>
          {pending
            ? "Guardando..."
            : product?.id
              ? "Guardar cambios"
              : "Crear producto"}
        </button>
        <button type="button" className="admin-button" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
