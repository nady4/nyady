-- Revert phase 5b's link-in-bio column: the /bio page was removed, so the
-- link list has no place to live.

-- AlterTable
ALTER TABLE "MarketingSettings" DROP COLUMN "bioLinks";
