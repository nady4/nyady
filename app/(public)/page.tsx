import Link from "next/link";
import Image from "next/image";
import styles from "@/styles/Landing.module.scss";

export default function LandingPage() {
  return (
    <main className={styles.landing}>
      <section className={styles.hero}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            Comodidad para tus pies, estilo para tu vida
          </h1>
          <p className={styles.subtitle}>
            Encontrá el calzado perfecto que combina comodidad, diseño y
            calidad.
          </p>
          <Link href="/catalog" className={styles.cta}>
            Ver Catálogo
          </Link>
        </div>
        <div className={styles.imageContainer}>
          <Image
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80"
            alt="Calzado moderno"
            fill
            className={styles.image}
          />
        </div>
      </section>
    </main>
  );
}
