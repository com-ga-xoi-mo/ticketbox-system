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
- Maildev SMTP on `localhost:1025`
- Maildev inbox on `http://localhost:1080`

## Environment

Copy `.env.example` to `.env` before starting the API or worker. Notification
delivery uses deterministic local email defaults unless a future adapter changes
the provider:

```bash
EMAIL_PROVIDER=local
EMAIL_FROM=no-reply@ticketbox.test
EMAIL_MAX_ATTEMPTS=3
EMAIL_RETRY_BACKOFF_MS=5000
```

For visible local email demo evidence, start dependencies and switch the email
provider to Maildev SMTP:

```bash
EMAIL_PROVIDER=smtp
EMAIL_SMTP_HOST=localhost
EMAIL_SMTP_PORT=1025
MAILDEV_WEB_URL=http://localhost:1080
```

Then open `http://localhost:1080` to inspect the local inbox. Maildev is a local
demo provider only; `EMAIL_PROVIDER=local` remains the deterministic default for
tests and development without SMTP.

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

The worker starts a NestJS application context and registers BullMQ processors,
including platform health checks and notification delivery jobs.

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
- Docker Compose for Maildev local email demo
- Prisma datasource configuration and baseline domain schema
- database migration and deterministic seed data
- Redis and BullMQ wiring
- notification delivery worker wiring
- environment validation
- health check
- base README

Deferred follow-on changes:

- `implement-auth-rbac`: authentication and authorization
- feature changes for concert catalog, ticketing, payment, notifications, imports, AI bio, and check-in
