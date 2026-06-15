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

This change covers only platform foundation:

- NestJS API and worker skeletons
- shared backend infrastructure modules
- Docker Compose for PostgreSQL and Redis
- Prisma datasource configuration and baseline domain schema
- database migration and deterministic seed data
- Redis and BullMQ wiring
- environment validation
- health check
- base README

Deferred follow-on changes:

- `implement-auth-rbac`: authentication and authorization
- feature changes for concert catalog, ticketing, payment, notifications, imports, AI bio, and check-in
