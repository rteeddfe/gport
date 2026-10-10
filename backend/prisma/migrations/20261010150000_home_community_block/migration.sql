-- AlterTable
ALTER TABLE "HomeContent" ADD COLUMN     "communityCards" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "communityLabel" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "statCards" JSONB NOT NULL DEFAULT '[]';

