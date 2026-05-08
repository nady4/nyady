/*
  Warnings:

  - You are about to drop the column `color` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "selectedColor" TEXT,
ADD COLUMN     "selectedSize" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "color",
DROP COLUMN "size",
ADD COLUMN     "colors" TEXT[],
ADD COLUMN     "photos" JSONB,
ADD COLUMN     "sizes" TEXT[];
