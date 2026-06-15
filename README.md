# TicketBox System

TicketBox is a concert ticketing system for the team project. The current baseline provides the initial NestJS backend workspace, local PostgreSQL and Redis dependencies, BullMQ worker wiring, configuration loading, health checks, Prisma migrations, and deterministic demo seed data.

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- Docker Desktop or another Docker Compose compatible runtime

## Setup

```bash
npm install
cp .env.example .env
npm run start:deps
npm run db:migrate
npm run db:seed
```

The local dependency stack starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

## Database

Prisma owns the local PostgreSQL schema and generated client.

```bash
npm run db:migrate   # apply local migrations
npm run db:generate  # regenerate Prisma Client
npm run db:seed      # load deterministic demo data
npm run db:reset     # reset local database and rerun migrations
npm run db:studio    # inspect data in Prisma Studio
```

Seed data is idempotent, so `npm run db:seed` can be run more than once without duplicating demo records.

The seed includes:

- demo roles: `AUDIENCE`, `ORGANIZER`, `CHECKIN_STAFF`, `ADMIN`
- demo users:
  - `audience@ticketbox.test`
  - `organizer@ticketbox.test`
  - `staff@ticketbox.test`
  - `admin@ticketbox.test`
- local-only password hash placeholder for demo credentials; production auth is implemented in a later change
- sample concerts:
  - Anh Trai Say Hi
  - Anh Trai Vuot Ngan Chong Gai
  - Em Xinh Say Hi
  - Chi Dep Dap Gio Re Song
- ticket types with VND prices, capacities, sale windows, max-per-user limits, seating zones, and ticket-to-zone mappings

## Backend API

```bash
npm run dev:api
```

The API listens on `http://localhost:3000` by default.

Health check:

```bash
npm run health
```

Expected healthy response shape:

```json
{
  "status": "up",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "services": {
    "api": { "status": "up" },
    "postgres": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

If PostgreSQL or Redis is unavailable, `GET /health` returns an unhealthy response with the failing dependency status.

### Public Concert Catalog

The public catalog APIs are read-only and return upcoming published concerts from PostgreSQL.

```text
GET /concerts
GET /concerts/:slug
GET /concerts/:slug/availability
```

Example:

```bash
curl http://localhost:3000/concerts
curl http://localhost:3000/concerts/anh-trai-say-hi-2026
curl http://localhost:3000/concerts/anh-trai-say-hi-2026/availability
```

Catalog detail responses include poster metadata, seating map metadata, seating zones, ticket types, ticket-to-zone mappings, and derived `availableQuantity`. Internal inventory counters such as `reservedQuantity` and `soldQuantity` are used for calculation but are not exposed by the public API.

Availability is currently calculated from source-of-truth ticket type rows:

```text
availableQuantity = max(totalQuantity - reservedQuantity - soldQuantity, 0)
```

Redis cache-aside for concert list/detail, short-TTL availability caching, and invalidation are deferred to the `implement-concert-caching` change.

### Read-Only Catalog Demo

A small static verification surface is available at:

```text
apps/catalog-demo/index.html
```

Demo steps:

```bash
npm run start:deps
npm run db:migrate
npm run db:seed
npm run dev:api
```

Then open `apps/catalog-demo/index.html` in a browser, keep the API base URL as `http://localhost:3000`, and load the catalog. The demo is intentionally read-only: it verifies list/detail data, ticket types, seating zones, mappings, and availability without implementing checkout, login, admin management, or seating map upload.

## Worker

```bash
npm run dev:worker
```

The worker starts a NestJS application context and registers the placeholder `platform.health` BullMQ processor. Domain jobs are intentionally not implemented in this foundation change.

## Verification

```bash
npm run build
npm run lint
npm run test
npm run format:check
npm run verify:prisma
npm run verify:database
```

Use `npm run verify:workspace` for a lightweight root workspace script check.

`npm run verify:database` expects PostgreSQL to be running and the migration plus seed data to be applied.

## Current Scope Boundaries

The current implemented baseline covers:

- NestJS API and worker skeletons
- shared backend infrastructure modules
- Docker Compose for PostgreSQL and Redis
- Prisma datasource configuration and baseline domain schema
- database migration and deterministic seed data
- Redis and BullMQ wiring
- environment validation
- health check
- base README
- public concert catalog list/detail/availability APIs
- read-only static catalog demo surface

Deferred follow-on changes:

- `implement-concert-admin-management`: organizer/admin concert and ticket type management
- `implement-seating-map-assets`: seating map upload, sanitization, and zone authoring
- `implement-concert-caching`: Redis catalog cache and availability invalidation
- ticketing, payment, notifications, imports, AI bio, and check-in changes
