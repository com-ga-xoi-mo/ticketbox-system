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

The worker starts a NestJS application context and registers BullMQ processors,
including platform health checks and notification delivery jobs.

### Sponsor VIP guest-list import

Scheduled discovery is the primary guest-list ingestion path. Place UTF-8 CSV files directly under a concert UUID directory:

```text
data/guest-list-inbox/<concertId>/*.csv
```

The worker validates the directory UUID and concert, rejects symlinks/path escapes, hashes each regular file, creates one canonical batch per concert/checksum, and moves a successfully claimed source to:

```text
data/guest-list-archive/<concertId>/<sha256>.csv
```

Required headers are `guest_name,email,phone,external_ref`; optional `action` is `UPSERT` (default) or explicit `CANCEL`. Each row needs at least one email, phone, or external reference. Invalid headers fail atomically; invalid rows remain in the batch report while valid rows import.

The queue job is `guest_list.import_requested` with a deterministic batch job ID. Scheduled reconciliation repairs a database-commit/enqueue-failure window. Processing leases allow expired jobs to be reclaimed, and same-concert batches apply in monotonic claim order. Reports are stored under `GUEST_LIST_STORAGE_PATH/reports/`.

Admin fallback endpoints can request imports, trigger discovery, inspect batches, and retrieve reports under `admin/concerts/:concertId/guest-list`. CHECKIN_STAFF VIP lookup is `POST /guest-list/lookup`; it requires the exact active assignment ID for the same concert/gate and does not alter `POST /checkin/scan`.

Configure discovery schedule, inbox/archive/storage paths, file/row limits, retry/backoff, and lease duration through the `GUEST_LIST_*` values in `.env.example`. For recovery, leave a pending batch intact and let reconciliation recreate its deterministic job; expired processing leases are reclaimed automatically.

## Check-in Mobile App

The React Native check-in staff mobile workspace lives at:

```text
apps/checkin-mobile/
```

Run the mobile app after installing workspace dependencies:

```bash
npm run dev:checkin-mobile
```

Verify the mobile foundation without a live backend check-in API:

```bash
npm run verify:checkin-mobile
```

The mobile app uses `EXPO_PUBLIC_API_BASE_URL` for the backend API base URL and
defaults to `http://localhost:3000`. The current mobile slice provides staff
login/session handling, assignment loading boundaries, and QR scan workflow
state. Backend scan endpoints and offline sync are implemented by later
OpenSpec changes.

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
- Docker Compose for Maildev local email demo
- Prisma datasource configuration and baseline domain schema
- database migration and deterministic seed data
- Redis and BullMQ wiring
- notification delivery worker wiring
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
