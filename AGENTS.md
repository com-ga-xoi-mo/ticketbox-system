# Agent Instructions

This file contains high-signal, repository-specific guidance for AI agents working in the TicketBox system monorepo. It focuses on non-obvious architecture, boundaries, and required command sequences.

## 1. Monorepo Architecture & Boundaries

- **`apps/api` and `apps/worker`**: Primary NestJS backend boundaries. `api` handles public/admin HTTP traffic; `worker` runs BullMQ job processors (notifications, guest-list imports).
- **`apps/checkin-mobile`**: React Native / Expo workspace for event staff check-in.
- **`packages/api-types`**: Shared Zod HTTP contracts. **Important:** This is an npm workspace that must be built (`npm run build:api-types`) before changes take effect in dependents.
- **`packages/backend`**: Contains shared NestJS modules. **Important:** This is *not* an npm workspace. It is mapped via TypeScript path aliases (`@ticketbox/backend/*`) in `tsconfig.base.json`.

## 2. Environment & Database Setup

- Start local infrastructure (PostgreSQL, Redis, Maildev):
  ```bash
  npm run start:deps
  ```
- Initialize and seed the database. Prisma owns the PostgreSQL schema (`prisma/schema.prisma`).
  ```bash
  npm run db:migrate
  npm run db:seed
  ```
  *Note: Seed data is idempotent and safe to run multiple times without duplicating demo records.*
- Local email deliveries are captured by Maildev (view inbox at `http://localhost:1080` when deps are running).

## 3. Dev Commands & Workflows

Always prefer root workspace `npm run ...` scripts over running commands in subdirectories.

- **Start API**: `npm run dev:api` (implicitly builds `api-types`). Listens on `:3000`.
- **Start Worker**: `npm run dev:worker`
- **Start Mobile App**: `npm run dev:checkin-mobile`

## 4. Testing & Verification Requirements

When proposing code changes, run the appropriate verification step:

- **Run all unit tests**: `npm test` (uses Vitest, implicitly runs `build:api-types` first).
- **Run end-to-end tests**: `npm run test:e2e`
- **Validate Prisma changes**: `npm run verify:prisma` (runs `validate` and `generate`).
- **Validate Database & Seed**: `npm run verify:database` (requires Postgres + migrations + seed).
- **Lint and Format**: `npm run lint` and `npm run format:check`.

## 5. Domain & Quirks

- **Worker Inbox**: The guest list import process relies on dropping CSV files directly into UUID-specific directories at `data/guest-list-inbox/<concertId>/*.csv`. The `guest_list.import_requested` job picks this up.
- **Concert Availability**: Public API inventory is calculated as `max(totalQuantity - reservedQuantity - soldQuantity, 0)` from source-of-truth PostgreSQL tables.
