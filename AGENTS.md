<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# agents.md

## 🧠 Purpose

This document defines how to recreate the NYA-STORE architecture in a new project called **NYADY**, preserving the same technical decisions, patterns, and flows while adapting naming, branding, and structure cleanly.

The goal is not to improvise. It is to **replicate architecture with intention**, avoiding drift.

---

## 🏗️ Project Identity

- Old name: `nya-store`
- New name: `nyady`

### Required replacements

- Repository name → `nyady`
- Database name → `nyady`
- Environment variables referencing `nya-store` → update to `nyady`
- Assets (icons, branding) → replace cat identity with NYADY brand

Do not leave legacy references. No mixed naming.

---

## ⚙️ Core Stack (must remain identical)

- Next.js 15 (App Router)
- React 18+
- TypeScript
- Prisma ORM
- PostgreSQL
- NextAuth.js (Credentials + JWT)
- Redux Toolkit
- Sass (SCSS)
- Mercado Pago SDK (`@mercadopago/sdk-react`)

No stack changes unless explicitly justified.

---

## 📁 Architecture Rules

### 1. App Router structure

Keep separation:

- `/app/(public)`
- `/app/(auth)`
- `/app/(protected)`
- `/app/api`

Do not collapse routes. Maintain logical grouping.

---

### 2. Server vs Client boundaries

- Server Actions for mutations
- API routes for external integrations (Mercado Pago, webhooks)
- Client components only when necessary (UI state, interactivity)

Avoid leaking business logic into client components.

---

### 3. State Management

Redux Toolkit is only for:

- UI state (filters, search, modals)
- Non-persistent ephemeral state

Do NOT store:

- Auth state
- Cart (persisted in DB)
- Orders

---

## 🗄️ Database Layer (Prisma)

Schema must be **identical in structure**, only adjust naming if needed.

Models:

- User
- Address
- Product
- WishList
- Cart
- Order
- OrderItem

### Rules

- Keep relations exactly the same
- Preserve unique constraints
- Do not denormalize
- Do not introduce premature abstractions

---

## 🔐 Authentication

- NextAuth.js with Credentials provider
- JWT sessions

### Requirements

- Password hashing (bcrypt)
- No OAuth unless explicitly added later
- Session must be stateless (JWT only)

---

## 🛍️ E-commerce Logic

### Cart

- Persistent per user in DB
- Unique constraint `(userId, productId)`
- Quantity controlled server-side

### Wishlist

- Same pattern as cart
- No duplication allowed

### Orders

Flow:

1. Create `Order` with `pending`
2. Create `OrderItem[]`
3. Generate Mercado Pago preference
4. Return `preferenceId`

Never skip order creation before payment.

---

## 💳 Mercado Pago Integration

### Required flow

1. Backend (`/api/orders`)
   - Create order
   - Create MP preference
   - Attach:
     - `back_urls`
     - `notification_url`
     - `external_reference`

2. Frontend
   - Initialize Wallet with `NEXT_PUBLIC_MP_PUBLIC_KEY`
   - Render checkout

3. Webhook (`/api/mp-webhook`)
   - Receive payment update
   - Match using `external_reference`
   - Update `Order.status`

### Rules

- Webhook is source of truth
- Redirects are not trusted for final state
- Always validate payment status

---

## 🌍 Environment Variables

Must exist:
NEXTAUTH_URL=http://localhost:3000

NEXTAUTH_SECRET=yourSecret
DATABASE_URL=postgresql://postgres:password@localhost:5432/nyady
MP_ACCESS_TOKEN=TEST-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_MP_PUBLIC_KEY=TEST-XXXXXXXXXXXXXXXX

### Constraints

- Never hardcode secrets
- Always use TEST credentials in dev
- Production must mirror names exactly

---

## 🎨 UI System

- Keep responsive design
- Maintain design system consistency

NYADY direction:

- More minimal and elegant
- Remove heavy pixel-art if not aligned with brand
- Keep component structure, not visual identity

Do not mix styling paradigms.

---

## 🚀 Setup Flow

1. Clone base structure (or copy project)
2. Rename all identifiers to `nyady`
3. Update `.env`
4. Run:
   npm install
   npx prisma migrate dev --name init
   npx prisma db seed
   npm run dev

---

## ⚠️ Non-Negotiables

- No business logic duplication
- No client-side trust for payments
- No schema breaking changes without migration strategy
- No inconsistent naming (`nya` must not remain anywhere)

---

## 🧩 Extension Points

Allowed improvements:

- Admin panel
- Product variants (sizes, colors)
- Inventory tracking improvements
- Better analytics

Not allowed:

- Rewriting core architecture
- Replacing Prisma or NextAuth without strong reason

---

## 🧠 Final Principle

This is not a redesign exercise.  
It is a **controlled replication with branding changes**.

If something changes, it must be intentional and justified, not accidental.

## 🔍 Legacy Exploration - Inspecting `nya-store`

To properly replicate the architecture, you must **actively explore the original `nya-store` codebase**, not guess how it works.

This section defines how to treat the old project as a **reference system**.

---

## 📂 Access Strategy

Work with the original project locally:
git clone https://github.com/nady4/nya-store.git
cd nya-store
code .

Do not browse it passively. You are expected to **trace flows end-to-end**.

---

## 🧭 What to Explore (in order)

### 1. `/app` (Core architecture)

Focus on:

- Route groups `(public)`, `(auth)`, `(protected)`
- Layout hierarchy
- Page structure

Goal:

- Understand navigation boundaries
- Identify where auth gates are enforced

---

### 2. `/app/api`

Critical for backend logic:

- `/api/orders`
- `/api/mp-webhook`
- Auth-related routes

Goal:

- Understand how server logic is separated
- Trace request → DB → response

---

### 3. `/lib` or `/services` (if present)

Look for:

- Prisma client setup
- Mercado Pago integration helpers
- Auth utilities

Goal:

- Identify reusable logic
- Avoid duplicating patterns incorrectly

---

### 4. `/prisma/schema.prisma`

This is the **source of truth**.

You must:

- Read all models
- Understand relations deeply
- Map how queries will behave

Do not modify blindly later.

---

### 5. `/store` (Redux)

Check:

- Slices
- What state is stored
- What is intentionally NOT stored

Goal:

- Avoid misusing Redux in NYADY

---

### 6. Components (`/components`)

Focus on:

- Separation of concerns
- Server vs Client components
- Reusability patterns

Ignore styling at first. Focus on structure.

---

## 🔄 Flow Tracing חובה

You must manually trace these flows:

### 🛒 Add to cart

UI → action → DB write → UI update

---

### 💳 Checkout

Cart → `/api/orders` → MP preference → frontend wallet

---

### 🔔 Webhook

MP → `/api/mp-webhook` → DB update → order status

---

### 🔐 Auth

Login → NextAuth → JWT → protected routes

---

## ⚠️ Common Mistakes (avoid these)

- Copying files without understanding flow
- Rewriting logic because it "looks messy"
- Mixing client/server responsibilities
- Breaking Prisma relations accidentally

---

## 🧠 Recommended Approach

For each feature:

1. Locate entry point (UI)
2. Trace to backend
3. Identify DB interaction
4. Re-implement in NYADY cleanly

If you can't explain the flow, you don't understand it yet.

---

## 🧩 Optional Tooling

Use tools to speed up exploration:

- Global search (`Ctrl + Shift + F`)
- TypeScript references ("Go to definition")
- Prisma Studio:

---

## 🧠 Final Rule

You are not copying a project.

You are **reverse-engineering a system and rebuilding it with control**.
