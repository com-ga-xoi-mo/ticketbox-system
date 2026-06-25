## Context

The audience checkout flow (`apps/audience-web`) currently creates orders at face-value ticket prices with no promotion or fee support. The backend `CreateOrderUseCase` sums `unitPriceVnd * quantity` per line item to produce `totalAmountVnd`. The `Order` Prisma model stores a single `totalAmountVnd` integer with no breakdown fields. Payment is initiated against this flat total.

Organizers need to distribute promo/voucher codes to drive sales, and the platform needs transparent service fees. The existing ordering module follows clean/hexagonal architecture (domain entities, ports, use cases, Prisma infrastructure). The shared `@ticketbox/api-types` package provides Zod schemas consumed by both backend and audience-web.

Key constraints from the user:
- Pricing logic must be authoritative on the backend — the frontend displays but never computes prices.
- Existing inventory reservation, payment idempotency, circuit breaker, and QR ticket issuance are out of scope.
- The audience app uses shadcn-style primitives and Ant Design components (Form, Alert, Steps, Result, Modal).

## Goals / Non-Goals

**Goals:**
- Introduce a Promotion domain with validation rules (expiry, usage limits, event/category/ticket-type scoping, per-user constraints).
- Compute a pricing breakdown on the backend: subtotal, discount, service fee, final payable total.
- Persist the breakdown on order records for auditability.
- Extend shared API contracts with promo code field and pricing breakdown fields.
- Add promo code entry and validation feedback in the audience checkout UI.
- Display order total breakdown (subtotal, discount, fee, total) in checkout and order detail views.

**Non-Goals:**
- Organizer-facing promotion CRUD (admin UI for creating/managing promotions). Promotions are assumed to exist in the database (seeded or managed outside this change).
- Stacking multiple promo codes on a single order.
- Automatic/cart-rule promotions that apply without a code.
- Refund recalculation when a promo is involved.
- Changes to inventory reservation, payment gateway integration, circuit breaker, or QR ticket issuance logic.
- Percentage-based service fees that vary by payment provider (service fee is a flat platform fee for now).

## Decisions

### D1: Promotion as a new domain module, not embedded in ordering

**Decision**: Create a new `promotion` module (`packages/backend/src/promotion/`) with its own domain entity, repository port, and validation service. The ordering module depends on a `PromotionValidationPort` interface, not on concrete promotion infrastructure.

**Rationale**: Promotions have independent lifecycle concerns (creation, expiry, usage tracking) that don't belong in the ordering domain. A port-based boundary keeps ordering testable and avoids coupling to promotion storage details.

**Alternative considered**: Embedding promo logic directly in `CreateOrderUseCase`. Rejected because it violates the existing clean architecture pattern and makes the use case harder to test.

### D2: Single promo code per order, validated at order creation time

**Decision**: One optional `promoCode` string per checkout request. Validation happens inside `CreateOrderUseCase` before the inventory reservation transaction. If the code is invalid, the order is rejected before any inventory is reserved.

**Rationale**: Validating before reservation avoids holding inventory for orders that will fail on promo validation. Single code keeps the pricing model simple and matches the Ticketbox.vn UX pattern.

**Alternative considered**: Validate promo in a separate pre-checkout endpoint. This would require two round-trips and create a TOCTOU gap (code could expire between validation and order creation). Rejected in favor of atomic validation-at-creation.

### D3: Promo code pre-validation endpoint for UI feedback

**Decision**: Add `POST /checkout/promo/validate` that checks promo validity and returns the discount preview (type, value, applicable items) without creating an order. The checkout UI calls this when the user enters a code. The authoritative validation still happens at order creation time.

**Rationale**: Users need immediate feedback when entering a promo code. The preview is advisory — the backend re-validates at order creation, so there's no trust issue. This matches Ticketbox.vn's UX where applying a code instantly shows the discount.

**Alternative considered**: Client-side validation only. Rejected — violates the constraint that pricing must be authoritative on the backend.

### D4: Service fee as a configurable flat amount per order

**Decision**: Service fee is a per-order flat amount (in VND) stored in application configuration (environment variable or config table). It is not per-item or percentage-based. The fee is added to every order regardless of promo discounts.

**Rationale**: Simplest model that covers the stated requirement. A flat fee avoids complex per-provider or per-item fee calculations. Can be extended to percentage-based later without schema changes (the `serviceFeeVnd` field stores the computed value regardless of calculation method).

**Alternative considered**: Per-item fee or percentage-based fee. Deferred — the schema stores the computed fee amount, so the calculation method can change without API or database schema changes.

### D5: Pricing breakdown stored as denormalized fields on Order

**Decision**: Add `subtotalVnd`, `discountAmountVnd`, `serviceFeeVnd`, and `promoCode` columns to the `Order` table. `totalAmountVnd` becomes `subtotalVnd - discountAmountVnd + serviceFeeVnd`. Keep `totalAmountVnd` as the payment-facing amount.

**Rationale**: Denormalized fields on the order provide a single source of truth for the pricing breakdown. No need to join to a separate pricing table for order queries. The existing `totalAmountVnd` field semantics change from "sum of items" to "final payable amount", but the value is still what gets sent to payment providers, so payment initiation code is unchanged.

**Alternative considered**: Separate `OrderPricing` table. Rejected — adds join complexity for every order query with no clear benefit given the small number of fields.

### D6: Promotion usage tracking with atomic update and event-driven rollback

**Decision**: 
1. Add a `usedCount` integer field to the `Promotion` table.
2. When creating an order with a promo, use an atomic database update (`UPDATE promotion SET usedCount = usedCount + 1 WHERE id = ? AND usedCount < maxUsageCount`) to increment the count and lock the row simultaneously. This ensures strict adherence to global limits even under high concurrency.
3. Track individual usages in a `PromotionUsage` table (promotion_id, user_id, order_id, created_at) to enforce per-user limits.
4. Implement an event-driven mechanism: when an order fails payment or expires, emit an `OrderCancelledEvent`. A listener in the Promotion module will catch this event, delete the corresponding `PromotionUsage` record, and decrement the `usedCount` on the `Promotion` table, returning the usage quota back to the system.

**Rationale**: 
- **Concurrency**: The "check then act" pattern is vulnerable to race conditions during traffic spikes. Atomic updates leverage database row-level locking to guarantee limits are never exceeded.
- **Fairness**: Reverting usages on cancelled orders prevents "lost" promotions where users abandon checkouts and permanently consume limited promo codes.
- **Decoupling**: Using events to trigger the rollback keeps the Ordering module decoupled from the Promotion module's internal accounting.

**Alternative considered**: Redis-based usage counter or `SELECT FOR UPDATE`. Rejected — Redis doesn't guarantee transactional consistency with the main DB. `SELECT FOR UPDATE` is slower and more prone to deadlocks compared to atomic `UPDATE` statements.

### D7: Discount calculation — percentage or fixed amount, applied to subtotal

**Decision**: Each promotion has a `discountType` (PERCENTAGE or FIXED_AMOUNT) and a `discountValue`. PERCENTAGE discounts are capped by an optional `maxDiscountVnd`. The discount is applied to the order subtotal (sum of line items), not per-item. The discount cannot exceed the subtotal (no negative prices).

**Rationale**: Order-level discount is simpler than per-item discount and matches typical voucher code UX. The `maxDiscountVnd` cap prevents unbounded percentage discounts on high-value orders.

## Risks / Trade-offs

**[Risk] TOCTOU between promo preview and order creation** → The preview endpoint is advisory only. The authoritative validation at order creation time prevents stale promo state from producing invalid discounts. UI should handle the case where a previewed discount is rejected at order creation (e.g., usage limit hit between preview and submit).

**[Risk] Migration adds columns to high-traffic Order table** → The migration adds nullable columns with defaults. No table rewrite needed for PostgreSQL. Run during low-traffic window. Backward-compatible: existing orders get `null` promo fields and zero discount/fee values.

**[Risk] Service fee amount changes affect in-flight orders** → Fee is captured at order creation time and stored on the order. Config changes only affect new orders, never retroactively alter existing orders.

**[Risk] Promo code brute-force attempts** → Rate limiting on `POST /checkout/promo/validate` and `POST /checkout/orders` endpoints. Promo codes should be sufficiently random (8+ alphanumeric characters). Not implementing CAPTCHA in this change.

**[Trade-off] Single promo code per order limits flexibility** → Acceptable for MVP. The schema supports extending to multiple codes later by moving `promoCode` to a join table, but this is out of scope.

**[Trade-off] Flat service fee is inflexible** → The stored `serviceFeeVnd` is the computed result. The calculation method (flat, percentage, per-provider) can change without schema migration. Only the computation logic needs updating.
