# cloud-object-storage Specification

## Purpose

Define the shared Object Storage foundation for TicketBox. It establishes a standard ObjectStoragePort interface and uses S3-compatible object storage such as Cloudflare R2 for persisted objects, with an in-memory adapter reserved for tests. This shared infrastructure ensures consistent object storage operations across the entire application while isolating downstream modules from the underlying storage provider details.

## Requirements

### Requirement: Platform Object Storage Port
The system SHALL provide a shared `ObjectStoragePort` interface at the platform layer (`platform/storage/`) that any module can depend on for storing and retrieving binary objects. The port SHALL define five operations: `putObject`, `getObject`, `deleteObject`, `objectExists`, and `getPublicUrl`. Application use cases SHALL depend only on this port interface, never on storage SDK or adapter classes directly.

#### Scenario: Module injects ObjectStoragePort
- **WHEN** a NestJS module imports `StorageModule`
- **THEN** it SHALL be able to inject `ObjectStoragePort` via the `OBJECT_STORAGE` token
- **AND** the injected instance SHALL be the S3-compatible storage adapter

#### Scenario: putObject stores a binary object
- **WHEN** a use case calls `putObject({ key, content, contentType })`
- **THEN** the storage adapter SHALL persist the binary content at the given key
- **AND** subsequent calls to `getObject(key)` SHALL return the same content

#### Scenario: getObject retrieves a stored object
- **WHEN** a use case calls `getObject(key)` for an existing key
- **THEN** the adapter SHALL return the stored binary content as a `Buffer`

#### Scenario: getObject for non-existent key
- **WHEN** a use case calls `getObject(key)` for a key that does not exist
- **THEN** the adapter SHALL throw a `StorageObjectNotFoundError`

#### Scenario: deleteObject removes a stored object
- **WHEN** a use case calls `deleteObject(key)` for an existing key
- **THEN** the object SHALL be removed from storage
- **AND** subsequent calls to `objectExists(key)` SHALL return `false`

#### Scenario: deleteObject for non-existent key
- **WHEN** a use case calls `deleteObject(key)` for a key that does not exist
- **THEN** the adapter SHALL complete without error (idempotent delete)

#### Scenario: objectExists checks key presence
- **WHEN** a use case calls `objectExists(key)`
- **THEN** it SHALL return `true` if the key exists in storage, `false` otherwise

### Requirement: S3-Compatible Storage Adapter
The system SHALL provide an `S3CompatibleObjectStorageAdapter` that implements `ObjectStoragePort` using the `@aws-sdk/client-s3` SDK. This adapter SHALL be compatible with Cloudflare R2 and any S3-compatible object storage provider.

#### Scenario: S3 adapter uploads object
- **WHEN** `putObject` is called on the S3 adapter
- **THEN** it SHALL send a `PutObjectCommand` to the configured S3 endpoint with the correct bucket, key, body, and content type

#### Scenario: S3 adapter retrieves object
- **WHEN** `getObject` is called on the S3 adapter
- **THEN** it SHALL send a `GetObjectCommand` and return the response body as a `Buffer`

#### Scenario: S3 adapter deletes object
- **WHEN** `deleteObject` is called on the S3 adapter
- **THEN** it SHALL send a `DeleteObjectCommand` to remove the object from the bucket

#### Scenario: S3 adapter checks object existence
- **WHEN** `objectExists` is called on the S3 adapter
- **THEN** it SHALL send a `HeadObjectCommand` and return `true` if the object exists, `false` if a `NotFound` error is returned

#### Scenario: S3 endpoint unreachable
- **WHEN** the S3 endpoint is unreachable during any operation
- **THEN** the adapter SHALL throw a `StorageUnavailableError` with a descriptive message

#### Scenario: S3 upload fails due to permissions
- **WHEN** `putObject` fails due to insufficient permissions
- **THEN** the adapter SHALL throw a `StorageUploadError` with context about the failure

### Requirement: In-Memory Object Storage Adapter for Testing
The system SHALL provide an `InMemoryObjectStorageAdapter` that implements `ObjectStoragePort` using an in-memory `Map`. This adapter SHALL be used exclusively in unit and integration tests. It SHALL NOT call any external service or access the filesystem.

#### Scenario: In-memory adapter stores and retrieves
- **WHEN** `putObject` is called followed by `getObject` with the same key
- **THEN** the returned `Buffer` SHALL equal the original content

#### Scenario: In-memory adapter is isolated per instance
- **WHEN** two separate `InMemoryObjectStorageAdapter` instances are created
- **THEN** objects stored in one instance SHALL NOT be visible in the other

### Requirement: S3 Storage Binding
The system SHALL instantiate `S3CompatibleObjectStorageAdapter` at startup for all persisted object storage operations.

#### Scenario: StorageModule creates S3 adapter
- **WHEN** `StorageModule` is loaded
- **THEN** the `StorageModule` SHALL instantiate `S3CompatibleObjectStorageAdapter`
- **AND** it SHALL use `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_PUBLIC_BASE_URL` for configuration

#### Scenario: S3 config missing
- **WHEN** any required `S3_*` variable is missing
- **THEN** the application SHALL fail at startup with a clear validation error listing the missing variable

### Requirement: Storage Environment Configuration
The system SHALL validate the following environment variables at startup via Zod schema in `env.schema.ts`:

| Variable | Required when | Format |
|----------|--------------|--------|
| `S3_ENDPOINT` | always | URL string |
| `S3_REGION` | always | non-empty string |
| `S3_BUCKET` | always | non-empty string |
| `S3_ACCESS_KEY_ID` | always | non-empty string |
| `S3_SECRET_ACCESS_KEY` | always | non-empty string |
| `S3_PUBLIC_BASE_URL` | always | URL string |

#### Scenario: Valid S3 config passes validation
- **WHEN** all `S3_*` variables are provided with valid values
- **THEN** the environment validation SHALL pass and the application SHALL start normally

#### Scenario: Missing S3 config fails validation
- **WHEN** `S3_BUCKET` is not set
- **THEN** the application SHALL fail at startup with error message indicating `S3_BUCKET` is required

### Requirement: Public URL Construction
The system SHALL provide a method to construct the public URL for a stored object. The public URL SHALL be `{S3_PUBLIC_BASE_URL}/{key}`. Public asset metadata SHALL use this URL as the primary client-facing delivery path for stored assets.

#### Scenario: S3 public URL construction
- **WHEN** `getPublicUrl("seating-maps/uuid/map.svg")` is called on the S3 adapter
- **AND** `S3_PUBLIC_BASE_URL` is `https://assets.ticketbox.example.com`
- **THEN** it SHALL return `https://assets.ticketbox.example.com/seating-maps/uuid/map.svg`

#### Scenario: Production catalog uses public object URL
- **WHEN** a poster or seating map asset is uploaded
- **THEN** the persisted asset `publicUrl` SHALL be derived from `S3_PUBLIC_BASE_URL`
- **AND** public catalog clients SHALL be able to use that URL directly without requesting a separate image URL endpoint

### Requirement: Storage Domain Errors
The system SHALL define domain-level error classes for storage operations. Application use cases SHALL catch these errors instead of SDK-specific exceptions.

#### Scenario: StorageUploadError thrown on put failure
- **WHEN** `putObject` fails due to any storage-side error (permissions, quota, network)
- **THEN** the adapter SHALL throw `StorageUploadError` with a descriptive message and the original error as cause

#### Scenario: StorageObjectNotFoundError thrown on missing key
- **WHEN** `getObject` is called for a key that does not exist
- **THEN** the adapter SHALL throw `StorageObjectNotFoundError` with the key in the message

#### Scenario: Missing delete is idempotent
- **WHEN** `deleteObject` is called for a key that does not exist
- **THEN** the adapter SHALL complete without throwing `StorageObjectNotFoundError`

#### Scenario: StorageUnavailableError thrown on connectivity failure
- **WHEN** any storage operation fails due to the storage backend being unreachable
- **THEN** the adapter SHALL throw `StorageUnavailableError`
- **AND** the error SHALL NOT include credentials or sensitive configuration in its message

### Requirement: ai-artist-bio Module Uses Shared Storage
The `ai-artist-bio` module SHALL be refactored to use the shared `ObjectStoragePort` from `platform/storage/` instead of its own private port definition. The module's private `object-storage.port.ts` and `local-object-storage.adapter.ts` SHALL be removed.

#### Scenario: ai-artist-bio uses global StorageModule binding
- **WHEN** `AiArtistBioModule` is loaded
- **THEN** it SHALL receive `OBJECT_STORAGE` from the platform storage module registered by `BackendCoreModule`
- **AND** it SHALL NOT provide its own `OBJECT_STORAGE` binding

#### Scenario: ai-artist-bio use cases continue working
- **WHEN** `RequestArtistBioUseCase` or `ProcessArtistBioUseCase` calls `putObject` or `getObject`
- **THEN** the operation SHALL succeed using the shared adapter
- **AND** the method signatures SHALL be identical to the previous private port

#### Scenario: ai-artist-bio tests use InMemoryObjectStorageAdapter
- **WHEN** unit tests for `ai-artist-bio` run
- **THEN** they SHALL use `InMemoryObjectStorageAdapter` from `platform/storage/testing/`
- **AND** no external storage service SHALL be contacted

### Requirement: Cloudflare R2 Setup Documentation
The system SHALL include documentation for setting up Cloudflare R2 as the production object storage backend.

#### Scenario: Developer reads R2 setup guide
- **WHEN** a developer reads the R2 setup documentation
- **THEN** it SHALL cover: creating an R2 bucket, generating API tokens with appropriate permissions, configuring public access or custom domain, and the required `.env` variables with example values

#### Scenario: Documentation does not contain real secrets
- **WHEN** the R2 setup documentation or `.env.example` is committed to the repository
- **THEN** it SHALL NOT contain real API keys, secret access keys, or bucket names from any actual Cloudflare account
