# Allo Inventory — Take-Home Exercise

A full-stack inventory reservation system built with Next.js 14, Prisma, and PostgreSQL. Solves the double-booking race condition at checkout using database-level row locking.

**Live Demo:** https://allo-inventory-ajx4ofee2-thirusprojects.vercel.app

## The Problem

Deducting stock only on payment completion allows two customers to simultaneously purchase the last unit. Deducting on cart add inflates stock depletion (most carts are abandoned). This system solves it with a 10-minute reservation hold during checkout.

## How It Works

1. Customer clicks Reserve → stock row is locked, `reservedUnits` incremented, reservation created with 10-min expiry
2. Customer sees a live countdown timer on the checkout page
3. On Confirm → `totalUnits` and `reservedUnits` both decremented (stock permanently sold)
4. On Cancel or expiry → only `reservedUnits` decremented (stock returned to available pool)

## Concurrency Safety

The reservation endpoint uses a PostgreSQL `SELECT ... FOR UPDATE` inside a Prisma transaction. This acquires a row-level lock on the stock record, so two simultaneous requests for the last unit are serialized — exactly one succeeds with 201, the other gets 409.

```sql
SELECT id, "totalUnits", "reservedUnits"
FROM "Stock"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE
```

## Expiry Strategy

Expired reservations are cleaned up lazily on every `GET /api/products` call — any pending reservations past their `expiresAt` are released and their `reservedUnits` decremented inside a transaction. This guarantees correctness without additional infrastructure.

In production I would add a Vercel Cron job running every minute to proactively release expired holds, preventing stale reservations from accumulating between product page visits.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products with available stock per warehouse |
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/reservations` | Reserve units — 409 if insufficient stock |
| GET | `/api/reservations/:id` | Get reservation details |
| POST | `/api/reservations/:id/confirm` | Confirm purchase — 410 if expired |
| POST | `/api/reservations/:id/release` | Release reservation early |

## Local Setup

1. Clone the repo
```bash
   git clone https://github.com/Thirupj10/allo-inventory.git
   cd allo-inventory
```

2. Install dependencies
```bash
   npm install
```

3. Set up environment variables — create a `.env` file:
DATABASE_URL="your-postgres-connection-string"

4. Run migrations and seed
```bash
   npx prisma migrate dev
   npx prisma db seed
```

5. Start the dev server
```bash
   npm run dev
```

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Prisma 5** ORM
- **Neon** — hosted PostgreSQL
- **Zod** — request validation
- **Tailwind CSS** — styling
- **Vercel** — deployment

## Trade-offs & What I'd Add With More Time

- **No Redis** — row-level locking in Postgres handles concurrency correctly for this scale. Redis would be needed for distributed locking across multiple database replicas.
- **No auth** — reservations are identified by ID only. Production would tie reservations to authenticated user sessions.
- **Lazy expiry** — works correctly but a cron job would be cleaner at scale.
- **No idempotency keys** — would add `Idempotency-Key` header support on reserve and confirm to safely handle client retries.
- **No loading states / error boundaries** — would add proper React error boundaries and skeleton loaders with more time.