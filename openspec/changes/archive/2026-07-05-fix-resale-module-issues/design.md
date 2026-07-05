## Context

The resale module (`packages/backend/src/resale/`) is the core peer-to-peer ticket trading feature of the platform. It handles listing creation, P2P order lifecycle, messaging, trust scoring, dispute resolution, and financial transactions — all within a single NestJS module following hexagonal architecture.

A codebase audit identified three groups of issues:

- **Group 1 (Production bugs)**: Queue processors silently swallow errors (BullMQ marks failed jobs as "succeeded"), no retry configuration exists on any processor, and the listing expiry batch runs without a database transaction.
- **Group 2 (Architectural debt)**: Prisma and raw SQL execute directly inside application use-cases; a concrete infrastructure class from the `users` directory is imported directly into resale use-cases; domain errors extend NestJS `HttpException`; domain ports use `any` and import from `@prisma/client`.
- **Group 3 (Code quality)**: HTTP exceptions thrown in use-cases, BullMQ `Queue` injected directly into use-cases, controllers lack DTO validation classes, no tests exist.

The `users` directory has no `users.module.ts` and no domain port for bank profiles — making it an open internal library rather than an encapsulated module.

## Goals / Non-Goals

**Goals:**
- Fix all Group 1 production bugs: error propagation in processors, retry configuration, transactional listing expiry batch
- Fix all Group 2 architectural violations: extract Prisma/SQL from use-cases into repository ports, encapsulate `users` as a proper NestJS module with a domain port, decouple domain errors from HTTP, type domain ports, own `ResaleOrderStatus` in domain
- Fix all Group 3 code quality issues: domain errors in use-cases, messaging port abstraction, DTO validation, unit tests for critical paths

**Non-Goals:**
- Splitting the resale module into multiple NestJS modules (separate concern, separate change)
- Changing any public REST API contracts
- Migrating to a different ORM or queue system
- Frontend changes

## Decisions

### D1: Fix error propagation by re-throwing in processors

**Decision**: In all `catch` blocks inside queue processors, re-throw the error after logging instead of silently catching it.

**Rationale**: BullMQ determines job success/failure by whether the `process()` method throws. Swallowing errors causes BullMQ to mark failed jobs as completed, bypassing retry and dead-letter queue mechanisms entirely. Re-throwing is the correct pattern per BullMQ documentation.

**Alternative considered**: Wrapping in a custom `JobFailedException` — unnecessary; BullMQ only needs the method to throw.

---

### D2: Configure retry via `defaultJobOptions` on `BullModule.registerQueue`

**Decision**: Add `defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }` to each queue registration in `resale.module.ts`.

**Rationale**: Retry configuration belongs at the queue registration site so it applies to all jobs enqueued without requiring each producer to specify it. Exponential backoff reduces thundering-herd on transient infrastructure failures.

**Alternative considered**: Per-job retry options in each use-case — creates inconsistency and coupling between use-cases and BullMQ retry semantics.

---

### D3: Wrap listing expiry batch in a Prisma `$transaction`

**Decision**: The `listing-expiry.processor.ts` batch loop will be wrapped in a single `prisma.$transaction()`.

**Rationale**: A for-loop with individual updates is not atomic. If one update fails midway, already-processed listings are expired but remaining ones are not, leaving the system in a partial state with no automatic recovery. A single transaction ensures all-or-nothing semantics.

**Alternative considered**: Process each listing in a separate job (fan-out) — more robust long-term but increases queue complexity; overkill for current scale.

---

### D4: Extract Prisma `$transaction` and raw SQL from use-cases into repository methods

**Decision**: For `cancel-p2p-order`, `resolve-dispute`, and `initiate-p2p-order` use-cases, move all `prisma.$transaction()` and `$queryRaw` calls into new methods on their respective repository implementations. Use-cases call named repository methods (e.g., `orderRepo.cancelWithRefund(orderId)`) rather than composing Prisma operations inline.

**Rationale**: Application use-cases must not know how data is persisted. Extracting to repositories keeps the application layer infrastructure-agnostic and testable with mock repositories.

**Alternative considered**: Unit of Work pattern — more expressive but significantly more complex; the repository method approach is sufficient and idiomatic in this codebase.

---

### D5: Create `UsersModule` with a domain port for seller bank profiles

**Decision**:
1. Define `ISellerBankProfileRepository` interface in `users/domain/ports/seller-bank-profile-repository.port.ts` with `SELLER_BANK_PROFILE_REPOSITORY` injection token.
2. Create `users/users.module.ts` that provides `PrismaSellerBankProfileRepository` under that token and exports the token.
3. Resale use-cases inject `ISellerBankProfileRepository` via the token; `ResaleModule` imports `UsersModule`.
4. Remove the direct `PrismaSellerBankProfileRepository` provider registration from `ResaleModule`.

**Rationale**: Resale's application layer must not know that `users` uses Prisma. The port inverts the dependency: resale depends on an abstraction, not on a concrete infrastructure class from another module. This is the hexagonal architecture intent already present in the resale module itself.

**Alternative considered**: Expose a `GetSellerBankProfileQuery` via CQRS bus — correct for microservices, unnecessary overhead for a monolith module boundary.

---

### D6: Decouple `ResaleDomainError` from `HttpException`

**Decision**:
1. `ResaleDomainError` extends `Error` with a `code` string discriminator (e.g., `'ORDER_NOT_FOUND'`).
2. Create a NestJS `@Catch(ResaleDomainError)` exception filter that maps error codes to HTTP status codes.
3. Register the filter globally or on the resale controllers.
4. Replace HTTP exception throws in use-cases with `ResaleDomainError` subclass throws.

**Rationale**: Domain layer must not know about HTTP. If the module is later exposed via WebSocket or gRPC, domain errors with HTTP status codes are meaningless. An exception filter is the correct NestJS pattern for this translation.

**Alternative considered**: Problem Details RFC 7807 response format — good idea but out of scope; filter can be extended later.

---

### D7: Replace `any` in domain ports with typed interfaces; own `ResaleOrderStatus` in domain

**Decision**: Define explicit TypeScript interfaces for all domain entities returned by ports (e.g., `ResaleListing`, `ResaleOrder`, `ResaleMessage`). Define a `ResaleOrderStatus` enum in `domain/` and have the Prisma repository map `@prisma/client` status to the domain enum.

**Rationale**: Domain ports typed with `any` provide no compile-time safety. The domain must own its types; the infrastructure layer is responsible for mapping ORM types to domain types, not the reverse.

---

### D8: Introduce a `IQueuePort` / `IEventPublisher` abstraction for messaging

**Decision**: Define a minimal `IEventPublisher` port in the domain with a single `publish(eventName: string, payload: unknown): Promise<void>` method. BullMQ implementation lives in infrastructure. Use-cases inject the port token.

**Rationale**: Use-cases injecting `@InjectQueue('...')` directly couple the application layer to BullMQ. The port abstraction makes use-cases testable without a running Redis/BullMQ instance.

**Alternative considered**: NestJS `EventEmitter2` — in-process, not persistent; unsuitable for jobs that must survive process restart.

---

### D9: Add DTO classes with `class-validator` to all controller endpoints

**Decision**: Create explicit DTO classes decorated with `class-validator` annotations for every endpoint currently using inline type annotations or untyped bodies. Apply `ValidationPipe` at the module level.

**Rationale**: Runtime validation is a basic controller responsibility. Missing validation allows malformed data to propagate into use-cases and eventually the database.

## Risks / Trade-offs

- **D3 (batch transaction)**: Wrapping a large batch in one transaction holds a DB lock longer. → Mitigation: Add a configurable batch size limit; if the expiry set is large, chunk into multiple transactions.
- **D4 (move Prisma to repos)**: Moving `$queryRaw` SQL into repositories may temporarily hide complexity. → Mitigation: Document the raw query reason in a code comment; consider extracting to a named view or stored procedure in a future change.
- **D5 (UsersModule)**: `users` currently has no `users.module.ts`. Creating it is low-risk but must be imported correctly in `AppModule`. → Mitigation: Verify `AppModule` imports after creation; add integration smoke test.
- **D6 (exception filter)**: HTTP status mapping must cover all existing `ResaleDomainError` subclasses or unhandled errors will return 500. → Mitigation: Add a fallback 500 case and log unmapped error codes as warnings.
- **D8 (event publisher port)**: The port abstraction adds one indirection layer. Developers unfamiliar with the pattern may bypass it. → Mitigation: Add a lint rule or PR checklist item to flag direct `@InjectQueue` usage in application use-cases.

## Migration Plan

1. **Group 1 fixes first** (processors + transaction) — zero API changes, safe to deploy immediately.
2. **Group 2 architectural changes** — wire new ports and modules; keep existing behavior identical. Deploy with a smoke-test of listing creation, P2P order initiation, and dispute resolution flows.
3. **Group 3 quality changes** — DTOs and tests; no runtime behavior change. Merge last.

No rollback strategy needed beyond standard git revert — no schema migrations, no data transformations.

## Open Questions

### Q1: Should `IEventPublisher` be platform-level or per-module?

**Decision: Per-module, mirroring the `ordering` module pattern. Do NOT create a platform-level abstraction at this time.**

**Evidence from codebase**:
- `ordering/domain/ports/order-event-publisher.port.ts` already defines `IOrderEventPublisher` scoped to that module — the only prior example of this pattern in the codebase.
- At least 5 other modules (`ai-artist-bio`, `guest-list-import`, `notification`, `ordering`, `payment`) use BullMQ, but none share a common publisher abstraction. Each wires queues independently.
- `platform/` has a `QueueModule` for queue *registration* infrastructure, but no shared publisher *interface*.

**Rationale**: The codebase has no precedent for a shared event publisher port, and the `ordering` module explicitly chose per-module scoping. Introducing a platform-level `IEventPublisher` now would be a cross-cutting architectural change beyond the scope of this fix. Per-module keeps the change contained and consistent with existing patterns. If a second module adopts `IEventPublisher`, that duplication is the signal to extract — not before.

**Trigger for revisiting**: When two or more modules independently define an `IEventPublisher` port with identical or near-identical signatures, extract to `platform/events/event-publisher.port.ts`.

---

### Q2: Should domain entity interfaces live in `domain/entities/` or inline in port files?

**Decision: Flat files directly in `domain/` (e.g., `domain/resale-listing.entity.ts`), mirroring the `ordering` and `payment` module conventions.**

**Evidence from codebase**:
- `ordering/domain/order.entity.ts` — entity defined as a flat file directly under `domain/`
- `payment/domain/payment.entity.ts` — same pattern
- `concert-management/domain/concert.types.ts`, `catalog.types.ts` — domain types as flat `.types.ts` files under `domain/`
- No module in the codebase uses a `domain/entities/` subdirectory. The pattern is consistently flat.
- `resale/domain/` currently has only `errors.ts` and `ports/` — no entities defined yet.

**Rationale**: The rest of the codebase does not use `domain/entities/` nesting. Introducing it in resale would create an inconsistency and a cognitive jump for developers navigating between modules. Flat files under `domain/` are immediately discoverable and match the established convention.

**Naming convention to follow**:
- Complex domain objects: `domain/resale-listing.entity.ts`, `domain/resale-order.entity.ts`
- Simple value types or enums: `domain/resale-order-status.ts`
- Port files remain in `domain/ports/` as they are now
