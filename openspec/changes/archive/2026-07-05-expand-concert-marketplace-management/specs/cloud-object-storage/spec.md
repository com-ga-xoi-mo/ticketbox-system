## ADDED Requirements

### Requirement: Concert banner object lifecycle
The system SHALL store and replace concert banner images through `ObjectStoragePort` using the same validation, public URL, compensation, and cleanup guarantees as concert posters.

#### Scenario: Banner object and metadata are persisted
- **WHEN** an authorized user uploads a valid concert banner
- **THEN** the system SHALL write the object under a unique concert-scoped key, derive `publicUrl` from storage, persist asset metadata, and associate `bannerAssetId`

#### Scenario: Failed banner association deletes new object
- **WHEN** object upload succeeds but database persistence or concert association fails
- **THEN** the system SHALL best-effort delete the newly uploaded object and retain the prior association

#### Scenario: Successful replacement deletes old object
- **WHEN** a replacement banner is fully persisted and associated
- **THEN** the system SHALL delete the old object and its obsolete metadata according to the established hard-delete lifecycle

#### Scenario: Banner public URL is primary delivery path
- **WHEN** a protected or public concert response contains banner asset metadata with a public URL
- **THEN** clients SHALL render that URL directly and use `GET /assets/:id` only as a fallback
