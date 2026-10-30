-- AddForeignKey
ALTER TABLE "SocialAsset" ADD CONSTRAINT "SocialAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
