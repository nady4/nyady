/*
  Warnings:

  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'web';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "productName" TEXT,
ADD COLUMN     "productPhoto" TEXT,
ADD COLUMN     "selectedSize" TEXT,
ADD COLUMN     "selectedTacoOption" TEXT,
ADD COLUMN     "unitPrice" DOUBLE PRECISION;

-- Backfill OrderItem snapshots from the current product data, so order
-- history keeps the price/name/photo the item was bought at even after the
-- product is later edited or the columns are consumed by new code.
UPDATE "OrderItem" AS oi
SET "unitPrice" = p.price,
    "productName" = p.name,
    "productPhoto" = p.photo
FROM "Product" AS p
WHERE oi."productId" = p.id;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "href" TEXT,
    "placement" TEXT NOT NULL DEFAULT 'home_promo',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "storeName" TEXT NOT NULL DEFAULT 'NYADY',
    "contactEmail" TEXT,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "announcement" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroCtaLabel" TEXT,
    "heroCtaHref" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);
