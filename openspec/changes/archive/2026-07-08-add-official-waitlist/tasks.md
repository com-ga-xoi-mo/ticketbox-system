## 1. Data Model and Contracts

- [x] 1.1 Add Prisma enums and models for official waitlist entries and purchase entitlements, including status, source, quantity, expiry, and queue-order indexes
- [x] 1.2 Add database migration for waitlist and entitlement tables without changing existing resale tables
- [x] 1.3 Add shared API request/response contracts for joining, leaving, reading waitlist status, and entitlement-backed checkout
- [x] 1.4 Add backend error codes for waitlist duplicate, invalid entitlement, expired entitlement, quantity exceeded, and waitlist-required checkout
- [x] 1.5 Define narrow ordering/waitlist integration ports for primary-sale release publishing and transactional entitlement validation without full module-to-module cycles

## 2. Backend Waitlist Capability

- [x] 2.1 Create official waitlist backend module structure following existing bounded-context patterns
- [x] 2.2 Implement waitlist repository ports and Prisma adapters for entry lifecycle, queue position lookup, and active entitlement lookup
- [x] 2.3 Implement join waitlist use case with one active entry per user/concert/ticket type
- [x] 2.4 Implement leave waitlist use case that cancels waiting entries and revokes active entitlements
- [x] 2.5 Implement get waitlist status use case with approximate queue position and active entitlement details
- [x] 2.6 Expose authenticated audience HTTP endpoints for join, leave, and status

## 3. Entitlement Granting

- [x] 3.1 Implement entitlement grant service that calculates available primary inventory and active unconsumed entitlement quantities
- [x] 3.2 Serialize grant processing per ticket type to prevent duplicate or overlapping entitlement grants
- [x] 3.3 Grant entitlements to eligible waitlist entries in FIFO order with a configurable TTL defaulting to 15 minutes
- [x] 3.4 Implement entitlement expiry worker that marks expired entitlements and triggers the next grant opportunity
- [x] 3.5 Extend direct-purchase order expiration transition to return released primary-sale items as `{ ticketTypeId, quantityReleased }`
- [x] 3.6 Connect direct-purchase expired reservation release signals to enqueue waitlist grant work for affected ticket types
- [x] 3.7 Persist in-app notification on entitlement grant with an action URL to the relevant event or checkout flow
- [x] 3.8 Move official waitlist background processor into a worker-scoped module that registers `OFFICIAL_WAITLIST_QUEUE`, and import that module from `BackendWorkerModule`

## 4. Checkout Guard Integration

- [x] 4.1 Extend checkout request/DTO handling to accept an optional waitlist entitlement identifier
- [x] 4.2 Add entitlement validation to direct `POST /checkout/orders` before inventory mutation for waitlist-gated ticket types
- [x] 4.3 Lock and consume valid entitlement in the same Prisma transaction that creates the pending direct-purchase order and reserves inventory
- [x] 4.4 Reject missing, expired, revoked, wrong-user, wrong-ticket-type, and quantity-exceeded entitlements before order creation or inventory mutation
- [x] 4.5 Preserve direct checkout behavior for ticket types without active waitlist entries or active waitlist entitlements
- [x] 4.6 Verify resale order creation remains outside the waitlist entitlement guard

## 5. Audience Web

- [x] 5.1 Add waitlist API client functions for join, leave, and status
- [x] 5.2 Show official waitlist action for sold-out or waitlist-gated primary-sale ticket types
- [x] 5.3 Show joined waitlist status, approximate queue position, and leave action
- [x] 5.4 Show active entitlement countdown and checkout action when the user receives a grant
- [x] 5.5 Include entitlement identifier in checkout order creation when checkout starts from a waitlist grant
- [x] 5.6 Map waitlist-specific backend errors to Vietnamese user-facing messages

## 6. Tests and Evidence

- [x] 6.1 Add unit tests for join, duplicate join, leave, status, grant order, entitlement expiry, and notification failure behavior
- [x] 6.2 Add integration tests proving entitlement grant does not mutate `reservedQuantity` or `soldQuantity`
- [x] 6.3 Add checkout integration tests for valid entitlement, missing entitlement, expired entitlement, wrong user, quantity exceeded, and non-gated direct checkout
- [x] 6.4 Add checkout transaction regression test proving entitlement remains active when inventory reservation fails before order creation
- [x] 6.5 Add regression tests proving resale listing/order flows are not invoked by official waitlist behavior
- [x] 6.6 Add audience web tests for sold-out waitlist action, joined status, granted countdown, entitlement checkout, and waitlist error messages
- [x] 6.7 Add a worker module/provider regression test or startup verification proving `OfficialWaitlistProcessor` can resolve `BullQueue_official.waitlist`
- [x] 6.8 Run relevant backend, frontend, and OpenSpec validation commands and record pass/fail evidence

## 7. Waitlist Email Notifications

- [x] 7.1 Add a waitlist entitlement email composer using existing notification email patterns, including concert name, ticket type, quantity, expiry time, and action URL
- [x] 7.2 Extend waitlist grant notification orchestration to persist the in-app notification and enqueue an email delivery without rolling back the entitlement if email delivery fails
- [x] 7.3 Add one-time near-expiry reminder detection for active waitlist entitlements that are close to expiry and have not been consumed, revoked, or expired
- [x] 7.4 Enqueue reminder emails through the existing notification delivery queue/channel with idempotency keyed by entitlement id and reminder type
- [x] 7.5 Add backend tests for grant email enqueueing, email failure isolation, near-expiry reminder enqueueing, and duplicate reminder prevention
- [x] 7.6 Run relevant backend, frontend, and OpenSpec validation commands and record pass/fail evidence

## 8. Notification Remediation

- [x] 8.1 Fix waitlist in-app notification action URLs to use the audience event slug, matching the email composer and `/events/:slug` route
- [x] 8.2 Fix waitlist grant and near-expiry email delivery enqueueing to use BullMQ-safe custom job IDs without colon characters
- [x] 8.3 Apply the existing email retry attempt and fixed backoff configuration to waitlist email delivery jobs, matching purchase-confirmation delivery behavior
- [x] 8.4 Add regression tests proving waitlist in-app action URLs resolve by slug and waitlist email delivery jobs are accepted by BullMQ with retry/backoff options
- [x] 8.5 Run focused notification/waitlist tests plus OpenSpec validation and record pass/fail evidence

## 9. Email Localization

- [x] 9.1 Update waitlist grant and near-expiry email subject/body copy to Vietnamese with proper diacritics
- [x] 9.2 Add or update regression tests proving the waitlist email composer outputs diacritics in grant and near-expiry emails
- [x] 9.3 Run focused waitlist notification/email tests plus OpenSpec validation and record pass/fail evidence
