-- Storefront list registry: fixed kinds, admin-managed values feeding the
-- product form selects and the catalog filters.
CREATE TABLE "ListValue" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListValue_pkey" PRIMARY KEY ("id")
);

-- "Метки" moved here from Category.badges — the badge options are now
-- plain registry values of the tags kind.
DROP INDEX IF EXISTS "Category_badges_idx";
ALTER TABLE "Category" DROP COLUMN "badges";

CREATE UNIQUE INDEX "ListValue_kind_name_key" ON "ListValue"("kind" ASC, "name" ASC);
CREATE UNIQUE INDEX "ListValue_kind_slug_key" ON "ListValue"("kind" ASC, "slug" ASC);
CREATE INDEX "ListValue_kind_idx" ON "ListValue"("kind" ASC);
