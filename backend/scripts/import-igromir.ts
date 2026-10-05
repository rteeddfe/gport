// One-off import of the reference catalog (igromir.yandex.ru — the store
// the owner is licensed to reuse) into the local database as DRAFT
// products. Idempotent: products are upserted by externalId
// ("igromir:product:<id>"), covers are downloaded to
// frontend/public/games/igromir/. Nothing is published automatically.
//
// Usage: node scripts/import-igromir.mjs [IMPORT_MAX=80]
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const API = 'https://gw.cg.yandex.ru/api/v1/store';
const SITE = 'https://igromir.yandex.ru';
const CATALOG_PAGES = ['/', '/catalog/game-goods', '/catalog/games', '/catalog/services'];
const MAX_PRODUCTS = Number(process.env.IMPORT_MAX ?? 80);
const DELAY_MS = 250;
const COVERS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../frontend/public/games/igromir',
);

const CATEGORIES = [
  { slug: 'game-currency', name: 'Игровые валюты' },
  { slug: 'games', name: 'Игры' },
  { slug: 'services', name: 'Пополнение сервисов' },
];
const TYPE_CATEGORY = {
  GAME_GOODS: 'game-currency',
  GAME: 'games',
  SERVICE: 'services',
};
const ACCOUNT_LABELS = {
  LOGIN: 'Логин аккаунта',
  ID: 'ID игрока',
  EMAIL: 'Email для получения',
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(1000 * (attempt + 1));
    }
  }
}

/** Pulls entity ids of every kind out of the SSR catalog/home HTML:
 * /game/ and /service/ are hubs (their pages list /product/ links),
 * /product/ are the purchasable products themselves. */
async function harvestIds() {
  const gameIds = new Set<string>();
  const productIds = new Set<string>();
  const serviceHubs = new Set<string>();
  for (const page of CATALOG_PAGES) {
    try {
      const res = await fetch(`${SITE}${page}`, { headers: { accept: 'text/html' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      for (const match of html.matchAll(/\/game\/(\d+)-[a-z0-9-]*/g)) gameIds.add(match[1]);
      for (const match of html.matchAll(/\/product\/(\d+)-[a-z0-9-]*/g)) productIds.add(match[1]);
      for (const match of html.matchAll(/\/service\/\d+-[a-z0-9-]*/g)) serviceHubs.add(match[0]);
      console.log(
        `harvest ${page}: games=${gameIds.size} products=${productIds.size} serviceHubs=${serviceHubs.size}`,
      );
    } catch (error) {
      console.warn(`harvest ${page} failed: ${error.message}`);
    }
    await sleep(DELAY_MS);
  }
  // Service hubs are not products themselves — their /product/ links are.
  for (const hub of serviceHubs) {
    try {
      const res = await fetch(`${SITE}${hub}`, { headers: { accept: 'text/html' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      for (const match of html.matchAll(/\/product\/(\d+)-[a-z0-9-]*/g)) productIds.add(match[1]);
    } catch (error) {
      console.warn(`hub ${hub} failed: ${error.message}`);
    }
    await sleep(DELAY_MS);
  }
  return { gameIds: [...gameIds], productIds: [...productIds] };
}

/** Every (deliveryType, region, valueCurrency) leaf of the options tree. */
function offerQueries(product) {
  const queries = [];
  const tree = product.optionsTree;
  if (!Array.isArray(tree) || tree.length < 2) {
    return [{ deliveryType: 'ACCOUNT', region: 'Любой', valueCurrency: '' }];
  }
  for (const delivery of tree[1]) {
    const regions = delivery.child?.[1] ?? [];
    for (const region of regions) {
      const currencies = region.child?.[1] ?? [{ value: '' }];
      for (const currency of currencies) {
        queries.push({
          deliveryType: delivery.value,
          region: region.value,
          valueCurrency: currency.value ?? '',
        });
      }
    }
  }
  return queries.slice(0, 6);
}

/** Joins the offers of all option branches, deduplicating by offer id. */
async function fetchOffers(product) {
  const byId = new Map();
  for (const query of offerQueries(product)) {
    const params = new URLSearchParams({
      deliveryType: query.deliveryType,
      region: query.region,
      ...(query.valueCurrency ? { valueCurrency: query.valueCurrency } : {}),
    });
    try {
      const offers = await fetchJson(`${API}/products/${product.id}/offers?${params}`);
      for (const offer of Array.isArray(offers) ? offers : []) byId.set(offer.id, offer);
    } catch (error) {
      console.warn(`  offers ${product.id} (${query.deliveryType}) failed: ${error.message}`);
    }
    await sleep(DELAY_MS);
  }
  return [...byId.values()];
}

function accountFieldFrom(offers) {
  const form = offers.find((offer) => offer.form?.length > 0)?.form?.[0];
  const kind = ACCOUNT_LABELS[form] ? form : 'LOGIN';
  return { accountFieldKind: kind, accountFieldLabel: ACCOUNT_LABELS[kind] };
}

/** A GAME product's offers are its editions (valueString = edition name,
 * deliveryType EMAIL) — one edition = one GAME_KEY product of ours. */
function editionsFrom(offers) {
  const byName = new Map();
  for (const offer of offers) {
    const name = offer.valueString ?? offer.valueCurrency;
    if (name && !byName.has(name)) byName.set(name, offer);
  }
  return [...byName.entries()].map(([edition, offer]) => ({ edition, offer }));
}

/** «The Last of Us Part I - Deluxe Edition Steam Game» → «Deluxe Edition». */
function editionSuffix(productName, edition) {
  const lowerProduct = productName.toLowerCase();
  const lowerEdition = edition.toLowerCase();
  if (lowerEdition.startsWith(lowerProduct)) {
    return edition.slice(productName.length).replace(/^[\s—–-]+/, '');
  }
  return edition;
}

async function downloadCover(product, game, slug) {
  const url = product.cover?.[0]?.src ?? game?.cover?.[0]?.src;
  if (!url) return [];
  const ext = url.match(/\.(webp|png|jpe?g)(?:\?|$)/i)?.[1] ?? 'webp';
  const filename = `${slug}.${ext}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await mkdir(COVERS_DIR, { recursive: true });
    await writeFile(path.join(COVERS_DIR, filename), Buffer.from(await res.arrayBuffer()));
    return [`/games/igromir/${filename}`];
  } catch (error) {
    console.warn(`  cover ${slug} failed: ${error.message}`);
    return [];
  }
}

async function uniqueSlug(base) {
  let slug = base;
  let suffix = 2;
  while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

async function upsertProduct(externalId, baseSlug, data, note = '') {
  const existing = await prisma.product.findUnique({ where: { externalId } });
  if (existing) {
    await prisma.product.update({
      where: { externalId },
      data: { ...data, slug: undefined, status: 'DRAFT' },
    });
    console.log(`updated  [${data.kind}] ${data.title}${note}`);
    return true;
  }
  await prisma.product.create({
    data: { ...data, slug: await uniqueSlug(baseSlug), externalId },
  });
  console.log(`imported [${data.kind}] ${data.title}${note}`);
  return true;
}

async function importProduct(product, game) {
  const offers = await fetchOffers(product);
  if (offers.length === 0) {
    console.warn(`skip ${product.id} ${product.name}: no offers`);
    return false;
  }
  const coverImages = await downloadCover(product, game, product.slug);
  const region = offers.find((offer) => offer.region)?.region ?? null;
  const categoryId = categories[TYPE_CATEGORY[product.type] ?? 'services'];

  // Regular games: each edition becomes its own key product (the key
  // pool is per product, so editions must not share one product).
  if (product.type === 'GAME') {
    const editions = editionsFrom(offers);
    let imported = 0;
    for (const { edition, offer } of editions) {
      const suffix = editionSuffix(product.name, edition);
      const title = suffix ? `${product.name} — ${suffix}` : product.name;
      const externalId = `igromir:product:${product.id}:${edition}`;
      const { accountFieldKind, accountFieldLabel } = accountFieldFrom([offer]);
      imported += Number(
        await upsertProduct(
          externalId,
          `${product.slug ?? `igromir-${product.id}`}${suffix ? `-${slugPart(suffix)}` : ''}`,
          {
            title,
            description: product.description?.short ?? game?.description?.short ?? null,
            images: coverImages,
            priceCents: offer.price,
            stock: 0,
            status: 'DRAFT',
            kind: 'GAME_KEY',
            minValue: null,
            maxValue: null,
            creditingMode: 'AUTO_CODE',
            accountFieldKind,
            accountFieldLabel,
            accountFieldHint: null,
            region: offer.region ?? region,
            categoryId,
          },
          editions.length > 1 ? ' (издание)' : '',
        ),
      );
    }
    return imported > 0;
  }

  const kind = offers.some((offer) => offer.minValue != null && offer.maxValue != null)
    ? 'TOPUP_AMOUNT'
    : 'TOPUP_NOMINAL';
  // The ACCOUNT branch is the storefront default («по логину»); its
  // offers are the clean nominals — the EMAIL/VAUCHER branch repeats
  // them with provider-branded labels. Prefer ACCOUNT, fall back to all.
  const nominalOffers = offers.filter((offer) => offer.deliveryType === 'ACCOUNT');
  const variantSource = nominalOffers.length > 0 ? nominalOffers : offers;
  const { accountFieldKind, accountFieldLabel } = accountFieldFrom(variantSource);

  const variants = [...variantSource
    .filter((offer) => offer.value != null)
    .reduce((unique, offer) => {
      const key = `${offer.valueString ?? offer.value}|${offer.price}`;
      if (!unique.has(key)) {
        unique.set(key, {
          label: offer.valueString ?? `${offer.value} ${offer.valueCurrency ?? ''}`.trim(),
          value: offer.value,
          unit: offer.valueCurrency != null && offer.valueCurrency !== 'RUB' ? offer.valueCurrency : null,
          priceCents: offer.price,
        });
      }
      return unique;
    }, new Map())
    .values()]
    .sort((a, b) => a.priceCents - b.priceCents);

  const range = offers.find((offer) => offer.minValue != null && offer.maxValue != null);
  const externalId = `igromir:product:${product.id}`;
  const baseSlug = product.slug ?? `igromir-${product.id}`;
  return upsertProduct(externalId, baseSlug, {
    title: product.name,
    description: product.description?.short ?? game?.description?.short ?? null,
    images: coverImages,
    // Starting prices — the admin reviews them before publishing.
    priceCents: product.minPrice ?? variants[0]?.priceCents ?? range?.minValue ?? 0,
    stock: 0,
    status: 'DRAFT',
    kind,
    minValue: kind === 'TOPUP_AMOUNT' ? range.minValue : null,
    maxValue: kind === 'TOPUP_AMOUNT' ? range.maxValue : null,
    creditingMode: 'MANUAL',
    accountFieldKind,
    accountFieldLabel,
    accountFieldHint: null,
    region,
    categoryId,
    variants:
      kind === 'TOPUP_NOMINAL'
        ? { create: variants.map((v, i) => ({ ...v, sortOrder: i })) }
        : undefined,
  });
}

/** Latin-ish slug fragment of an edition suffix. */
function slugPart(text) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'edition'
  );
}

const categories = {};
for (const { slug, name } of CATEGORIES) {
  const category = await prisma.category.upsert({
    where: { slug },
    update: {},
    create: { slug, name },
  });
  categories[slug] = category.id;
}

// --reset: drop everything imported earlier (DRAFT only) for a clean run.
if (process.argv.includes('--reset')) {
  const removed = await prisma.product.deleteMany({
    where: { externalId: { startsWith: 'igromir:' } },
  });
  console.log(`reset: removed ${removed.count} previously imported products.`);
}

console.log('harvesting ids…');
const { gameIds, productIds } = await harvestIds();

const games = new Map<string, any>();
const hubProductIds = new Set<string>();
for (const id of gameIds) {
  try {
    const game = await fetchJson(`${API}/games/${id}`);
    games.set(id, game);
    for (const collection of game.collections ?? []) {
      for (const productId of collection.productIds ?? []) hubProductIds.add(productId);
    }
  } catch (error) {
    console.warn(`game ${id} failed: ${error.message}`);
  }
  await sleep(DELAY_MS);
}
for (const id of hubProductIds) productIds.push(id);

const products = [];
for (const id of productIds) {
  if (products.length >= MAX_PRODUCTS) break;
  try {
    products.push(await fetchJson(`${API}/products/${id}`));
  } catch (error) {
    console.warn(`product ${id} failed: ${error.message}`);
  }
  await sleep(DELAY_MS);
}

console.log(`importing ${products.length} products…`);
let done = 0;
for (const product of products) {
  const game = product.gameId ? games.get(String(product.gameId)) : undefined;
  try {
    if (await importProduct(product, game)) done++;
  } catch (error) {
    console.warn(`product ${product.id} ${product.name} failed: ${error.message}`);
  }
  await sleep(DELAY_MS);
}

console.log(`\nDone: ${done}/${products.length} products imported as DRAFT.`);
console.log('Review prices/covers in /admin/products, then publish.');
await prisma.$disconnect();
