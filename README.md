# NYADY

> Artisanal house-slippers storefront (pantuflas, pantubotas, hornitos, chinelas) built for the Argentine market — Spanish UI (es-AR), ARS pricing, real Mercado Pago checkout and Zipnova shipping.

A full-stack e-commerce application built with Next.js 16 (App Router), React 19, Prisma, PostgreSQL, NextAuth.js, Redux Toolkit, Mercado Pago, and Zipnova. Designed as an end-to-end showcase: product catalog, persistent cart, coupons, volume discounts, live shipping quotes, payment + webhook handling, and order tracking — all behind a proper server/client boundary.

## 📸 Screenshots

<table>
  <tr>
    <td width="50%" align="center"><em>Home / landing</em></td>
    <td width="50%" align="center"><em>Catalog with filters</em></td>
  </tr>
  <tr>
    <td><img src="./screenshots/home.png" alt="Home" /></td>
    <td><img src="./screenshots/catalog.png" alt="Catalog" /></td>
  </tr>
  <tr>
    <td align="center"><em>Product detail (size / color / heel)</em></td>
    <td align="center"><em>Cart + shipping quote + coupon</em></td>
  </tr>
  <tr>
    <td><img src="./screenshots/product.png" alt="Product detail" /></td>
    <td><img src="./screenshots/cart.png" alt="Cart" /></td>
  </tr>
  <tr>
    <td align="center"><em>Checkout (Mercado Pago Wallet)</em></td>
    <td align="center"><em>Orders + shipment tracking</em></td>
  </tr>
  <tr>
    <td><img src="./screenshots/checkout.png" alt="Checkout" /></td>
    <td><img src="./screenshots/orders.png" alt="Orders & tracking" /></td>
  </tr>
</table>

<br>

## 🌐 Live demo

> _Add a link to the deployed app here (e.g. Vercel)._

- **URL:** _<https://nyady.com>_
- **Demo account:** `test@nyady.com` / username `nyady` / password `Nyady-1234` (seeded) — or register a new one.

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
- User account settings and shipping-address management
- Full set of info / legal pages required for Argentine e-commerce: envíos, medios de pago, promociones, reembolsos, preguntas frecuentes, elaboración, privacidad, términos, contacto, blog, and the **botón de arrepentimiento** (withdrawal form)

### ⚙️ Operations (seller-side)

- **Artisanal elaboración flow** — after payment, an order enters "En Preparación" (3–7 business days of crafting). The seller marks it ready, which creates the Zipnova shipment and unlocks tracking.
- **Seller-only ship endpoint** guarded by an `ADMIN_TOKEN`

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
| Forms                     | React Hook Form                                        |
| Runtime / package manager | Bun                                                    |

<br>

## 🏗️ Architecture

Route groups keep public, auth, and protected surfaces cleanly separated:

```
app/
├── (public)/         # Catalog, product detail, cart, wishlist, info/legal pages
├── (auth)/           # Sign-in, register
├── (protected)/      # Account, orders, address management
├── success|pending|failure/   # Payment return pages
└── api/              # auth, register, products, orders, coupons, mp-webhook
actions/              # Server Actions (cart, wishlist, orders, coupons, shipping, …)
lib/                  # Prisma client, NextAuth config, shared discount math, colors
store/                # Redux store + slices (UI state only)
hooks/                # Data-loading + validation hooks
components/           # NavBar, Footer, ProductCard, Filters, ShippingQuote, CheckoutButton, OrderTracking, …
types/                # Shared TypeScript types
prisma/               # Schema + migrations + seed
styles/               # SCSS stylesheets
```

### 🖥️ Server / client boundaries

- **Server Actions** for mutations (cart, wishlist, orders, coupons, address, products, shipping)
- **API routes** for external integrations (Mercado Pago preference creation, payment webhook, Zipnova)
- **Client components** only where interactivity is required (selectors, filters, checkout wallet)

### 🔍 Notable implementation details

- **Single source of truth for discounts** — `lib/discounts.ts` is pure (no `"use server"`, no Prisma) so the wholesale + coupon math is imported by both the cart UI and the orders API, guaranteeing the charged total matches what the customer sees.
- **Idempotent payment webhook** — looks up the order before updating, clears only the buyer's cart, and treats forged/stale notifications safely. The Zipnova shipment is deliberately _not_ created on payment; it's deferred until elaboración is complete.
- **Coupon consumed only after the Mercado Pago preference succeeds** — a failed preference rolls back the orphan order so a one-per-user coupon isn't burned and the user can retry.
- **Per-order snapshots** of recipient data, the chosen shipping option, and the coupon (code + discount) are stored on the order so tracking and history stay correct even if the cart is cleared or the coupon is later edited/deleted.
- **Cart persisted in the database** (not Redux) — Redux is reserved for ephemeral UI state like filters and search, per the project's state-management rules.

<br>

## 🗄️ Data model

Prisma models: `User`, `Address`, `Product`, `Cart`, `WishList`, `Order`, `OrderItem`, `Coupon`.

- `Cart` rows are unique per `(user, product, selectedSize, selectedColor, selectedTacoOption)`.
- `Order` carries a `shippingSelection` JSON snapshot, recipient fields, shipment id/tracking, and coupon snapshots used to create the Zipnova shipment after payment and render order history.
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
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=yourSecret
DATABASE_URL=postgresql://user:password@host:5432/nyady

# Mercado Pago
MP_ACCESS_TOKEN=TEST-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_MP_PUBLIC_KEY=TEST-XXXXXXXXXXXXXXXX

# Zipnova shipping
ZIPNOVA_KEY=yourZipnovaKey
ZIPNOVA_SECRET=yourZipnovaSecret
ZIPNOVA_ACCOUNT_ID=yourAccountId

# Seller-only ship endpoint
ADMIN_TOKEN=yourStrongRandomToken
```

### 🛢️ Database setup

```bash
bun run db:migrate
bun run db:seed
```

The seed creates a demo user (`test@nyady.com` / username `nyady` / password `Nyady-1234`), a set of sample products, and example coupons (`BIENVENIDA10`, `5000OFF`, `VERANO15`, `MAYORISTA25`).

### 💻 Run the dev server

```bash
bun run dev
```

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
- Product images in the seed reference remote hosts allowlisted in [next.config.ts](next.config.ts).

<br>

## 📬 Contact

### 💌 Email: **dev@nady4.com**

### 💼 LinkedIn: [nady4](https://www.linkedin.com/in/nady4)

### 👩🏻‍💻 GitHub: [@nady4](https://github.com/nady4)
