-- New catalog structure (source: Vault Games entity map, phase 1).
-- Drops the old igromir card fields (region/localization/ageRating), adds
-- the cashback/rating/tags/console/subscription fields, and wipes the
-- legacy demo catalog content (game keys + currency nominals).
-- TOPUP_AMOUNT services (Steam wallet top-up) are store structure, not
-- content — they survive the wipe.
-- Orders whose items only reference the removed products are dev/demo
-- history for content that no longer exists and go away with it.

DELETE FROM "Order"
WHERE "id" IN (
  SELECT oi."orderId"
  FROM "OrderItem" oi
  JOIN "Product" p ON p."id" = oi."productId"
  WHERE p."kind" <> 'TOPUP_AMOUNT'
);

DELETE FROM "Product" WHERE "kind" <> 'TOPUP_AMOUNT';

ALTER TABLE "Product" DROP COLUMN "region";
ALTER TABLE "Product" DROP COLUMN "localization";
ALTER TABLE "Product" DROP COLUMN "ageRating";

ALTER TABLE "Product" ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "cashbackPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "releaseYear" INTEGER;
ALTER TABLE "Product" ADD COLUMN "rating" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "consoles" TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE "Product" ADD COLUMN "tags" TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE "Product" ADD COLUMN "coverColors" TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE "Product" ADD COLUMN "features" TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE "Product" ADD COLUMN "searchAliases" TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE "Product" ADD COLUMN "tagline" TEXT;
ALTER TABLE "Product" ADD COLUMN "group" TEXT;
ALTER TABLE "Product" ADD COLUMN "systemRequirements" JSONB;
