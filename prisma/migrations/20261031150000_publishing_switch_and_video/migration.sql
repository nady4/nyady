-- Phase 5b: publication safety switch, video media type and link-in-bio links.
--
-- 1) MarketingSettings.autoPublish — master switch for unattended publishing.
--    It defaults to FALSE: the scheduled queue (Vercel cron + GitHub Actions)
--    publishes nothing until the admin explicitly enables it.
-- 2) SocialPost.mediaType — "image" (feed photo / carousel) or "video"
--    (media[0] = the .mp4 published as an Instagram reel).
-- 3) MarketingSettings.bioLinks — link-in-bio entries for the public /bio page.

-- AlterTable
ALTER TABLE "MarketingSettings" ADD COLUMN     "autoPublish" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bioLinks" JSONB;

-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'image';
