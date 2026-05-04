# NYADY

E-commerce application built with Next.js 15, Prisma, NextAuth.js, Redux Toolkit, and Mercado Pago.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (Credentials + JWT)
- **State**: Redux Toolkit
- **Styling**: Sass (SCSS)
- **Payments**: Mercado Pago SDK

## Getting Started

### Prerequisites

- Bun
- PostgreSQL database

### Installation

```bash
bun install
```

### Environment Setup

Create a `.env` file based on `.env` with your credentials:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=yourSecret
DATABASE_URL=postgresql://postgres:password@localhost:5432/nyady
MP_ACCESS_TOKEN=TEST-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_MP_PUBLIC_KEY=TEST-XXXXXXXXXXXXXXXX
```

### Database Setup

```bash
bun run db:migrate
bun run db:seed
```

### Run Development Server

```bash
bun run dev
```

## Scripts

| Command            | Description           |
|--------------------|-----------------------|
| `bun run dev`      | Start dev server      |
| `bun run build`    | Build for production  |
| `bun run start`    | Start production server|
| `bun run lint`     | Run ESLint            |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:seed`  | Seed database         |
| `bun run db:generate` | Generate Prisma client |

## Project Structure

```
app/
├── (auth)/           # Auth pages (signin, register)
├── (public)/          # Public pages (catalog, cart, wishlist, products)
├── (protected)/       # Protected pages (orders, settings, address)
├── success|failure|pending/  # Payment status pages
└── api/              # API routes

lib/                  # Prisma client + NextAuth config
store/               # Redux store + slices
actions/             # Server Actions
hooks/               # Custom React hooks
components/          # UI components
styles/              # SCSS stylesheets
prisma/              # Schema + seed
```

## Features

- Product catalog with search and filters
- Persistent shopping cart
- Wishlist
- Order management
- Mercado Pago checkout
- User account settings
- Shipping address management