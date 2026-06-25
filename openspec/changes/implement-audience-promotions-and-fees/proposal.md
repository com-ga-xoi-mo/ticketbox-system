## Why

The audience checkout flow currently charges the face-value ticket price with no mechanism for promotions, voucher/promo codes, or service fees. Organizers need the ability to offer discounts (percentage or fixed-amount) tied to promo codes with eligibility constraints, and the platform needs to apply transparent service fees. Without an authoritative backend pricing breakdown, the order and payment records cannot be audited for discount or fee components, and the checkout UI cannot communicate promo states (applied, invalid, expired, already used) to the customer.

## What Changes

- Add a voucher/promo code entry field to the audience checkout flow so customers can apply a code before payment.
- Introduce backend promotion validation: eligibility checks for expiry, usage limits, applicable event/category/ticket type scoping, and audience-user constraints.
- Compute service fees on the backend as part of the order total calculation.
- Produce a full pricing breakdown on the order: subtotal (sum of line items), discount amount, service fee, and final payable total.
- Persist the pricing breakdown (promo code used, discount amount, service fee) on order and payment records for auditability.
- **BREAKING**: Extend the `OrderSummaryResponse` and `OrderDetailResponse` schemas with new pricing breakdown fields (`subtotalVnd`, `discountAmountVnd`, `serviceFeeVnd`, `promoCode`). Existing consumers that do not expect these fields will still function because new fields are additive, but display logic that only reads `totalAmountVnd` will not show the breakdown.
- Extend `CreateOrderRequest` to accept an optional `promoCode` field.
- Add checkout UI states for promo validation feedback: invalid code, expired code, usage-limit-exceeded, promo applied with discount preview, and payment amount adjustment.

## Capabilities

### New Capabilities
- `promotion-validation`: Backend promo/voucher code validation — eligibility, expiry, usage limits, event/category/ticket-type scoping, per-user constraints, and discount calculation (percentage or fixed-amount).
- `checkout-pricing-breakdown`: Order-level pricing breakdown computation and persistence — subtotal, discount, service fee, and final payable total. Authoritative on the backend; surfaced in API responses.
- `audience-promo-ui`: Audience checkout UI for promo code entry, validation feedback states, and order total breakdown display.

### Modified Capabilities
- `audience-checkout`: Add promo code entry step, discount/fee display in order summary, and new UI states for promo validation results.
- `shared-api-contracts`: Extend order request/response schemas with promo code field, pricing breakdown fields, and promo validation error codes.

## Impact

- **Backend ordering module** (`packages/backend/src/ordering/`): Order creation use case must accept an optional promo code, validate it, compute the pricing breakdown, and persist discount/fee data on the order.
- **Backend new promotion module**: New domain entities (Promotion/Voucher), repository, and validation service. No existing code to modify — this is greenfield.
- **Shared API types** (`packages/api-types/src/ordering/order.contract.ts`): `CreateOrderRequestSchema`, `OrderSummaryResponseSchema`, `OrderDetailResponseSchema`, and `OrderItemSummarySchema` gain new fields. A new promo validation error code enum is needed.
- **Audience web app** (`apps/audience-web/`): Checkout page gains a promo code input with validation UX, and the order summary/detail views gain a pricing breakdown section.
- **Payment initiation**: The `totalAmountVnd` sent to payment providers must reflect the post-discount, post-fee final total. No changes to payment gateway integration itself.
- **Existing order/payment data**: Orders created before this change will have `null`/zero discount and fee values — backward-compatible.
