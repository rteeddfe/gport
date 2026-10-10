-- DropIndex
DROP INDEX "Order_promoCodeId_idx";

-- AlterTable
ALTER TABLE "SiteSettings" ALTER COLUMN "siteName" SET DEFAULT '',
ALTER COLUMN "supportEmail" SET DEFAULT '',
ALTER COLUMN "logoUrl" SET DEFAULT '',
ALTER COLUMN "seoTitle" SET DEFAULT '',
ALTER COLUMN "seoDescription" SET DEFAULT '',
ALTER COLUMN "faviconUrl" SET DEFAULT '',
ALTER COLUMN "robotsTxt" SET DEFAULT '',
ALTER COLUMN "manifestName" SET DEFAULT '',
ALTER COLUMN "manifestShortName" SET DEFAULT '',
ALTER COLUMN "manifestIcon192Url" SET DEFAULT '',
ALTER COLUMN "manifestIcon512Url" SET DEFAULT '';

-- CreateTable
CREATE TABLE "RegisterChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegisterChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegisterChallenge_codeHash_key" ON "RegisterChallenge"("codeHash");

-- CreateIndex
CREATE INDEX "RegisterChallenge_userId_idx" ON "RegisterChallenge"("userId");

-- CreateIndex
CREATE INDEX "RegisterChallenge_expiresAt_idx" ON "RegisterChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "RegisterChallenge" ADD CONSTRAINT "RegisterChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
