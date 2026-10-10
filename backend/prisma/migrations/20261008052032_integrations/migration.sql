-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('OAUTH', 'PAYMENT', 'EMAIL', 'CAPTCHA');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('YANDEX', 'VK');

-- CreateTable
CREATE TABLE "Integration" (
    "id" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "secrets" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_provider_key" ON "Integration"("provider");
