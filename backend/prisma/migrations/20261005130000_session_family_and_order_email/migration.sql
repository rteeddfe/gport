-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable (backfill before the NOT NULL: every existing session
-- becomes its own rotation family)
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "familyId" UUID;
UPDATE "RefreshToken" SET "familyId" = gen_random_uuid() WHERE "familyId" IS NULL;
ALTER TABLE "RefreshToken" ALTER COLUMN "familyId" SET NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
