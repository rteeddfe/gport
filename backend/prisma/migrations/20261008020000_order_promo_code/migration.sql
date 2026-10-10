-- Promo codes reach the direct checkout: the applied code snapshot and
-- the resolved discount live on the order.
ALTER TABLE "Order" ADD COLUMN "promoCodeId" UUID;
ALTER TABLE "Order" ADD COLUMN "promoCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Order_promoCodeId_idx" ON "Order"("promoCodeId" ASC);

ALTER TABLE "Order" ADD CONSTRAINT "Order_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
