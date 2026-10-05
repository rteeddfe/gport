-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('GAME_KEY', 'TOPUP_NOMINAL', 'TOPUP_AMOUNT');

-- CreateEnum
CREATE TYPE "CreditingMode" AS ENUM ('AUTO_CODE', 'MANUAL');

-- CreateEnum
CREATE TYPE "AccountFieldKind" AS ENUM ('LOGIN', 'ID', 'EMAIL');

-- AlterTable
ALTER TABLE "HomeContent" ADD COLUMN     "carouselCards" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "accountIdentifier" TEXT,
ADD COLUMN     "amountCents" INTEGER,
ADD COLUMN     "variantLabel" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "accountFieldHint" TEXT,
ADD COLUMN     "accountFieldKind" "AccountFieldKind",
ADD COLUMN     "accountFieldLabel" TEXT,
ADD COLUMN     "creditingMode" "CreditingMode" NOT NULL DEFAULT 'AUTO_CODE',
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "kind" "ProductKind" NOT NULL DEFAULT 'GAME_KEY',
ADD COLUMN     "maxValue" INTEGER,
ADD COLUMN     "minValue" INTEGER;

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" INTEGER,
    "unit" TEXT,
    "priceCents" INTEGER NOT NULL,
    "oldPriceCents" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductVariant_productId_sortOrder_idx" ON "ProductVariant"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Product_externalId_key" ON "Product"("externalId");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

