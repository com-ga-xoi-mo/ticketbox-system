## ADDED Requirements

### Requirement: EventType enum classification
The system SHALL define an `EventType` enum with values `CONCERT`, `WORKSHOP`, `SPORT`, `MOVIE`, `THEATRE`, `VOUCHER` in the Prisma schema, and add an `eventType` field to the Concert model defaulting to `CONCERT`.

#### Scenario: New EventType enum is created in Prisma
- **WHEN** the Prisma schema is inspected
- **THEN** an `EventType` enum exists with exactly the values `CONCERT`, `WORKSHOP`, `SPORT`, `MOVIE`, `THEATRE`, `VOUCHER`
- **AND** the enum is mapped to `event_type` in the database

#### Scenario: Concert model gains eventType field
- **WHEN** a new Concert row is created without specifying `eventType`
- **THEN** the `eventType` column defaults to `CONCERT`
- **AND** the column is non-nullable

#### Scenario: Existing concerts receive default eventType
- **WHEN** the migration runs against a database with existing Concert rows
- **THEN** all existing rows have `eventType` set to `CONCERT`
- **AND** no data loss occurs

### Requirement: Featured metadata fields on Concert
The Concert model SHALL include `isFeatured` (boolean), `bannerAssetId` (optional UUID FK to Asset), and `displayOrder` (integer) fields for curating homepage featured content.

#### Scenario: isFeatured defaults to false
- **WHEN** a Concert is created without specifying `isFeatured`
- **THEN** the `isFeatured` field defaults to `false`

#### Scenario: bannerAssetId references Asset table
- **WHEN** a Concert has a non-null `bannerAssetId`
- **THEN** the value references a valid row in the Asset table
- **AND** if the Asset is deleted, the `bannerAssetId` is set to null (onDelete: SetNull)

#### Scenario: displayOrder defaults to zero
- **WHEN** a Concert is created without specifying `displayOrder`
- **THEN** the `displayOrder` field defaults to `0`

#### Scenario: Featured index supports efficient queries
- **WHEN** the database schema is inspected
- **THEN** a composite index exists on `[isFeatured, displayOrder, startsAt]` to support the featured events query

### Requirement: SEO metadata fields on Concert
The Concert model SHALL include optional `seoTitle`, `seoDescription`, and `seoImageUrl` fields for search engine and social sharing metadata.

#### Scenario: SEO fields are nullable strings
- **WHEN** the Concert model is inspected
- **THEN** `seoTitle` is a nullable varchar(160), `seoDescription` is a nullable varchar(320), and `seoImageUrl` is a nullable text field

#### Scenario: SEO fields default to null
- **WHEN** a Concert is created without specifying SEO fields
- **THEN** `seoTitle`, `seoDescription`, and `seoImageUrl` are all null

#### Scenario: Existing concerts are unaffected
- **WHEN** the migration runs against existing Concert rows
- **THEN** all SEO fields are null for existing rows
- **AND** no existing data is modified

### Requirement: Database migration is non-breaking
The Prisma migration adding `eventType`, featured metadata, and SEO fields SHALL be additive-only and backward-compatible.

#### Scenario: Migration adds columns without dropping existing ones
- **WHEN** the migration SQL is inspected
- **THEN** it contains only `ALTER TABLE ... ADD COLUMN` and `CREATE TYPE` statements
- **AND** no columns are dropped or renamed

#### Scenario: Migration is reversible
- **WHEN** a rollback is needed
- **THEN** the added columns and enum type can be dropped without affecting existing functionality
