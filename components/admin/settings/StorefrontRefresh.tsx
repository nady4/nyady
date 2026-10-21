"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revalidateStorefrontAction } from "@/actions/admin/content";

export default function StorefrontRefresh() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      await revalidateStorefrontAction();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-storefront-refresh">
      <button
        type="button"
        className="admin-button"
        onClick={() => void refresh()}
        disabled={busy}
      >
        {busy ? "Revalidando..." : "Revalidar tienda (/ y /catalog)"}
      </button>
      <p className="admin-field-hint">
        Limpia la caché de la portada y el catálogo si hiciste cambios
        directos en la base.
      </p>
    </div>
  );
}
