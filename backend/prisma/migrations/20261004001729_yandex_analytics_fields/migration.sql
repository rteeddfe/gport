-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "metrikaCounterId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "metrikaWebvisor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "yandexVerification" TEXT NOT NULL DEFAULT '';
