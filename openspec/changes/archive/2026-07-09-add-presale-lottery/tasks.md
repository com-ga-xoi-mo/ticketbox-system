## 1. Data model & migration

- [x] 1.1 Add `lottery_configs` model (ticketTypeId, registrationOpensAt, registrationClosesAt, drawAt, allocation, status enum `SCHEDULED|DRAWING|COMPLETED|CANCELLED`, seed nullable) with unique per ticket type in `prisma/schema.prisma`
- [x] 1.2 Add `lottery_registrations` model (userId, ticketTypeId, concertId, desiredQuantity, status enum `REGISTERED|WON|NOT_SELECTED|WITHDRAWN`, timestamps) with unique active `(userId, ticketTypeId)` and index `(ticketTypeId, status)`
- [x] 1.3 Add `lottery_draws` audit model (lotteryConfigId, ticketTypeId, seed, registrantCount, winners JSON/ordered list, allocationConsumed, executedAt)
- [x] 1.4 Add nullable `presaleGateOpensAt` / `presaleGateClosesAt` columns on `ticket_types` (the time-based gate the checkout guard reads); index if needed
- [x] 1.5 Add nullable `lotteryRegistrationId` column + relation on `purchase_entitlements` (symmetric to `waitlistEntryId`); confirm `source` already supports `LOTTERY`
- [x] 1.6 Prisma migration SQL authored + `prisma generate` done. Verified byte-equivalent to Prisma's canonical output via `prisma migrate diff --from-schema-datamodel <old> --to-schema-datamodel <new>` (only extra: the partial unique index in 1.7). Was hand-written because Docker/Postgres was offline at implementation time.
- [x] 1.7 Regenerate the migration canonically with DB up (`prisma migrate dev --name add_presale_lottery --create-only`), review/strip any spurious `DROP INDEX waitlist_...` from pre-existing waitlist drift, re-append the partial unique index `lottery_registrations_one_active_per_user_ticket_type_idx ... WHERE status = 'REGISTERED'`, then apply with `prisma migrate deploy`

## 2. Domain layer (presale-lottery)

- [x] 2.1 Create `presale-lottery/domain/lottery.types.ts` (config, registration, draw, status enums) mirroring `waitlist.types.ts`
- [x] 2.2 Create `presale-lottery/domain/errors.ts` (registration window closed, quantity exceeded, ticket type not eligible, already drawn, config incoherent, allocation exceeds inventory)
- [x] 2.3 Create `presale-lottery/domain/ports/presale-lottery-repository.port.ts` (config CRUD, registration create/withdraw/find, list registered for draw, grant entitlement, status lookup, per-ticket-type lock, audit write)
- [x] 2.4 Add deterministic seeded selection helper (seed + registrationId → stable permutation) as a pure domain function with unit tests

## 3. Application layer (use-cases)

- [x] 3.1 `ConfigureLotteryUseCase` — validate window coherence and allocation ≤ available inventory, create `SCHEDULED` config, AND write `presaleGateOpensAt/ClosesAt` onto the ticket type; `CancelLotteryUseCase` clears the gate window
- [x] 3.2 `RegisterForLotteryUseCase` — window-open + `max_per_user` cap + single active registration
- [x] 3.3 `WithdrawLotteryRegistrationUseCase` — only before draw
- [x] 3.4 `GetLotteryStatusUseCase` — registration/draw status + active LOTTERY entitlement details
- [x] 3.5 `RunLotteryDrawUseCase` — per-ticket-type lock, `SCHEDULED→DRAWING`, seeded selection capped by `min(allocation, available inventory − active entitlement qty)` and per-user allowance, grant LOTTERY entitlements (link `lotteryRegistrationId`), mark winners/non-winners, write audit, `DRAWING→COMPLETED`, idempotent when already `COMPLETED`
- [x] 3.6 Own `ExpireLotteryEntitlementsUseCase` scoped to `source = LOTTERY` (dedicated, NOT the waitlist expiry use-case) + near-expiry reminder
- [x] 3.7 Unit tests: deterministic draw, allocation exhaustion, per-user cap, idempotent re-run, withdrawn excluded, gate-window written on config

## 4. Infrastructure layer

- [x] 4.1 `prisma-presale-lottery.repository.ts` implementing the repository port (incl. `withTicketTypeLock`, `grantEntitlement` with `source=LOTTERY` + `lotteryRegistrationId`, gate-window writes on ticket type, audit persistence)
- [x] 4.2 `presale-lottery-queue.constants.ts` + `presale-lottery-draw.processor.ts` (worker) scheduling the draw at `drawAt`, plus a LOTTERY-scoped entitlement-expiry/reminder processor
- [x] 4.3 Notification service for winner grant + not-selected, reusing waitlist notification composer patterns (in-app + Vietnamese email, event-slug action URL, BullMQ-safe job IDs, retry/backoff)
- [x] 4.4 Unit tests for repository adapter draw/grant and notification composer copy (Vietnamese diacritics, job ID safety)

## 5. HTTP adapters & contracts

- [x] 5.1 Add `lottery.contract.ts` Zod schemas to `@ticketbox/api-types` (register/withdraw/status request+response, organizer config) and export from index
- [x] 5.2 `presale-lottery.controller.ts` (audience: register, withdraw, status) + presenter mapping domain → wire contract
- [x] 5.3 Organizer lottery config + draw-status endpoints (authorized) with validation DTOs
- [x] 5.4 Controller-level validation/authz tests

## 6. Checkout guard integration (ticket-purchase)

- [x] 6.1 Extend `findGatedTicketTypeIds` to also mark a ticket type gated when `now` is within its `presaleGateOpensAt/ClosesAt` window (read from `ticket_types` only — no lottery-table dependency)
- [x] 6.2 Scope the entitlement-presence branch of the gate to `source = WAITLIST` (or let the window override) so leftover LOTTERY entitlements don't keep a type gated after the window closes
- [x] 6.3 Extend the consume path to mark the linked `lottery_registrations` row fulfilled via `lotteryRegistrationId` (mirroring the existing `waitlistEntryId` → FULFILLED update); entitlement consumption already source-agnostic (verified)
- [x] 6.4 Integration tests: non-winner rejected during window BEFORE any entitlement exists; winner checkout consumes LOTTERY entitlement in reservation txn; direct checkout resumes after window even with leftover entitlements; registration marked fulfilled; no `reserved_quantity`/`sold_quantity` regression; resale orders excluded

## 7. Module wiring

- [x] 7.1 Create `PresaleLotteryModule` (HTTP, use-cases, repository, notification) and register in the API composition root
- [x] 7.2 Create `PresaleLotteryWorkerModule` (draw processor + its Bull queue) and import it from `BackendWorkerModule`; ensure API app does NOT start the draw processor
- [x] 7.3 Add config for lottery entitlement TTL (default 15 min) and draw scheduling to platform config/env schema
- [x] 7.4 Worker module boot test (queue provider resolves in worker scope)

## 8. Frontend (audience-web)

- [x] 8.1 Add `waitlist.ts`-style `lottery.ts` API client (register/withdraw/status) in `apps/audience-web/src/shared/api`
- [x] 8.2 Event-detail states: registration open (register action), registered, registration closed, draw pending, won (entitlement countdown + checkout), not-selected
- [x] 8.3 Include entitlement id in `POST /checkout/orders`; map lottery checkout errors to Vietnamese messages; refresh status on expiry
- [x] 8.4 Component/spec tests for the lottery states and error mapping

## 9. Verification & docs

- [x] 9.1 `npm run build` green + `npm run test` green for all touched areas (112 unit tests). NOTE: 7 pre-existing failures on `dev` base are unrelated to this change (create-order/expire-reservations drift from the waitlist PR, AuthController missing `ForgotPasswordUseCase`, coordinate schema); lint has only pre-existing `any` warnings, none in new code
- [x] 9.2 Add a module `CLAUDE.md` for `presale-lottery` (role, I/O contract, key decisions) consistent with `official-waitlist`
- [x] 9.3 Manual test note / Postman entries for organizer config → registration → draw → winner checkout flow
- [x] 9.4 DB verification with Docker up: `prisma migrate status` clean → `npm run db:seed` → boot API (confirm `role.findMany` init succeeds) → run DB/e2e tests without `SKIP_DB_TESTS` (report lottery/guard results separately from the 7 pre-existing failures) → `prisma migrate diff` confirms no drift from this change

## 10. Manual draw, registration list, and per-lottery TTL extension

- [x] 10.1 Add `entitlementTtlMinutes` to `lottery_configs` in Prisma schema + migration SQL with default 15 and positive check where practical
- [x] 10.2 Extend domain/config types, repository inputs, presenter, and `ConfigureLotteryRequest/Response` contracts to carry `entitlementTtlMinutes`
- [x] 10.3 Update `ConfigureLotteryUseCase` validation so TTL must be positive, defaults to 15 when omitted, and can be updated only while the lottery is `SCHEDULED`
- [x] 10.4 Change `RunLotteryDrawUseCase` / repository draw commit to use the config's TTL instead of the global lottery TTL when calculating winner entitlement `expiresAt`
- [x] 10.5 Add organizer/admin endpoint `POST /organizer/lottery/:ticketTypeId/draw-now` that calls the existing draw use case, returns granted/not-selected counts, and remains idempotent for completed draws
- [x] 10.6 Add organizer/admin endpoint `GET /organizer/lottery/:ticketTypeId/registrations` returning registration rows with user display/email, desired quantity, status, timestamps, and entitlement summary
- [x] 10.7 Add backend tests for TTL default/update/reject-after-draw, manual draw sharing the same audit/grant path, idempotent manual redraw, registration list shape, and organizer/admin authorization
- [x] 10.8 Add audience-web API client methods/contracts for organizer lottery test actions: configure/update TTL, run draw now, and list registrations
- [x] 10.9 Add a temporary audience-web operator/testing panel on event detail for organizer/admin/dev testing with controls: TTL input, `Quay so ngay`, `Xem DS dang ky`; hide it from normal audience users
- [x] 10.10 Add UI tests for the temporary panel visibility, manual draw refresh behavior, registration list rendering, and TTL validation messaging
- [x] 10.11 Update `presale-lottery/CLAUDE.md` and manual test notes with the organizer/admin handoff button list and the temporary audience UI testing path
- [x] 10.12 Run targeted verification: `npm.cmd run build:api-types`, presale-lottery backend tests, audience-web lottery tests, `npm.cmd run build`, and `openspec.cmd validate add-presale-lottery --strict`

## 11. Fixes — full-presale gating and reconfigure-after-cancel

- [x] 11.1 Gate covers the whole presale: in `createConfig` (repository), set `presaleGateOpensAt = ticketType.saleStartsAt` (not `drawAt`); `presaleGateClosesAt` stays `publicSaleStartsAt`. Pass `saleStartsAt` from `ConfigureLotteryUseCase` (it already loads the ticket type). No schema/migration change — only the value written changes.
- [x] 11.2 Confirm the draw path never writes the gate window (draw only grants entitlements) so manual `draw-now` before `drawAt` cannot open the sale to non-winners.
- [x] 11.3 Reconfigure after cancel: relax the `ConfigureLotteryUseCase` guard to reject only when the existing config status is `DRAWING` or `COMPLETED` (allow `CANCELLED` → reset to `SCHEDULED`, clearing `seed`/`drawnAt` and re-writing the gate window).
- [x] 11.4 Tests: (a) non-winner rejected during presale before any draw and after a manual early draw; winner can still checkout; (b) direct sale resumes after `publicSaleStartsAt`; (c) reconfigure succeeds when previous config is `CANCELLED` and is rejected when `COMPLETED`/`DRAWING`. Update any existing test that assumed gate opens at `drawAt`.
- [x] 11.5 Verify: `npm run build` + presale-lottery/guard tests green; `openspec validate add-presale-lottery --strict`.
