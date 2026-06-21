import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";
import styles from "@/styles/Blog.module.scss";

export const metadata: Metadata = {
  title: "Blog - NYADY",
  description: "Blog de NYADY. Noticias, consejos y más."
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
          <p>
            Estamos felices de tenerte aquí. Conocé nuestra historia y lo que
            nos hace únicos.
          </p>
          <p>
            NYADY nace con la misión de ofrecer calzados artesanales de calidad
            excepcional, hechos a mano con los mejores materiales.
          </p>
        </article>

        <article className={styles.post}>
          <h2>Cuidados del Producto</h2>
          <p>Aprendé cómo cuidar tus productos para que duren más tiempo.</p>
          <ul>
            <li>Guardalos en un lugar seco</li>
            <li>Limpiá regularmente</li>
            <li>Evitá la exposición directa al sol</li>
          </ul>
        </article>

        <article className={styles.post}>
          <h2>Novedades</h2>
          <p>Estate al tanto de los nuevos productos y colecciones.</p>
        </article>

        <article className={styles.post}>
          <h2>Tips de Estilo</h2>
          <p>Consejos para combinar y usar tus productos NYADY.</p>
        </article>
      </div>

      <div className="highlight">
        <p>
          <strong>¿Querés escribir?</strong> Contactános si querés proponer
          contenido.
        </p>
      </div>
    </InfoPage>
  );
}
