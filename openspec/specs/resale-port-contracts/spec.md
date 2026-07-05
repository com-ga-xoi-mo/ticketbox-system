# Capability: resale-port-contracts

## Purpose
TBD: Defines strict typing and interface boundaries for resale ports, ensuring proper DTO validation and domain-level enum ownership.

## Requirements

### Requirement: Domain ports must use explicit TypeScript types instead of any
All port interfaces in `resale/domain/ports/` SHALL define method signatures using explicit domain entity interfaces or primitives. The use of `any`, `any[]`, or `data: any` in port method signatures is NOT permitted.

#### Scenario: Listing repository port is consumed by a use-case
- **WHEN** a use-case calls a method on `IResaleListingRepository`
- **THEN** the return type SHALL be a named domain type (e.g., `ResaleListing | null`, `ResaleListing[]`) that TypeScript can statically verify

#### Scenario: Messaging repository port is consumed by a use-case
- **WHEN** a use-case calls a method on `IResaleMessagingRepository`
- **THEN** parameters and return values SHALL be typed with domain interfaces, not `any`

### Requirement: ResaleOrderStatus must be defined in the domain layer
The `ResaleOrderStatus` enum or union type SHALL be defined in `resale/domain/` (e.g., `resale/domain/enums/resale-order-status.ts`). Domain ports and use-cases SHALL reference the domain-owned type. Infrastructure repositories SHALL map the Prisma `ResaleOrderStatus` to the domain type.

#### Scenario: Domain port references order status
- **WHEN** `IResaleOrderRepository` is defined
- **THEN** any status field in its method signatures SHALL use the domain-owned `ResaleOrderStatus` type, not an import from `@prisma/client`

#### Scenario: Prisma repository maps ORM type to domain type
- **WHEN** `PrismaResaleOrderRepository` reads an order from the database
- **THEN** it SHALL map the Prisma status value to the domain `ResaleOrderStatus` before returning to the caller

### Requirement: Controller endpoints must use DTO classes with class-validator decorators
Every HTTP controller endpoint in `resale/adapters/http/` that accepts a request body or query parameters SHALL use a dedicated DTO class decorated with `class-validator` annotations. Raw inline body types and manual `parseInt` parsing are NOT permitted.

#### Scenario: Admin resolves a dispute
- **WHEN** `AdminResaleOrderController` receives a dispute resolution request
- **THEN** the body SHALL be validated against a `ResolveDisputeDto` class with `@IsString()`, `@IsIn(['complete', 'cancel'])`, and `@IsNotEmpty()` decorators before the use-case is called

#### Scenario: Buyer initiates a P2P order with invalid data
- **WHEN** `ResaleOrderController` receives a request body missing required fields
- **THEN** `ValidationPipe` SHALL reject the request with HTTP 400 before it reaches the use-case

#### Scenario: Feed is requested with pagination parameters
- **WHEN** `ResaleListingsController` receives `page` and `limit` query params
- **THEN** they SHALL be parsed and validated using `ParseIntPipe` rather than manual `parseInt()` calls
