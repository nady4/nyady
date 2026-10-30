import PostComposer from "@/components/admin/marketing/PostComposer";
import type { ComposerInitial } from "@/components/admin/marketing/PostComposer";
import { loadComposerData } from "@/lib/marketing/page-data";
import { isMetaConfigured } from "@/lib/marketing/meta";
import { metaAccountStatus } from "@/lib/marketing/publisher";
import { getSiteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Nuevo post · Marketing",
};

const EMPTY_INITIAL: ComposerInitial = {
  id: null,
  title: "",
  body: "",
  hashtags: [],
  channels: [],
  media: [],
  productId: null,
  campaign: "",
  scheduledAt: "",
  status: "draft",
};

export default async function NewMarketingPostPage() {
  const [data, metaStatus] = await Promise.all([
    loadComposerData(),
    metaAccountStatus(),
  ]);

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Nuevo post</h1>
      </div>
      <PostComposer
        initial={{ ...EMPTY_INITIAL }}
        products={data.products}
        templates={data.templates}
        assets={data.assets}
        campaigns={data.campaigns}
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
