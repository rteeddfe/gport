-- AlterTable
ALTER TABLE "HomeContent" ADD COLUMN     "serviceCards" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "topupServices" JSONB NOT NULL DEFAULT '[]';

