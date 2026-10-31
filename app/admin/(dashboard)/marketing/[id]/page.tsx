import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import PostComposer from "@/components/admin/marketing/PostComposer";
import type { ComposerInitial } from "@/components/admin/marketing/PostComposer";
import { loadComposerData } from "@/lib/marketing/page-data";
import { isMetaConfigured } from "@/lib/marketing/meta";
import { metaAccountStatus } from "@/lib/marketing/publisher";
import { getSiteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Editar post · Marketing",
};

export default async function EditMarketingPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, data, metaStatus] = await Promise.all([
    prisma.socialPost.findUnique({
      where: { id },
      include: { product: { select: { name: true, slug: true } } },
    }),
    loadComposerData(),
    metaAccountStatus(),
  ]);

  if (!post) notFound();

  const initial: ComposerInitial = {
    id: post.id,
    title: post.title,
    body: post.body,
    hashtags: post.hashtags,
    channels: post.channels,
    media: post.media,
    mediaType: post.mediaType === "video" ? "video" : "image",
    productId: post.productId,
    campaign: post.campaign ?? "",
    scheduledAt: post.scheduledAt
      ? toDatetimeLocal(post.scheduledAt)
      : "",
    status: post.status === "ready" ? "ready" : "draft",
  };

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Editar post</h1>
      </div>
      <PostComposer
        initial={initial}
        products={data.products}
        templates={data.templates}
        assets={data.assets}
        campaigns={
          post.campaign && !data.campaigns.includes(post.campaign)
            ? [post.campaign, ...data.campaigns]
            : data.campaigns
        }
        settings={data.settings}
        siteUrl={getSiteUrl()}
        connection={{
          configured: isMetaConfigured(),
          facebook: {
            connected: metaStatus.facebook,
            pageName: metaStatus.pageName,
          },
          instagram: {
            connected: metaStatus.instagram,
            username: metaStatus.igUsername,
          },
        }}
      />
    </main>
  );
}

/** datetime-local wants "YYYY-MM-DDTHH:mm" in the browser's local time. */
function toDatetimeLocal(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
