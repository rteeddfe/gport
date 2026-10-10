import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ADMIN_PERMISSIONS } from '../src/common/constants/admin-permissions.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://localhost:5432/marketplace',
  }),
});

async function main(): Promise<void> {
  // Development-only credentials (local seed, never production passwords).
  const passwordHash = await bcrypt.hash('admin1234', 10);

  // The pre-existing local admin account is promoted to SUPER_ADMIN: the
  // minimal change that gives local development a full-access account
  // without creating a new one. The `marketplace` in the address is a
  // technical artifact of the early skeleton name, not a business model.
  await prisma.user.upsert({
    where: { email: 'admin@marketplace.local' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'admin@marketplace.local',
      passwordHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  // Dedicated ADMIN so the whole role matrix (USER / ADMIN / SUPER_ADMIN)
  // can be exercised in local development. The demo admin holds every
  // admin permission — narrow the set locally to test restricted access.
  await prisma.user.upsert({
    where: { email: 'admin@gport.local' },
    update: { permissions: [...ADMIN_PERMISSIONS] },
    create: {
      email: 'admin@gport.local',
      passwordHash,
      name: 'Admin',
      role: 'ADMIN',
      permissions: [...ADMIN_PERMISSIONS],
    },
  });

  // Game keys land here at import (docs/vault-games-source-map.md); the
  // storefront catalog reads them by this slug.
  await prisma.category.upsert({
    where: { slug: 'games' },
    update: {},
    create: {
      name: 'Игры',
      slug: 'games',
      description: 'Цифровые ключи и Steam Gift-игры',
      type: 'games',
    },
  });

  // Пополнение игровых балансов: products of this section are created in
  // the admin panel — the category itself is the storefront structure.
  await prisma.category.upsert({
    where: { slug: 'game-currency' },
    update: {},
    create: {
      name: 'Игровая валюта',
      slug: 'game-currency',
      description: 'Пополнение игровых балансов и внутриигровая валюта',
      type: 'currency',
    },
  });

  // Subscription services (PS Plus, Game Pass, Spotify…) land here at
  // import; the storefront reads them by kind, the section groups the list.
  await prisma.category.upsert({
    where: { slug: 'subscriptions' },
    update: {},
    create: {
      name: 'Подписки',
      slug: 'subscriptions',
      description: 'Игровые и медиа подписки: PS Plus, Game Pass, Spotify и другие',
      type: 'subscriptions',
    },
  });

  // ----- List registry («Категории» → «Списки») ---------------------------
  // Fixed kinds, curated starting fill (the admin edits values in the
  // admin panel). Product columns store these slugs; the catalog filters
  // and the storefront display names resolve from here.
  const listValues: Array<{ kind: string; name: string; slug: string }> = [
    // Карточные метки («метка карточки» в форме товара).
    { kind: 'tags', name: 'Хит', slug: 'hit' },
    { kind: 'tags', name: 'Новинка', slug: 'new' },
    // Платформы (одно значение на товар).
    { kind: 'platform', name: 'Steam', slug: 'steam' },
    { kind: 'platform', name: 'PlayStation', slug: 'playstation' },
    { kind: 'platform', name: 'Xbox', slug: 'xbox' },
    { kind: 'platform', name: 'Nintendo', slug: 'nintendo' },
    // Жанры игр (фасет каталога).
    { kind: 'genre', name: 'Экшен', slug: 'action' },
    { kind: 'genre', name: 'Шутер', slug: 'shooter' },
    { kind: 'genre', name: 'RPG', slug: 'rpg' },
    { kind: 'genre', name: 'Стратегия', slug: 'strategy' },
    { kind: 'genre', name: 'Приключение', slug: 'adventure' },
    { kind: 'genre', name: 'Симулятор', slug: 'simulation' },
    { kind: 'genre', name: 'Гонки', slug: 'racing' },
    { kind: 'genre', name: 'Спорт', slug: 'sports' },
    { kind: 'genre', name: 'Хоррор', slug: 'horror' },
    { kind: 'genre', name: 'Инди', slug: 'indie' },
    // Консоли (поколения).
    { kind: 'consoles', name: 'PlayStation 5', slug: 'playstation-5' },
    { kind: 'consoles', name: 'PlayStation 4', slug: 'playstation-4' },
    { kind: 'consoles', name: 'Xbox Series X|S', slug: 'xbox-series-xs' },
    { kind: 'consoles', name: 'Nintendo Switch', slug: 'nintendo-switch' },
    { kind: 'consoles', name: 'Nintendo Switch 2', slug: 'nintendo-switch-2' },
    // Группы подписок.
    { kind: 'subscription-group', name: 'Игровые', slug: 'gaming' },
    { kind: 'subscription-group', name: 'ИИ-сервисы', slug: 'ai' },
    { kind: 'subscription-group', name: 'Медиа', slug: 'media' },
    { kind: 'subscription-group', name: 'Соцсети', slug: 'social' },
    // «Что входит в подписку».
    { kind: 'subscription-includes', name: 'Сетевая игра', slug: 'online' },
    { kind: 'subscription-includes', name: 'Каталог игр', slug: 'games-catalog' },
    { kind: 'subscription-includes', name: 'Облачный гейминг', slug: 'cloud-gaming' },
    { kind: 'subscription-includes', name: 'Эксклюзивные скидки', slug: 'discounts' },
    { kind: 'subscription-includes', name: 'Классика каталога', slug: 'classics' },
  ];
  for (const value of listValues) {
    await prisma.listValue.upsert({
      where: { kind_slug: { kind: value.kind, slug: value.slug } },
      update: { name: value.name },
      create: value,
    });
  }

  // Anti-DDoS defaults (edited in the «Состояние» tab): auto-ban off —
  // the admin turns it on and tunes the thresholds explicitly.
  await prisma.securitySettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  // The store ships EMPTY by design: no products, promo codes, posts,
  // reviews or FAQ. Catalog content is created in the admin panel (or via
  // scripts/import-vault-games.ts when the Vault Games catalog is wanted).

  // Remove legacy skeleton data from the marketplace-era seed.
  await prisma.product.deleteMany({
    where: {
      slug: {
        in: ['nextjs-ecommerce-guide', 'typescript-style-guide', 'saas-landing-template'],
      },
    },
  });
  await prisma.category.deleteMany({
    where: { slug: { in: ['ebooks', 'templates'] } },
  });

  // ----- Site settings (admin-managed, public read) -----------------------
  // The store ships BLANK: the admin fills branding, contacts and SEO in
  // the settings UI. Theme colors stay — an empty color is invalid.
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteName: '',
      descriptor: '',
      descriptorFooter: '',
      supportEmail: '',
      logoUrl: '',
      socials: [],
      headerMenu: [],
      footerMenus: [],
      seoTitle: '',
      seoDescription: '',
      ogImageUrl: null,
      faviconUrl: '',
      robotsTxt: '',
      manifestName: '',
      manifestShortName: '',
      manifestThemeColor: '#0B0D12',
      manifestBackgroundColor: '#0B0D12',
      manifestIcon192Url: '',
      manifestIcon512Url: '',
    },
  });

  // ----- Home hero content -------------------------------------------------
  // Blank by design — the admin composes the hero in the settings UI.
  await prisma.homeContent.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      kicker: '',
      title: '',
      titleAccent: '',
      subtitle: '',
      ctaPrimaryLabel: '',
      ctaPrimaryHref: '',
      ctaLabel: '',
      ctaHref: '',
      tiles: [],
    },
  });

  // Legal pages are NOT seeded: the admin creates them in the
  // «Политики» section, and the footer lists only what exists.

  const productCount = await prisma.product.count();
  const postCount = await prisma.post.count();
  const reviewCount = await prisma.review.count();
  const promoCount = await prisma.promoCode.count();
  console.log(
    `Seed completed: 1 SUPER_ADMIN, 1 ADMIN, 3 categories, list registry, blank site settings, home content. Content left empty by design (products: ${productCount}, posts: ${postCount}, reviews: ${reviewCount}, promo codes: ${promoCount}, policies: 0).`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
