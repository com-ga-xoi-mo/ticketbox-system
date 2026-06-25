## ADDED Requirements

### Requirement: Order pricing breakdown computation
The system SHALL compute a full pricing breakdown for every order at creation time. The breakdown consists of: `subtotalVnd` (sum of all order item `totalPriceVnd`), `discountAmountVnd` (computed from the applied promotion, or 0 if no promo), `serviceFeeVnd` (platform service fee), and `totalAmountVnd` (= `subtotalVnd - discountAmountVnd + serviceFeeVnd`). The computation SHALL be authoritative on the backend.

#### Scenario: Order without promo code
- **WHEN** an order is created with 2x VIP tickets at 500,000 VND each and no promo code, with a service fee of 20,000 VND
- **THEN** the system SHALL compute `subtotalVnd: 1000000`, `discountAmountVnd: 0`, `serviceFeeVnd: 20000`, `totalAmountVnd: 1020000`

#### Scenario: Order with percentage promo code
- **WHEN** an order with subtotal 1,000,000 VND applies a 20% discount promo (maxDiscountVnd: 150,000) and service fee is 20,000 VND
- **THEN** the system SHALL compute `discountAmountVnd: 150000` (capped), `totalAmountVnd: 870000`

#### Scenario: Order with fixed amount promo code
- **WHEN** an order with subtotal 500,000 VND applies a fixed 100,000 VND discount promo and service fee is 20,000 VND
- **THEN** the system SHALL compute `discountAmountVnd: 100000`, `totalAmountVnd: 420000`

#### Scenario: Discount cannot exceed subtotal
- **WHEN** an order with subtotal 50,000 VND applies a fixed 100,000 VND discount promo
- **THEN** the system SHALL cap `discountAmountVnd` at 50,000 VND so `totalAmountVnd` is never negative (equals `serviceFeeVnd` at minimum)

#### Scenario: Percentage discount without cap
- **WHEN** an order with subtotal 1,000,000 VND applies a 30% discount promo with `maxDiscountVnd: null`
- **THEN** the system SHALL compute `discountAmountVnd: 300000` without capping

### Requirement: Pricing breakdown persistence on order
The system SHALL persist `subtotalVnd`, `discountAmountVnd`, `serviceFeeVnd`, and `promoCode` (nullable) as columns on the `orders` table alongside the existing `totalAmountVnd`. Existing orders created before this change SHALL have `subtotalVnd` equal to `totalAmountVnd`, `discountAmountVnd: 0`, `serviceFeeVnd: 0`, and `promoCode: null`.

#### Scenario: New order stores full breakdown
- **WHEN** an order is created with a promo code applied
- **THEN** the system SHALL persist `subtotalVnd`, `discountAmountVnd`, `serviceFeeVnd`, `promoCode`, and the computed `totalAmountVnd` on the order record

#### Scenario: Order without promo stores zero discount
- **WHEN** an order is created without a promo code
- **THEN** the system SHALL persist `discountAmountVnd: 0` and `promoCode: null` on the order record

#### Scenario: Existing orders have backward-compatible values
- **WHEN** the database migration runs on existing order data
- **THEN** existing orders SHALL have `subtotalVnd` defaulting to `totalAmountVnd`, `discountAmountVnd` defaulting to `0`, `serviceFeeVnd` defaulting to `0`, and `promoCode` defaulting to `null`

#### Scenario: Payment amount matches order total
- **WHEN** payment is initiated for an order with a pricing breakdown
- **THEN** the `amountVnd` sent to the payment provider SHALL equal the order's `totalAmountVnd` (post-discount, post-fee)

### Requirement: Service fee configuration
The system SHALL read the service fee amount from application configuration. The fee SHALL be a non-negative integer representing VND. The fee is applied per order, not per item.

#### Scenario: Service fee from configuration
- **WHEN** the application configuration specifies `SERVICE_FEE_VND=20000`
- **THEN** the system SHALL apply a 20,000 VND service fee to every new order

#### Scenario: Zero service fee
- **WHEN** the application configuration specifies `SERVICE_FEE_VND=0`
- **THEN** the system SHALL apply a 0 VND service fee (effectively no fee)

#### Scenario: Service fee is captured at order creation
- **WHEN** the service fee configuration changes after an order is created
- **THEN** the existing order's `serviceFeeVnd` SHALL remain unchanged; only new orders use the updated fee

### Requirement: Pricing breakdown in order API responses
The system SHALL include `subtotalVnd`, `discountAmountVnd`, `serviceFeeVnd`, and `promoCode` in `OrderSummaryResponse` and `OrderDetailResponse` API payloads.

#### Scenario: Order summary includes breakdown
- **WHEN** the audience app fetches an order summary via `GET /me/orders`
- **THEN** each order in the response SHALL include `subtotalVnd`, `discountAmountVnd`, `serviceFeeVnd`, `promoCode`, and `totalAmountVnd`

#### Scenario: Order detail includes breakdown
- **WHEN** the audience app fetches order detail via `GET /me/orders/:id`
- **THEN** the response SHALL include `subtotalVnd`, `discountAmountVnd`, `serviceFeeVnd`, `promoCode`, and `totalAmountVnd`

#### Scenario: Pre-migration orders return zero discount and fee
- **WHEN** the audience app fetches an order created before this change
- **THEN** the response SHALL include `discountAmountVnd: 0`, `serviceFeeVnd: 0`, and `promoCode: null`
