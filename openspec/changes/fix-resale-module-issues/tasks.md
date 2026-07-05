## 1. Group 1 — Queue Resilience (Production Fixes)

- [x] 1.1 Fix `order-confirm-expiry.processor.ts`: re-throw caught errors after logging so BullMQ marks the job as failed
- [x] 1.2 Fix `order-reserved-expiry.processor.ts`: re-throw caught errors after logging so BullMQ marks the job as failed
- [x] 1.3 Fix `compute-trust.processor.ts`: re-throw caught errors after logging
- [x] 1.4 Fix `listing-expiry.processor.ts`: re-throw caught errors after logging
- [x] 1.5 Add `defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }` to all four `BullModule.registerQueue` calls in `resale.module.ts`
- [x] 1.6 Wrap the batch update loop in `listing-expiry.processor.ts` in a Prisma `$transaction` to ensure all-or-nothing semantics
- [x] 1.7 Add a configurable batch size limit to the listing expiry processor to prevent oversized single transactions
- [ ] 1.8 Write unit tests for queue processors verifying: error re-throw behavior, retry configuration, and transaction rollback on partial failure

## 2. Group 2a — Users Module Encapsulation

- [ ] 2.1 Define `ISellerBankProfileRepository` interface in `users/domain/ports/seller-bank-profile-repository.port.ts` with `findByUserId` method returning a typed domain record
- [ ] 2.2 Define `SELLER_BANK_PROFILE_REPOSITORY` injection token in the same port file
- [ ] 2.3 Create `users/users.module.ts` that provides `PrismaSellerBankProfileRepository` under `SELLER_BANK_PROFILE_REPOSITORY` token and exports that token
- [ ] 2.4 Update `resale.module.ts` to import `UsersModule` and remove the direct `PrismaSellerBankProfileRepository` provider registration
- [ ] 2.5 Update `create-listing.use-case.ts` to inject `ISellerBankProfileRepository` via `SELLER_BANK_PROFILE_REPOSITORY` token instead of the concrete Prisma class
- [ ] 2.6 Update `initiate-p2p-order.use-case.ts` to inject `ISellerBankProfileRepository` via token instead of the concrete Prisma class
- [ ] 2.7 Verify no file under `resale/application/` imports from `../users/infrastructure/`

## 3. Group 2b — Extract Prisma and Raw SQL from Use-Cases

- [ ] 3.1 Add `cancelWithRefund(orderId: string): Promise<void>` to `IResaleOrderRepository` port and implement it in `PrismaResaleOrderRepository`, moving the `$transaction` logic from `cancel-p2p-order.use-case.ts`
- [ ] 3.2 Update `CancelP2POrderUseCase` to call `orderRepo.cancelWithRefund()` and remove all direct `PrismaService` injection and transaction code
- [ ] 3.3 Add `resolveDispute(orderId: string, outcome: 'complete' | 'cancel', note: string): Promise<void>` to `IResaleOrderRepository` and implement in `PrismaResaleOrderRepository`, moving `$transaction` logic from `resolve-dispute.use-case.ts`
- [ ] 3.4 Update `ResolveDisputeUseCase` to call `orderRepo.resolveDispute()` and remove all direct Prisma injection
- [ ] 3.5 Add `reserveForOrder(listingId: string): Promise<ReservedOrderData>` to `IResaleOrderRepository` (or a dedicated method) encapsulating the `$queryRaw` in `initiate-p2p-order.use-case.ts`
- [ ] 3.6 Update `InitiateP2POrderUseCase` to use the new repository method and remove `PrismaService` and `$queryRaw` injection

## 4. Group 2c — Domain Error Decoupling

- [ ] 4.1 Rewrite `domain/errors.ts`: `ResaleDomainError` extends `Error`, adds `code: string` property, remove all `HttpException` and `HttpStatus` imports
- [ ] 4.2 Create `resale/adapters/http/filters/resale-domain-error.filter.ts`: `@Catch(ResaleDomainError)` filter that maps error codes to HTTP statuses with a structured JSON response
- [ ] 4.3 Register the exception filter on all resale HTTP controllers (or globally via `APP_FILTER` in `resale.module.ts`)
- [ ] 4.4 Replace all `BadRequestException`, `ForbiddenException`, `ConflictException`, `UnprocessableEntityException` throws in `cancel-p2p-order.use-case.ts` with appropriate `ResaleDomainError` subclass throws
- [ ] 4.5 Replace all HTTP exception throws in `confirm-payment.use-case.ts` with `ResaleDomainError` subclasses
- [ ] 4.6 Replace all HTTP exception throws in `confirm-receipt.use-case.ts` with `ResaleDomainError` subclasses
- [ ] 4.7 Replace all HTTP exception throws in `initiate-p2p-order.use-case.ts` with `ResaleDomainError` subclasses
- [ ] 4.8 Replace `UnprocessableEntityException` in `create-listing.use-case.ts` with `ResaleDomainError` subclass

## 5. Group 2d — IEventPublisher Port for BullMQ

- [ ] 5.1 Define `IEventPublisher` port interface in `resale/domain/ports/event-publisher.port.ts` with `publish(eventName: string, payload: unknown): Promise<void>`
- [ ] 5.2 Define `EVENT_PUBLISHER` injection token in the same file
- [ ] 5.3 Create `resale/infrastructure/queue/bullmq-event-publisher.ts` implementing `IEventPublisher` using injected BullMQ queues
- [ ] 5.4 Register `BullmqEventPublisher` as `EVENT_PUBLISHER` provider in `resale.module.ts`
- [ ] 5.5 Update all use-cases that directly inject `@InjectQueue(...)` to instead inject `IEventPublisher` via `EVENT_PUBLISHER` token (affects: `execute-purchase.use-case.ts`, `messaging.use-cases.ts`, `initiate-p2p-order.use-case.ts`, `confirm-payment.use-case.ts`, `resolve-dispute.use-case.ts`)

## 6. Group 2e — Domain Port Contracts and Typed Enums

- [ ] 6.1 Define `ResaleOrderStatus` enum in `resale/domain/enums/resale-order-status.ts`
- [ ] 6.2 Remove `@prisma/client` import from `domain/ports/p2p-order/resale-order-repository.port.ts` and use the domain enum
- [ ] 6.3 Update `PrismaResaleOrderRepository` to map Prisma's `ResaleOrderStatus` to the domain enum in all query results
- [ ] 6.4 Define explicit domain entity interfaces for `ResaleListing`, `ResaleMessage`, `ResaleSocialComment`, `ResaleTransaction`, `ResaleTrustProfile` in `domain/entities/` or inline in their respective port files
- [ ] 6.5 Replace all `Promise<any>` and `data: any` in `resale-listing-repository.port.ts` with typed domain interfaces
- [ ] 6.6 Replace all `Promise<any>` / `any` in `resale-messaging-repository.port.ts`
- [ ] 6.7 Replace all `Promise<any>` / `any` in `resale-social-repository.port.ts`
- [ ] 6.8 Replace all `Promise<any>` / `any` in `resale-transaction-repository.port.ts`
- [ ] 6.9 Replace all `Promise<any>` / `any` in `resale-trust-repository.port.ts`
- [ ] 6.10 Update all corresponding Prisma repository implementations to satisfy the new typed port interfaces

## 7. Group 3 — Controller Validation and Tests

- [ ] 7.1 Create `ResolveDisputeDto` with `class-validator` decorators and apply to `AdminResaleOrderController` dispute resolution endpoint
- [ ] 7.2 Create `CreateListingDto` with `class-validator` decorators and apply to `ResaleListingsController` create endpoint
- [ ] 7.3 Create `InitiateOrderDto` with `class-validator` decorators and apply to `ResaleOrderController` initiation endpoint
- [ ] 7.4 Replace manual `parseInt(page, 10)` / `parseInt(limit, 10)` in `ResaleListingsController` with `ParseIntPipe`
- [ ] 7.5 Ensure `ValidationPipe` is applied at the module level or globally so DTO validation runs on all resale endpoints
- [ ] 7.6 Write unit tests for `CreateListingUseCase` covering: seller has no bank profile (domain error), listing created successfully
- [ ] 7.7 Write unit tests for `InitiateP2POrderUseCase` covering: listing not found, listing already reserved, successful initiation
- [ ] 7.8 Write unit tests for `CancelP2POrderUseCase` covering: not the seller, order already cancelled, successful cancellation
- [ ] 7.9 Write unit tests for `ResaleDomainErrorFilter` covering: known code maps to correct HTTP status, unknown code returns 500
