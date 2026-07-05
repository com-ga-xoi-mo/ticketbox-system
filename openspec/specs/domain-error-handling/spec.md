# Capability: domain-error-handling

## Purpose
TBD: Defines rules for error handling in the domain layer, ensuring use-cases throw domain errors and exception filters translate them to HTTP responses.

## Requirements

### Requirement: ResaleDomainError must not extend HttpException
`ResaleDomainError` and all its subclasses SHALL extend the native `Error` class, not `HttpException` from `@nestjs/common`. Domain errors SHALL carry a string `code` discriminator (e.g., `ORDER_NOT_FOUND`, `NOT_THE_SELLER`) instead of an HTTP status code.

#### Scenario: Domain error is created
- **WHEN** a resale use-case creates a `ResaleDomainError` subclass
- **THEN** it SHALL be an instance of `Error`
- **THEN** it SHALL NOT be an instance of `HttpException`
- **THEN** it SHALL expose a `code` property of type string

### Requirement: An exception filter must translate domain errors to HTTP responses
A NestJS `ExceptionFilter` decorated with `@Catch(ResaleDomainError)` SHALL be registered on resale controllers. It SHALL map each known `code` to an appropriate HTTP status code and return a structured error response body.

#### Scenario: Known domain error code is thrown
- **WHEN** a use-case throws a `ResaleDomainError` with a known `code` (e.g., `ORDER_NOT_FOUND`)
- **THEN** the filter SHALL respond with the correct HTTP status (e.g., 404) and a JSON body containing `{ code, message }`

#### Scenario: Unknown domain error code is thrown
- **WHEN** a `ResaleDomainError` with an unrecognized `code` reaches the filter
- **THEN** the filter SHALL respond with HTTP 500 and log the unmapped code as a warning

### Requirement: Application use-cases must throw domain errors, not HTTP exceptions
All application use-cases in `resale/application/use-cases/` SHALL throw `ResaleDomainError` subclasses. They SHALL NOT import or throw `BadRequestException`, `ForbiddenException`, `ConflictException`, `UnprocessableEntityException`, or any other class from `@nestjs/common`.

#### Scenario: Business rule violation in use-case
- **WHEN** a use-case detects a violated business rule (e.g., user is not the seller)
- **THEN** it SHALL throw a `ResaleDomainError` subclass with the appropriate `code`
- **THEN** the exception filter SHALL translate this to the correct HTTP response for the caller

### Requirement: BullMQ must not be injected directly into application use-cases
Application use-cases SHALL NOT inject `@InjectQueue(...)` or reference `Queue` from `@nestjs/bullmq` directly. Use-cases that need to enqueue background jobs SHALL inject an `IEventPublisher` port and call `publish(eventName, payload)`.

#### Scenario: Use-case needs to trigger a background job
- **WHEN** a use-case (e.g., `ConfirmReceiptUseCase`) needs to schedule a trust score computation
- **THEN** it SHALL call `this.eventPublisher.publish('compute-seller-trust', payload)` via the injected port
- **THEN** the infrastructure implementation of `IEventPublisher` SHALL enqueue the BullMQ job

#### Scenario: Event publisher port in tests
- **WHEN** a use-case is unit tested
- **THEN** `IEventPublisher` SHALL be mockable without requiring a running Redis or BullMQ instance
