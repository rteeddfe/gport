-- AlterTable
ALTER TABLE "HomeContent" ADD COLUMN     "wallCards" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;
