import Link from "next/link";
import prisma from "@/lib/prisma";
import PostsAdmin from "@/components/admin/marketing/PostsAdmin";
import TemplatesAdmin from "@/components/admin/marketing/TemplatesAdmin";
import AssetsAdmin from "@/components/admin/marketing/AssetsAdmin";
import MarketingSettingsCard from "@/components/admin/marketing/MarketingSettingsCard";
import SocialConnectionsCard from "@/components/admin/marketing/SocialConnectionsCard";
import MarketingStatsCard from "@/components/admin/marketing/MarketingStatsCard";
import WhatsAppCampaignsCard, {
  type WaCampaignRow,
  type WaPostOption,
} from "@/components/admin/marketing/WhatsAppCampaignsCard";
import { loadAssetRows } from "@/lib/marketing/page-data";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/format";
import { loadMarketingStats } from "@/lib/marketing/insights";
import { loadWaRecipients } from "@/lib/marketing/whatsapp";
import { isMetaConfigured } from "@/lib/marketing/meta";
import { metaAccountStatus } from "@/lib/marketing/publisher";
import { getSiteUrl } from "@/lib/site-url";
import type { MarketingPostRow } from "@/types/admin";

export const metadata = {
  title: "Marketing",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
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

  // Defensive load: a failure in any loader must never 500 the whole page or
  // blank the admin shell — degrade to empty sections instead.
  const [posts, templates, assets, settings, metaStatus, stats, waCampaigns, waSends, recipients] =
    await Promise.all([
      prisma.socialPost
        .findMany({
          orderBy: { updatedAt: "desc" },
          include: { product: { select: { name: true, slug: true } } },
        })
        .catch(() => []),
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
    ]);

  const postRows: MarketingPostRow[] = posts.map((post) => ({
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
  const waPostOptions: WaPostOption[] = postRows.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    hashtags: post.hashtags,
    productSlug: post.productSlug,
  }));

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Marketing</h1>
        <Link href="/admin/marketing/nuevo" className="admin-button primary">
          + Nuevo post
        </Link>
      </div>

      {metaState && (
        <div className={`admin-mkt-oauth-banner ${metaState.ok}`} role="status">
          {metaState.text}
        </div>
      )}

      <section className="admin-content-section">
        <h2 className="admin-content-section-title">Estadísticas</h2>
        <MarketingStatsCard stats={stats} />
      </section>

      <section className="admin-content-section">
        <h2 className="admin-content-section-title">Posteos</h2>
        <p className="admin-field-hint">
          Biblioteca de contenido para redes (Facebook, Instagram y WhatsApp). Los posts
          “listos” se publican a Meta con el botón {`"`}Publicar ahora{`"`} o entrando en la cola
          programada.
        </p>
        <PostsAdmin posts={postRows} />
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
