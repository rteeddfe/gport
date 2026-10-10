-- Categories gain a section type and card-badge options («метки»);
-- the cover gradient placeholder is removed from the store entirely.
ALTER TABLE "Category" ADD COLUMN "type" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Category" ADD COLUMN "badges" TEXT[] NOT NULL DEFAULT '{}'::text[];

-- Backfill the type of the seeded catalog sections by their slugs.
UPDATE "Category" SET "type" = 'games' WHERE "slug" = 'games';
UPDATE "Category" SET "type" = 'subscriptions' WHERE "slug" = 'subscriptions';
UPDATE "Category" SET "type" = 'currency' WHERE "slug" = 'game-currency';

ALTER TABLE "Product" DROP COLUMN "coverColors";
