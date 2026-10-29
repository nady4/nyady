<h1 align="center">NYADY</h1>
<p align="center">
  👢 Full-stack e-commerce platform with product catalog, persistent shopping cart, coupons, shipping quotations, payment management and order tracking.
</p>
<p align="center">
  Built with Next.js, TypeScript, Redux Toolkit, Prisma + PostgreSQL y NextAuth. Integrated with MercadoPago and Zipnova.
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

## 🌐 Live demo

- **URL:** <b><a href="https://nyady.com">nyady.com</a></b>
- **Demo account:** `test@nyady.com` / username `nyady` / password `Nyady-1234` — or register a new one.

<br>

## ✨ Features

### 🛍️ Storefront

- **Product catalog** with live search and filtering by category, size, and color
- **Product detail pages** with size, color, and heel (`taco`) selectors and related products
- **Persistent, database-backed cart** keyed per user with selected variant (size/color/heel)
- **Wishlist** saved per user
- **Wholesale / volume discounts** — ≥4 units → 10% off, ≥20 units → 20% off
- **Coupon engine** — `PERCENT` and `FIXED` codes, one-per-user, usage limits, and expiry dates
- **Live shipping quotes** via Zipnova — carrier options, pickup points, and declared value
- **Mercado Pago checkout** (Wallet) with `success` / `pending` / `failure` return pages
- **Order history with tracking** — live shipment status and tracking history from Zipnova

### 🔐 Account & compliance

- Credentials auth (bcrypt + JWT sessions) with register / sign-in flows
- **Email confirmation on registration** — accounts are created unverified and must confirm via a single-use, 24h-expiry link (Resend); sign-in is blocked until confirmed, with a resend option on the sign-in page
- **Password recovery** — "¿Olvidaste tu contraseña?" flow: `/forgot-password` emails a single-use, 1-hour, sha256-hashed token link (`PasswordResetToken`; the raw token only travels in the email so a leaked database can't reset accounts) and must never leak which emails exist (the API answers the same generic message for unknown accounts). `/reset-password` validates, consumes the token and stores a fresh bcrypt hash. Existing JWT sessions stay valid after a password change (NextAuth JWTs don't record the password).
- **Terms & Privacy consent** — registration requires accepting the Términos y Condiciones and the Política de Privacidad; the acceptance timestamp and terms version are stored on the user
- User account settings and shipping-address management
- Full set of info / legal pages required for Argentine e-commerce: envíos, medios de pago, promociones, reembolsos, preguntas frecuentes, elaboración, privacidad, términos, contacto, blog, and the **botón de arrepentimiento**.

### ⚙️ Operations (seller-side)

- **Admin dashboard** at `/admin` — protected by username/password from `ADMIN_USERNAME` / `ADMIN_PASSWORD`, with a signed httpOnly session cookie (7 days, `proxy.ts` guards every `/admin/*` route and every admin server action / `/api/admin/*` route re-checks the session):
  - **Resumen** — KPIs (monthly/weekly/today revenue, orders, average ticket, new users), a 30-day sales chart, orders-by-status breakdown, actionable alerts (approved orders without shipment, unverified users, archived products) and latest orders.
  - **Productos** — searchable, filterable, paginated table with bulk actions, **full CRUD** (name, price, stock, category, SKU, internal purchase name, description, sizes/colors/heel options, availability) and a **per-color image manager** powered by Vercel Blob (client uploads, cover selection, drag reorder, per-color buckets). Archive (soft delete) keeps order history while hiding the product from the store and clearing carts/wishlists; permanent delete is offered only for products without orders, with orphan-blob cleanup.
  - **Categorías** — rename/merge categories across all products in one transaction (categories live on `Product.category` in v1).
  - **Pedidos** — filterable table by status/date/customer with **CSV export**, a rich detail per order (items with purchase-time snapshots, totals/discounts breakdown, recipient, Zipnova shipment + live tracking timeline, internal notes), admin status transitions (approve/reject/cancel with guard rails), editable recipient + manual tracking fields, and item editing for pending orders only (totals recompute with the same discount math as checkout). **Manual order creation** for phone/WhatsApp sales (existing user + catalog items + optional coupon + shipping cost, `source: "manual"`).
  - **Envíos** — shipments table with persisted Zipnova status, per-row refresh, carrier option, tracking links, and destination.
  - **Usuarios** — filterable table (verified/unverified, with/without orders, archived), profile editing (username, email, address), verification toggle with confirmation-email resend via Resend, password reset, and archived-account blocking (sign-in rejects archived users).

  - **Reportes** — date-range analytics with previous-period deltas: revenue/orders/ticket, sales-per-day and per-category charts, top products by revenue (snapshot-based), best customers, coupon usage, plus CSV exports of orders (`from`/`to`) and the full product catalog.
  - **Contenido** — homepage promo banners (Vercel Blob upload, ordering, scheduling via start/end dates, active toggle) rendered below the hero by the server-rendered landing.
  - **Configuración** — store profile + hero copy persisted on `StoreSettings` (landing falls back to the hardcoded copy), integration health board (DB, Mercado Pago, Zipnova, Resend, Vercel Blob, auth — env presence only, never values), admin credential info, read-only wholesale tiers, and a manual storefront revalidation button.
- **Artisanal elaboración flow** — after payment, an order enters "In Preparation" state (3–7 business days of crafting). The seller marks it ready from the admin dashboard, which creates the Zipnova shipment and unlocks tracking.
- **Seller-only ship endpoint** guarded by an `ADMIN_TOKEN` (`POST /api/orders/[id]/ship`)

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
| Images                    | Vercel Blob (admin uploads with client `upload()`)     |
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
actions/              # Server Actions: cart, wishlist, orders, coupons, shipping, address + actions/admin/* (products, users, orders, categories, content)
lib/                  # Prisma client, NextAuth config, shared discount math, colors, admin session/token, order-status, admin blob cleanup
store/                # Redux store + slices (UI state only)
hooks/                # Data-loading + validation hooks
components/           # NavBar, Footer, ProductCard, Filters, ShippingQuote, CheckoutButton, OrderTracking + admin/* (layout shell, products, orders, users, shipments, content, settings, ui)
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
- **Idempotent payment webhook** — looks up the order before updating, clears only the buyer's cart, and treats forged/stale notifications safely. The Zipnova shipment is deliberately _not_ created on payment; it's deferred until elaboración is complete.
- **Coupon consumed only after the Mercado Pago preference succeeds** — a failed preference rolls back the orphan order so a one-per-user coupon isn't burned and the user can retry.
- **Per-order snapshots** of recipient data, the chosen shipping option, and the coupon (code + discount) are stored on the order so tracking and history stay correct even if the cart is cleared or the coupon is later edited/deleted. Since the admin-dashboard migration, `OrderItem` also snapshots `unitPrice`, `productName`, `productPhoto`, `selectedSize` and `selectedTacoOption` at purchase time (with a one-time backfill), so order history and reports stay accurate even if products are later renamed, repriced or archived.
- **Soft delete everywhere it matters** — `Product`, `User` and `Order` carry an `archivedAt` column. Archiving hides from the storefront and the default admin lists without breaking order history; archiving a product clears its carts/wishlists, and archived users are rejected at sign-in before the password check. Permanent delete is only available for entities without references.
- **Admin manual orders** — created with `source: "manual"` and never touched by the Mercado Pago webhook; items are validated and priced server-side against the current catalog (snapshotting price/name/variant photo), and totals always recompute through `lib/discounts.ts`. Item editing is locked once an order leaves `pending`.
- **Cart persisted in the database** (not Redux) — Redux is reserved for ephemeral UI state like filters and search, per the project's state-management rules.
- **Stateless admin session** — the dashboard uses a 7-day HMAC-signed httpOnly cookie (`lib/admin-token.ts`, WebCrypto so it works in the edge proxy) instead of a database row; `proxy.ts` guards every `/admin/*` route except the login page, and all admin server actions — plus the `/api/admin/*` routes (upload, exports, revalidate) that the proxy doesn't cover — re-check the session server-side.
- **Image uploads via Vercel Blob** — the browser asks `/api/admin/upload` (admin-guarded token endpoint with content-type/size/path-prefix validation) and PUTs files directly to Blob, avoiding serverless body-size limits. Removed/replaced images are best-effort cleaned with a reference check against other products and banners.
- **Zipnova credentials guard** — while `ZIPNOVA_*` env vars are placeholders, the admin orders view skips live status/tracking calls (they would 403) and falls back to the data persisted on the order; set the real keys and the calls resume automatically. Live Zipnova calls run only on the order detail and Envíos refresh, keeping the orders list fast.

<br>

## 🗄️ Data model

Prisma models: `User`, `Address`, `Product`, `Cart`, `WishList`, `Order`, `OrderItem`, `Coupon`, `Banner`, `StoreSettings`, `VerificationToken`, `PasswordResetToken`.

- `Cart` rows are unique per `(user, product, selectedSize, selectedColor, selectedTacoOption)`.
- `Product` has an `available` boolean (default `true`) used by the admin dashboard — products are made on demand, so `stock` is informational only. `archivedAt` implements the soft delete; `createdAt`/`updatedAt` power admin sorting and reports.
- `Order` carries a `shippingSelection` JSON snapshot, recipient fields, shipment id/tracking, and coupon snapshots used to create the Zipnova shipment after payment and render order history. `source` distinguishes web checkouts from admin-created manual orders, `notes` holds internal-only remarks, and `archivedAt` hides an order from the admin without touching the buyer's history.
- `OrderItem` snapshots the purchase-time product (`unitPrice`, `productName`, `productPhoto`) and the selected variants (`selectedColor`, `selectedSize`, `selectedTacoOption`), backfilled from existing data by the `admin_dashboard` migration.
- `User.archivedAt` implements soft-deleted accounts (blocked from sign-in, history preserved).
- `Banner` stores admin-managed homepage promos (image, copy, destination, ordering, active flag, start/end scheduling).
- `StoreSettings` is a singleton row (`id = "default"`) with editable store profile and landing hero copy; empty fields fall back to the hardcoded landing strings.
- `Coupon` supports `PERCENT` / `FIXED` types with `usageLimit`, `usedCount`, `onePerUser`, and `expiresAt`.

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

Create a `.env` file (see `.gitignore` — `.env*` is ignored) with:

```env
# App / auth
# App / auth (canonical public origin: used by metadataBase, robots, sitemap)
NEXTAUTH_URL=https://nyady.com
NEXTAUTH_SECRET=yourSecret
DATABASE_URL=postgresql://user:password@host:5432/nyady

# Admin dashboard (/admin)
# Sign-in is at /admin/login; the session cookie is signed with NEXTAUTH_SECRET
# (or ADMIN_SECRET if set). Defaults to nyady/nyady if unset — set real values!
ADMIN_USERNAME=nyady
ADMIN_PASSWORD=yourAdminPassword

# Mercado Pago
MP_ACCESS_TOKEN=TEST-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_MP_PUBLIC_KEY=TEST-XXXXXXXXXXXXXXXX

# Zipnova shipping
ZIPNOVA_KEY=yourZipnovaKey
ZIPNOVA_SECRET=yourZipnovaSecret
ZIPNOVA_ACCOUNT_ID=yourAccountId

# Seller-only ship endpoint
ADMIN_TOKEN=yourStrongRandomToken

# Vercel Blob — product & banner image uploads from the admin dashboard.
# Create the store in Vercel (Project → Storage → Blob) — on Vercel deployments
# the token is injected automatically; locally run `vercel env pull` or upload
# it by hand to .env. Without it, admin image uploads show a friendly error.
# `**.public.blob.vercel-storage.com` is already allowlisted in next.config.ts.
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxx

# Email (Resend) — registration confirmation emails
# Get a key at https://resend.com/api-keys. Without RESEND_API_KEY, dev builds
# log the confirmation link to the console instead of sending. EMAIL_FROM must
# use a domain verified in Resend; onboarding@resend.dev only delivers to the
# Resend account owner's address.
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=NYADY <no-reply@yourdomain.com>
```

### 🛢️ Database setup

```bash
bun run db:migrate
bun run db:seed
```

The seed creates a demo user (`test@nyady.com` / username `nyady` / password `Nyady-1234`, pre-verified so it skips the email confirmation), a set of sample products, example coupons (`BIENVENIDA10`, `5000OFF`, `VERANO15`, `MAYORISTA25`), and the `StoreSettings` singleton with defaults.

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

<br>

## 📝 Notes

- The UI is in Spanish (es-AR) and prices are in Argentine pesos (ARS), matching the Mercado Pago and Zipnova integrations.
- Mercado Pago `auto_return` is enabled only for HTTPS `NEXTAUTH_URL`s (the API rejects HTTP return URLs), so use an HTTPS deployment or tunnel for full checkout redirects.
- Product images in the seed reference remote hosts allowlisted in [next.config.ts](next.config.ts); admin-uploaded images live on Vercel Blob (`**.public.blob.vercel-storage.com`, also allowlisted).
- Deleting (not archiving) a product is only possible when it has no orders — order history is never broken. Products with sales get archived instead.

<br>

## 📬 Contact

### 💌 Email: **dev@nady4.com**

### 💼 LinkedIn: [nady4](https://www.linkedin.com/in/nady4)

### 👩🏻‍💻 GitHub: [@nady4](https://github.com/nady4)
