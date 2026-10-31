import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { loadBulkProducts } from "@/lib/marketing/page-data";
import { isMetaConfigured } from "@/lib/marketing/meta";
import BulkComposer, {
  type BulkProductOption,
} from "@/components/admin/marketing/BulkComposer";
import PublishBulkCard, {
  type BulkPublishGroup,
} from "@/components/admin/marketing/PublishBulkCard";

export const metadata = {
  title: "Crear en masa · Marketing",
};

export default async function BulkCreatePage() {
  const [products, templates, posts] = await Promise.all([
    loadBulkProducts(),
    prisma.copyTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.socialPost.findMany({
      // Include partial publishes too (a channel may still be pending).
      select: {
        id: true,
        title: true,
        campaign: true,
        status: true,
        channels: true,
        publishedAt: true,
        fbPostId: true,
        igMediaId: true,
      },
    }),
  ]);

  const productOptions: BulkProductOption[] = products.map((option) => ({
    id: option.id,
    name: option.name,
    price: option.price,
    category: option.category,
    photo: option.photo,
    photoUrls: option.photoUrls,
    colors: option.colors,
    sizes: option.sizes,
    slug: option.slug,
  }));

  // Same grouping the embedded panel uses: unpublished Meta posts by campaign.
  const bulkGroups: BulkPublishGroup[] = [];
  for (const post of posts) {
    if (!post.channels.some((channel) => channel === "facebook" || channel === "instagram"))
      continue;
    if (post.status !== "draft" && post.status !== "ready") continue;
    const fbPending = post.channels.includes("facebook") && !post.fbPostId;
    const igPending = post.channels.includes("instagram") && !post.igMediaId;
    if (!fbPending && !igPending) continue;
    const key = post.campaign || "";
    let group = bulkGroups.find((g) => g.campaign === key);
    if (!group) {
      group = { campaign: key, ready: [], drafts: [] };
      bulkGroups.push(group);
    }
    const item = { id: post.id, title: post.title };
    if (post.status === "ready") group.ready.push(item);
    else group.drafts.push(item);
  }
  bulkGroups.sort(
    (a, b) => b.ready.length + b.drafts.length - (a.ready.length + a.drafts.length)
  );

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Crear en masa</h1>
      </div>
      <BulkComposer
        products={productOptions}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          body: t.body,
        }))}
        siteUrl={getSiteUrl()}
      />

      <section className="admin-content-section" style={{ marginTop: "1.5rem" }}>
        <h2 className="admin-content-section-title">Publicar en masa</h2>
        <p className="admin-field-hint">
          Después de crear los borradores, el nuevo campaign queda seleccionado acá:
          tocá “Publicar” y salen en sequence (4s entre cada una).
        </p>
        <PublishBulkCard groups={bulkGroups} metaReady={isMetaConfigured()} />
      </section>
    </main>
  );
}
