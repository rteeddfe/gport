-- CreateTable
CREATE TABLE "OAuthLinkChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthLinkChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthLinkChallenge_codeHash_key" ON "OAuthLinkChallenge"("codeHash");

-- CreateIndex
CREATE INDEX "OAuthLinkChallenge_userId_idx" ON "OAuthLinkChallenge"("userId");

-- CreateIndex
CREATE INDEX "OAuthLinkChallenge_expiresAt_idx" ON "OAuthLinkChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "OAuthLinkChallenge" ADD CONSTRAINT "OAuthLinkChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
