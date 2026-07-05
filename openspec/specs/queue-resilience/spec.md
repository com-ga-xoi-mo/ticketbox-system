# Capability: queue-resilience

## Purpose
TBD: Ensures all queue processors in the resale module are resilient, handle errors correctly, and utilize proper retry configurations and transactional bounds.

## Requirements

### Requirement: Queue processors must propagate errors to BullMQ
All queue processors in the resale module SHALL re-throw errors after logging them so that BullMQ can correctly mark jobs as failed and trigger retry and dead-letter queue behavior.

#### Scenario: Order expiry processor encounters a database error
- **WHEN** `ResaleOrderConfirmExpiryProcessor` or `ResaleOrderReservedExpiryProcessor` throws an error during job processing
- **THEN** the error SHALL be re-thrown from the `process()` method so BullMQ marks the job as failed

#### Scenario: Trust compute processor encounters an error
- **WHEN** `ResaleTrustProcessor` throws an error during processing
- **THEN** the error SHALL be re-thrown so the job enters the failed state in BullMQ

#### Scenario: Listing expiry processor encounters an error
- **WHEN** `ResaleListingExpiryProcessor` throws an error during batch processing
- **THEN** the error SHALL be re-thrown so BullMQ marks the job as failed

### Requirement: All resale queues must have retry configuration
All four BullMQ queues in `ResaleModule` (`compute-seller-trust`, `resale-listing-expiry`, `resale.order.reserved.expiry`, `resale.order.confirm.expiry`) SHALL be configured with at least 3 retry attempts and exponential backoff via `defaultJobOptions`.

#### Scenario: A queue job fails on the first attempt
- **WHEN** a queue job throws an error on attempt 1
- **THEN** BullMQ SHALL automatically retry the job up to 3 times total with exponential backoff starting at 5 seconds

#### Scenario: A job exceeds all retry attempts
- **WHEN** a queue job fails on all configured attempts
- **THEN** the job SHALL move to the failed state and be accessible in the BullMQ failed jobs list for inspection

### Requirement: Listing expiry batch must be transactional
The `ResaleListingExpiryProcessor` SHALL wrap the batch update of expired listings in a single database transaction to ensure all-or-nothing semantics.

#### Scenario: Batch expiry completes successfully
- **WHEN** the listing expiry processor finds N expired listings and all updates succeed
- **THEN** all N listings SHALL be marked as expired in a single committed transaction

#### Scenario: Batch expiry fails partway through
- **WHEN** the listing expiry processor encounters an error on the Kth listing (K < N)
- **THEN** all previously processed listings in the same batch SHALL be rolled back so no partial state is committed
- **THEN** the job SHALL be marked as failed and eligible for retry

#### Scenario: Large batch exceeds size limit
- **WHEN** the number of expired listings exceeds a configurable batch size limit
- **THEN** the processor SHALL process listings in chunks, each chunk wrapped in its own transaction
