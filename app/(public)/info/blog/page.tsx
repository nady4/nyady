import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import InfoPage from "@/components/InfoPage";
import styles from "@/styles/Blog.module.scss";

export const metadata: Metadata = {
  title: "Blog - NYADY",
  description: "Blog de NYADY. Noticias, consejos y más.",
};

export default function BlogPage() {
  return (
    <InfoPage
      title="Blog NYADY"
      description="Últimas noticias, consejos y tendencias."
    >
      <div className={styles.blogGrid}>
        <article className={styles.post}>
          <h2>Bienvenido a NYADY</h2>
          <p>Estamos felices de tenerte aquí. Conocí nuestra historia y lo que nos hace únicos.</p>
          <p>NYADY nace con la misión de ofrecer productos de calidad excepcional...</p>
          <Link href="/info/blog/bienvenida">Leer más →</Link>
        </article>

        <article className={styles.post}>
          <h2>Cuidados del Producto</h2>
          <p>Aprendé cómo cuidar tus productos para que duren más tiempo.</p>
          <ul>
            <li>Guardalos en lugar seco</li>
            <li>Limpiá regularmente</li>
            <li>Evitá la exposición directa al sol</li>
          </ul>
          <Link href="/info/blog/cuidados">Leer más →</Link>
        </article>

        <article className={styles.post}>
          <h2>Novedades</h2>
          <p>Estate al tanto de los nuevos productos y colecciones.</p>
          <Link href="/info/blog/novedades">Ver más →</Link>
        </article>

        <article className={styles.post}>
          <h2>Tips de Estilo</h2>
          <p>Consejos para combinar y usar tus productos NYADY.</p>
          <Link href="/info/blog/tips">Leer más →</Link>
        </article>
      </div>

      <div className="highlight">
        <p><strong>¿Querés escribir?</strong> Contactános si querés proponer contenido.</p>
      </div>
    </InfoPage>
  );
}