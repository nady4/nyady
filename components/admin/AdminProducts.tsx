"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ProductType } from "@/types";
import ProductForm from "@/components/admin/ProductForm";
import {
  createProductAction,
  updateProductAction,
  toggleAvailabilityAction,
  deleteProductAction,
} from "@/actions/admin";

export default function AdminProducts({
  products,
}: {
  products: ProductType[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ProductType | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    router.refresh();
  };

  const handleCreate = async (formData: FormData) => {
    const result = await createProductAction(formData);
    if (!result.ok) throw new Error(result.error || "Error al crear");
    setAdding(false);
    refresh();
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editing) return;
    const result = await updateProductAction(editing.id, formData);
    if (!result.ok) throw new Error(result.error || "Error al actualizar");
    setEditing(null);
    refresh();
  };

  const handleToggle = (productId: string) => {
    startTransition(async () => {
      await toggleAvailabilityAction(productId);
      refresh();
    });
  };

  const handleDelete = (product: ProductType) => {
    if (
      !window.confirm(
        `¿Eliminar "${product.name}"? Se quitará de carritos, favoritos y pedidos asociados.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteProductAction(product.id);
      refresh();
    });
  };

  return (
    <div className="admin-products">
      {!adding && !editing && (
        <button
          type="button"
          className="admin-button primary admin-add-button"
          onClick={() => setAdding(true)}
        >
          + Agregar producto
        </button>
      )}

      {(adding || editing) && (
        <ProductForm
          product={editing || undefined}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSubmit={editing ? handleUpdate : handleCreate}
          submitLabel={editing ? "Guardar cambios" : "Crear producto"}
        />
      )}

      <div className="admin-product-grid">
        {products.map((product) => (
          <div
            key={product.id}
            className={`admin-product-card ${
              product.available ? "" : "unavailable"
            }`}
          >
            <div className="admin-product-photo">
              {product.photo ? (
                <Image
                  src={product.photo}
                  alt={product.name}
                  width={120}
                  height={120}
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              ) : (
                <span className="admin-product-no-photo">Sin foto</span>
              )}
            </div>

            <div className="admin-product-info">
              <h3 className="admin-product-name">{product.name}</h3>
              <span className="admin-product-category">
                {product.category}
                {product.code ? ` · ${product.code}` : ""}
              </span>
              <span className="admin-product-price">
                ${product.price.toLocaleString("es-AR")}
              </span>
              <span className="admin-product-made-on-demand">
                Hecho a pedido
              </span>
            </div>

            <div className="admin-product-status">
              <span
                className={`admin-status-badge ${
                  product.available ? "available" : "unavailable"
                }`}
              >
                {product.available ? "Disponible" : "No disponible"}
              </span>
              <button
                type="button"
                className="admin-button small"
                onClick={() => handleToggle(product.id)}
                disabled={isPending}
              >
                {product.available ? "Desactivar" : "Activar"}
              </button>
            </div>

            <div className="admin-product-actions">
              <button
                type="button"
                className="admin-button"
                onClick={() => setEditing(product)}
              >
                Editar
              </button>
              <button
                type="button"
                className="admin-button danger"
                onClick={() => handleDelete(product)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <p className="admin-empty">No hay productos todavía</p>
        )}
      </div>
    </div>
  );
}
