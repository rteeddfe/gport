-- Anti-DDoS v1: manual/auto IP bans + the threshold settings edited in
-- the admin «Состояние» tab.
CREATE TABLE "BlockedIp" (
    "id" UUID NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedIp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlockedIp_ip_key" ON "BlockedIp"("ip" ASC);
CREATE INDEX "BlockedIp_expiresAt_idx" ON "BlockedIp"("expiresAt" ASC);

CREATE TABLE "SecuritySettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "autoBanEnabled" BOOLEAN NOT NULL DEFAULT false,
    "banThresholdRequests" INTEGER NOT NULL DEFAULT 240,
    "banWindowSeconds" INTEGER NOT NULL DEFAULT 60,
    "banDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecuritySettings_pkey" PRIMARY KEY ("id")
);
