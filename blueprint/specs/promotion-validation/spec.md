# Spec: promotion-validation

## Purpose
TBD: Defines backend requirements for promotion storage, validation rules, usage tracking, and safe concurrency handling.

## Requirements

### Requirement: Promotion entity and storage
The system SHALL maintain a `promotions` table with the following fields: `id`, `code` (unique, case-insensitive), `discountType` (PERCENTAGE or FIXED_AMOUNT), `discountValue` (integer — percentage points or VND), `maxDiscountVnd` (nullable cap for percentage discounts), `maxUsageCount` (nullable global usage limit), `maxUsagePerUser` (nullable per-user usage limit), `validFrom` (nullable start datetime), `validUntil` (nullable expiry datetime), `isActive` (boolean), `applicableEventIds` (nullable array of concert/event UUIDs), `applicableCategoryIds` (nullable array of ticket category UUIDs), `applicableTicketTypeIds` (nullable array of ticket type UUIDs), `createdAt`, and `updatedAt`.

#### Scenario: Promotion with percentage discount is stored
- **WHEN** a promotion is created with `discountType: PERCENTAGE`, `discountValue: 20`, and `maxDiscountVnd: 200000`
- **THEN** the system SHALL persist the promotion with a 20% discount capped at 200,000 VND

#### Scenario: Promotion with fixed amount discount is stored
- **WHEN** a promotion is created with `discountType: FIXED_AMOUNT` and `discountValue: 50000`
- **THEN** the system SHALL persist the promotion with a fixed 50,000 VND discount and `maxDiscountVnd` SHALL be ignored

#### Scenario: Promotion code is case-insensitive unique
- **WHEN** a promotion with code `SUMMER2026` exists and another promotion with code `summer2026` is created
- **THEN** the system SHALL reject the creation as a duplicate

### Requirement: Promotion usage tracking
The system SHALL track promotion usage in a `promotion_usages` table with `id`, `promotionId`, `userId`, `orderId`, and `createdAt`. Usage records SHALL be created atomically within the same database transaction as order creation.

#### Scenario: Usage record is created with the order
- **WHEN** a valid promo code is applied during checkout and the order is created successfully
- **THEN** the system SHALL insert a `promotion_usages` record linking the promotion, user, and order within the same transaction

#### Scenario: Failed order creation does not create usage record
- **WHEN** order creation fails (e.g., insufficient inventory) after promo validation passes
- **THEN** the system SHALL NOT persist a promotion usage record because the transaction is rolled back

#### Scenario: Usage record is not duplicated for idempotent order
- **WHEN** a duplicate checkout request with the same idempotency key is submitted
- **THEN** the system SHALL return the existing order without creating an additional usage record

### Requirement: Promo code eligibility validation
The system SHALL validate a promo code against all eligibility rules before allowing it to be applied to an order. Validation SHALL check: code existence, active status, date validity, global usage limit, per-user usage limit, and applicable scope (event, category, ticket type).

#### Scenario: Valid promo code passes all checks
- **WHEN** an active promo code is submitted that has not expired, is within usage limits, and applies to the requested event/ticket types
- **THEN** the system SHALL accept the code and return the discount type, value, and computed discount amount

#### Scenario: Non-existent promo code is rejected
- **WHEN** a promo code is submitted that does not exist in the database
- **THEN** the system SHALL reject the code with error code `PROMO_CODE_NOT_FOUND`

#### Scenario: Inactive promo code is rejected
- **WHEN** a promo code is submitted that exists but has `isActive: false`
- **THEN** the system SHALL reject the code with error code `PROMO_CODE_INACTIVE`

#### Scenario: Expired promo code is rejected
- **WHEN** a promo code is submitted after its `validUntil` datetime has passed
- **THEN** the system SHALL reject the code with error code `PROMO_CODE_EXPIRED`

#### Scenario: Promo code not yet valid is rejected
- **WHEN** a promo code is submitted before its `validFrom` datetime
- **THEN** the system SHALL reject the code with error code `PROMO_CODE_NOT_YET_VALID`

#### Scenario: Global usage limit exceeded is rejected
- **WHEN** a promo code has `maxUsageCount: 100` and 100 usage records already exist
- **THEN** the system SHALL reject the code with error code `PROMO_USAGE_LIMIT_EXCEEDED`

#### Scenario: Per-user usage limit exceeded is rejected
- **WHEN** a promo code has `maxUsagePerUser: 1` and the current user already has 1 usage record for this promotion
- **THEN** the system SHALL reject the code with error code `PROMO_USER_LIMIT_EXCEEDED`

#### Scenario: Promo code not applicable to event is rejected
- **WHEN** a promo code has `applicableEventIds` set and the checkout concert ID is not in that list
- **THEN** the system SHALL reject the code with error code `PROMO_NOT_APPLICABLE`

#### Scenario: Promo code not applicable to ticket type is rejected
- **WHEN** a promo code has `applicableTicketTypeIds` set and none of the checkout ticket type IDs are in that list
- **THEN** the system SHALL reject the code with error code `PROMO_NOT_APPLICABLE`

#### Scenario: Null scope fields mean universal applicability
- **WHEN** a promo code has `applicableEventIds: null` and `applicableTicketTypeIds: null`
- **THEN** the system SHALL treat the code as applicable to all events and ticket types

### Requirement: Promo code pre-validation endpoint
The system SHALL provide a `POST /checkout/promo/validate` endpoint that accepts `{ code, concertId, ticketTypeIds }` and returns the discount preview without creating an order. This endpoint requires AUDIENCE authentication.

#### Scenario: Valid promo returns discount preview
- **WHEN** an authenticated AUDIENCE user submits a valid promo code with a concert ID and ticket type IDs
- **THEN** the system SHALL return `{ valid: true, discountType, discountValue, maxDiscountVnd, message }` without creating any order or usage record

#### Scenario: Invalid promo returns error details
- **WHEN** an authenticated AUDIENCE user submits an invalid promo code
- **THEN** the system SHALL return `{ valid: false, errorCode, message }` with the specific rejection reason

#### Scenario: Pre-validation is rate-limited
- **WHEN** an authenticated user submits more than 10 promo validation requests within 1 minute
- **THEN** the system SHALL return HTTP 429 with a retry-after header

### Requirement: Concurrent promo usage does not exceed limits
The system SHALL prevent concurrent checkout requests from exceeding a promotion's global or per-user usage limits by validating and inserting usage records within the same serialized database transaction as order creation.

#### Scenario: Two concurrent checkouts with usage limit of 1
- **WHEN** two concurrent checkout requests from different users use the same promo code with `maxUsageCount: 1`
- **THEN** the system SHALL accept only one request and reject the other with `PROMO_USAGE_LIMIT_EXCEEDED`

#### Scenario: Same user concurrent checkouts with per-user limit of 1
- **WHEN** the same user sends two concurrent checkout requests with a promo code that has `maxUsagePerUser: 1`
- **THEN** the system SHALL accept only one request and reject the other with `PROMO_USER_LIMIT_EXCEEDED`
