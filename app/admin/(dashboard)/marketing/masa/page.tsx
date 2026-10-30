import prisma from "@/lib/prisma";
import { toMarketingProductOption } from "@/lib/marketing/product-option";
import { getSiteUrl } from "@/lib/site-url";
import BulkComposer, {
  type BulkProductOption,
} from "@/components/admin/marketing/BulkComposer";

export const metadata = {
  title: "Crear en masa · Marketing",
};

export default async function BulkCreatePage() {
  const [productRows, templates] = await Promise.all([
    prisma.product.findMany({
      where: { archivedAt: null },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: 400,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        photo: true,
        photos: true,
        category: true,
        colors: true,
        sizes: true,
        description: true,
      },
    }),
    prisma.copyTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  const products: BulkProductOption[] = productRows.map((row) => {
    const option = toMarketingProductOption(row);
    return {
      id: option.id,
      name: option.name,
      price: option.price,
      category: option.category,
      photo: option.photo,
      photoUrls: option.photoUrls,
      colors: option.colors,
      sizes: option.sizes,
      slug: option.slug,
    };
  });

  const templateOptions = templates.map((t) => ({
    id: t.id,
    name: t.name,
    body: t.body,
  }));

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Crear en masa</h1>
      </div>
      <BulkComposer
        products={products}
        templates={templateOptions}
        siteUrl={getSiteUrl()}
      />
    </main>
  );
}
