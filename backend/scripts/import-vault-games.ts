// One-off import of the owner's previous store (Vault Games,
// 31-57-28-12.sslip.io) into the local database. Source map:
// docs/vault-games-source-map.md. Idempotent: products are upserted by
// externalId ("vault:product:<slug>" / "vault:subscription:<slug>"), covers
// are downloaded to frontend/public/covers/. Imports as PUBLISHED — the
// old store's curated catalog IS the new catalog content.
//
// The site sits behind a preview gate: the demo_access cookie is required.
// Pass the token via env (kept out of the repo on purpose):
//   VAULT_ACCESS=<token> pnpm exec tsx scripts/import-vault-games.ts [--reset]
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const SITE = 'http://31-57-28-12.sslip.io';
const COOKIE = `demo_access=${process.env.VAULT_ACCESS ?? ''}`;
const DELAY_MS = 300;
const GAME_STOCK = 25;
const COVERS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../frontend/public/covers',
);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { cookie: COOKIE, accept: 'text/html' },
      });
      if (res.status === 401) throw new Error('401 — проверь VAULT_ACCESS');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(1000 * (attempt + 1));
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// Next.js flight payload: every page embeds its data in
// self.__next_f.push([1,"…"]) chunks; entity objects are plain JSON inside.

function flightOf(html) {
  const chunks = [];
  const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let m;
  while ((m = re.exec(html)) !== null) chunks.push(JSON.parse(m[1]));
  return chunks.join('');
}

/** Smallest enclosing JSON object per slug containing `marker` (the
 * shortest is the entity itself, not a UI wrapper). */
function objectsBySlug(flight, marker) {
  const seen = new Map();
  let idx = 0;
  for (;;) {
    const key = flight.indexOf(marker, idx);
    if (key === -1) break;
    let start = -1;
    for (let s = key; s >= 0; s--) {
      if (flight[s] !== '{') continue;
      if (braceEnd(flight, s) > key) {
        start = s;
        break;
      }
    }
    if (start === -1) {
      idx = key + 1;
      continue;
    }
    const end = braceEnd(flight, start);
    const raw = flight.slice(start, end + 1);
    const slugMatch = raw.match(/"slug":"([a-z0-9-]+)"/);
    const slug = slugMatch ? slugMatch[1] : null;
    if (slug && (!seen.has(slug) || raw.length < seen.get(slug).length)) {
      seen.set(slug, raw);
    }
    idx = end;
  }
  const parsed = [];
  for (const [slug, raw] of seen) {
    try {
      parsed.push(JSON.parse(raw));
    } catch {
      console.warn(`  parse ${slug} failed, skipped`);
    }
  }
  return parsed;
}

function braceEnd(text, start) {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Detail-page HTML scraping (SSR markup, no deps).

function decodeEntities(text) {
  return text
    .replace(/<!-- -->/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function metaContent(html, name) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)="${name}"[^>]+content="((?:[^"\\\\]|\\\\.)*)"`,
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : null;
}

/** The <section> whose <h2> starts with `heading`, up to the next <h2.
 * h2 contents may embed icons (svg) — strip tags before matching. */
function sectionByHeading(html, heading) {
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, ''));
    if (!text.startsWith(heading)) continue;
    const rest = html.slice(m.index);
    const next = rest.slice(10).search(/<h2[\s>]/);
    return next === -1 ? rest : rest.slice(0, next + 10);
  }
  return '';
}

/** { minimum: {os,cpu,gpu,ram,storage}, recommended: {…} } from the
 * requirements cards. The old site labels rows in Russian — remapped to
 * the fixed-shape keys the admin form and the detail page render. */
const SYSREQ_KEYS = {
  'Система': 'os',
  'Процессор': 'cpu',
  'Видеокарта': 'gpu',
  'Оперативная память': 'ram',
  'Место на диске': 'storage',
};

function parseRequirements(html) {
  const section = sectionByHeading(html, 'Системные требования');
  if (!section) return null;
  const result = {};
  const groups = [
    ['Минимальные', 'minimum'],
    ['Рекомендуемые', 'recommended'],
  ];
  for (const [label, key] of groups) {
    const at = section.indexOf(`>${label}<`);
    if (at === -1) continue;
    const cardEnd = section.indexOf('</dl>', at);
    const card = section.slice(at, cardEnd === -1 ? undefined : cardEnd);
    const rows = {};
    const rowRe =
      /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g;
    let row;
    while ((row = rowRe.exec(card)) !== null) {
      const label = decodeEntities(row[1].replace(/<[^>]+>/g, ''));
      const mapped = SYSREQ_KEYS[label];
      if (mapped) rows[mapped] = decodeEntities(row[2].replace(/<[^>]+>/g, ''));
    }
    if (Object.keys(rows).length > 0) result[key] = rows;
  }
  return Object.keys(result).length > 0 ? result : null;
}

/** Numbered activation steps → "1. …\n2. …" (the instruction field). */
function parseActivation(html) {
  const section = sectionByHeading(html, 'Активация');
  if (!section) return null;
  const steps = [];
  const stepRe = /<span class="pt-0\.5">([\s\S]*?)<\/span>/g;
  let step;
  while ((step = stepRe.exec(section)) !== null) {
    const text = decodeEntities(step[1].replace(/<[^>]+>/g, ''));
    if (text) steps.push(text);
  }
  return steps.length > 0 ? steps.map((s, i) => `${i + 1}. ${s}`).join('\n') : null;
}

// ---------------------------------------------------------------------------

/** Flight payload quirk: missing values arrive as the literal string
 * "$undefined" — normalize the shapes we consume. */
const asList = (v) => (Array.isArray(v) ? v : []);
const asNumber = (v) => (typeof v === 'number' ? v : null);

function discountPercentOf(priceCents, oldPriceCents) {
  if (!oldPriceCents || oldPriceCents <= priceCents) return 0;
  return Math.round(((oldPriceCents - priceCents) / oldPriceCents) * 100);
}

async function downloadCover(imagePath, slug) {
  if (!imagePath || typeof imagePath !== 'string') return [];
  const ext = path.extname(imagePath).replace('.', '') || 'jpg';
  const filename = `${slug}.${ext}`;
  try {
    const res = await fetch(`${SITE}${imagePath}`, {
      headers: { cookie: COOKIE },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await mkdir(COVERS_DIR, { recursive: true });
    await writeFile(
      path.join(COVERS_DIR, filename),
      Buffer.from(await res.arrayBuffer()),
    );
    return [`/covers/${filename}`];
  } catch (error) {
    console.warn(`  cover ${slug} failed: ${error.message}`);
    return [];
  }
}

/** Upsert with full variant replace on update (re-runs must not stack
 * duplicate nominals). */
async function upsertProduct(externalId, slug, data, variants, note = '') {
  const existing = await prisma.product.findUnique({ where: { externalId } });
  const variantsAction = variants
    ? existing
      ? { deleteMany: {}, create: variants }
      : { create: variants }
    : undefined;
  if (existing) {
    await prisma.product.update({
      where: { externalId },
      data: { ...data, variants: variantsAction },
    });
    console.log(`updated     [${data.kind}] ${data.title}${note}`);
    return;
  }
  // The card slug is the desired address; suffix only on a real clash.
  let finalSlug = slug;
  let suffix = 2;
  while (await prisma.product.findUnique({ where: { slug: finalSlug }, select: { id: true } })) {
    finalSlug = `${slug}-${suffix++}`;
  }
  await prisma.product.create({
    data: { ...data, slug: finalSlug, externalId, variants: variantsAction },
  });
  console.log(`imported    [${data.kind}] ${data.title}${note}`);
}

async function importGame(card, categories) {
  const html = await fetchText(`${SITE}/product/${card.slug}`);
  const description = metaContent(html, 'og:description');
  const systemRequirements = parseRequirements(html);
  const instruction = parseActivation(html);
  const images = await downloadCover(card.image, card.slug);
  const priceCents = asNumber(card.price) * 100;
  const oldRub = asNumber(card.oldPrice);
  const oldPriceCents = oldRub != null ? oldRub * 100 : null;
  await upsertProduct(
    `vault:product:${card.slug}`,
    card.slug,
    {
      title: card.title,
      description,
      instruction,
      platform: card.platform ?? null,
      genre: asList(card.genres),
      images,
      priceCents,
      oldPriceCents,
      discountPercent: discountPercentOf(priceCents, oldPriceCents),
      cashbackPercent: asNumber(card.cashback) ?? 0,
      releaseYear: asNumber(card.releaseYear),
      rating: asNumber(card.rating),
      consoles: asList(card.consoles),
      tags: asList(card.tags),
      systemRequirements: systemRequirements ?? undefined,
      stock: GAME_STOCK,
      status: 'PUBLISHED',
      kind: 'GAME_KEY',
      creditingMode: 'AUTO_CODE',
      categoryId: categories.games,
    },
    undefined,
  );
}

async function importSubscription(service, categories) {
  const plans = asList(service.plans);
  const sorted = [...plans].sort((a, b) => a.price - b.price);
  const priceCents = sorted[0] ? sorted[0].price * 100 : 0;
  const variants = plans.map((plan, index) => ({
    label: plan.label,
    value: asNumber(plan.months),
    unit: plan.months != null ? 'мес.' : null,
    priceCents: plan.price * 100,
    oldPriceCents: asNumber(plan.oldPrice) != null ? asNumber(plan.oldPrice) * 100 : null,
    sortOrder: index,
  }));
  await upsertProduct(
    `vault:subscription:${service.slug}`,
    service.slug,
    {
      title: service.name,
      description: service.tagline ?? null,
      instruction:
        'Код активации придёт на почту сразу после оплаты. Введите его в магазине сервиса — подписка активируется сразу.',
      platform: null,
      genre: [],
      images: [],
      priceCents,
      oldPriceCents: null,
      discountPercent: 0,
      cashbackPercent: 0,
      releaseYear: null,
      rating: null,
      consoles: [],
      tags: [],
      tagline: service.tagline ?? null,
      group: service.group ?? null,
      features: asList(service.features),
      searchAliases: asList(service.searchAliases),
      stock: 0,
      status: 'PUBLISHED',
      kind: 'TOPUP_NOMINAL',
      creditingMode: 'AUTO_CODE',
      categoryId: categories.subscriptions,
    },
    variants,
    ` (${plans.length} тарифа)`,
  );
}

// --reset: drop everything imported earlier for a clean run.
if (process.argv.includes('--reset')) {
  const removed = await prisma.product.deleteMany({
    where: { externalId: { startsWith: 'vault:' } },
  });
  console.log(`reset: removed ${removed.count} previously imported products.`);
}

const categories = {};
for (const slug of ['games', 'subscriptions']) {
  const category = await prisma.category.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: slug === 'games' ? 'Игры' : 'Подписки',
    },
  });
  categories[slug] = category.id;
}

console.log('parsing catalog…');
// The default catalog list misses a few games — different sorts/filters
// surface different subsets («Похожие» strips rotate randomly). Merge the
// union; the full card wins over partial matches.
const cardBySlug = new Map();
for (const page of ['/catalog', '/catalog?sort=new', '/catalog?genre=rpg', '/']) {
  const flight = flightOf(await fetchText(`${SITE}${page}`));
  for (const card of objectsBySlug(flight, '"category":"games"')) {
    if (asNumber(card.price) == null || card.title == null) continue;
    const prev = cardBySlug.get(card.slug);
    if (!prev || (prev.price == null && asNumber(card.price) != null)) {
      cardBySlug.set(card.slug, card);
    }
  }
  await sleep(DELAY_MS);
}
// The old site renders some cards as markup without flight JSON (the
// embedding strategy changed mid-migration); their values are verified
// against the detail pages and recorded in docs/vault-games-source-map.md.
const SUPPLEMENT = [
  {
    slug: 'baldurs-gate-3',
    title: "Baldur's Gate 3",
    platform: 'steam',
    genres: ['rpg', 'strategy', 'adventure'],
    price: 3199,
    oldPrice: null,
    cashback: 7,
    releaseYear: 2023,
    rating: 4.9,
    cover: ['#7b2cbf', '#10002b'],
    image: '/covers/baldurs-gate-3.jpg',
    consoles: null,
    tags: ['hit'],
  },
];
for (const card of SUPPLEMENT) {
  if (!cardBySlug.has(card.slug)) cardBySlug.set(card.slug, card);
}
const gameCards = [...cardBySlug.values()];
console.log(`catalog: ${gameCards.length} games (incl. ${SUPPLEMENT.length} from the source map)`);

console.log('parsing subscriptions…');
const subsFlight = flightOf(await fetchText(`${SITE}/subscriptions`));
const services = objectsBySlug(subsFlight, '"plans":').filter(
  (service) => service.name != null && Array.isArray(service.plans),
);
console.log(`subscriptions: ${services.length} services`);

let done = 0;
for (const card of gameCards) {
  try {
    await importGame(card, categories);
    done++;
  } catch (error) {
    console.warn(`game ${card.slug} failed: ${error.message}`);
  }
  await sleep(DELAY_MS);
}
for (const service of services) {
  try {
    await importSubscription(service, categories);
    done++;
  } catch (error) {
    console.warn(`subscription ${service.slug} failed: ${error.message}`);
  }
  await sleep(DELAY_MS);
}

console.log(`\nDone: ${done}/${gameCards.length + services.length} entities imported as PUBLISHED.`);
await prisma.$disconnect();
