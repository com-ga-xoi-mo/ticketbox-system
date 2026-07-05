## Why

The resale module contains critical production bugs in its queue processors (swallowed errors, missing retry logic, non-transactional batch operations) that can silently corrupt order state and leave expired listings unprocessed. Beyond the immediate bugs, the module violates architectural boundaries at multiple layers — Prisma leaks into application use-cases, HTTP exceptions bleed into domain logic, and cross-module coupling bypasses abstraction — making the codebase increasingly fragile and untestable as it grows.

## What Changes

- **Fix queue processors to propagate errors correctly** so BullMQ can retry and route failures to dead-letter queues
- **Add retry configuration** to all four BullMQ queue processors (`compute-seller-trust`, `resale-listing-expiry`, `resale.order.reserved.expiry`, `resale.order.confirm.expiry`)
- **Wrap listing expiry batch in a database transaction** to prevent partial-completion data inconsistency
- **Extract Prisma and raw SQL out of application use-cases** — move database transactions into repository ports/infrastructure layer
- **Eliminate direct cross-module infrastructure import** — replace `PrismaSellerBankProfileRepository` import in resale use-cases with a proper domain port abstracted behind a `UsersModule` export
- **Decouple domain errors from HTTP** — `ResaleDomainError` should extend `Error`, not `HttpException`; introduce an exception filter to map domain errors to HTTP responses
- **Replace `any` types in domain ports** with typed domain interfaces
- **Remove `@prisma/client` import from domain port** — define `ResaleOrderStatus` enum in the domain layer
- **Replace HTTP exceptions in application use-cases** with domain errors
- **Replace direct BullMQ injection in use-cases** with a messaging port abstraction
- **Add DTO classes with `class-validator`** to all controller endpoints lacking validation
- **Add unit tests** for critical use-cases and queue processors

## Capabilities

### New Capabilities

- `queue-resilience`: Reliable queue processing with error propagation, retry logic, and transactional batch operations for listing expiry
- `users-bank-profile-port`: A domain port abstraction for seller bank profile data, exposed via `UsersModule`, consumed by resale use-cases without coupling to infrastructure
- `domain-error-handling`: Pure domain error hierarchy with an NestJS exception filter that translates domain errors to HTTP responses
- `resale-port-contracts`: Strongly-typed domain port interfaces replacing `any` types, with a domain-owned `ResaleOrderStatus` enum

### Modified Capabilities

## Impact

- `packages/backend/src/resale/infrastructure/queue/*.ts` — all four processors modified
- `packages/backend/src/resale/application/use-cases/p2p-order/initiate-p2p-order.use-case.ts` — remove Prisma/SQL, inject port
- `packages/backend/src/resale/application/use-cases/p2p-order/cancel-p2p-order.use-case.ts` — remove Prisma transaction, inject port
- `packages/backend/src/resale/application/use-cases/p2p-order/resolve-dispute.use-case.ts` — remove Prisma transaction, inject port
- `packages/backend/src/resale/application/use-cases/create-listing.use-case.ts` — remove direct repo import, inject bank profile port
- `packages/backend/src/resale/domain/errors.ts` — decouple from `HttpException`
- `packages/backend/src/resale/domain/ports/*.ts` — replace `any`, remove `@prisma/client` import
- `packages/backend/src/users/` — add `users.module.ts`, domain port, export bank profile token
- `packages/backend/src/resale/resale.module.ts` — import `UsersModule`, wire new ports
- `packages/backend/src/resale/adapters/http/*.ts` — add DTO validation classes
- No public API contract changes; no breaking changes for frontend consumers
