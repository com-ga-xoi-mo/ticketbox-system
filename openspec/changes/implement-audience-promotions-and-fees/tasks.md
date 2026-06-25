## 1. Database Schema & Migration

- [x] 1.1 Create Prisma model `Promotion` with fields: `id`, `code` (unique, case-insensitive), `discountType` (enum PERCENTAGE/FIXED_AMOUNT), `discountValue`, `maxDiscountVnd`, `maxUsageCount`, `maxUsagePerUser`, `validFrom`, `validUntil`, `isActive`, `applicableEventIds`, `applicableCategoryIds`, `applicableTicketTypeIds`, `createdAt`, `updatedAt`
- [x] 1.2 Create Prisma model `PromotionUsage` with fields: `id`, `promotionId`, `userId`, `orderId`, `createdAt` and composite unique constraint on (`promotionId`, `orderId`)
- [x] 1.3 Add pricing breakdown columns to `Order` model: `subtotalVnd` (Int, default 0), `discountAmountVnd` (Int, default 0), `serviceFeeVnd` (Int, default 0), `promoCode` (String?, nullable), `promotionId` (String?, nullable FK to Promotion)
- [x] 1.4 Generate and run Prisma migration; verify existing orders get default values (`subtotalVnd` = `totalAmountVnd`, `discountAmountVnd` = 0, `serviceFeeVnd` = 0, `promoCode` = null)
- [x] 1.5 Add case-insensitive unique index on `Promotion.code` (using `LOWER(code)` or `citext`)

## 2. Shared API Contracts (`@ticketbox/api-types`)

- [x] 2.1 Add `PromoErrorCodeSchema` Zod enum with values: `PROMO_CODE_NOT_FOUND`, `PROMO_CODE_INACTIVE`, `PROMO_CODE_EXPIRED`, `PROMO_CODE_NOT_YET_VALID`, `PROMO_USAGE_LIMIT_EXCEEDED`, `PROMO_USER_LIMIT_EXCEEDED`, `PROMO_NOT_APPLICABLE`
- [x] 2.2 Add `DiscountTypeSchema` Zod enum with values: `PERCENTAGE`, `FIXED_AMOUNT`
- [x] 2.3 Add `ValidatePromoRequestSchema` with fields: `code` (required trimmed non-empty string), `concertId` (required UUID), `ticketTypeIds` (required UUID array, min 1)
- [x] 2.4 Add `ValidatePromoResponseSchema` as discriminated union on `valid`: `{ valid: true, discountType, discountValue, maxDiscountVnd, message }` | `{ valid: false, errorCode, message }`
- [x] 2.5 Extend `OrderSummaryResponseSchema` with `subtotalVnd` (non-negative int), `discountAmountVnd` (non-negative int), `serviceFeeVnd` (non-negative int), `promoCode` (nullable string)
- [x] 2.6 Extend `CreateOrderRequestSchema` with optional `promoCode` field (trimmed non-empty string, optional)
- [x] 2.7 Export all new schemas and inferred types from `@ticketbox/api-types` root entrypoint
- [x] 2.8 Build the shared package and verify it compiles without framework imports

## 3. Backend Promotion Domain Module

- [x] 3.1 Create `packages/backend/src/promotion/` module directory structure following existing clean architecture pattern: `domain/`, `application/`, `infrastructure/`, `adapters/`
- [x] 3.2 Create `Promotion` domain entity (`promotion/domain/promotion.entity.ts`) with discount calculation method: `calculateDiscount(subtotalVnd: number): number` that handles PERCENTAGE (with maxDiscountVnd cap) and FIXED_AMOUNT, capping at subtotal
- [x] 3.3 Create `PromotionDiscountType` enum (`promotion/domain/promotion-discount-type.enum.ts`)
- [x] 3.4 Create `IPromotionRepository` port interface with methods: `findByCode(code: string)`, `countUsages(promotionId: string)`, `countUserUsages(promotionId: string, userId: string)`, `createUsage(promotionId: string, userId: string, orderId: string, tx?)` 
- [x] 3.5 Create `PromotionValidationPort` interface in the ordering domain (`ordering/domain/ports/promotion-validation.port.ts`) with method: `validate(code: string, userId: string, concertId: string, ticketTypeIds: string[]): Promise<PromotionValidationResult>`
- [x] 3.6 Create promotion error classes: `PromoCodeNotFoundError`, `PromoCodeInactiveError`, `PromoCodeExpiredError`, `PromoCodeNotYetValidError`, `PromoUsageLimitExceededError`, `PromoUserLimitExceededError`, `PromoNotApplicableError`
- [x] 3.7 Create `ValidatePromotionUseCase` (`promotion/application/use-cases/validate-promotion.use-case.ts`) implementing all eligibility checks: existence, active, date validity, global usage, per-user usage, event/ticket-type scope
- [x] 3.8 Create `PrismaPromotionRepository` implementing `IPromotionRepository` with case-insensitive code lookup and usage counting queries
- [x] 3.9 Create `PromotionValidationService` implementing `PromotionValidationPort` — adapts `ValidatePromotionUseCase` for consumption by the ordering module
- [x] 3.10 Create `PromotionModule` (`promotion/promotion.module.ts`) with NestJS providers and exports

## 4. Backend Pricing Breakdown & Order Creation Changes

- [x] 4.1 Add `SERVICE_FEE_VND` environment variable to config/env schema with default `0`
- [x] 4.2 Create `PricingBreakdownService` (or inline in use case) that computes: `subtotalVnd`, `discountAmountVnd` (from promotion), `serviceFeeVnd` (from config), `totalAmountVnd` (= subtotal - discount + fee)
- [x] 4.3 Extend `CreateOrderCommand` with optional `promoCode: string`
- [x] 4.4 Modify `CreateOrderUseCase.execute()` to: accept optional promo code, call `PromotionValidationPort.validate()` if code provided, compute pricing breakdown, pass breakdown to Order entity constructor
- [x] 4.5 Extend `Order` entity `OrderProps` with `subtotalVnd`, `discountAmountVnd`, `serviceFeeVnd`, `promoCode`, `promotionId` fields
- [x] 4.6 Extend `OrderItem` entity if needed (no per-item discount in this change)
- [x] 4.7 Update `PrismaOrderRepository` (or `PrismaInventoryReservationRepository`) to persist new order fields and create `PromotionUsage` record within the reservation transaction
- [x] 4.8 Update `CreateOrderUseCase` idempotency path to return existing order without re-validating promo
- [x] 4.9 Ensure payment initiation uses the order's `totalAmountVnd` (post-discount, post-fee) — verify `InitiatePaymentUseCase` already reads from order

## 5. Backend Promo Validation HTTP Endpoint

- [x] 5.1 Create `ValidatePromoDto` (NestJS class-validator or Zod pipe) for `POST /checkout/promo/validate` request body
- [x] 5.2 Create `PromoController` or extend `OrderController` with `POST /checkout/promo/validate` endpoint, guarded by AUDIENCE auth
- [x] 5.3 Map `ValidatePromotionUseCase` result to `ValidatePromoResponse` wire format
- [x] 5.4 Add rate limiting (10 requests/minute per user) on the promo validation endpoint
- [x] 5.5 Map promo error classes to appropriate HTTP status codes and `PromoErrorCode` values in the checkout order creation endpoint

## 6. Backend Order Response Mapping

- [x] 6.1 Update order presenter/mapper to include `subtotalVnd`, `discountAmountVnd`, `serviceFeeVnd`, `promoCode` in `OrderSummaryResponse` and `OrderDetailResponse`
- [x] 6.2 Add contract tests: validate representative order response payloads (with and without promo) against the updated shared Zod schemas
- [x] 6.3 Verify existing order list and detail endpoints return backward-compatible responses for pre-migration orders (discount=0, fee=0, promoCode=null)

## 7. Audience Web — Promo Code UI

- [ ] 7.1 Create `PromoCodeInput` component: text input + "Áp dụng" button, loading state, success state (shows applied code + discount description + remove button), error state (inline error messages)
- [ ] 7.2 Create `usePromoValidation` hook (or similar): calls `POST /checkout/promo/validate`, manages promo state (idle, loading, applied, error), returns discount preview data
- [ ] 7.3 Add promo code API client function in `apps/audience-web/src/shared/api/orders.ts`: `validatePromoCode({ code, concertId, ticketTypeIds })`
- [ ] 7.4 Map promo error codes to Vietnamese messages: `PROMO_CODE_NOT_FOUND` → "Mã khuyến mãi không hợp lệ", `PROMO_CODE_EXPIRED` → "Mã khuyến mãi đã hết hạn", `PROMO_USER_LIMIT_EXCEEDED` → "Bạn đã sử dụng mã khuyến mãi này", `PROMO_USAGE_LIMIT_EXCEEDED` → "Mã khuyến mãi đã hết lượt sử dụng", `PROMO_NOT_APPLICABLE` → "Mã khuyến mãi không áp dụng cho sự kiện này", `PROMO_CODE_NOT_YET_VALID` → "Mã khuyến mãi chưa có hiệu lực", `PROMO_CODE_INACTIVE` → "Mã khuyến mãi không hợp lệ"

## 8. Audience Web — Pricing Breakdown Display

- [ ] 8.1 Create `OrderPricingBreakdown` component: displays subtotal, discount line (conditionally with promo code label), service fee line (conditionally hidden if 0), total payable. Uses VND currency formatting.
- [ ] 8.2 Integrate `PromoCodeInput` into `CheckoutPage.tsx` — position before payment initiation, after ticket selection summary
- [ ] 8.3 Integrate `OrderPricingBreakdown` into `CheckoutPage.tsx` — replaces or augments the current single-total display
- [ ] 8.4 Update `CheckoutPage.tsx` to pass `promoCode` in the `POST /checkout/orders` request when a promo is applied
- [ ] 8.5 Handle promo rejection at order creation: show Alert with rejection reason, allow removing promo and retrying
- [ ] 8.6 Integrate `OrderPricingBreakdown` into `OrderDetailPage.tsx` — show breakdown for orders with discount or fee data
- [ ] 8.7 Update shared API response types/parsing in audience-web to use the extended `OrderSummaryResponse` and `OrderDetailResponse` schemas

## 9. Testing & Verification

- [ ] 9.1 Unit tests for `Promotion.calculateDiscount()`: percentage with cap, percentage without cap, fixed amount, discount exceeding subtotal
- [ ] 9.2 Unit tests for `ValidatePromotionUseCase`: all eligibility scenarios (valid, not found, inactive, expired, not yet valid, usage limit, per-user limit, not applicable, null scopes)
- [ ] 9.3 Unit tests for `CreateOrderUseCase` with promo: pricing breakdown computation, promo validation failure before reservation, idempotent order returns without re-validation
- [ ] 9.4 Integration test: concurrent checkout with promo usage limit prevents double-usage
- [ ] 9.5 Contract tests: validate promo validation request/response and extended order response against shared Zod schemas
- [ ] 9.6 Verify `npm run build` passes for `@ticketbox/api-types`, backend, and audience-web
- [ ] 9.7 Verify existing checkout tests still pass (no regression on orders without promo codes)
