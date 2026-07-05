# Capability: users-bank-profile-port

## Purpose
TBD: Defines how the Resale module accesses users' bank profiles through properly abstracted domain ports without relying on direct infrastructure access.

## Requirements

### Requirement: Users module must expose a domain port for seller bank profiles
The `users` bounded context SHALL define a `ISellerBankProfileRepository` interface in its domain layer and expose it via a proper NestJS `UsersModule` with an injection token (`SELLER_BANK_PROFILE_REPOSITORY`). The concrete Prisma implementation SHALL NOT be importable directly from outside the `users` directory.

#### Scenario: Resale module needs bank profile for listing creation
- **WHEN** `CreateListingUseCase` checks if a seller has a bank account configured
- **THEN** it SHALL inject `ISellerBankProfileRepository` via the `SELLER_BANK_PROFILE_REPOSITORY` token, not the concrete Prisma class

#### Scenario: Resale module needs bank profile for P2P order initiation
- **WHEN** `InitiateP2POrderUseCase` fetches seller bank details to return to the buyer
- **THEN** it SHALL use the `ISellerBankProfileRepository` port, not the concrete Prisma class

#### Scenario: Users module is imported into ResaleModule
- **WHEN** `ResaleModule` is bootstrapped
- **THEN** it SHALL import `UsersModule` which provides and exports the `SELLER_BANK_PROFILE_REPOSITORY` token

### Requirement: Resale use-cases must not import from users infrastructure layer
Resale application use-cases SHALL NOT contain import statements referencing any path under `../users/infrastructure/`. All access to users domain data MUST go through exported ports from `UsersModule`.

#### Scenario: Static analysis of import paths
- **WHEN** any file under `resale/application/` is inspected
- **THEN** it SHALL contain no import paths matching `**/users/infrastructure/**`

### Requirement: Prisma and raw SQL must not appear in application use-cases
Application use-cases in `resale/application/use-cases/` SHALL NOT inject `PrismaService`, call `$transaction()`, or execute `$queryRaw`. These operations MUST be encapsulated in repository methods in the infrastructure layer.

#### Scenario: Cancel P2P order use-case
- **WHEN** `CancelP2POrderUseCase` cancels an order and refunds the buyer
- **THEN** it SHALL call a single repository method (e.g., `orderRepo.cancelWithRefund()`) that encapsulates any transactional database operation

#### Scenario: Resolve dispute use-case
- **WHEN** `ResolveDisputeUseCase` resolves a dispute
- **THEN** it SHALL call repository methods for state changes; no `PrismaService` SHALL be injected into the use-case class

#### Scenario: Initiate P2P order use-case
- **WHEN** `InitiateP2POrderUseCase` reserves a listing and creates an order
- **THEN** it SHALL use repository methods rather than raw SQL or direct Prisma calls
