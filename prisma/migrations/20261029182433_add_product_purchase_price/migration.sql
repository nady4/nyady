-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "purchasePrice" DECIMAL(14,2);

-- Backfill: placeholder purchase cost = retail price - 10.000 (the brief's
-- default "for now"). Each product cost stays editable from the admin form.
UPDATE "Product"
SET "purchasePrice" = "price" - 10000
WHERE "purchasePrice" IS NULL;
