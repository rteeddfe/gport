-- Separate header/footer descriptors: the header keeps its short line
-- next to the logo, the footer gets its own brand paragraph.
ALTER TABLE "SiteSettings" ADD COLUMN "descriptorFooter" TEXT NOT NULL DEFAULT '';
