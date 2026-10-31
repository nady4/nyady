import Link from "next/link";
import prisma from "@/lib/prisma";
import PostsAdmin from "@/components/admin/marketing/PostsAdmin";
import TemplatesAdmin from "@/components/admin/marketing/TemplatesAdmin";
import AssetsAdmin from "@/components/admin/marketing/AssetsAdmin";
import MarketingSettingsCard from "@/components/admin/marketing/MarketingSettingsCard";
import SocialConnectionsCard from "@/components/admin/marketing/SocialConnectionsCard";
import TopPostsCard from "@/components/admin/marketing/TopPostsCard";
import PublishModeCard from "@/components/admin/marketing/PublishModeCard";
import BulkComposer, {
  type BulkProductOption,
} from "@/components/admin/marketing/BulkComposer";
import MarketingStatsCard from "@/components/admin/marketing/MarketingStatsCard";
import WhatsAppCampaignsCard, {
  type WaCampaignRow,
  type WaPostOption,
} from "@/components/admin/marketing/WhatsAppCampaignsCard";
import { loadAssetRows, loadBulkProducts } from "@/lib/marketing/page-data";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/format";
import { loadMarketingStats } from "@/lib/marketing/insights";
import { loadWaRecipients } from "@/lib/marketing/whatsapp";
import { isMetaConfigured } from "@/lib/marketing/meta";
import { metaAccountStatus } from "@/lib/marketing/publisher";
import { getSiteUrl } from "@/lib/site-url";
import type { Prisma } from "@prisma/client";
import type {
  MarketingPostRow,
  PublishPendingTarget,
} from "@/types/admin";

export const metadata = {
  title: "Marketing",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

interface PostFilters {
  q: string;
  channel: string;
  status: string;
  published: string;
}

type PostWithProduct = Prisma.SocialPostGetPayload<{
  include: { product: { select: { name: true; slug: true } } };
}>;
type WaOptionRow = {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  product: { slug: string } | null;
};

function buildPostWhere(filters: PostFilters): Prisma.SocialPostWhereInput {
  const where: Prisma.SocialPostWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.channel) where.channels = { has: filters.channel };
  if (filters.published === "pending") where.publishedAt = null;
  if (filters.published === "published") where.publishedAt = { not: null };
  const q = filters.q.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
      { campaign: { contains: q, mode: "insensitive" } },
      { product: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

function oauthBanner(
  meta: string,
  message: string
): { ok: "ok" | "error" | "warn"; text: string } | null {
  if (meta === "connected") {
    return { ok: "ok", text: "Cuentas de Meta conectadas correctamente." };
  }
  if (meta === "connected_no_ig") {
    return {
      ok: "warn",
      text: "Página de Facebook conectada, pero no encontró tu cuenta de Instagram vinculada. Revisá que la IG profesional esté conectada a la Página y reconectá.",
    };
  }
  if (meta === "noconfig") {
    return {
      ok: "warn",
      text: "Meta no está configurado: faltan META_APP_ID y META_APP_SECRET en el entorno.",
    };
  }
  if (meta === "error" && message) {
    return { ok: "error", text: `Error conectando: ${message}` };
  }
  return null;
}

export default async function AdminMarketingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const metaState = oauthBanner(first(params.meta), first(params.mkt_msg));

  // Posts pagination filters (URL is the source of truth).
  const filters = {
    q: first(params.q).trim(),
    channel: ["facebook", "instagram", "whatsapp"].includes(first(params.channel))
      ? first(params.channel)
      : "",
    status: ["draft", "ready"].includes(first(params.status))
      ? first(params.status)
      : "",
    published: ["pending", "published"].includes(first(params.published))
      ? first(params.published)
      : "",
  };
  const perPage = 5;
  const page = Math.max(1, Number(first(params.page)) || 1);
  // Defensive load: a failure in any loader must never 500 the whole page or
  // blank the admin shell — degrade to empty sections instead.
  const [postResults, templates, assets, settings, metaStatus, stats, waCampaigns, waSends, recipients, bulkProductsRaw] =
    await Promise.all([
      (async (): Promise<
        [PostWithProduct[], number, PublishPendingTarget[], WaOptionRow[]]
      > => {
        try {
          const result = await Promise.all([
          prisma.socialPost.findMany({
            where: buildPostWhere(filters),
            orderBy:
              filters.published === "published"
                ? [{ publishedAt: "desc" }, { updatedAt: "desc" }]
                : [{ updatedAt: "desc" }],
            skip: (page - 1) * perPage,
            take: perPage,
            include: { product: { select: { name: true, slug: true } } },
          }),
          prisma.socialPost.count({ where: buildPostWhere(filters) }),
          prisma.socialPost.findMany({
            // Pending = any requested Meta channel without a published id
            // (covers never-published AND partial publishes like FB ok/IG err).
            where: {
              OR: [
                { channels: { has: "facebook" }, fbPostId: null },
                { channels: { has: "instagram" }, igMediaId: null },
              ],
            },
            orderBy: { updatedAt: "desc" },
            select: { id: true, title: true },
          }),
          prisma.socialPost.findMany({
            orderBy: { updatedAt: "desc" },
            take: 60,
            select: {
              id: true,
              title: true,
              body: true,
              hashtags: true,
              product: { select: { slug: true } },
            },
          }),
          ]) as unknown as [
            PostWithProduct[],
            number,
            PublishPendingTarget[],
            WaOptionRow[],
          ];
          return result;
        } catch (error) {
          console.error("[admin/marketing] posts load failed:", error);
          return [[], 0, [], []];
        }
      })(),
      prisma.copyTemplate.findMany({ orderBy: { name: "asc" } }).catch(() => []),
      loadAssetRows().catch(() => []),
      prisma.marketingSettings
        .findUnique({ where: { id: "default" } })
        .catch(() => null),
      metaAccountStatus().catch(() => ({
        facebook: false,
        instagram: false,
        pageName: null,
        igUsername: null,
      })),
      loadMarketingStats().catch((error) => {
        console.error("[admin/marketing] stats load failed:", error);
        return {
          lastSyncAtText: null,
          followers: { facebook: null, instagram: null },
          posts: [],
          topPosts: [],
          bottomPosts: [],
          totals: {
            likes: 0,
            comments: 0,
            shares: 0,
            saves: 0,
            impressions: 0,
            reach: 0,
            clicks: 0,
          },
        };
      }),
      prisma.whatsAppCampaign
        .findMany({
          orderBy: { updatedAt: "desc" },
          include: { _count: { select: { sends: true } } },
        })
        .catch(() => []),
      prisma.whatsAppCampaignSend
        .findMany({ select: { campaignId: true, phone: true } })
        .catch(() => []),
      loadWaRecipients(null).catch(() => []),
      loadBulkProducts().catch(() => []),
    ]);

  const [postsRaw, postsTotal, pendingTargetsRaw, waOptionRows] = postResults;

  const postRows: MarketingPostRow[] = postsRaw.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    hashtags: post.hashtags,
    channels: post.channels,
    media: post.media,
    productId: post.productId,
    productName: post.product?.name ?? null,
    productSlug: post.product?.slug ?? null,
    campaign: post.campaign,
    status: post.status,
    scheduledAtText: post.scheduledAt ? formatAdminDateTime(post.scheduledAt) : "",
    dateText: formatAdminDate(post.createdAt),
    published: post.publishedAt != null,
    fbPostId: post.fbPostId,
    fbPermalink: post.fbPermalink,
    igMediaId: post.igMediaId,
    igPermalink: post.igPermalink,
    publishedText: post.publishedAt ? formatAdminDate(post.publishedAt) : null,
    lastError: post.lastError,
  }));

  const templateRows = templates.map((t) => ({
    id: t.id,
    name: t.name,
    body: t.body,
    hashtags: t.hashtags,
    updatedAtText: formatAdminDate(t.updatedAt),
  }));

  const waCampaignRows: WaCampaignRow[] = waCampaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    bodyText: campaign.bodyText,
    updatedAtText: formatAdminDate(campaign.updatedAt),
    sends: campaign._count.sends,
  }));
  const sentMap: Record<string, string[]> = {};
  for (const send of waSends) {
    (sentMap[send.campaignId] ??= []).push(send.phone);
  }
  const waPostOptions: WaPostOption[] = waOptionRows.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    hashtags: post.hashtags,
    productSlug: post.product?.slug ?? null,
  }));

  const pendingTargets: PublishPendingTarget[] = pendingTargetsRaw;

  const bulkProducts: BulkProductOption[] = bulkProductsRaw.map((option) => ({
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


  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Marketing</h1>
        <div className="admin-mkt-nav">
          <Link href="/admin/marketing/calendario" className="admin-button">
            Planificador
          </Link>
          <Link href="/admin/marketing/embudo" className="admin-button">
            Embudo
          </Link>
          <Link href="/admin/marketing/referidos" className="admin-button">
            Referidos
          </Link>
          <Link href="/admin/marketing/nuevo" className="admin-button primary">
            + Nuevo post
          </Link>
        </div>
      </div>

      {metaState && (
        <div className={`admin-mkt-oauth-banner ${metaState.ok}`} role="status">
          {metaState.text}
        </div>
      )}

      <section className="admin-content-section">
        <PublishModeCard autoPublish={settings?.autoPublish === true} />
      </section>

      <section className="admin-content-section">
        <h2 className="admin-content-section-title">Estadísticas</h2>
        <MarketingStatsCard stats={stats} />
      </section>

      <section className="admin-content-section">
        <h2 className="admin-content-section-title">Qué funciona</h2>
        <TopPostsCard
          topPosts={stats.topPosts}
          bottomPosts={stats.bottomPosts}
        />
      </section>

      <section className="admin-content-section">
        <h2 className="admin-content-section-title">Posteos</h2>
        <p className="admin-field-hint">
          Biblioteca de contenido para redes (Facebook, Instagram y WhatsApp).
          “Publicar” publica al instante; “Publicar pendientes” hace la corrida en
          secuencia con todo lo no publicado.
        </p>
        <PostsAdmin
          posts={postRows}
          filters={filters}
          page={page}
          perPage={perPage}
          total={postsTotal}
          pendingTargets={pendingTargets}
        />

        <h3 className="admin-mkt-subtitle">Crear en masa</h3>
        <p className="admin-field-hint">
          Un borrador por producto con todas sus fotos, descripción con data real y
          ¡opción de IA! Después usá “Publicar pendientes” de arriba (o{' '}
          <Link href="/admin/marketing/masa">pantalla completa en /admin/marketing/masa</Link>).
        </p>
        <BulkComposer
          products={bulkProducts}
          templates={templateRows.map((t) => ({ id: t.id, name: t.name, body: t.body }))}
          siteUrl={getSiteUrl()}
        />
      </section>

      <section className="admin-content-section">
        <h2 className="admin-content-section-title">WhatsApp (difusión manual)</h2>
        <WhatsAppCampaignsCard
          campaigns={waCampaignRows}
          recipients={recipients}
          sentMap={sentMap}
          posts={waPostOptions}
          siteUrl={getSiteUrl()}
        />
      </section>

      <section className="admin-content-section">
        <h2 className="admin-content-section-title">Plantillas de copy</h2>
        <TemplatesAdmin templates={templateRows} />
      </section>

      <section className="admin-content-section">
        <h2 className="admin-content-section-title">Biblioteca de imágenes</h2>
        <AssetsAdmin assets={assets} />
      </section>

      <section className="admin-content-section">
        <h2 className="admin-content-section-title">Voz & preferencias</h2>
        <MarketingSettingsCard
          settings={{
            brandVoice: settings?.brandVoice ?? null,
            defaultHashtags: settings?.defaultHashtags ?? [],
            instagramHandle: settings?.instagramHandle ?? null,
            whatsappPhone: settings?.whatsappPhone ?? null,
          }}
        />
      </section>
      <section className="admin-content-section">
        <h2 className="admin-content-section-title">Conexión con Meta</h2>
        <SocialConnectionsCard
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
      </section>

    </main>
  );
}
