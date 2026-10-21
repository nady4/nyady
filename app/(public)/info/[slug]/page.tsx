import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import InfoPage from "@/components/InfoPage";
import styles from "@/styles/InfoPage.module.scss";
import { renderMarkdown } from "@/lib/markdown";
import { getInfoFallback } from "@/components/info/InfoFallbacks";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await prisma.infoPage.findUnique({ where: { slug } });
  const fallback = getInfoFallback(slug)?.fallback;

  const title = row?.title ?? fallback?.title ?? "Información";
  const description = row?.description ?? fallback?.description ?? "";

  return {
    title: row ? `${title} - NYADY` : fallback ? title : "Página no encontrada - NYADY",
    description:
      description ||
      "Información y preguntas frecuentes sobre NYADY, sandalias artesanales.",
  };
}

/**
 * Admin-editable info pages: the DB row (edited from /admin/contenido) wins;
 * deleting the row restores the original hardcoded copy via the fallback
 * map. Slugs outside the editable list 404 (their static pages still exist).
 */
export default async function DynamicInfoPage({ params }: Props) {
  const { slug } = await params;
  const info = getInfoFallback(slug);
  if (!info) notFound();

  const row = await prisma.infoPage.findUnique({ where: { slug } });

  const title = row?.title ?? info.fallback.title;
  const description = row?.description ?? info.fallback.description;
  const content = row?.content ?? info.fallback.content;

  return (
    <InfoPage title={title} description={description}>
      {renderMarkdown(content)}
      {row ? (
        /* Last-touched hint only for DB-managed pages, subtle. */
        <p className={styles.updatedHint}>
          Editado desde el panel
        </p>
      ) : null}
    </InfoPage>
  );
}
