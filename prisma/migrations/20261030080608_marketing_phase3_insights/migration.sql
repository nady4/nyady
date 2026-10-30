-- AlterTable
ALTER TABLE "MarketingSettings" ADD COLUMN     "lastInsightsSyncAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SocialPostMetric" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialPostMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccountStat" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccountStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialPostMetric_date_idx" ON "SocialPostMetric"("date");

-- CreateIndex
CREATE INDEX "SocialPostMetric_postId_idx" ON "SocialPostMetric"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPostMetric_postId_date_key" ON "SocialPostMetric"("postId", "date");

-- CreateIndex
CREATE INDEX "SocialAccountStat_date_idx" ON "SocialAccountStat"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccountStat_channel_date_key" ON "SocialAccountStat"("channel", "date");

-- AddForeignKey
ALTER TABLE "SocialPostMetric" ADD CONSTRAINT "SocialPostMetric_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
