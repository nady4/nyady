-- Adds a unique, SEO-friendly slug to Product (e.g. "abril-negro") and
-- backfills it from the existing name for every current row.

ALTER TABLE "Product" ADD COLUMN "slug" TEXT;

-- Slugify: strip accents (á→a, ñ→n, ü→u, ...), lowercase, replace every
-- non-alphanumeric run with a dash and trim leading/trailing dashes.
UPDATE "Product"
SET "slug" = lower(
    regexp_replace(
      regexp_replace(
        translate(
          "name",
          'áéíóúüñÁÉÍÓÚÜÑ',
          'aeiouunaeiouun'
        ),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      ),
      '^-+|-+$',
      ''
    )
  )
WHERE "slug" IS NULL;

-- Names made purely of symbols end up with an empty slug: fall back to a
-- short id-derived value so the unique index stays satisfiable.
UPDATE "Product"
SET "slug" = 'sandalia-' || lower(right("id", 6))
WHERE "slug" IS NULL OR "slug" = '';

-- Disambiguate duplicated names ("Abril" appearing twice gets /abril then
-- /abril-2) keeping the oldest creation order on the short URL.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt" ASC) AS rn
  FROM "Product"
)
UPDATE "Product" p
SET "slug" = p."slug" || '-' || r.rn
FROM ranked r
WHERE p."id" = r."id" AND r.rn > 1;

ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
