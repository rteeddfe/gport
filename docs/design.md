# Design — UX/UI

Single dark neon theme (no light theme, no theme switcher). Reference:
a neon gaming-store layout — glassmorphism surfaces, violet primary
actions, cyan accents, glow effects. This document is the design source
of truth; the tokens are implemented in `frontend/app/globals.css`.

Status: token layer applied. Page templates below are the design target —
screens are redesigned one by one after this spec is approved.

## Color tokens

| Token | Hex | Role | Where it is used |
| --- | --- | --- | --- |
| Canvas | `#0B0D12` | Page background | `body`, page sections |
| Surface | `#141720` | Cards, sections, header | `--card`, `--sidebar` |
| Raised | `#1D212D` | Raised elements | Inputs, hover states, popovers, secondary buttons |
| Border | `#2A3040` | All borders and dividers | `--border`, `--input` |
| Text / Primary | `#F4F5FA` | Headings, body text | `--foreground` |
| Text / Muted | `#929BAF` | Secondary text, captions, strikethrough old price | `--muted-foreground` |
| Action / Primary | `#8B5CF6` | Actions only | Buttons, active states, focus rings, links-that-act |
| Accent | `#55DDE5` | Information accents | Discount/bonus badges, gradient ends, highlights — not buttons |

Rules:

- Roughly 60/30/10: canvas/surface dominate, violet is reserved for
  actions, cyan is reserved for accents. Violet buttons never get cyan
  text; cyan is never a large fill.
- `--primary` = violet, so every existing shadcn component follows the
  palette without per-component overrides.
- Destructive stays red (shadcn default) for validation and errors.
- Brand tokens for direct use: `bg-canvas`, `bg-surface`, `bg-raised`,
  `bg-brand`/`text-brand`, `text-neon`, plus `--color-brand-bright`
  `#A78BFA` for gradient starts and hovers.

## Effects (the signature layer)

Implemented as Tailwind 4 utilities in `globals.css`:

| Utility | Effect | Used for |
| --- | --- | --- |
| `glass` | 62% surface + `backdrop-blur(16px)` | Sticky header, drawers, popovers, hero cards |
| `glow-brand` | Violet neon `box-shadow` | Primary button hover, active tiles, focus highlights |
| `glow-neon` | Cyan neon `box-shadow` | Accent details, active category tiles |
| `text-gradient` | Violet→cyan gradient text | Hero headlines, brand wordmark |
| `neon-border` | Gradient hairline border (violet→cyan) over `--card` fill | Hero banners, highlighted cards |

Plus a page-level aurora: fixed radial violet/cyan glows behind content
(on `body`), violet `::selection`, `color-scheme: dark`.

Interaction language: 150–200 ms ease-out; card hover lifts 2 px and
brightens the border toward violet; focus rings are violet with a soft
glow. No bouncy/springy motion.

## Typography and shape

- Geist Sans / Geist Mono, both with the Cyrillic subset enabled
  (UI copy is Russian).
- Scale: h1 40–48 extrabold tracking-tight · h2 24–30 bold · card title
  16–18 semibold · body 14–16 · captions 12–13 in muted.
- Prices use `tabular-nums`; old price is muted with a strikethrough.
- Base radius 12 px (`--radius`); cards render ≈20 px, pills `rounded-full`.
- Container 1232 px box (16 px side padding → 1200 px content, aligned
  with the header capsule edge-to-edge); section rhythm `py-16`; grid gaps
  16–24 px.

## Component patterns

- **Button** — primary (violet, `glow-brand` on hover), secondary
  (raised), outline, ghost, link. Disabled = 50% opacity, no glow.
- **Input / Select** — raised background, `#2A3040` border, violet focus
  ring with glow.
- **Product card** — cover image (3:4), title, muted genre/platform line,
  price with optional old price, discount badge (cyan on `neon/10`);
  hover lift + border brightening. Cover placeholder: violet/cyan
  gradient block, not a gray box.
- **Badge** — pill; discount/bonus cyan; neutral status on raised.
- **Header** — floating capsule (approved variant 5): sticky wrapper
  (`top-0`, `px-4 pt-4`, `pointer-events-none` with the capsule itself
  `pointer-events-auto`), capsule = `glass` + `rounded-2xl` + violet glow
  shadow, 1200 px wide: logo (`public/logo2.png`) + descriptor
  «магазин цифровых товаров», menu «Каталог · Пополнение · Акции» (icon +
  text, active = raised pill with violet icon), circular search button
  opening a command-palette dialog over `GET /search/suggest`, auth widget
  («Войти» / avatar dropdown with role badge and sign-out), mobile menu in
  a right Sheet.
- **Hero banner (home, first block)** — approved variant 2 «Терминал»
  (`features/home/components/hero-banner.tsx`; picked 2026-10-03 from
  five demos on a `/design/banners` scratch page — Сияние, Терминал,
  Витрина, Контур, Постер — demo deleted): a techy `bg-surface`
  `rounded-3xl` card with soft violet/cyan radial-gradient washes (the
  news-card cover language — grid pattern and HUD rings removed same
  day per user request) and a circular 3D card carousel on the right
  (`hero-carousel.tsx`, placeholder art — see below). Content: neon kicker
  «Пополнение сервисов», visible `<h1>` «Пополняй любимые игры» +
  `text-gradient` «по выгодному курсу», two CTA buttons — violet «Пополнение» → `/topup` with a
  white-ring `Wallet` chip and outline «Каталог игр» (admin-managed
  label/href, default `/products`) with a `brand/15` `Gamepad2` chip. Below, a 4-column row (2/1
  on small screens) of advantage tiles — «Призраки» design, picked
  2026-10-04 from five demos on a `/design/tiles` scratch page (demo
  deleted): each tile is `bg-canvas/70` with a short violet→cyan
  gradient tick at the top edge and a giant ghost numeral
  (`font-mono text-7xl`, `text-foreground/[0.06]`) cropped by the
  tile's bottom-right corner; texts: «Без ограничений, регистрации и
  верификации», «Без скрытых комиссий и платежей», «Моментальная
  доставка после оплаты», «Много способов оплаты». Banner staggers in
  like the wall (client component, itemVariants rise 24 px).
- **Hero service wall (home, second block)** — majestic-style poster
  wall, approved variant «Мозаика»: a frameless 7-column wall of
  posters (260 px tall on desktop since 2026-10-03 — halved per user
  request; `rounded-2xl`, tight 10 px gaps; 2/3 columns with portrait
  tiles on mobile), six top-up services (PlayStation, Battle.net,
  Nintendo, Apple ID, Telegram Premium, Telegram Stars — full-bleed art
  + name/price over a bottom scrim) and a center CTA tile
  «Посмотреть все» → `/topup` on a violet→cyan gradient, always glowing.
  On `hover: hover` devices art stays monochrome
  (`saturate(0) brightness(0.9)`) until hovered: the tile colorizes,
  lifts 4 px and tints its border in its own brand color
  (`--tile-glow`); the art zooms to 1.05; the brand mark scales 1.08.
  Hovering the CTA plays the same hover on every tile at once,
  staggered by `--tile-index`, and lights the backdrop washes + blurred
  blobs centered on the wall itself (~48% of the section height, sized
  to the card row since the halving) so the glow halos the cards, not
  the whole block.
  Tile brand colors are service imagery, not theme accents. SVG marks
  live in `public/brands/` (Simple Icons); Nintendo is a CSS pill.
  (Five style variants were demoed on a `/design/heroes` scratch page —
  glass, posters, neon frames, mosaic, wide — mosaic picked and the demo
  deleted.)
- **Hero circular carousel (banner art, placeholder)** —
  `features/home/components/hero-carousel.tsx` (client component,
  ordered 2026-10-03: «круговая карусель с эффектом объема… пока с
  фолбэками изображений и рыба текстом», then «сделать
  пропорциональнее… возможность её крутить… поднять выше… часть
  карточек скрыть за блоком… больше расстояние между карточками»):
  8 cards (covers borrowed from the «Игровые валюты» block —
  `public/games/*.jpg`, DEVELOPMENT-ONLY placeholder art — plus dummy
  title «Название товара» / price «от 999 ₽») on a CSS-3D ring
  (`.carousel-*` in `globals.css`: scene `perspective: 1000px`,
  positioners place cards at `translateZ(240px)` (raised from 220 for
  more air between cards, 2026-10-03), face height 226 px).
  Rotation is a framer motion value: `useAnimationFrame` auto-spins at
  12°/s (paused while dragging and under `prefers-reduced-motion`),
  horizontal pointer drag adds to the same value (`DRAG_FACTOR` 0.35,
  pointer capture, `touch-none`), and each face counter-rotates by
  `-(angle + slot)` via `useTransform` so cards always face the viewer.
  The ring carries a `-14°` rotateX tilt (ellipse view from above);
  the scene is a 440 px square shifted right and up (`translate-x-12
  -translate-y-14`) so the right-hand cards bleed past the banner's
  `overflow-hidden` edge. Replaced the interim store-logo art on the
  banner's right side.
- **Reviews (home, third block)** — `features/home/components/
  reviews-section.tsx`: `SectionHeading` (cyan kicker «Отзывы» + h2
  «Что говорят игроки» with a `text-gradient` tail) over a 1/2/4-column
  grid of `rounded-2xl border bg-surface` cards: cyan stars
  (`fill-neon`, 4/5 for one review), quote text, footer with an
  initials circle on a `brand/40→neon/30` gradient, name and the
  reviewed service in muted small text. Content is a static placeholder
  list in the component — no reviews entity exists yet.
- **News (home, fourth block)** — `features/home/components/
  news-section.tsx`: `SectionHeading` («Новости» / «Что нового в
  магазине») over a 1/2/3-column grid of `rounded-2xl border
  bg-surface` articles: a 16/9 cover of the store logo (`/logo2.png`,
  `h-14`, fallback until news images exist) centered on `bg-canvas`
  with soft violet/cyan radial washes, then mono cyan date, title,
  muted excerpt. No links yet — there is no news page. Static
  placeholder list in the component.
- **FAQ (home, fifth block)** — `features/home/components/
  faq-section.tsx`: `SectionHeading` («FAQ» / «Частые вопросы») over a
  full-width shadcn `Accordion` (`components/ui/accordion.tsx`,
  new file — Radix Accordion from the `radix-ui` meta-package,
  `accordion-down/up` keyframes from `tw-animate-css`): each item is a
  `rounded-2xl border bg-canvas/70 px-5` card with a semibold question,
  rotating chevron and muted answer. (A two-column variant with a
  decorative icon panel on the right existed briefly on 2026-10-03 and
  was removed per user request — the block stays single-column.) Copy
  mirrors the hero theses (no registration, instant delivery, no hidden
  fees); answers are placeholders until the business processes are
  approved.
- **SectionHeading** — `features/home/components/section-heading.tsx`:
  shared homepage section header (cyan `tracking-[0.3em]` kicker +
  `text-3xl/4xl` h2, optional `text-gradient` span) used by the three
  blocks above; same language as the hero banner kicker.
- **Game currencies (home, third block)** — `features/home/components/
  game-currency-section.tsx`: the ONLY data-driven home block — a
  Server Component that fetches `getProducts({ categorySlug:
  "game-currency", limit: 11 })` (the public endpoint always scopes to
  `status: PUBLISHED`) in the same style as the `/products` page
  (service → try/catch). Renders nothing when the API is down or the
  category is empty. Poster grid per the reference (2/3/6 columns):
  3/4 cover on top, `rounded-2xl border bg-surface` card, truncated
  title and a bold tabular price («499 ₽», ru-RU) — no «от» prefix yet
  (products are package-level; grouping per game is future work).
  Covers go through `product-cover.tsx` (client): the neon-wash
  backdrop with the store logo (`/logo2.png`) is always painted and the image
  overlays it — `onError` hides a failed image so a broken cover
  degrades to the fallback instead of a broken-image icon. Cover art
  lives in `frontend/public/games/*.jpg` (600×900, downloaded
  2026-10-03 from igromir.yandex.ru as DEVELOPMENT-ONLY placeholders —
  copyrighted game art, replace with licensed assets before
  production); the seed now holds 11 `game-currency` products pointing
  at those local paths (earlier picsum.photos URLs are gone — that host
  is 403-blocked on this network, so `next.config.ts` needs no remote
  patterns). A final «Ещё» tile (`LayoutGrid` +
  «Ещё») links to `/products`. Page order (updated 2026-10-03): banner →
  top-up banner → wall → currencies → reviews → stats+socials → news →
  FAQ (SystemStatus removed from the page 2026-10-03; the component and
  `useHealth` stay in `features/health`). Home sections keep a uniform
  spacing rhythm (normalized 2026-10-03): every section carries only
  `pb-16` — no top paddings except the hero's `pt-4` header clearance —
  so every block gap is a consistent 64 px.
- **Motion layer (framer-motion)** — hero tiles are wrapped in motion
  divs (`hero-services.tsx`, client component) that stagger in on load
  (`staggerChildren: 0.06`, rise 28 px, 0.5 s ease-out). Activating
  «Посмотреть все» plays the reverse — tiles dissolve upward staggered
  while the neon wash fades — and only then `router.push('/topup')`;
  modified clicks (new tab) keep the browser default. Hover
  transforms stay in CSS on the inner `.service-tile`, motion wrappers
  own only entrance/exit, so CSS `:hover` and framer never fight over
  inline transforms. Every `(public)` route fades in via
  `app/(public)/template.tsx` — the theme's «in-focus» effect (0.5 s:
  opacity 0 → 1, y 18 → 0, blur 10 px → 0, signature ease; sharpened
  from a plain 0.35 s fade per user request «при переходе по роутам
  надо какой-нибудь эффект»); template
  remounts per navigation, header/footer stay put; enter-only — App
  Router has no exit slot). Content sections stagger in on scroll
  (added 2026-10-03, user: «добавь везде где уместно на главной»):
  currencies, reviews and news run a client container with
  `whileInView` (`once: true, margin: -80px`) over the shared presets
  in `features/home/components/motion-presets.ts` (`staggerContainer`
  0.08 s per child + `riseItem` y-24/0.5 s — the hero banner reuses
  the same presets, and its carousel joins the banner stagger); the
  currency section keeps its server-side fetch and delegates rendering
  to the client `GameCurrencyGrid`; FAQ rises as heading + list.
  Entrance-only — hover
  transforms stay in CSS. All motion respects `prefers-reduced-motion`
  via `MotionConfig reducedMotion="user"`, and the hero skips the exit
  delay entirely under reduced motion. Hover rendering is kept
  compositor-friendly: tiles and art layers are pre-promoted
  (`will-change: transform` / `filter, transform`), the neon wash layer
  carries `will-change: opacity`, and per-tile glow `box-shadow` was
  dropped — the tile's `overflow-hidden` clipped it entirely, so its
  transition only repainted an invisible region every frame.
- **Catalog (`/products`, designed 2026-10-03)** — Server Component
  reading the URL query (`?category=&search=&sort=&page=`): header
  (kicker + h1 «Каталог цифровых товаров» + total count), client
  `CatalogFilters` (category chips with productsCount, search input,
  shadcn Select for `new / price_asc / price_desc` — everything pushes
  URL params, so states are shareable), `ProductRevealGrid` (4 cols) of
  the shared `ProductCard` and a prev/next pagination (12 per page,
  disabled-aware). Empty state and API-error state reuse the shared
  components. The page never hand-rolls cards: `ProductCard`
  (`features/products/components/product-card.tsx`) is shared with the
  home currency block — portrait 3/4 cover with the store-logo
  fallback (`/logo2.png` on the neon wash — no letter), violet `−N%` badge and struck-through old price when
  `oldPriceCents` allows, hover = lift + `glow-brand`.
- **Top-up (`/topup`, designed 2026-10-03)** — the approved layered
  neon backdrop (three radial washes + three drifting `blur-2xl` blobs,
  `blob-drift` keyframes, disabled under `prefers-reduced-motion`) kept;
  the glass stub is replaced with real content: h1 «Пополнение игр и
  сервисов», the six `SERVICES` (extracted to
  `features/home/services-data.tsx`, shared with the home wall) as a
  `.service-wall` strip — same monochrome→color hover CSS, tiles are
  presentational divs (no per-service flow exists) — and the real
  `game-currency` products from the API in a 6-col `ProductRevealGrid`
  with a «Весь раздел →» link to
  `/products?category=game-currency`. The purchase flow itself is still
  unapproved — nothing here pretends to check out.
- **Promotions (`/promotions`, designed 2026-10-03)** — header «Акции и
  скидки» + a 4-col `ProductRevealGrid` of published products carrying
  a discount (`oldPriceCents > priceCents`, fetched with limit 100 and
  filtered client-side of the fetch — no promotions entity exists yet,
  the page moves behind one when approved). Empty state when no
  discounts, ErrorState when the API is down.
- **Reviews carousel (home, 2026-10-03)** — a 4-block row
  (`xl:grid-cols-4`): columns 1–3 are ONE scroll-snap carousel container
  (`xl:col-span-3`, three review cards per view — 2 at sm, 1 on mobile;
  native `overflow-x-auto snap-x` + hidden scrollbar, round Chevron arrows
  in the header row — the carousel is INFINITE: the 4-review list renders
  three times, the track starts on the middle copy and once a scroll
  settles (120 ms debounce) silently jumps back into it, so the arrows are
  never disabled and wrap in both directions; browsers that skip
  programmatic smooth scrolling get an instant fallback to the target —
  no carousel dependency); column 4 is the separate static CTA card
  «Играли у нас?» with the «Оставить отзыв» button opening
  `review-form-dialog.tsx` — controlled Dialog, RHF + zodResolver over
  `schemas/review.schema.ts` (rating 1–5 star radio buttons, name
  optional, text ≥10), NO submission API — a valid submit just resets and
  closes, the caption says the server send arrives with the reviews API.
- **Stats + socials (home, 2026-10-03)** — `community-section.tsx`
  before the news block, from the user's reference screenshot translated
  into our palette: two `min-h-64` gradient stat cards (cyan wash / violet
  wash, uppercase badge pills «Количество клиентов:» / «Количество
  пополнений:», «Более 136 684 довольных клиентов» / «Свыше 1 088 276
  успешных пополнений» with the big `text-gradient` number, faint rotated
  decorative squares) and a wide «Наши социальные сети» card — Telegram
  @gport and GPort Official (VK) columns, each with a brand-colored icon
  tile (`telegram.svg` white mark on #229ED9; new
  `public/brands/vk-white.svg` on #0077FF), a description, a «10 000+ /
  1 900+ регулярных юзеров» pill and an outline shadcn Button
  «Подписаться» → t.me/gport / vk.com/gport (placeholders, same as the
  footer). Numbers are static placeholders — no aggregate endpoints;
  move behind services/*.service.ts when a stats source is approved.
- **News + FAQ (home, 2026-10-03)** — News: «Все новости» text + ArrowRight
  link sits right of the heading in a `flex items-end justify-between` row
  (href `#news` anchor until a news page exists). FAQ: filter chips Все /
  Стим-пополнение / Покупка игр (same chip classes as the catalog
  filters, `aria-pressed`, the Accordion remounts per filter) over 7
  placeholder Q&As tagged topup 3 / games 4.
- **Top-up block (2nd home block, 2026-10-03)** — the «Баннер» layout
  (`features/topup/components/topup-banner.tsx`), picked by the user
  («вариант 3 ставь на главную») from five experimental compositions; the
  `/topup-variations` comparison page plus the four unused variants and
  the original igromir-row `topup-widget.tsx` were deleted the same day
  at the user's request. Gradient banner: a glass form
  card (`bg-surface/80 backdrop-blur`) on the left — login (per-service
  placeholder + ?-tooltip), country Select (drives the currency sign — ₽/Br/₸/֏ map in
  `widget-data.ts`), amount with the sign after the number, violet
  «Оплатить {total} {currency}» — and the service showcase on the right: big mark,
  «Пополнение {name}», «от {priceFrom} ₽», three placeholder bullets and
  icon chips of all services (the active one stays in the row,
  highlighted `border-brand`, so switching never reshuffles). Functional shell of the
  igromir.yandex.ru constructor in our style; the payment business process
  is not approved — a valid pay click shows the cyan "платёжный провайдер
  не подключён" hint. The shared top-up modules:
  `features/topup/widget-data.ts` (TOPUP_SERVICES = widget-only Steam +
  the shared SERVICES with «от {priceFrom}», countries, fee 0.06),
  `hooks/use-topup-widget.ts` (RHF + Zod over `schemas/topup.schema.ts`:
  login ≥3, amount digits 50–15000, promo optional; selected service;
  mirrored amount string for the live total = ceil(amount × 1.06) —
  `form.watch` would bail the React Compiler; submit reveals the
  "coming later" hint) and the pre-wired fields/pieces in
  `features/topup/components/`: `fields.tsx`
  (Login/Country/Amount/Promo over `useFormContext`), `hint-icon.tsx`
  (self-provider tooltip), `payment-pending-hint.tsx`,
  `topup-legal-line.tsx` (links «оферту»/«условия» → `/policies/offer`)
  and `service-mark.tsx`. Steam's white mark is
  `public/brands/steam.svg` (widget-only — the wall keeps its 6 services
  + CTA); Nintendo's word mark is an em-based pill sized through font-size
  (ServiceMark `scale`), so it fits every chip without a transform
  overflow; `public/brands/*.svg` all carry explicit width/height.
- **Policies (`/policies/[slug]`, designed 2026-10-03)** — five static SSG
  documents (`privacy`, `offer`, `refund`, `contacts`, `rightsholders`)
  driven by `features/policies/content.ts` (title, meta description,
  "updated" line, intro + numbered sections). Kicker «Информация», h1 and
  the document body live in a `max-w-3xl` reading column; the body sits
  in a `bg-canvas/70` rounded card (same surface as the FAQ items).
  Copy is placeholder lorem — swap for approved legal texts in place,
  keeping the structure. Unknown slugs 404 via `notFound()`.
- **Footer** — brand block (logo + short description) + two link columns
  after the reference layout: «Покупателям» (FAQ → `/#faq`, Отзывы →
  `/#reviews` — both deep-link to the homepage sections, which carry
  `id` + `scroll-mt-24`; Возврат средств → `/policies/refund`) and
  «GPort» (Контакты, Публичная оферта, Политика конфиденциальности,
  Информация для правообладателям → `/policies/*`). Faint violet radial
  wash along the top edge; below a hairline: two social circles — Telegram
  and VK only (`public/brands/telegram-muted.svg` + `vk.svg`, simpleicons
  in the muted text color; hrefs are placeholders until real community
  URLs exist), then a hairline divider and the app marks — «Приложение:»
  with muted Apple/Android circles (`apple-muted.svg`, `android-muted.svg`)
  opening the install instructions with the matching platform preset —
  then the legal lines «© {year} GPort. Все права защищены»
  and «Поддержка: support@gport.ru» (mailto; placeholder address).
- **PWA install (2026-10-04)** — GPort is installable as a web app:
  `public/manifest.webmanifest` (standalone, dark theme #0B0D12, GPort
  name/short_name) + a passthrough service worker `public/sw.js`
  (registers via `features/pwa/register-sw.tsx` in the root layout;
  caches nothing, exists only so Chrome fires `beforeinstallprompt`) +
  square brand icons (`public/icons/`: `icon.svg` and sharp-generated
  PNGs 192/512, a maskable variant, `apple-touch-icon.png` 180 — violet→
  cyan gradient with a white G). Layout metadata adds the manifest link,
  `appleWebApp` meta and `themeColor`. The smart banner
  (`features/pwa/components/install-banner.tsx`) rides INSIDE the sticky
  header, above the capsule (storefront layouts, not admin): iOS Safari →
  «Добавьте GPort на экран „Домой“» + «Как добавить»; Android Chrome →
  «Установите приложение GPort» with the native prompt when
  `beforeinstallprompt` was captured (module-level listener), falling back
  to the steps; an X dismisses for good (`localStorage`, never re-shown).
  Hidden on desktop, when already standalone, or after install. Both
  entry points open `install-instructions-dialog.tsx` — platform chips
  (iPhone/Safari, Android/Chrome) over 3 icon steps (Share → «На экран
  „Домой“» → Добавить; ⋮ → «Установить приложение» → confirm). Platform
  detection (`features/pwa/platform.ts`) is pure (UA + maxTouchPoints —
  iPadOS masquerades as desktop Mac) and covered by Jest
  (`tests/features/install-banner.test.tsx`); browser-only state flows
  through `useSyncExternalStore` with safe server snapshots (SSR renders
  nothing, no hydration mismatch).
- **Cookie banner (`features/consent/components/cookie-banner.tsx`,
  2026-10-04)** — notice fixed to the bottom-LEFT of every storefront
  page (mounted next to `SupportBubble` in the public/auth/dashboard
  layouts + `not-found.tsx`; the support bubble owns the right corner —
  on mobile the banner sits above it, `bottom-20` → `sm:bottom-4`/
  `md:bottom-6`, full width → `sm:max-w-md`). `bg-surface/90` glass
  card, rounded-2xl, violet glow shadow, `animate-in` rise+fade; cyan
  `Cookie` icon chip, title «Мы используем cookie», one-liner linking to
  `/policies/privacy`, violet «Принять». Accepting persists
  `gport-cookie-consent=accepted` in localStorage (the banner returns if
  storage is unavailable); browser-only state via `useSyncExternalStore`
  with a hidden server snapshot. No consent backend — the flag only;
  Jest: `tests/features/cookie-banner.test.tsx`.
- **404 (`app/not-found.tsx`, 2026-10-04)** — global not-found page that
  renders the storefront chrome itself (Header/main/Footer + SupportBubble +
  CookieBanner — the root layout owns no chrome; `notFound()` from
  chrome-less segments like `/policies/[slug]` bubbles here). Design is the
  «Достижение» variant (picked 2026-10-04 by the user from five demos on a
  temporary noindex `/design/notfound` page — demo deleted): a centered
  `bg-surface rounded-3xl max-w-xl` card with violet/cyan washes, a glowing
  Trophy chip (`glow-brand`, violet `bg-brand/15`), neon kicker
  «Достижение разблокировано», h1 «Такой страницы нет» (the gradient
  «нет»), a playful muted line about XP for curiosity, a decorative
  «Прогресс исследования 67%» XP bar (`bg-gradient-to-r from-brand
  to-neon`), and the «На главную» + outline «В каталог игр» buttons.
  Metadata title «Страница не найдена». The card is shared
  (`components/layout/not-found-card.tsx`) by TWO boundaries: the root
  `app/not-found.tsx` (renders Header/main/Footer + SupportBubble +
  CookieBanner itself — the root layout owns no chrome) catches URLs that
  match NO route group, while `app/(public)/not-found.tsx` (card only)
  catches `notFound()` thrown inside the (public) group (e.g. an unknown
  `/policies/[slug]`) — the group layout provides the chrome there, and a
  root-boundary fallthrough used to render the header/footer twice.
- **Support bubble** — floating «Поддержка» pill fixed to the bottom-right
  of every storefront page (public/auth/dashboard layouts, not admin),
  `features/support/components/support-bubble.tsx`: opens the shared
  Dialog (our styling) with a React Hook Form + Zod feedback form (name
  optional, email, question ≥10 chars) — validation only, no submission
  API yet (`schemas/support.schema.ts`).
- **Cart** — right drawer (Sheet) plus a full `/cart` page, kept in
  sync: items, promo code input, totals. Checkout button stays disabled
  with a "coming later" hint until payments are designed and approved.
- **Admin panel (base, `/admin`, 2026-10-03)** — the super-admin frontend
  foundation. Layout groups now own their chrome: root layout keeps only
  Providers; `(public)`/`(auth)`/`(dashboard)` wrap pages in the storefront
  Header/Footer, while `(admin)` renders `AdminShell` instead
  (`features/admin/components/admin-shell.tsx`): UX gate to SUPER_ADMIN
  (guest → redirect `/sign-in`, other roles → «Нет доступа» card; the
  backend RolesGuard remains the source of truth), desktop sidebar
  (`bg-surface`, logo + «админ-панель», the logo is a Link to `/` in both
  the sidebar header and the mobile top bar — user-ordered 2026-10-04,
  nav from `features/admin/nav.ts`,
  active = raised pill with violet icon, a full-width «Перейти на сайт»
  outline button above the user card + sign-out at the bottom; the mobile
  top bar repeats the same nav in a left Sheet and carries an
  ExternalLink icon button home). Pages:
  Обзор (section cards from the same nav data — no fake stats, aggregate
  APIs don't exist) + placeholder EmptyState pages for Товары /
  Категории / Промокоды / Пользователи / Аналитика
  (products has a backend controller already — its table is the natural
  next step; analytics waits for an aggregate API, added 2026-10-04). The «Состояние» tab
  (added 2026-10-04, `/admin/health`) is LIVE data, not a stub: the
  client panel `features/admin/components/health-status-cards.tsx` reads
  the real public `GET /health` through the shared `useHealth` hook —
  three cards (API reachable, PostgreSQL probe via Prisma, server
  timestamp in ru-RU) with «Доступен/Недоступен» badges, skeletons while
  pending and a «Проверить снова» refetch button (spinner while
  fetching). Styling: shadcn defaults
  on the shared tokens, no neon effects. After sign-in SUPER_ADMIN lands
  on `/admin`; the header profile dropdown gains an «Админ-панель» item
  for that role. The session lives in httpOnly cookies (`proxy.ts` guards
  `/admin` by refresh-cookie presence, `useMe` revalidates via `/auth/me`),
  so reloads keep the admin signed in.
- **Admin «Настройки сайта» (`/admin/settings/*`, 2026-10-04)** — five
  route tabs under a shared header (`settings/layout.tsx` + pill
  `SettingsTabs`, `/admin/settings` redirects to the first tab):
  **Основные** (name, support email, logo upload, socials
  list add/remove), **SEO** (title/description, og:image upload,
  robots.txt textarea, PWA manifest fields with color pickers, favicon +
  192/512 icon uploads), **Юр. информация** (policy list on the left +
  full Tiptap editor on the right: h2/h3, bold/italic, lists, links,
  tables; content sanitized server-side against a whitelist before it
  reaches `/policies/[slug]`), **FAQ** (constructor: create card + per-item
  question/answer/category/Показывать checkbox/sortOrder, delete with a
  confirm step), **Главная страница** (hero kicker/title/accent/subtitle/
  CTA + the four ghost tiles). Forms are RHF + zodResolver (schemas in
  `schemas/`); every tab PUTs/patches only its own fields merged over the
  current settings (the settings PUT is full-object). Image uploads go
  through `POST /admin/uploads` into the `UploadedFile` table and fields
  keep `/files/:id` URLs (public, immutable). All reads on the storefront
  come from the public GETs — root `generateMetadata`/`generateViewport`,
  `app/robots.txt/route.ts`, `app/manifest.ts` (static
  `public/manifest.webmanifest` deleted), `SiteHeader`/`Footer`, hero
  banner, FAQ block, policy pages — so admin edits are visible on the
  site immediately.
- **Skeletons** — surface shimmer; **states** reuse EmptyState/ErrorState.

## Page templates (target screens)

1. **Home** — hero banner carousel (glass, `neon-border`, gradient
   headline), category pill row («Игры», «Игровая валюта», «Пополнения —
   скоро»), «Популярное» product grid, advantages row, footer. The
   top-up constructor block (denomination tiles + order summary on the
   right) belongs to the future «Пополнения» screen and waits for the
   top-up business process to be specified.
2. **Catalog `/games`** — left glass filter panel (genre, platform,
   region, price), search + sort on top, product grid, pagination.
   Note: the API currently supports sort/pagination only; attribute
   filters need a GET `/products` extension (separate backend task).
3. **Product `/games/:slug`** — large cover + gallery, attribute list
   (region, platform, localization, age rating, genres), tabs
   «Описание / Инструкция», sticky purchase block, related products.
4. **Cart** — drawer + `/cart` page as above.
5. **Auth** — centered card with a `neon-border` gradient hairline
   (violet→cyan) over the aurora background with blurred blobs of both
   brand colors; Russian forms («Вход», «Регистрация» with optional name),
   submit button violet with glow, switch links accent cyan.
6. **Dashboard `/dashboard` (designed 2026-10-03)** — the buyer account
   lives INSIDE the storefront chrome (our header + footer — the user's
   explicit correction; the admin panel keeps its standalone sidebar).
   Kicker «Личный кабинет» + h1 + a horizontal pill switcher
   (`features/account/components/dashboard-nav.tsx`, active = raised pill
   with violet icon, same language as the header nav) shared by all pages
   (items in `features/account/nav.ts` — the overview cards render from
   the same list): Обзор, Заказы (EmptyState — waits for the
   purchase/orders business process), Достижения (added 2026-10-04 — a
   static 3-col showcase grid in the 404-achievement language: unlocked
   cards glow with `border-brand/40` + a cyan «Получено» pill, locked
   ones are dimmed with a Lock icon, each carries a mono «+N XP»; summary
   line «Открыто N из M · +XP»; NO achievements API — list/rules are
   fish until approved), Профиль (read-only card fed by a server-side
   `me()` with the request cookies forwarded manually — a server fetch
   has no cookie jar; editing waits for a profile-update API). Route
   access: proxy.ts refresh-cookie gate.

Out of scope until designed and approved: top-up screens, payments,
orders. The admin panel keeps shadcn defaults on the same tokens (the
base shell above is approved; new admin sections extend it without a
redesign pass).
