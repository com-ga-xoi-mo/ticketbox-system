## ADDED Requirements

### Requirement: Seed demo artists and concert links
The seed script SHALL create demo Artist records and link them to existing sample concerts via ConcertArtist records, providing development and submission evidence for the artist domain.

#### Scenario: Seed creates demo artists
- **WHEN** the seed script runs in a development or test environment
- **THEN** the system SHALL create Artist records for demo artists matching existing sample concert `artistName` values such as "Anh Trai Say Hi", with slugs, display names, and ACTIVE status

#### Scenario: Seed links demo artists to sample concerts
- **WHEN** the seed script creates demo artists
- **THEN** the system SHALL create ConcertArtist records linking each demo artist to the corresponding sample concert(s) where the `artistName` matches

#### Scenario: Seed is idempotent
- **WHEN** the seed script runs more than once
- **THEN** the system SHALL not create duplicate Artist or ConcertArtist records, using upsert or existence checks

#### Scenario: Seed does not modify existing concert artistName
- **WHEN** the seed script links demo artists to sample concerts
- **THEN** the system SHALL NOT modify the existing `Concert.artistName` values on those concerts
