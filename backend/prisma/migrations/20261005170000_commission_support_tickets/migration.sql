-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "commissionCents" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "commissionPercent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "contact" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'NEW',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_ip_createdAt_idx" ON "SupportTicket"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

