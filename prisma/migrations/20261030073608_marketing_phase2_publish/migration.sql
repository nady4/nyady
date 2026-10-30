-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "fbPermalink" TEXT,
ADD COLUMN     "fbPostId" TEXT,
ADD COLUMN     "igMediaId" TEXT,
ADD COLUMN     "igPermalink" TEXT,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "pageId" TEXT,
    "pageName" TEXT,
    "igUserId" TEXT,
    "igUsername" TEXT,
    "tokenEnc" TEXT NOT NULL,
    "scopes" TEXT[],
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_channel_key" ON "SocialAccount"("channel");

-- CreateIndex
CREATE INDEX "SocialPost_publishedAt_idx" ON "SocialPost"("publishedAt");
