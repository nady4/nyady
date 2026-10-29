import Link from "next/link";
import { fraunces } from "./fonts";
import "@/styles/NotFound.scss";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <h1 className={fraunces.className}>Esta página no existe</h1>
      <p>
        El producto que buscás puede haberse agotado o la dirección cambió.
        Mirá el catálogo: seguro encontrás un par que te va a gustar.
      </p>
      <div className="not-found-actions">
        <Link href="/catalog" className="nf-cta">
          Ver catálogo
        </Link>
        <Link href="/" className="nf-link">
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
