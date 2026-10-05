import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

  const games = await prisma.category.upsert({
    where: { slug: 'games' },
    update: {},
    create: {
      name: 'Игры',
      slug: 'games',
      description: 'Цифровые ключи и Steam Gift-игры',
    },
  });

  const gameCurrency = await prisma.category.upsert({
    where: { slug: 'game-currency' },
    update: {},
    create: {
      name: 'Игровая валюта',
      slug: 'game-currency',
      description: 'Пополнение игровых балансов и внутриигровая валюта',
    },
  });

  // No cover art for the game keys yet — an empty images array makes the
  // shared ProductCard render its neon initial fallback (picsum.photos is
  // unreachable from this network, so no placeholder URLs either).
  // Attribute values mirror what similar RU game stores list on a card.
  await prisma.product.upsert({
    where: { slug: 'gothic-1-remake' },
    update: { images: [], stock: 15 },
    create: {
      title: 'Gothic 1 Remake',
      slug: 'gothic-1-remake',
      description:
        'Ремейк культовой ролевой игры: колония орков, безымянный герой и свобода выбора в мрачном фэнтези-мире.',
      instruction:
        '1. Скачайте и установите Steam.\n2. Войдите в свой аккаунт.\n3. Нажмите «Добавить игру» → «Активировать в Steam».\n4. Введите полученный ключ.',
      region: 'RU+CIS',
      platform: 'Steam',
      genre: ['Action', 'RPG'],
      localization: 'RU',
      ageRating: '16+',
      images: [],
      priceCents: 170_000,
      oldPriceCents: 212_500,
      stock: 15,
      currency: 'RUB',
      status: 'PUBLISHED',
      categoryId: games.id,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'clair-obscur-expedition-33' },
    update: { images: [], stock: 7 },
    create: {
      title: 'Clair Obscur: Expedition 33',
      slug: 'clair-obscur-expedition-33',
      description:
        'Пошаговая RPG с элементами реального времени от французской студии Sandfall Interactive.',
      instruction:
        '1. Скачайте и установите Steam.\n2. Войдите в свой аккаунт.\n3. Нажмите «Добавить игру» → «Активировать в Steam».\n4. Введите полученный ключ.',
      region: 'RU+CIS',
      platform: 'Steam',
      genre: ['RPG'],
      localization: 'RU',
      ageRating: '18+',
      images: [],
      priceCents: 208_100,
      oldPriceCents: 260_100,
      stock: 7,
      currency: 'RUB',
      status: 'PUBLISHED',
      categoryId: games.id,
    },
  });

  // More catalog games with store-typical card data (dev-only content;
  // covers stay empty until licensed art is added).
  const games_ = [
    {
      title: 'Elden Ring',
      slug: 'elden-ring',
      description:
        'Ролевая игра в тёмном фэнтези-мире от FromSoftware: Междуземье, Блаженные и Стальное древо.',
      genre: ['Action', 'RPG'],
      ageRating: '18+',
      priceCents: 419_900,
      oldPriceCents: 524_900,
      stock: 12,
    },
    {
      title: 'Cyberpunk 2077',
      slug: 'cyberpunk-2077',
      description:
        'Открытый мир Найт-Сити: импланты, корпорации и наёмники в сюжетном боевеке от CD PROJEKT RED.',
      genre: ['Action', 'Shooter'],
      ageRating: '18+',
      priceCents: 299_900,
      oldPriceCents: 399_900,
      stock: 20,
    },
    {
      title: "Baldur's Gate 3",
      slug: 'baldurs-gate-3',
      description:
        'Классическая CRPG по D&D 5e от Larian Studios: партия, пошаговые бои и свобода решений.',
      genre: ['RPG', 'Strategy'],
      ageRating: '18+',
      priceCents: 369_900,
      oldPriceCents: null,
      stock: 9,
    },
    {
      title: 'Red Dead Redemption 2',
      slug: 'red-dead-redemption-2',
      description:
        'Вестерн от Rockstar Games: банды, прерии и закат эпохи Дикого Запала глазами Артура Моргана.',
      genre: ['Action', 'Adventure'],
      ageRating: '18+',
      priceCents: 329_900,
      oldPriceCents: 412_400,
      stock: 14,
    },
    {
      title: 'Hogwarts Legacy',
      slug: 'hogwarts-legacy',
      description:
        'Ролевая игра по вселенной Гарри Поттера: Хогвартс XIX века, заклинания и магические существа.',
      genre: ['Action', 'RPG'],
      ageRating: '16+',
      priceCents: 279_900,
      oldPriceCents: 349_900,
      stock: 18,
    },
    {
      title: 'EA SPORTS FC 25',
      slug: 'ea-sports-fc-25',
      description:
        'Футбольный симулятор EA: клубы, карьера и Ultimate Team. Ключ активации в EA App.',
      genre: ['Sport', 'Simulation'],
      ageRating: '6+',
      priceCents: 449_900,
      oldPriceCents: 562_400,
      stock: 11,
    },
  ];

  for (const game of games_) {
    await prisma.product.upsert({
      where: { slug: game.slug },
      update: { stock: game.stock },
      create: {
        title: game.title,
        slug: game.slug,
        description: game.description,
        instruction:
          '1. Скачайте и установите Steam.\n2. Войдите в свой аккаунт.\n3. Нажмите «Добавить игру» → «Активировать в Steam».\n4. Введите полученный ключ.',
        region: 'RU+CIS',
        platform: 'Steam',
        genre: game.genre,
        localization: 'RU',
        ageRating: game.ageRating,
        images: [],
        priceCents: game.priceCents,
        oldPriceCents: game.oldPriceCents,
        stock: game.stock,
        currency: 'RUB',
        status: 'PUBLISHED',
        categoryId: games.id,
      },
    });
  }

  // Development placeholder for the home «Игровые валюты» block: cover art
  // is stored in frontend/public/games/ (downloaded from igromir.yandex.ru,
  // dev-only — replace with licensed art before production).
  await prisma.product.upsert({
    where: { slug: 'pubg-mobile-660-uc' },
    update: { images: ['/games/pubg-mobile.jpg'], stock: 100 },
    create: {
      title: 'PUBG Mobile 660 UC',
      slug: 'pubg-mobile-660-uc',
      description: '660 UC для PUBG Mobile: скины, боевой пропуск и предметы.',
      instruction:
        'Укажите UID аккаунта при оформлении — валюта придёт автоматически в течение нескольких минут.',
      region: 'Global',
      platform: 'PUBG Mobile',
      genre: ['Валюта'],
      localization: 'RU',
      ageRating: '12+',
      images: ['/games/pubg-mobile.jpg'],
      priceCents: 49_900,
      stock: 100,
      currency: 'RUB',
      status: 'PUBLISHED',
      categoryId: gameCurrency.id,
    },
  });

  const currencyProducts = [
    {
      title: 'Genshin Impact',
      slug: 'genshin-impact',
      description: 'Кристаллы Сотворения для Genshin Impact.',
      images: ['/games/genshin-impact.jpg'],
      priceCents: 552_00,
    },
    {
      title: 'Roblox',
      slug: 'roblox',
      description: 'Robux для Roblox.',
      images: ['/games/roblox.jpg'],
      priceCents: 203_00,
    },
    {
      title: 'VALORANT',
      slug: 'valorant',
      description: 'VP — валюта VALORANT.',
      images: ['/games/valorant.jpg'],
      priceCents: 282_00,
    },
    {
      title: 'Delta Force',
      slug: 'delta-force',
      description: 'Дельта-монеты для Delta Force.',
      images: ['/games/delta-force.jpg'],
      priceCents: 28_00,
    },
    {
      title: 'Minecraft Minecoins',
      slug: 'minecraft-minecoins',
      description: 'Minecoins для Minecraft Marketplace.',
      images: ['/games/minecraft-minecoins.jpg'],
      priceCents: 1154_00,
    },
    {
      title: 'Arena Breakout',
      slug: 'arena-breakout',
      description: 'Бонды для Arena Breakout.',
      images: ['/games/arena-breakout.jpg'],
      priceCents: 103_00,
    },
    {
      title: 'Blood Strike',
      slug: 'blood-strike',
      description: 'Золото для Blood Strike.',
      images: ['/games/blood-strike.jpg'],
      priceCents: 98_00,
    },
    {
      title: 'Free Fire',
      slug: 'free-fire',
      description: 'Алмазы для Free Fire.',
      images: ['/games/free-fire.jpg'],
      priceCents: 121_00,
    },
    {
      title: 'League of Legends',
      slug: 'league-of-legends',
      description: 'RP для League of Legends.',
      images: ['/games/league-of-legends.jpg'],
      priceCents: 568_00,
    },
    {
      title: 'Marvel Rivals',
      slug: 'marvel-rivals',
      description: 'Лattice для Marvel Rivals.',
      images: ['/games/marvel-rivals.jpg'],
      priceCents: 108_00,
    },
  ];

  for (const product of currencyProducts) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: { stock: 100 },
      create: {
        ...product,
        stock: 100,
        region: 'Global',
        platform: product.title,
        genre: ['Валюта'],
        localization: 'RU',
        currency: 'RUB',
        status: 'PUBLISHED',
        categoryId: gameCurrency.id,
      },
    });
  }

  await prisma.promoCode.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      discountType: 'PERCENT',
      value: 10,
      isActive: true,
      maxUses: 1000,
    },
  });

  // Development-only placeholder: fixed 500 ₽ off from a 1 500 ₽ subtotal.
  await prisma.promoCode.upsert({
    where: { code: 'GPORT500' },
    update: {},
    create: {
      code: 'GPORT500',
      discountType: 'FIXED',
      value: 50000,
      isActive: true,
      minSubtotalCents: 150000,
      maxUses: 500,
    },
  });

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
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteName: 'GPort',
      supportEmail: 'support@gport.ru',
      logoUrl: '/logo2.png',
      socials: [
        { label: 'Telegram', url: 'https://t.me/gport', iconUrl: '/brands/telegram-muted.svg' },
        { label: 'VK', url: 'https://vk.com/gport', iconUrl: '/brands/vk.svg' },
      ],
      seoTitle: 'GPort — магазин цифровых товаров',
      seoDescription: 'Интернет-магазин цифровых игровых товаров и услуг',
      ogImageUrl: null,
      faviconUrl: '/icons/icon.svg',
      robotsTxt:
        'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\n',
      manifestName: 'GPort — магазин цифровых товаров',
      manifestShortName: 'GPort',
      manifestThemeColor: '#0B0D12',
      manifestBackgroundColor: '#0B0D12',
      manifestIcon192Url: '/icons/icon-192.png',
      manifestIcon512Url: '/icons/icon-512.png',
    },
  });

  // ----- Home hero content -------------------------------------------------
  await prisma.homeContent.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      kicker: 'Пополнение сервисов',
      title: 'Пополняй любимые игры',
      titleAccent: 'по выгодному курсу',
      subtitle: '',
      ctaLabel: 'Каталог игр',
      ctaHref: '/products',
      tiles: [
        'Без ограничений, регистрации и верификации',
        'Без скрытых комиссий и платежей',
        'Моментальная доставка после оплаты',
        'Много способов оплаты',
      ],
    },
  });

  // ----- Policy pages (рыба until real legal texts arrive) ------------------
  const LOREM =
    'Рыба-текст: данный раздел заполняется предварительным текстом и не является юридически значимым описанием. После согласования финальной редакции документа текст будет заменён на утверждённый юристами вариант с сохранением текущей структуры разделов.';

  const policyToHtml = (
    intro: string,
    sections: Array<{ heading: string; paragraphs: string[] }>,
  ): string =>
    [
      `<p>${intro}</p>`,
      ...sections.flatMap((section) => [
        `<h2>${section.heading}</h2>`,
        ...section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`),
      ]),
    ].join('');

  // Real legal documents (RF law based; entity details are placeholders
  // like [ИНН] — replace before going live). Kept in prisma/legal/*.html.
  const policyPages = [
    { slug: 'oferta', title: 'Публичная оферта', sortOrder: 1 },
    { slug: 'privacy', title: 'Политика конфиденциальности', sortOrder: 2 },
    { slug: 'refund', title: 'Политика возврата средств', sortOrder: 3 },
    { slug: 'rights-holders', title: 'Информация для правообладателей', sortOrder: 4 },
    { slug: 'terms', title: 'Пользовательское соглашение', sortOrder: 5 },
  ];

  const legalDir = join(import.meta.dirname, 'legal');
  for (const doc of policyPages) {
    const content = readFileSync(join(legalDir, doc.slug + '.html'), 'utf8');
    await prisma.policyPage.upsert({
      where: { slug: doc.slug },
      // Re-seeding refreshes the legal texts; admins may edit them after.
      update: { content, sortOrder: doc.sortOrder },
      create: { slug: doc.slug, title: doc.title, content, sortOrder: doc.sortOrder },
    });
  }

  // ----- FAQ items (storefront FAQ block) -----------------------------------
  if ((await prisma.faqItem.count()) === 0) {
    await prisma.faqItem.createMany({
      data: [
        {
          question: 'Нужна ли регистрация и верификация?',
          answer:
            'Нет. Чтобы пополнить игру, достаточно выбрать сервис и указать данные аккаунта — создавать аккаунт и проходить верификацию не нужно.',
          category: 'topup',
          sortOrder: 1,
        },
        {
          question: 'Как быстро приходит пополнение?',
          answer:
            'Зачисление автоматическое и в большинстве случаев моментальное — сразу после подтверждения оплаты.',
          category: 'topup',
          sortOrder: 2,
        },
        {
          question: 'Оплата прошла, но пополнение не пришло. Что делать?',
          answer:
            'Такое случается редко: в отдельных случаях платёж обрабатывается дольше обычного. Если зачисление так и не пришло — свяжитесь с нами, проверим платёж и разберёмся.',
          category: 'topup',
          sortOrder: 3,
        },
        {
          question: 'Какие способы оплаты доступны?',
          answer:
            'Принимаем банковские карты и другие популярные способы оплаты. Доступные варианты показываются на шаге оплаты.',
          category: 'games',
          sortOrder: 4,
        },
        {
          question: 'Есть ли скрытые комиссии?',
          answer:
            'Нет. Цена на шаге оплаты финальная — никаких скрытых комиссий и доплат.',
          category: 'games',
          sortOrder: 5,
        },
        {
          question: 'В каком виде приходит купленная игра?',
          answer:
            'Ключом активации для Steam или другой площадки вместе с короткой инструкцией — данные доступны сразу после оплаты.',
          category: 'games',
          sortOrder: 6,
        },
        {
          question: 'Купленный ключ не активировался. Что делать?',
          answer:
            'Свяжитесь с поддержкой: проверим покупку и вышлем новый ключ или вернём деньги. Каждая ситуация разбирается вручную.',
          category: 'games',
          sortOrder: 7,
        },
      ],
    });
  }

  // ----- Blog posts (development-only placeholder news) --------------------
  const posts_ = [
    {
      slug: 'dobro-pozhalovat-v-gport',
      title: 'Добро пожаловать в GPort!',
      excerpt:
        'Магазин цифровых игровых товаров открылся: игры, пополнение сервисов и моментальная доставка.',
      content:
        'Мы запустили GPort — магазин цифровых товаров для геймеров.\n\nЗдесь вы можете купить игры для Steam и других площадок, а также пополнить игровые сервисы без регистрации и верификации. Цена на шаге оплаты финальная — без скрытых комиссий.\n\nЗаглядывайте в раздел «Акции»: скидки появляются регулярно, а все новости магазина мы будем публиковать в этом блоге.',
      status: 'PUBLISHED',
    },
    {
      slug: 'skidki-na-osennie-hity',
      title: 'Осенние скидки на хиты — до 20%',
      excerpt:
        'Elden Ring, Cyberpunk 2077 и другие популярные игры подешевели — скидка уже в цене.',
      content:
        'До конца осени действуют скидки на популярные игры:\n\n— Elden Ring — по специальной цене;\n— Cyberpunk 2077 — со скидкой;\n— и другие хиты в разделе «Акции».\n\nСкидка отображается в каталоге перечёркнутой старой ценой — доплачивать за промокод не нужно. Ключ приходит на почту сразу после оплаты.',
      status: 'PUBLISHED',
    },
    {
      slug: 'novye-sposoby-oplaty',
      title: 'Готовим новые способы оплаты',
      excerpt: 'Рассказываем, какие способы оплаты появятся в магазине в ближайшее время.',
      content:
        'Работаем над расширением списка способов оплаты: кроме банковских карт добавим популярные альтернативные варианты.\n\nСледите за новостями — анонсируем запуск в этом блоге.',
      status: 'DRAFT',
    },
  ];
  for (const post of posts_) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        status: post.status,
        ...(post.status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
      },
    });
  }

  // ----- Reviews (development-only placeholder content) --------------------
  if ((await prisma.review.count()) === 0) {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    await prisma.review.createMany({
      data: [
        {
          authorName: 'Дмитрий',
          rating: 5,
          text: 'Пополнение пришло моментально, курс приятно удивил. Теперь пополняю только здесь — никакой лишней волокиты.',
          status: 'PUBLISHED',
          createdAt: new Date(now - 6 * day),
        },
        {
          authorName: 'Анна',
          rating: 5,
          text: 'Впервые оформляла подписку, переживала из-за оплаты. Всё прошло без регистрации и за минуту — отзыв пишу специально, чтобы сказать спасибо.',
          status: 'PUBLISHED',
          createdAt: new Date(now - 5 * day),
        },
        {
          authorName: 'Игорь',
          rating: 4,
          text: 'Оплатил картой — ключ на почте почти сразу. Минус звезда только за то, что хочется ещё больше игр в каталоге.',
          status: 'PUBLISHED',
          createdAt: new Date(now - 4 * day),
        },
        {
          authorName: 'Мария',
          rating: 5,
          text: 'Понятный сайт и финальная цена сразу на шаге оплаты: никаких скрытых комиссий, всё честно. Буду брать ещё.',
          status: 'PUBLISHED',
          createdAt: new Date(now - 3 * day),
        },
        {
          authorName: 'Гость',
          rating: 5,
          text: 'Взял Elden Ring со скидкой — ключ активировался в Steam с первого раза. Поддержка отвечала быстро, хотя вопрос и не был проблемой.',
          status: 'PUBLISHED',
          createdAt: new Date(now - 2 * day),
        },
        {
          authorName: 'Сергей',
          rating: 4,
          text: 'Покупал игру в подарок другу: скачал, оплатил, переслал ключ. Всё заняло пару минут. Единственное — хотелось бы больше способов оплаты.',
          status: 'PUBLISHED',
          createdAt: new Date(now - day),
        },
        {
          authorName: 'Ольга',
          rating: 5,
          text: 'Отличный магазин: заказала игру вечером, ключ пришёл моментально. Очень удобно, что не нужна регистрация.',
          status: 'PENDING',
          createdAt: new Date(now - 2 * 60 * 60 * 1000),
        },
        {
          authorName: 'Гость',
          rating: 4,
          text: 'В целом всё хорошо, но интерфейс на телефоне хотелось бы чуть компактнее. А так — цены радуют, буду пользоваться.',
          status: 'PENDING',
          createdAt: new Date(now - 30 * 60 * 1000),
        },
      ],
    });
  }

  const productCount = await prisma.product.count();
  const postCount = await prisma.post.count();
  const reviewCount = await prisma.review.count();
  const promoCount = await prisma.promoCode.count();
  console.log(
    `Seed completed: 1 SUPER_ADMIN, 1 ADMIN, 2 categories, ${productCount} products, ${promoCount} promo codes, ${postCount} blog posts, ${reviewCount} reviews, site settings, home content, 5 policy pages, 7 FAQ items.`,
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
