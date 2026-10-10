-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "legalAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "legalInn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "legalName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "legalOgrn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "legalPhone" TEXT NOT NULL DEFAULT '';

