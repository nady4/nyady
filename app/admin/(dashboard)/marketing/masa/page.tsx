import prisma from "@/lib/prisma";
import { toMarketingProductOption } from "@/lib/marketing/product-option";
import { getSiteUrl } from "@/lib/site-url";
import { loadBulkProducts } from "@/lib/marketing/page-data";
import BulkComposer, {
  type BulkProductOption,
} from "@/components/admin/marketing/BulkComposer";

export const metadata = {
  title: "Crear en masa · Marketing",
};

export default async function BulkCreatePage() {
  const [products, templates] = await Promise.all([
    loadBulkProducts(),
    prisma.copyTemplate.findMany({ orderBy: { name: "asc" } }),
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
    </main>
  );
}
