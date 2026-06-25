## ADDED Requirements

### Requirement: Paid order recovery protects inventory and fulfillment
The system SHALL serialize expiration and successful-payment finalization for the same order using PostgreSQL transaction controls. A persisted successful payment SHALL prevent reservation expiration, and recovery SHALL complete eligible paid-order inventory and ticket fulfillment idempotently without violating inventory constraints.

#### Scenario: Expiration skips an order with successful payment
- **WHEN** an expired-reservation scan finds a `PENDING_PAYMENT` order that has a linked `SUCCEEDED` payment
- **THEN** the system SHALL NOT transition the order to `EXPIRED`
- **AND** the system SHALL NOT decrement reserved inventory for that order
- **AND** the system SHALL report the inconsistent order for successful-payment recovery

#### Scenario: Payment success wins a concurrent expiration decision
- **WHEN** successful-payment finalization and reservation expiration concurrently process the same pending order after payment success is persisted
- **THEN** PostgreSQL serialization and mutation-time guards SHALL prevent the expiration path from releasing that order's inventory
- **AND** at most one paid inventory transition SHALL be applied

#### Scenario: Recovery completes a pending paid order
- **WHEN** a payment is `SUCCEEDED` and its linked order remains `PENDING_PAYMENT`
- **THEN** recovery SHALL transition the order to `PAID`
- **AND** reserved inventory SHALL be converted to sold inventory exactly once
- **AND** the system SHALL issue the expected tickets exactly once

#### Scenario: Recovery completes missing tickets for an already paid order
- **WHEN** an order is `PAID` but the number of issued tickets is lower than the quantity purchased
- **THEN** recovery SHALL issue only the missing tickets
- **AND** existing tickets and QR token hashes SHALL remain unchanged

#### Scenario: Repeated recovery is idempotent
- **WHEN** callback handling, a repair worker, or a future internal recovery command invokes successful-payment finalization repeatedly for the same fully fulfilled order
- **THEN** the system SHALL NOT adjust inventory again
- **AND** the system SHALL NOT issue duplicate tickets

#### Scenario: Unsafe inventory recovery is stopped
- **WHEN** persisted inventory data cannot be safely reconstructed or the paid order cannot be fulfilled without exceeding total inventory
- **THEN** the system SHALL stop automatic fulfillment with a controlled terminal inconsistency
- **AND** the system SHALL NOT create negative inventory, oversell tickets, or consume another active order's reservation

#### Scenario: Successful payment on a terminal order is not silently revived
- **WHEN** recovery finds a `SUCCEEDED` payment linked to an `EXPIRED`, `FAILED`, or `CANCELLED` order
- **THEN** the system SHALL report a terminal lifecycle inconsistency
- **AND** the system SHALL NOT automatically change the terminal order to `PAID`
