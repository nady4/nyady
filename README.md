<h1 align="center">NYADY</h1>
<p align="center">
  👢 Full-stack e-commerce platform with product catalog, persistent shopping cart, coupons, shipping quotations, payment management and order tracking.
</p>
<p align="center">
  Built with Next.js, TypeScript, Redux Toolkit, Prisma + PostgreSQL y NextAuth. Integrated with MercadoPago and Zipnova.
</p>
<p align="center">
  🛡️ <i>This is a live store that charges real money through Mercado Pago with production credentials — see <a href="#-security">Security</a> for how it stays safe.</i>
</p>
<br>

## 📸 Screenshots

<table>
  <tr>
    <td colspan="2" align="center"><em>Product</em></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="./public/assets/screenshots/product.png" alt="Orders & tracking" /></td>
  </tr>
  <tr>
    <td width="50%" align="center"><em>Home / landing</em></td>
    <td width="50%" align="center"><em>Catalog with filters</em></td>
  </tr>
  <tr>
    <td><img src="./public/assets/screenshots/home.png" alt="Home" /></td>
    <td><img src="./public/assets/screenshots/catalog.png" alt="Catalog" /></td>
  </tr>
  <tr>
    <td align="center"><em>Cart</em></td>
    <td align="center"><em>Checkout</em></td>
  </tr>
  <tr>
    <td><img src="./public/assets/screenshots/cart.png" alt="Product detail" /></td>
    <td><img src="./public/assets/screenshots/checkout.png" alt="Cart" /></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><em>Orders + shipment tracking</em></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="./public/assets/screenshots/orders.png" alt="Orders & tracking" /></td>
  </tr>
</table>

<br>

## 🌐 Live store

- **URL:** <b><a href="https://nyady.com">nyady.com</a></b>

> ⚠️ This is production, not a playground: every checkout moves real money through Mercado Pago and every account sees real order history. No demo credentials are published here. To explore the admin dashboard or request a safe demo walkthrough, reach out to `dev@nady4.com`.

<br>

## ✨ Features

### 🛍️ Storefront

- **Product catalog** with live search and filtering by category, size, and color
- **Product detail pages** with size, color, and heel (`taco`) selectors and related products
- **Product imagery on Vercel Blob** — per-color photo buckets served from Blob URLs (host allowlisted in `next.config.ts`); the local `public/assets/products` folder + `products.csv` are the bulk source, synced with `bun run catalog:sync` (uploads every image, drops colors without a photo and double sizes below 35, rewrites DB + CSV)
- **Persistent, database-backed cart** keyed per user with selected variant (size/color/heel)
- **Wishlist** saved per user
- **Wholesale / volume discounts** — ≥4 units → 10% off, ≥20 units → 20% off
- **Coupon engine** — `PERCENT` and `FIXED` codes, one-per-user, usage limits, and expiry dates
- **Live shipping quotes** via Zipnova — carrier options, pickup points, and declared value
- **Mercado Pago checkout** (Wallet) with `success` / `pending` / `failure` return pages — real charges in production (`APP_USR_*` credentials), test credentials locally
- **Order history with tracking** — live shipment status and tracking history from Zipnova

### 🔐 Account & compliance

- Credentials auth (bcrypt + JWT sessions) with register / sign-in flows
- **Email confirmation on registration** — accounts are created unverified and must confirm via a single-use, 24h-expiry link (Resend); sign-in is blocked until confirmed, with a resend option on the sign-in page
- **Password recovery** — "¿Olvidaste tu contraseña?" flow: `/forgot-password` emails a single-use, 1-hour, sha256-hashed token link (`PasswordResetToken`; the raw token only travels in the email so a leaked database can't reset accounts) and must never leak which emails exist (the API answers the same generic message for unknown accounts). `/reset-password` validates, consumes the token and stores a fresh bcrypt hash. Existing JWT sessions stay valid after a password change (NextAuth JWTs don't record the password).
- **Terms & Privacy consent** — registration requires accepting the Términos y Condiciones and the Política de Privacidad; the acceptance timestamp and terms version are stored on the user
- User account settings and shipping-address management
- Full set of info / legal pages required for Argentine e-commerce: envíos, medios de pago, promociones, reembolsos, preguntas frecuentes, elaboración, privacidad, términos, contacto, blog, and the **botón de arrepentimiento**.

### ⚙️ Operations (seller-side)

- **Admin dashboard** at `/admin` — protected by username/password from `ADMIN_USERNAME` / `ADMIN_PASSWORD`, with a signed httpOnly session cookie (7 days, `proxy.ts` guards every `/admin/*` route and every admin server action / `/api/admin/*` route re-checks the session). The `nyady`/`nyady` unset default exists only to keep local dev moving — it must be overridden with real credentials before any deployment:
  - **Resumen** — KPIs (monthly/weekly/today revenue, orders, average ticket, new users), a 30-day sales chart, orders-by-status breakdown, actionable alerts (approved orders without shipment, unverified users, archived products) and latest orders.
  - **Productos** — searchable, filterable, paginated table with bulk actions, **full CRUD** (name, price, stock, category, SKU, internal purchase name, description, sizes/colors/heel options, availability) and a **per-color image manager** powered by Vercel Blob (client uploads, cover selection, drag reorder, per-color buckets), plus the `catalog:sync` bulk pipeline for mass image updates. Archive (soft delete) keeps order history while hiding the product from the store and clearing carts/wishlists; permanent delete is offered only for products without orders, with orphan-blob cleanup.
  - **Categorías** — rename/merge categories across all products in one transaction (categories live on `Product.category` in v1).
  - **Pedidos** — filterable table by status/date/customer with **CSV export**, a rich detail per order (items with purchase-time snapshots, totals/discounts breakdown, recipient, Zipnova shipment + live tracking timeline, internal notes), admin status transitions (approve/reject/cancel with guard rails), editable recipient + manual tracking fields, and item editing for pending orders only (totals recompute with the same discount math as checkout). **Manual order creation** for phone/WhatsApp sales (existing user + catalog items + optional coupon + shipping cost, `source: "manual"`).
  - **Envíos** — shipments table with persisted Zipnova status, per-row refresh, carrier option, tracking links, and destination.
  - **Usuarios** — filterable table (verified/unverified, with/without orders, archived), profile editing (username, email, address), verification toggle with confirmation-email resend via Resend, password reset, and archived-account blocking (sign-in rejects archived users).

  - **Reportes** — date-range analytics with previous-period deltas: revenue/orders/ticket, sales-per-day and per-category charts, top products by revenue (snapshot-based), best customers, coupon usage, plus CSV exports of orders (`from`/`to`) and the full product catalog.
  - **Contenido** — homepage promo banners (Vercel Blob upload, ordering, scheduling via start/end dates, active toggle) rendered below the hero by the server-rendered landing.
  - **Marketing** — social content library for Facebook / Instagram / WhatsApp: posts (copy + hashtags + media + linked product), reusable copy templates, a marketing image library (Vercel Blob `social/` prefix, product-photo reuse), an AI copywriter backed by the OpenCode Go API (`glm-5.3-flash`, 3 variants with per-channel adaptation, brand-voice prompt, tone selector), live per-channel previews (IG feed card / FB post / WhatsApp bubble) and copy-to-clipboard + `wa.me` share fallbacks. **Meta publishing (phase 2)** — OAuth connection for the Facebook Page + linked Instagram business account (tokens AES-256-GCM encrypted at rest), "Publicar ahora" (FB photo/link posts; IG containers → `media_publish`, single or carousel), and a daily Vercel Cron queue (`/api/crons/marketing-publish`, `CRON_SECRET`-protected) plus a manual "Correr cola" button. **Insights (phase 3)** — daily cron `/api/crons/marketing-insights` snapshots lifetime per-post metrics (reach/impressions/reactions/comments/shares/saves/clicks) into `SocialPostMetric` plus follower counts into `SocialAccountStat`, rendered in an admin stats panel with totals and a "Sincronizar ahora" action; product links published to Meta carry automatic UTMs (`utm_source`/`utm_medium=social`/`utm_campaign`) for order-funnel attribution. **Manual WhatsApp campaigns (phase 4, no Cloud API)** — campaign text library backed by `WhatsAppCampaign`/`WhatsAppCampaignSend`, recipients derived from customers with orders (AR phone normalization for wa.me), per-recipient "Abrir chat" deep links with the campaign text pre-filled, a send log that prevents accidental resends, and copy import from existing SocialPosts. **Bulk IG/FB creation (/admin/marketing/masa)** — multi-select products (search/category filter, ≤25 per run), shared description template with real product data (`{producto} {precio} {link} {tallas} {colores}`), optional per-product AI polish (OpenCode Go), photo-mode dropdown (all ≤10 / cover + 1 per color / cover only) building one **carousel draft per product**, campaign auto-tag, results summary; plus native drag & drop photo reordering in the composer (carousel order = drag order). **IG JPEG pipeline** — `lib/marketing/ig-image.ts` converts any non-JPEG image to JPEG via sharp right before creating containers (deterministic `social/ig-jpg/` Blob path per source), so mixed-format catalog photos never break IG publishing. **Measurement engine + content planner (phase 5)** — the loop *medir → aprender → generar*: (a) *attribution* — a first-party cookie (`components/AttributionCapture.tsx`) stores the UTM params of the landing page for 30 days, the checkout copies them onto the `Order` (`utmSource/utmMedium/utmCampaign/utmContent`), and `/admin/marketing/embudo` aggregates paid orders by source / campaign / referral code (revenue, AOV, best publication hours in ART); (b) *scoring* — every published post gets an index (weighted interactions per 1000 reached accounts: saves/shares 4, clicks/comments 3, likes 1) and the "Qué funciona" panel ranks them and turns a winner into three new AI angles that become one-click drafts; (c) *planner* — `/admin/marketing/calendario` stores automatable preferences (`ContentPreference`: pillars, formats, objectives, forbidden topics, audience, default CTA, posts/week, best hours) plus the editorial calendar (`ContentPlan`), the AI proposes the week and each planned slot becomes a real post draft (copy + product media + schedule, campaign = `auto-<pilar>`) that the publish queue publishes after approval; (d) *referrals* — `/admin/marketing/referidos` issues per-customer codes (a coupon with an owner, so the money math never changes), the share link carries `?ref=CODE`, the cart applies it automatically and the order credits the referrer; (e) *publishing cadence* — `.github/workflows/marketing-publish.yml` hits the same `CRON_SECRET`-protected queue every 4 hours (the Vercel Hobby plan only allows one daily cron). **Publication safety + reels (phase 5b)** — unattended publishing is **OFF by default**: `MarketingSettings.autoPublish` gates the scheduled queue (the cron and the GitHub workflow publish nothing until the admin flips the switch in `/admin/marketing`; the admin's own "Publicar" / "Correr cola" buttons always work), so content can be generated and scheduled without ever going out on its own. **Reels** — posts can carry a video (`SocialPost.mediaType = "video"`, `media[0]` = the public `.mp4` uploaded to the `social/reels/` Blob prefix, `media[1]` = optional cover) and Instagram publishes it as a REEL (`media_type=REELS` + `share_to_feed`, with a longer container poll); Facebook receives the cover photo + product link. Optional later: WhatsApp Cloud API (business verification + approved marketing templates + per-message Meta pricing).
  - **Configuración** — store profile + hero copy persisted on `StoreSettings` (landing falls back to the hardcoded copy), integration health board (DB, Mercado Pago, Zipnova, Resend, Vercel Blob, auth — env presence only, never values), admin credential info, read-only wholesale tiers, and a manual storefront revalidation button.
- **Artisanal elaboración flow** — after payment, an order enters "In Preparation" state (3–7 business days of crafting). The seller marks it ready from the admin dashboard, which creates the Zipnova shipment and unlocks tracking.
- **Seller-only ship endpoint** guarded by an `ADMIN_TOKEN` (`POST /api/orders/[id]/ship`)

<br>

## 🛡️ Security

The store is **live and charges real money** (production Mercado Pago `APP_USR` credentials). These are the rules baked into the codebase to keep that safe:

- **No secrets in the repo** — `.env*` is gitignored; production credentials (database, Mercado Pago, Zipnova, Resend, Vercel Blob) live only in Vercel environment variables. The connected Blob store authenticates from the Vercel runtime via **OIDC** (`VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`, auto-rotated tokens), so no long-lived token is ever distributed or stored.
- **Server-side money math only** — the client never sends prices or totals. Checkout builds items from the **database cart** (`getCartProducts`), recomputes discounts with the single source of truth `lib/discounts.ts` (server-configured wholesale tiers + coupons) and derives the charged total from those server values; the request body only carries recipient data, the chosen shipping option and a coupon code, which is re-validated server-side too.
- **Distrustful, idempotent payment webhook** — `POST /api/mp-webhook` re-fetches the payment from the Mercado Pago API before acting on it, only allows the documented status transitions (`pending → approved/...`), keeps a breadcrumb for refunds/chargebacks, and clears only the buyer's cart. Coupon consumption (`usedCount`) happens only after the preference is successfully created, so a failed preference never burns a one-per-user coupon nor leaves an orphan pending order.
- **Admin surface** — every `/admin/*` route is blocked at the proxy level (Next 16 `proxy.ts`), and every admin server action or `/api/admin/*` route re-verifies the session itself (the cookie is an HMAC-signed httpOnly cookie signed with `NEXTAUTH_SECRET`, 7-day TTL). `/api/admin/login` has rate limiting. Blob uploads never accept arbitrary paths (`products/`, `banners/` and `social/` prefixes only, with content-type/size validation). The OpenCode Go API key never leaves the server (`OPENCODE_API_KEY` server-side only; the composer talks to admin-guarded server actions).
- **Account hygiene** — passwords as bcrypt hashes only; unverified accounts can't sign in (single-use 24h confirmation tokens); password recovery emails single-use 1-hour tokens whose sha256 hash is stored (raw token only travels via email, so a leaked DB alone can't reset an account); reset endpoints answer generically so they never leak which emails exist; archived users are rejected at sign-in before the password check runs.
- **Rate limiting on sensitive routes** — register, resend verification, forgot-password, admin login, order/checkout creation and the MP webhook are all throttled (`lib/rate-limit.ts` — in-memory sliding-window counters keyed per client IP/route).
- **Tamper-proof history** — every `OrderItem` snapshots unit price, product name, photo and chosen variant at purchase time, so later catalog edits (renames, price changes, availability, archiving) can never rewrite what a customer actually bought.
- **Deploy hygiene** — `vercel env pull` outputs (`.env.local` from Vercel, which includes short-lived OIDC tokens) are gitignored too; nothing secret is committed to git.
- **Responsible disclosure** — found a vulnerability? Email `dev@nady4.com` before publishing; don't run probes or test purchases against live data.

<br>

## 🛠️ Tech stack

| Area                      | Technology                                             |
| ------------------------- | ------------------------------------------------------ |
| Framework                 | Next.js 16 (App Router)                                |
| UI                        | React 19, Sass (SCSS)                                  |
| Language                  | TypeScript                                             |
| Database                  | PostgreSQL (Neon) + Prisma ORM 6                       |
| Auth                      | NextAuth.js v4 (Credentials + JWT, bcrypt)             |
| State                     | Redux Toolkit (UI state only — filters/search)         |
| Payments                  | Mercado Pago SDK (`@mercadopago/sdk-react`) + REST API |
| Shipping                  | Zipnova REST API (quote, create, track)                |
| Images                    | Vercel Blob (OIDC auth on Vercel; admin uploads + `catalog:sync` bulk pipeline) |
| Forms                     | React Hook Form                                        |
| Runtime / package manager | Bun                                                    |

<br>

## 🏗️ Architecture

Route groups keep public, auth, and protected surfaces cleanly separated:

```
app/
├── (public)/         # Catalog, product detail, cart, wishlist, info/legal pages, landing (banners + hero copy)
├── (auth)/           # Sign-in, register
├── (protected)/      # Account, orders, address management
├── admin/            # Admin dashboard: (dashboard) shell + resumen/productos/pedidos/cupones/usuarios/categorías/envíos/reportes/contenido/configuración, and login
├── success|pending|failure/   # Payment return pages
└── api/              # auth, register, products, orders, coupons, mp-webhook, admin (login/logout/upload/export/revalidate)
actions/              # Server Actions: cart, wishlist, orders, coupons, shipping, address + actions/admin/* (products, users, orders, categories, content, marketing)
lib/                  # Prisma client, NextAuth config, shared discount math, colors, admin session/token, order-status, admin blob cleanup
store/                # Redux store + slices (UI state only)
hooks/                # Data-loading + validation hooks
components/           # NavBar, Footer, ProductCard, Filters, ShippingQuote, CheckoutButton, OrderTracking + admin/* (layout shell, products, orders, users, shipments, content, marketing, settings, ui)
types/                # Shared TypeScript types (storefront + admin)
prisma/               # Schema + migrations + seed
styles/               # SCSS stylesheets (incl. Admin.scss)
proxy.ts              # Route guard for /admin/* (Next 16 proxy convention)
```

### 🖥️ Server / client boundaries

- **Server Actions** for mutations (cart, wishlist, orders, coupons, address, products, shipping, admin)
- **API routes** for external integrations (Mercado Pago preference creation, payment webhook, Zipnova) and the admin login/logout session endpoints
- **Client components** only where interactivity is required (selectors, filters, checkout wallet, admin forms)

### 🔍 Notable implementation details

- **Single source of truth for discounts** — `lib/discounts.ts` is pure (no `"use server"`, no Prisma) so the wholesale + coupon math is imported by both the cart UI and the orders API, guaranteeing the charged total matches what the customer sees.
- **Idempotent payment webhook** — re-fetches the payment from the Mercado Pago API instead of trusting the notification body, looks up the order before updating, clears only the buyer's cart, and treats forged/stale notifications safely. The Zipnova shipment is deliberately _not_ created on payment; it's deferred until elaboración is complete.
- **Coupon consumed only after the Mercado Pago preference succeeds** — a failed preference rolls back the orphan order so a one-per-user coupon isn't burned and the user can retry.
- **Per-order snapshots** of recipient data, the chosen shipping option, and the coupon (code + discount) are stored on the order so tracking and history stay correct even if the cart is cleared or the coupon is later edited/deleted. Since the admin-dashboard migration, `OrderItem` also snapshots `unitPrice`, `productName`, `productPhoto`, `selectedSize` and `selectedTacoOption` at purchase time (with a one-time backfill), so order history and reports stay accurate even if products are later renamed, repriced or archived.
- **Soft delete everywhere it matters** — `Product`, `User` and `Order` carry an `archivedAt` column. Archiving hides from the storefront and the default admin lists without breaking order history; archiving a product clears its carts/wishlists, and archived users are rejected at sign-in before the password check. Permanent delete is only available for entities without references.
- **Admin manual orders** — created with `source: "manual"` and never touched by the Mercado Pago webhook; items are validated and priced server-side against the current catalog (snapshotting price/name/variant photo), and totals always recompute through `lib/discounts.ts`. Item editing is locked once an order leaves `pending`.
- **Cart persisted in the database** (not Redux) — Redux is reserved for ephemeral UI state like filters and search, per the project's state-management rules. Checkout items come from this DB cart (current catalog prices), never from the browser.
- **Bulk catalog sync** — `bun run catalog:sync` treats `public/assets/products` + `products.csv` as the source of truth: uploads every image to Vercel Blob under deterministic `products/<folder>/<file>` paths (idempotent overwrites), drops colors without a photo and double sizes below 35, rewrites `photo`/`photos`/`sizes` in the DB, patches the CSV, and prunes carts that reference now-invalid variants.
- **Stateless admin session** — the dashboard uses a 7-day HMAC-signed httpOnly cookie (`lib/admin-token.ts`, WebCrypto so it works in the edge proxy) instead of a database row; `proxy.ts` guards every `/admin/*` route except the login page, and all admin server actions — plus the `/api/admin/*` routes (upload, exports, revalidate) that the proxy doesn't cover — re-check the session server-side.
- **Image uploads via Vercel Blob** — the browser asks `/api/admin/upload` (admin-guarded token endpoint with content-type/size/path-prefix validation) and PUTs files directly to Blob, avoiding serverless body-size limits. On Vercel the store authenticates via OIDC (no long-lived token needed); removed/replaced images are best-effort cleaned with a reference check against other products and banners.
- **Zipnova credentials guard** — while `ZIPNOVA_*` env vars are placeholders, the admin orders view skips live status/tracking calls (they would 403) and falls back to the data persisted on the order; set the real keys and the calls resume automatically. Live Zipnova calls run only on the order detail and Envíos refresh, keeping the orders list fast.

<br>

## 🗄️ Data model

Prisma models: `User`, `Address`, `Product`, `Cart`, `WishList`, `Order`, `OrderItem`, `Coupon`, `Banner`, `StoreSettings`, `InfoPage`, `SocialPost`, `CopyTemplate`, `SocialAsset`, `MarketingSettings`, `ContentPreference`, `ContentPlan`, `SocialPostMetric`, `SocialAccountStat`, `WhatsAppCampaign`, `WhatsAppCampaignSend`, `VerificationToken`, `PasswordResetToken`.

- `Cart` rows are unique per `(user, product, selectedSize, selectedColor, selectedTacoOption)`.
- `Product` has an `available` boolean (default `true`) used by the admin dashboard — products are made on demand, so `stock` is informational only. `sizes`/`colors` are the storefront-availability lists (a variant can only be ordered if listed); `photos` is the per-color JSON map of image URLs, `photo` the cover image (a sync keeps the existing cover color if all its images survived, otherwise it falls back to the first color). `archivedAt` implements the soft delete; `createdAt`/`updatedAt` power admin sorting and reports.
- `Order` carries a `shippingSelection` JSON snapshot, recipient fields, shipment id/tracking, and coupon snapshots used to create the Zipnova shipment after payment and render order history. `source` distinguishes web checkouts from admin-created manual orders, `notes` holds internal-only remarks, and `archivedAt` hides an order from the admin without touching the buyer's history.
- `OrderItem` snapshots the purchase-time product (`unitPrice`, `productName`, `productPhoto`) and the selected variants (`selectedColor`, `selectedSize`, `selectedTacoOption`), backfilled from existing data by the `admin_dashboard` migration.
- `User.archivedAt` implements soft-deleted accounts (blocked from sign-in, history preserved).
- `Banner` stores admin-managed homepage promos (image, copy, destination, ordering, active flag, start/end scheduling).
- `StoreSettings` is a singleton row (`id = "default"`) with editable store profile and landing hero copy; empty fields fall back to the hardcoded landing strings.
- `Coupon` supports `PERCENT` / `FIXED` types with `usageLimit`, `usedCount`, `onePerUser`, and `expiresAt`.
- `SocialPost` is the marketing library entry (copy, hashtags, channels `facebook|instagram|whatsapp`, media array with cover first, optional product link, campaign tag, `draft|ready` status, `scheduledAt`). Published posts record Meta results (`fbPostId/fbPermalink`, `igMediaId/igPermalink`, `publishedAt`, `lastError`). `CopyTemplate` holds reusable copy with `{producto} {precio} {link} {tallas} {colores}` placeholders, `SocialAsset` the tagged marketing image library, and `MarketingSettings` the singleton with brand voice / default hashtags / IG handle / WA phone / last insights sync. `SocialPostMetric` + `SocialAccountStat` are daily snapshot tables written by the insights cron. `WhatsAppCampaign` + `WhatsAppCampaignSend` back the manual WhatsApp diffusion loop (unique per campaign + phone). **Phase 5**: `ContentPreference` (singleton with the automatable content rules) + `ContentPlan` (editorial calendar slots, linked to the `SocialPost` they generated); `Order` gained the attribution columns (`utmSource`/`utmMedium`/`utmCampaign`/`utmContent`/`referralCode`) and `Coupon` gained the referral fields (`isReferral`/`referrerUserId`/`referrerName`/`sourceCampaign`). Deleting rows cleans their orphan Blob images (`social/` included) via `lib/admin/blob.ts`.

See [prisma/schema.prisma](prisma/schema.prisma) for the full schema.

<br>

## 🚀 Getting started

### 📋 Prerequisites

- [Bun](https://bun.sh)
- A PostgreSQL database (the project uses Neon)

### 📦 Installation

```bash
bun install
```

### 🔑 Environment setup

Create a `.env` file with local/dev values (see `.gitignore` — `.env*` is ignored, nothing secret is ever committed). **Production values (real keys) live only in the Vercel project environment** — never in this repository, never in screenshots, never in logs:

```env
# App / auth
# App / auth (canonical public origin: used by metadataBase, robots, sitemap)
NEXTAUTH_URL=https://nyady.com
NEXTAUTH_SECRET=yourSecret
DATABASE_URL=postgresql://user:password@host:5432/nyady

# Admin dashboard (/admin)
# Sign-in is at /admin/login; the session cookie is signed with NEXTAUTH_SECRET
# (or ADMIN_SECRET if set). Defaults to nyady/nyady if unset — dev-only
# convenience, override with real values before any deploy.
ADMIN_USERNAME=nyady
ADMIN_PASSWORD=yourAdminPassword

# Mercado Pago
# Locally use TEST credentials. Production runs with APP_USR (real money)
# keys that must live in the Vercel env only — rotate immediately from the
# Mercado Pago panel if one ever leaks.
MP_ACCESS_TOKEN=TEST-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_MP_PUBLIC_KEY=TEST-XXXXXXXXXXXXXXXX

# Zipnova shipping
ZIPNOVA_KEY=yourZipnovaKey
ZIPNOVA_SECRET=yourZipnovaSecret
ZIPNOVA_ACCOUNT_ID=yourAccountId

# Seller-only ship endpoint
ADMIN_TOKEN=yourStrongRandomToken

# Vercel Blob — product & banner images.
# With the store connected to the Vercel project (Project → Storage → Blob),
# auth is OIDC-based: on Vercel deployments nothing needs to be configured;
# locally run `vercel env pull` to get BLOB_STORE_ID / VERCEL_OIDC_TOKEN.
#
# IMPORTANT: uploads FROM THE BROWSER (admin image pickers, marketing
# library) use the Blob "client token" flow, which requires a READ-WRITE
# token (the OIDC connection only covers server-side writes). Create one in
# the Blob dashboard → Store → Tokens → Create Token (Read-Write) and set it
# here as BLOB_READ_WRITE_TOKEN, otherwise the admin shows "subidas no
# configuradas" and no image can be uploaded.
# `**.public.blob.vercel-storage.com` is already allowlisted in next.config.ts.
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxx

# Email (Resend) — registration confirmation emails
# Get a key at https://resend.com/api-keys. Without RESEND_API_KEY, dev builds
# log the confirmation link to the console instead of sending. EMAIL_FROM must
# use a domain verified in Resend; onboarding@resend.dev only delivers to the
# Resend account owner's address.
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=NYADY <no-reply@yourdomain.com>

# AI copywriting (admin /admin/marketing) — OpenCode Go subscription API key
# from https://opencode.ai/console. Without it the composer still works, only
# the "generate with AI" panel explains that the key is missing.
OPENCODE_API_KEY=oc_xxxxxxxx

# Meta (Facebook/Instagram publishing, /admin/marketing phase 2)
# Create a Business-type app in developers.facebook.com (development mode is
# enough while the app owner is the NYADY Page/IG admin). The OAuth callback
# is https://nyady.com/api/admin/marketing/meta/callback
META_APP_ID=yourAppId
META_APP_SECRET=yourAppSecret
# Optional Graph API version pin (defaults to v26.0)
# META_API_VERSION=v26.0

# Scheduled publish queue auth (Vercel Cron sends Authorization: Bearer)
CRON_SECRET=yourStrongRandomToken
```

> The same `CRON_SECRET` must also be added as a **repository secret** (and
> `SITE_URL` as a repository variable) if you want the free GitHub Actions
> workflow (`.github/workflows/marketing-publish.yml`) to publish every 4
> hours — the Vercel Hobby plan only allows one cron run per day.

> ⚠️ Files created by `vercel env pull` (`.env.local`, which includes short-lived OIDC tokens) are also gitignored — double-check `git status` before committing anything env-like.

### 🛢️ Database setup

```bash
bun run db:migrate
bun run db:seed
```

The seed is for **local development only** — it creates a pre-verified demo user (credentials are defined in [prisma/seed.ts](prisma/seed.ts) and intentionally not published), a set of sample products, example coupons (`BIENVENIDA10`, `5000OFF`, `VERANO15`, `MAYORISTA25`), and the `StoreSettings` singleton with defaults.

> ⚠️ Never run `db:seed` or `db:import` against the production database: they `upsert` demo rows and would overwrite live catalog data. Production catalog changes go through the admin dashboard or `catalog:sync` against the production store.

### 💻 Run the dev server

```bash
bun run dev
```

### 🧑‍💻 Admin dashboard

Accessible at **`/admin`** (login at `/admin/login`) with the credentials from `ADMIN_USERNAME` / `ADMIN_PASSWORD`. The sidebar gives you access to:

| Section | What you can do |
| --- | --- |
| **Resumen** | KPIs, 30-day sales chart, order statuses, actionable alerts |
| **Productos** | Full CRUD with per-color images (Vercel Blob), filters, bulk actions, duplicate, pause/archive |
| **Categorías** | Rename and merge categories across every product |
| **Pedidos** | Filters + CSV export, per-order detail (status, recipient, tracking, items), manual orders |
| **Cupones** | Full CRUD for coupon codes with value rules, usage limits, expiry, one-per-user toggle and a usage-protection guard (used coupons can be paused but not deleted) |
| **Envíos** | Zipnova shipments with refresh and tracking links |
| **Usuarios** | Profiles, verification, password resets, archive |
| **Reportes** | Date-range analytics, top products/customers, coupons, CSV exports |
| **Contenido** | Homepage promo banners (upload, schedule, order) |
| **Marketing** | Social posts library (copy, hashtags, media, product link), copy templates, image assets, AI variantes (OpenCode Go), previews IG/FB/WhatsApp + share links |
| **Configuración** | Store profile & hero copy, integration health, storefront cache flush |

<br>

## 📜 Scripts

| Command               | Description                 |
| --------------------- | --------------------------- |
| `bun run dev`         | Start the dev server        |
| `bun run build`       | Build for production        |
| `bun run start`       | Start the production server |
| `bun run lint`        | Run ESLint                  |
| `bun run db:migrate`  | Run Prisma migrations       |
| `bun run db:seed`     | Seed the database           |
| `bun run db:generate` | Generate the Prisma client  |
| `bun run db:import`   | Import/refresh products from the catalog CSV |
| `bun run catalog:sync` | Re-sync the catalog against `public/assets/products` photos: re-uploads every image to Vercel Blob, drops colors without a photo and double sizes below 35, and updates the DB + products.csv |
| `bun run blob:check`  | Verify the Vercel Blob token |

<br>

## 📝 Notes

- The UI is in Spanish (es-AR) and prices are in Argentine pesos (ARS), matching the Mercado Pago and Zipnova integrations.
- **Production is the real store**: Mercado Pago runs with production (`APP_USR`) credentials there, so checkouts charge customers. Test credentials are for local development only. Never commit real keys, and rotate any credential that could have leaked from logs, screenshots or a `.env` file.
- Mercado Pago `auto_return` is enabled only for HTTPS `NEXTAUTH_URL`s (the API rejects HTTP return URLs), so use an HTTPS deployment or tunnel for full checkout redirects.
- **Product images live on Vercel Blob** (`**.public.blob.vercel-storage.com`, allowlisted in [next.config.ts](next.config.ts)). The local `public/assets/products` folders + `products.csv` are the bulk-sync source (`bun run catalog:sync`); the local-only seed products may still reference other allowlisted remote hosts so a fresh clone renders without uploading anything.
- Deleting (not archiving) a product is only possible when it has no orders — order history is never broken. Products with sales get archived instead.

<br>

## 📬 Contact

### 💌 Email: **dev@nady4.com**

### 💼 LinkedIn: [nady4](https://www.linkedin.com/in/nady4)

### 👩🏻‍💻 GitHub: [@nady4](https://github.com/nady4)
