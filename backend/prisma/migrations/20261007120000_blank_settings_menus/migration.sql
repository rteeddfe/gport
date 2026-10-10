-- Blank-by-default settings: descriptor + admin-built menus, schema
-- defaults aligned with the empty-store doctrine.
ALTER TABLE "SiteSettings" ADD COLUMN "descriptor" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SiteSettings" ADD COLUMN "headerMenu" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "SiteSettings" ADD COLUMN "footerMenus" JSONB NOT NULL DEFAULT '[]';
