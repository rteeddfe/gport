-- HomeContent joins the blank-store doctrine: both hero CTAs are
-- admin-managed (the hardcoded «Пополнение» button becomes content),
-- schema defaults go empty so a self-healed row is blank too.
ALTER TABLE "HomeContent" ADD COLUMN "ctaPrimaryLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HomeContent" ADD COLUMN "ctaPrimaryHref" TEXT NOT NULL DEFAULT '';

ALTER TABLE "HomeContent" ALTER COLUMN "kicker" SET DEFAULT '';
ALTER TABLE "HomeContent" ALTER COLUMN "title" SET DEFAULT '';
ALTER TABLE "HomeContent" ALTER COLUMN "titleAccent" SET DEFAULT '';
ALTER TABLE "HomeContent" ALTER COLUMN "ctaLabel" SET DEFAULT '';
ALTER TABLE "HomeContent" ALTER COLUMN "ctaHref" SET DEFAULT '';
ALTER TABLE "HomeContent" ALTER COLUMN "tiles" SET DEFAULT '[]'::jsonb;

UPDATE "HomeContent" SET
  "kicker" = '',
  "title" = '',
  "titleAccent" = '',
  "subtitle" = '',
  "ctaPrimaryLabel" = '',
  "ctaPrimaryHref" = '',
  "ctaLabel" = '',
  "ctaHref" = '',
  "tiles" = '[]'::jsonb;
