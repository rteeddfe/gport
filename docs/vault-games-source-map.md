# Vault Games — source site entity map

Inventory of the previous store (source for catalog migration): section tree,
taxonomy, every entity with its exact fields, and the full data inventory
scraped on 2026-10-06. This document is a **map only** — the import design
(mapping onto our Prisma schema) is decided separately.

- Source: `http://31-57-28-12.sslip.io/` (Next.js App Router, "Vault Games",
  demo-preview build). The whole site is behind a preview gate: requests must
  carry the `demo_access` cookie (set by opening any URL with
  `?access=<token>`; token kept out of the repo — see chat/memory).
- **There is no JSON API.** `/api/*` returns 404. All data ships inside the
  RSC flight payload embedded in each page's HTML
  (`self.__next_f.push([1,"…"])` chunks). Extraction = fetch pages with the
  cookie + parse those chunks. Note: with PPR, flight payloads contain a
  prerendered 404 fallback («Такой страницы нет») for streamed segments — it
  is an artifact, not a real 404; judge pages by their rendered content.

## 1. Site tree

```
/                        Home (popular / new / sale game carousels, subscriptions
                         where showOnHome, Steam top-up banner, FAQ, articles teaser)
├── /catalog             Game catalog — the only list page; flat facets, no category tree
│   └── /product/<slug>  Game detail page (15 games)
├── /subscriptions       Subscription services index (10 services)
│   └── /subscriptions/<slug>
├── /topup/steam         Steam wallet top-up (single hardcoded service)
├── /articles            Blog index (5 articles)
│   └── /articles/<slug>
├── /cart                Cart
├── /login               Sign in
├── /orders/find         «Find my order» by lookup
└── /contacts            Contacts (Telegram support)
```

Navigation sections: Магазин (`/catalog`), Пополнение Steam (`/topup/steam`),
Подписки (`/subscriptions`), Скидки (`/catalog?sale=1`), Статьи (`/articles`),
Помощь (guides + orders/find + contacts).

## 2. Catalog taxonomy (the old site's "categories")

No nested category tree — `/catalog` filters by flat facets:

| Facet | Param | Values |
| --- | --- | --- |
| Platform | `platform` | `steam`, `playstation`, `xbox`, `nintendo` |
| Genre | `genre` | `action`, `rpg`, `shooter`, `strategy`, `racing`, `sport`, `indie`, `horror`, `adventure`, `open-world`, `sandbox`, `survival`, `simulator`, `fighting`, `platformer`, `puzzle`, `mmo` (17) |
| Price band | `price` | `under-1000`, `1000-3000`, `over-3000` |
| Sale | `sale` | `1` |
| Sort | `sort` | popular (default), `price-asc`, `price-desc`, `discount`, `new` |

Products carry `category: "games"` always; subscriptions and top-up are
separate entities, not catalog categories. Genre chips link back into the
catalog (`/catalog?genre=rpg`); a product's "related games" = same primary
genre.

## 3. Entities

### 3.1 Game product — catalog card

15 items. Exact card object (all fields always present unless noted):

```json
{
  "slug": "marvels-spider-man-2",
  "title": "Marvel's Spider-Man 2",
  "category": "games",
  "platform": "playstation",
  "genres": ["action", "open-world", "adventure"],
  "price": 4700,
  "oldPrice": 10000,
  "cashback": 5,
  "releaseYear": 2025,
  "rating": 4.8,
  "description": "",
  "cover": ["#aa0606", "#1f0101"],
  "image": "/media/covers/2794418d989594af.webp",
  "consoles": ["PlayStation 5", "PlayStation 4"],
  "tags": ["hit"],
  "inStock": true,
  "sold": 1
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `slug` | string | URL key (`/product/<slug>`) |
| `title` | string | |
| `category` | enum | always `"games"` |
| `platform` | enum | `steam` / `playstation` / `xbox` / `nintendo` |
| `genres` | string[] | subset of the 17-value genre taxonomy |
| `price` | int | **rubles, not kopecks** |
| `oldPrice` | int \| null | crossed-out price; discount % and savings are computed from it |
| `cashback` | int | percent (3 / 5 / 7 / 10 seen) — "вернём N% на баланс" |
| `releaseYear` | int | |
| `rating` | float | 4.1–4.9, out of 5 |
| `description` | string | empty in card payloads; full text only on the detail page |
| `cover` | string[2] | gradient colors for the placeholder tile |
| `image` | string | cover path; mostly `/covers/<slug>.jpg`, two uploaded files under `/media/covers/<hash>.webp` |
| `consoles` | string[] \| null | console generations (e.g. `["PlayStation 5","PlayStation 4"]`, `["Nintendo Switch","Nintendo Switch 2"]`) |
| `tags` | string[] | `"hit"` (Хит), `"new"` (Новинка) |
| `inStock` | boolean | |
| `sold` | int | sales counter (0/1 in demo data) |

### 3.2 Game product — detail page additions

The detail page renders the same card object plus page-level sections:

- Full `description` (paragraph text; also reused as og:description).
- **Системные требования** — two columns (МИНИМАЛЬНЫЕ / РЕКОМЕНДУЕМЫЕ), each:
  Система, Процессор, Видеокарта, Оперативная память, Место на диске.
- **Активация ключа Steam** — activation instructions section (per platform).
- Buy panel: old price, discount %, price, «Экономия N ₽», «Вернём N ₽ кешбэком
  на баланс», «Купить сейчас» + «В корзину», trust badges («Ключ придёт на
  почту сразу после оплаты», «Вернём деньги, если ключ не подойдёт»).
- **Похожие игры** — 5 cards sharing the primary genre, link «Весь жанр "X" →».
- Breadcrumb: Главная → Игры → <Platform> → <Title>. Badge «Ключ для Steam».
- SEO: `og:title` = `<Title> — купить ключ <Platform>`.

### 3.3 Subscription service

10 items. Exact object:

```json
{
  "slug": "playstation-plus",
  "name": "PlayStation Plus",
  "group": "gaming",
  "tagline": "Онлайн-игра, каталог игр для PS4 и PS5, облачные сохранения",
  "delivery": "code",
  "brand": "playstation",
  "searchAliases": ["пс плюс", "ps plus", "плейстейшн", "psn"],
  "features": ["Сетевая игра на PS4 и PS5", "..."],
  "colors": ["#00439c", "#0070d1"],
  "plans": [
    { "id": "essential-1", "label": "Essential · 1 мес", "price": 790, "months": 1 },
    { "id": "essential-12", "label": "Essential · 12 мес", "price": 4490, "months": 12, "oldPrice": 5290 }
  ],
  "showOnHome": true
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `slug` / `name` | string | |
| `group` | enum | `gaming` / `ai` / `media` / `social` — the subscription "categories" |
| `tagline` | string | one-line description |
| `delivery` | enum | always `"code"` (activation code by e-mail) |
| `brand` | string | `playstation`, `xbox`, `nintendoSwitch`, `ea`, `openai`, `midjourney`, `spotify`, `youtube`, `telegram`, `discord` |
| `searchAliases` | string[] | folk search terms (Cyrillic incl.) |
| `features` | string[] | «Что входит» list |
| `colors` | string[2] | brand gradient |
| `plans` | Plan[] | `{ id, label, price (int ₽), months (1/3/6/12), oldPrice? }` |
| `showOnHome` | boolean | home carousel flag (5 of 10 are true) |

Detail page adds a static 3-step «Как получить» (choose plan → code arrives by
e-mail → redeem in the service store) and «Другие подписки» cross-links.

### 3.4 Top-up service (Steam)

Single hardcoded page, not a data entity. Parameters visible on the page:

- Service: Steam wallet top-up by **login** («Имя, под которым вы входите в
  Steam, а не никнейм в профиле»).
- Limits: **100 ₽ – 30 000 ₽**; **commission 6%** shown up front.
- Delivery: «деньги приходят на кошелёк за 1–5 минут».
- Page blocks: «Как это работает», FAQ.

### 3.5 Article (blog)

5 items. Fields observed from the index/detail UI (no compact JSON object in
flight): `slug`, `title`, category chip (`Гайды` / `Подборки`), display date
(day-month, e.g. «24 сентября»), rich-text body (headings, lists), «Читайте
также» related links.

| Slug | Category |
| --- | --- |
| `kak-aktivirovat-klyuch-steam` | Гайды |
| `kak-popolnit-steam-po-loginu` | Гайды |
| `ps-plus-essential-extra-deluxe` | Гайды |
| `luchshie-skidki` | Подборки |
| `bolshie-rpg` | Подборки |

## 4. Inventory (scraped 2026-10-06)

### Games (15)

| Slug | Platform | Price | Old | CB% | Year | Rating | Tags | Genres |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| marvels-spider-man-2 | playstation | 4700 | 10000 | 5 | 2025 | 4.8 | hit | action, open-world, adventure |
| red-dead-redemption-2 | steam | 1299 | 3299 | 5 | 2019 | 4.8 | — | action, open-world, adventure |
| forza-horizon-5 | xbox | 1990 | 3490 | 5 | 2021 | 4.7 | — | racing, sport, open-world, simulator |
| elden-ring | steam | 2799 | 3999 | 5 | 2022 | 4.9 | hit | rpg, action, open-world, adventure |
| hollow-knight-silksong | steam | 699 | — | 10 | 2025 | 4.8 | new, hit | indie, action, platformer, adventure |
| ea-sports-fc-26 | playstation | 5299 | — | 3 | 2025 | 4.1 | hit | sport, simulator |
| civilization-7 | steam | 3999 | 4200 | 7 | 2025 | 4.3 | new | strategy |
| hades-2 | steam | 899 | — | 10 | 2025 | 4.8 | new | indie, action, rpg |
| resident-evil-4 | steam | 1799 | 3599 | 5 | 2023 | 4.8 | — | horror, action, survival |
| counter-strike-2-prime | steam | 1290 | — | 3 | 2023 | 4.4 | — | shooter |
| zelda-tears-of-the-kingdom | nintendo | 4599 | — | 3 | 2023 | 4.9 | — | action, rpg, open-world, adventure, puzzle |
| cyberpunk-2077 | steam | 1499 | 2999 | 5 | 2020 | 4.6 | hit | rpg, action, shooter, open-world, adventure |
| god-of-war-ragnarok | playstation | 3499 | 4999 | 5 | 2022 | 4.9 | hit | action, adventure |
| baldurs-gate-3 | steam | 3199 | — | 7 | 2023 | 4.9 | hit | rpg, strategy, adventure |
| subnautica | steam | 1600 | 1900 | 5 | 2018 | 4.4 | — | indie, horror, survival, open-world, adventure |

All `inStock: true`; `sold` is 0 or 1 (demo data). `description` is empty on
every card — full texts exist only on detail pages and must be scraped
per-page during import, together with system requirements.

### Subscriptions (10)

| Slug | Name | Group | Plans (label → price ₽ / months) |
| --- | --- | --- | --- |
| playstation-plus | PlayStation Plus | gaming | Essential 1мес 790; Essential 12мес 4490 (old 5290); Extra 1мес 1190; Extra 12мес 7990 (old 9490); Deluxe 12мес 9490 |
| xbox-game-pass | Xbox Game Pass | gaming | Core 1мес 690; PC 1мес 890; Ultimate 1мес 1290; Ultimate 3мес 2490 (old 2990) |
| nintendo-switch-online | Nintendo Switch Online | gaming | 3мес 690; 12мес 1990; 12мес+Expansion 3990 |
| ea-play | EA Play | gaming | 1мес 490; 12мес 2990 |
| chatgpt | ChatGPT | ai | Plus 1мес 2490; Pro 1мес 23990 |
| midjourney | Midjourney | ai | Basic 1мес 1190; Standard 1мес 3490 |
| spotify | Spotify Premium | media | 1мес 590; 3мес 1590; 12мес 5490 (old 6990) |
| youtube-premium | YouTube Premium | media | 1мес 490; 12мес 4990 |
| telegram-premium | Telegram Premium | social | 3мес 1190; 6мес 1990; 12мес 3490 |
| discord-nitro | Discord Nitro | social | Basic 1мес 290; Nitro 1мес 890; Nitro 12мес 8490 (old 9990) |

`showOnHome: true` for: playstation-plus, chatgpt, xbox-game-pass, spotify,
telegram-premium.

## 5. Correspondence to our domain model (factual, no decisions)

| Old site | Our schema (today) |
| --- | --- |
| Game product | `Product` with `kind=game`-style typing (`Product.kind`, `ProductVariant`, crediting fields already exist) |
| Subscription service + plans | `Product` per service + `ProductVariant` per plan (duration as variant) |
| Steam top-up service | existing top-up service pattern (`Product` with commission + min/max, `/topup/[slug]`) |
| Platform facet | platform field / catalog filter |
| Genre facet | `Product.genre` |
| Tags (`hit`, `new`) | product flags/badges |
| Cover gradient + image | cover image (dev-only `/games/` covers locally; real covers need upload) |

Prices on the old site are integer **rubles**; our schema stores **kopecks**
(`priceCents`) — multiply by 100 at import. Cashback % maps to our cashback
concept if we keep it. `sold`/`rating` are demo-grade data — decide during
import whether to carry them.
