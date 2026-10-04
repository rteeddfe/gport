-- AlterTable
ALTER TABLE "HomeContent" ALTER COLUMN "kicker" SET DEFAULT 'Пополнение сервисов',
ALTER COLUMN "title" SET DEFAULT 'Пополняй любимые игры',
ALTER COLUMN "titleAccent" SET DEFAULT 'по выгодному курсу',
ALTER COLUMN "ctaLabel" SET DEFAULT 'Каталог игр',
ALTER COLUMN "ctaHref" SET DEFAULT '/products',
ALTER COLUMN "tiles" SET DEFAULT '["Без ограничений, регистрации и верификации", "Без скрытых комиссий и платежей", "Моментальная доставка после оплаты", "Много способов оплаты"]';

-- AlterTable
ALTER TABLE "SiteSettings" ALTER COLUMN "siteName" SET DEFAULT 'GPort',
ALTER COLUMN "supportEmail" SET DEFAULT 'support@gport.ru',
ALTER COLUMN "logoUrl" SET DEFAULT '/logo2.png',
ALTER COLUMN "socials" SET DEFAULT '[]',
ALTER COLUMN "seoTitle" SET DEFAULT 'GPort — магазин цифровых товаров',
ALTER COLUMN "seoDescription" SET DEFAULT 'Интернет-магазин цифровых игровых товаров и услуг',
ALTER COLUMN "faviconUrl" SET DEFAULT '/icons/icon.svg',
ALTER COLUMN "robotsTxt" SET DEFAULT 'User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
',
ALTER COLUMN "manifestName" SET DEFAULT 'GPort — магазин цифровых товаров',
ALTER COLUMN "manifestShortName" SET DEFAULT 'GPort',
ALTER COLUMN "manifestThemeColor" SET DEFAULT '#0B0D12',
ALTER COLUMN "manifestBackgroundColor" SET DEFAULT '#0B0D12',
ALTER COLUMN "manifestIcon192Url" SET DEFAULT '/icons/icon-192.png',
ALTER COLUMN "manifestIcon512Url" SET DEFAULT '/icons/icon-512.png';
