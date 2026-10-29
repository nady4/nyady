-- AlterTable: money fields from float8 to numeric(14,2)
ALTER TABLE "public"."Product" ALTER COLUMN "price" TYPE DECIMAL(14,2);
ALTER TABLE "public"."OrderItem" ALTER COLUMN "unitPrice" TYPE DECIMAL(14,2);
ALTER TABLE "public"."Order" ALTER COLUMN "total" TYPE DECIMAL(14,2),
  ALTER COLUMN "discountAmount" TYPE DECIMAL(14,2),
  ALTER COLUMN "discountAmount" SET DEFAULT 0;
ALTER TABLE "public"."Coupon" ALTER COLUMN "value" TYPE DECIMAL(10,2);
