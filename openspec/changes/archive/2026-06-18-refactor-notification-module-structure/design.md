## Context

TicketBox uses a NestJS modular monolith with clean/hexagonal boundaries. The blueprint states the dependency direction as:

```text
domain -> application/use-cases -> adapters -> infrastructure
```

The current notification module already follows this idea behaviorally:

- domain ports define boundaries:
  - `NotificationRepositoryPort`
  - `NotificationChannelPort`
- application use cases coordinate notification creation and delivery:
  - `CreatePurchaseConfirmationNotificationsUseCase`
  - `DeliverNotificationUseCase`
- BullMQ processors receive worker jobs
- BullMQ producers enqueue notification jobs
- email adapters send messages
- Prisma repository persists notification state

The problem is naming and discoverability. Existing HTTP-facing modules make their inbound adapter obvious with `adapters/http`, while notification is worker-driven and has no HTTP controller. If BullMQ processors remain only under `infrastructure/queue`, a future contributor can reasonably think the module has no adapter boundary. That makes later work more error-prone, especially around payment/order integration.

At the same time, the repository's current module convention uses `infrastructure/*` for concrete provider implementations such as Prisma repositories, queue producers, storage, AI providers, QR hashing, and email delivery. This refactor should expose the missing inbound queue adapter without moving every concrete implementation into an `adapters/outbound/*` convention that the rest of the repo does not use.

The existing worker-driven flow is:

```text
order.paid queue job
  -> PurchaseConfirmationProcessor
  -> CreatePurchaseConfirmationNotificationsUseCase
  -> NotificationRepositoryPort
  -> notification.delivery queue job
  -> NotificationDeliveryProcessor
  -> DeliverNotificationUseCase
  -> NotificationChannelPort
```

This change should make that flow obvious in the folder structure without changing the flow itself.

## Goals / Non-Goals

**Goals:**

- Refactor notification folders so the worker-triggered inbound adapter role is explicit.
- Make queue processors clearly visible as inbound queue adapters.
- Keep queue producer, email channel implementations, and Prisma repository under `infrastructure/*` to match existing module conventions.
- Keep notification worker-driven in this slice.
- Document that `adapters/http` is intentionally absent because notification currently has no user-facing HTTP endpoint.
- Document that payment/order must still emit or call `PurchaseConfirmationNotificationProducer.enqueueOrderPaid(...)` after successful payment/order fulfillment.
- Keep current tests passing without behavior changes.

**Non-Goals:**

- Do not add notification HTTP endpoints.
- Do not implement payment/order integration.
- Do not move payment fulfillment logic into notification.
- Do not change queue names, job names, payload contracts, retry behavior, email behavior, database schema, or public API surface.
- Do not redesign notification business logic.
- Do not implement reminder behavior in this refactor.
- Do not introduce an `adapters/outbound/*` folder convention for this module while other modules still use `infrastructure/*` for concrete providers.

## Decisions

### Decision 1: Use an explicit inbound queue adapter and keep infrastructure providers

Target structure:

```text
packages/backend/src/notification/
  domain/
    notification.types.ts
    events/
    ports/
  application/
    use-cases/
  adapters/
    inbound/
      queue/
        purchase-confirmation.processor.ts
        notification-delivery.processor.ts
  infrastructure/
    database/
      prisma-notification.repository.ts
    email/
      email-channel.provider.ts
      local-email-channel.adapter.ts
      smtp-email-channel.adapter.ts
    queue/
      notification-job.types.ts
      purchase-confirmation-notification.producer.ts
  testing/
  notification.module.ts
```

Rationale: this matches the blueprint's ports/adapters intent while staying consistent with the existing TicketBox module layout. The queue processors are inbound adapters because they translate external worker jobs into use-case calls. Prisma, email, and queue producer implementations remain concrete infrastructure behind ports or integration contracts.

Alternative considered: move all concrete implementations into `adapters/outbound/*`. That is a valid ports/adapters style in isolation, but it makes notification diverge from the current repo convention used by `checkin`, `ai-artist-bio`, `concert-management`, and `identity`.

Alternative considered: keep the existing `infrastructure/*` layout and only add comments. That is less disruptive but keeps the same confusion that caused this change because the worker entry point still has no visible adapter boundary.

### Decision 2: Treat queue processors as inbound adapters

`PurchaseConfirmationProcessor` and `NotificationDeliveryProcessor` are entry points from BullMQ into application use cases. They should move from:

```text
infrastructure/queue/
```

to:

```text
adapters/inbound/queue/
```

Rationale: they receive external worker jobs and translate queue payloads into use-case calls, which is the same role an HTTP controller would play for request/response traffic.

### Decision 3: Keep producer, email, and database implementations in infrastructure

The queue producer, email implementations, and Prisma repository are concrete provider implementations used by the module:

- `PurchaseConfirmationNotificationProducer` sends jobs to BullMQ.
- `createEmailChannelAdapter`, `LocalEmailChannelAdapter`, and `SmtpEmailChannelAdapter` implement email delivery.
- `PrismaNotificationRepository` implements notification persistence.

They should stay under:

```text
infrastructure/queue/
infrastructure/email/
infrastructure/database/
```

Rationale: application/domain code depends on ports; these files adapt those ports or integration points to external systems. In this repo, concrete provider implementations are consistently represented as infrastructure. Keeping that convention avoids replacing one form of confusion with another.

### Decision 4: Keep queue payload types centralized with the queue adapter contract

`notification-job.types.ts` is a shared queue payload contract used by both inbound processors and the queue producer. It must not duplicate the job payload types across multiple folders.

Preferred placement:

```text
infrastructure/queue/notification-job.types.ts
```

with inbound processors importing that shared type.

Rationale: the important rule is one source of truth for queue payload shape. Splitting or redefining these types would create contract drift risk.

### Decision 5: Do not add `adapters/http`

Notification currently has no user-facing notification endpoint in this slice. Missing `adapters/http` is intentional, not an incomplete implementation.

If a later change adds features such as `GET /me/notifications`, read/unread state, or notification preferences, that later change should add an HTTP inbound adapter. This refactor should only document that absence.

### Decision 6: Keep payment/order integration external to notification

The notification module prepares the notification side of the `order.paid` contract by exposing:

```text
PurchaseConfirmationNotificationProducer.enqueueOrderPaid(...)
```

However, the payment/order module still owns deciding when an order is successfully paid and fulfilled. Member 3 payment/order work must call or emit this integration point after successful payment/order fulfillment.

This refactor must not add that call and must not move payment business logic into notification.

### Decision 7: Add a small module README or design note

Add `packages/backend/src/notification/README.md` or an equivalent short note during implementation. It should document:

- notification is worker-driven in this slice
- queue processors are inbound adapters
- queue producer, email, and database files are infrastructure implementations
- `adapters/http` is absent intentionally
- payment/order integration is out of scope and belongs to Member 3 unless a later change says otherwise
- current flow from `order.paid` job to notification delivery

Rationale: this prevents future contributors from repeating the same misunderstanding after the folder move.

## Risks / Trade-offs

- [Risk] Import churn may accidentally change behavior. -> Mitigation: keep moves mechanical, keep queue constants and payload types unchanged, and run focused notification tests.
- [Risk] Queue payload types can become duplicated while moving files. -> Mitigation: keep `notification-job.types.ts` as a single shared queue contract.
- [Risk] Future contributors may assume the payment flow is already wired because the producer exists. -> Mitigation: document that payment/order must still emit or call `enqueueOrderPaid(...)`.
- [Risk] Adding `adapters/http` just for symmetry would create a fake surface area. -> Mitigation: document its absence instead of adding unused code.

## Migration Plan

1. Move only BullMQ processors into `adapters/inbound/queue` without changing class names or runtime constants.
2. Keep or restore Prisma repository, email implementations, queue producer, and shared queue payload types under `infrastructure/database`, `infrastructure/email`, and `infrastructure/queue`.
2. Update imports in `notification.module.ts`, `backend-worker.module.ts`, notification specs, and any exports.
3. Add a short notification module README or design note.
4. Run focused notification tests, lint, build, and OpenSpec validation.

Rollback is mechanical: move files back to the previous paths and restore imports. No database rollback, queue migration, or API migration is required.

## Open Questions

- None for this refactor. Payment/order emission of `order.paid` remains an explicit later integration task owned by Member 3 unless a later OpenSpec change changes ownership.
