## 1. Data model & migration

- [x] 1.1 Add `waiting_room_configs` model in `prisma/schema.prisma`: `concertId` (unique), `enabled`, `autoActivate`, `manualOverride` enum (`NONE | FORCE_ON | FORCE_OFF`), `maxConcurrency`, `admissionTtlSeconds`, `activateThreshold`, `deactivateThreshold`, `cooldownSeconds`, timestamps; relation to `Concert`
- [x] 1.2 Generate the Prisma migration with DB up (`prisma migrate dev --name add_waiting_room_configs`) and `prisma generate`. No runtime tables — all queue/token/counter state is Redis-only

## 2. Domain layer (virtual-waiting-room)

- [x] 2.1 `domain/waiting-room.types.ts`: config record, override enum, effective-active result, queue-status record (position/status), admission-token record
- [x] 2.2 `domain/errors.ts`: concert-not-found, room-inactive, invalid-config, admission-required, admission-invalid/expired
- [x] 2.3 `domain/ports/waiting-room-store.port.ts`: Redis-facing port — join/leave queue, ZRANK position, admit-batch (bounded K, atomic), issue/validate/consume admission token, release slot, load counter increment + read, effective-active computation inputs
- [x] 2.4 `domain/ports/waiting-room-config-repository.port.ts`: per-concert config CRUD (Postgres)

## 3. Application layer (use-cases)

- [x] 3.1 `ConfigureWaitingRoomUseCase` / `SetWaitingRoomOverrideUseCase` — validate (K>0, TTL>0, deactivate < activate, cooldown>=0), persist config
- [x] 3.2 `GetWaitingRoomStatusUseCase` — effective-active + user's position/status (or "inactive")
- [x] 3.3 `JoinWaitingRoomUseCase` / `LeaveWaitingRoomUseCase` — enqueue/remove when active; no-op when inactive
- [x] 3.4 `AdmitWaitingRoomUseCase` — under per-concert lock: reclaim expired slots, admit earliest waiting up to K, issue tokens; idempotent
- [x] 3.5 `ValidateAdmissionUseCase` — atomic token validation bound to (userId, concertId); `ReleaseAdmissionSlotUseCase` — free slot on order creation/leave
- [x] 3.6 `ComputeEffectiveActiveUseCase` — `enabled` master switch, `FORCE_OFF`, `FORCE_ON`, then (auto && Redis load-state active with activate/deactivate hysteresis + cooldown)
- [x] 3.7 Unit tests: FIFO position, bounded-K admission, idempotent admit, token bind/expire/consume, hysteresis activate/deactivate

## 4. Infrastructure layer

- [x] 4.1 `infrastructure/redis/redis-waiting-room.store.ts` implementing the store port with ioredis (`REDIS_CLIENT`): sorted sets `waiting:{c}` / `active:{c}`, opaque token key `admission:{token}`, reverse key `admission:user:{c}:{user}`, load keys (`load:{c}:counter`, `load:{c}:state`, `load:{c}:lastBelowThresholdAt`), per-concert lock, Lua for atomic admit + token validate
- [x] 4.2 `infrastructure/database/prisma-waiting-room-config.repository.ts` implementing config CRUD plus `listRunnableRooms()` for worker ticks (`enabled` and force-on/auto candidates)
- [x] 4.3 `infrastructure/realtime/waiting-room-stream-token.service.ts` — mirror `notification-stream` short-lived stream-token mint/verify, but bind token scope to `(userId, concertId)`
- [x] 4.4 `infrastructure/queue/waiting-room-queue.constants.ts` + `waiting-room-admit.processor.ts` (worker) — periodic admit tick over `listRunnableRooms()`, reclaim expired slots, admit next users, write Redis admission state only; do not push directly into API SSE registries
- [x] 4.5 Unit tests for the Redis store (atomic admit under concurrency, expiry reclaim, position, load-state cooldown) and stream-token service (rejects wrong concert)

## 5. HTTP adapters & contracts

- [x] 5.1 Add `waiting-room.contract.ts` Zod schemas to `@ticketbox/api-types` (join/leave/status request+response, stream-token response, SSE event payload including `admissionToken?`, organizer config/override) and export from index
- [x] 5.2 `adapters/http/waiting-room.controller.ts` (audience): `POST /waiting-room/:concertId/join`, `DELETE /waiting-room/:concertId`, `GET /waiting-room/:concertId/status`, `GET /waiting-room/:concertId/stream-token`, `@Sse('waiting-room/:concertId/stream')`
- [x] 5.3 `adapters/http/organizer-waiting-room.controller.ts` (organizer/admin): configure + set override (force-on/off) + read config/status
- [x] 5.4 Controller-level validation/authz tests

## 6. Checkout guard integration (ticket-purchase)

- [x] 6.1 Add `waitingRoomAdmissionToken?: string` to `CreateOrderRequestSchema` / DTO / frontend client and add an admission-token port on the ordering side (parallel to the entitlement port) checked at `POST /checkout/orders` before the reservation transaction
- [x] 6.2 Guard logic: first return existing order for `(userId, idempotencyKey)` without requiring a new token; if no existing order and concert waiting room inactive → no-op; if active → validate token bound to (userId, concertId) atomically, else reject and signal "go to queue"; release the slot after order creation. Fail-open if Redis active-state cannot be read and `WAITING_ROOM_FAIL_OPEN=true`
- [x] 6.3 Increment the load counter on checkout attempts to feed auto-activation
- [x] 6.4 Integration tests: active room blocks missing/foreign token; admitted user checks out and slot releases; duplicate idempotency retry returns existing order without a new token; Redis fail-open behavior; inactive room unaffected; no `reserved_quantity`/`sold_quantity` regression; admission composes with entitlement gating

## 7. Module wiring

- [x] 7.1 `VirtualWaitingRoomModule` (HTTP, use-cases, Redis store, config repo, SSE registry) registered in the API composition root
- [x] 7.2 `VirtualWaitingRoomWorkerModule` (admit-loop processor + its Bull queue) imported by `BackendWorkerModule`; API app does NOT start the admit loop
- [x] 7.3 Platform config/env: default `maxConcurrency`, `admissionTtlSeconds`, activate/deactivate thresholds, admit-tick interval, cooldown; Redis-down fail-open flag
- [x] 7.4 Worker module boot test (queue provider resolves in worker scope)

## 8. Frontend (audience-web)

- [x] 8.1 `shared/api/waiting-room.ts` client: status preflight, join/leave/status, mint per-concert stream-token, and an `EventSource`-based SSE subscription helper
- [x] 8.2 Waiting-room view: enter after active-room preflight, live position via SSE, "it's your turn" → proceed to checkout with admission token; leave action
- [x] 8.3 Include the admission token as `waitingRoomAdmissionToken` in `POST /checkout/orders`; map waiting-room checkout errors to Vietnamese messages; return to queue on missing/expired admission
- [x] 8.4 Component/spec tests for waiting-room states, SSE position updates, and error mapping

## 9. Verification & docs

- [ ] 9.1 `npm run build && npm run lint && npm run test` green (report any pre-existing failures separately)
- [x] 9.2 Add a module `CLAUDE.md` for `virtual-waiting-room` (role, I/O contract, key decisions) consistent with `official-waitlist` / `presale-lottery`
- [x] 9.3 Manual test note (`docs/manual-tests/virtual-waiting-room.md`): organizer force-on → user joins → SSE position → admit → admitted checkout → slot release; and inactive-room passthrough
- [x] 9.4 DB verification with Docker up: migrate + boot API + exercise join/status/SSE/admit/checkout live (using force-on override for determinism); confirm no drift
