import { Metadata } from "next";
import { fraunces } from "@/app/fonts";
import styles from "@/styles/InfoPage.module.scss";

interface InfoPageProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "NYADY - Información",
  description: "Página de información de NYADY"
};

export default function InfoPage({
  title,
  description,
  children
}: InfoPageProps) {
  return (
    <main className={`${fraunces.className} ${styles.infoContainer}`}>
      <section className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.body}>{children}</div>
      </section>
    </main>
  );
}
