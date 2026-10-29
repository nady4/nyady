"use client";

import "@/styles/NotFound.scss";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="not-found-page">
      <h1>Ups, algo falló</h1>
      <p>
        Ocurrió un error inesperado. Podés reintentar o volver a la tienda
        más tarde.
      </p>
      <div className="not-found-actions">
        <button type="button" className="nf-cta" onClick={reset}>
          Reintentar
        </button>
      </div>
      {error.digest && (
        <p className="nf-digest">Código de error: {error.digest}</p>
      )}
    </div>
  );
}
