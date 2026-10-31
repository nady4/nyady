-- Phase 5: marketing measurement engine.
--
-- 1) Attribution columns on Order (UTM + referral code) so a sale can be
--    traced back to the social post / campaign that brought it.
-- 2) Referral flags on Coupon (a referral is a normal coupon with an owner).
-- 3) ContentPreference (singleton) + ContentPlan (editorial calendar) so the
--    content can be generated and scheduled automatically.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "referralCode" TEXT;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "isReferral" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referrerUserId" TEXT,
ADD COLUMN     "referrerName" TEXT,
ADD COLUMN     "sourceCampaign" TEXT;

-- CreateTable
CREATE TABLE "ContentPreference" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pillars" TEXT[],
    "formats" TEXT[],
    "objectives" TEXT[],
    "forbiddenTopics" TEXT[],
    "audience" TEXT,
    "defaultCta" TEXT,
    "postsPerWeek" INTEGER NOT NULL DEFAULT 4,
    "bestHours" TEXT[],
    "maxPromoPerWeek" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPlan" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "idea" TEXT,
    "productId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "postId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentPlan_date_idx" ON "ContentPlan"("date");

-- CreateIndex
CREATE INDEX "ContentPlan_status_idx" ON "ContentPlan"("status");

-- CreateIndex
CREATE INDEX "ContentPlan_pillar_idx" ON "ContentPlan"("pillar");

-- AddForeignKey
ALTER TABLE "ContentPlan" ADD CONSTRAINT "ContentPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
