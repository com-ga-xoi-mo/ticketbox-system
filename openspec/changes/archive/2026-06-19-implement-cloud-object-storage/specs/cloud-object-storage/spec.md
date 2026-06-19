## ADDED Requirements

### Requirement: Platform Object Storage Port
The system SHALL provide a shared `ObjectStoragePort` interface at the platform layer (`platform/storage/`) that any module can depend on for storing and retrieving binary objects. The port SHALL define five operations: `putObject`, `getObject`, `deleteObject`, `objectExists`, and `getPublicUrl`. Application use cases SHALL depend only on this port interface, never on storage SDK or adapter classes directly.

#### Scenario: Module injects ObjectStoragePort
- **WHEN** a NestJS module imports `StorageModule`
- **THEN** it SHALL be able to inject `ObjectStoragePort` via the `OBJECT_STORAGE` token
- **AND** the injected instance SHALL be determined by the `STORAGE_DRIVER` configuration

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

---

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

---

### Requirement: Local Object Storage Adapter
The system SHALL provide a `LocalObjectStorageAdapter` that implements `ObjectStoragePort` using the local filesystem. This adapter SHALL serve as a development and testing fallback only — it is NOT the production storage path.

#### Scenario: Local adapter writes to filesystem
- **WHEN** `putObject` is called on the local adapter
- **THEN** it SHALL write the binary content to `{rootDir}/{key}` on the local filesystem
- **AND** it SHALL create parent directories if they do not exist

#### Scenario: Local adapter reads from filesystem
- **WHEN** `getObject` is called on the local adapter for an existing key
- **THEN** it SHALL read and return the file content as a `Buffer`

#### Scenario: Local adapter key not found
- **WHEN** `getObject` is called for a key that does not exist on the filesystem
- **THEN** it SHALL throw a `StorageObjectNotFoundError`

---

### Requirement: In-Memory Object Storage Adapter for Testing
The system SHALL provide an `InMemoryObjectStorageAdapter` that implements `ObjectStoragePort` using an in-memory `Map`. This adapter SHALL be used exclusively in unit and integration tests. It SHALL NOT call any external service or access the filesystem.

#### Scenario: In-memory adapter stores and retrieves
- **WHEN** `putObject` is called followed by `getObject` with the same key
- **THEN** the returned `Buffer` SHALL equal the original content

#### Scenario: In-memory adapter is isolated per instance
- **WHEN** two separate `InMemoryObjectStorageAdapter` instances are created
- **THEN** objects stored in one instance SHALL NOT be visible in the other

---

### Requirement: Config-Driven Adapter Selection
The system SHALL select the object storage adapter at startup based on the `STORAGE_DRIVER` environment variable. The value `s3` SHALL activate the `S3CompatibleObjectStorageAdapter`. The value `local` SHALL activate the `LocalObjectStorageAdapter`.

#### Scenario: STORAGE_DRIVER=s3 selects S3 adapter
- **WHEN** `STORAGE_DRIVER` is set to `s3`
- **THEN** the `StorageModule` SHALL instantiate `S3CompatibleObjectStorageAdapter`
- **AND** it SHALL use `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_PUBLIC_BASE_URL` for configuration

#### Scenario: STORAGE_DRIVER=local selects local adapter
- **WHEN** `STORAGE_DRIVER` is set to `local`
- **THEN** the `StorageModule` SHALL instantiate `LocalObjectStorageAdapter`
- **AND** `S3_*` environment variables SHALL NOT be required

#### Scenario: STORAGE_DRIVER=s3 without required S3 config
- **WHEN** `STORAGE_DRIVER` is `s3` but any required `S3_*` variable is missing
- **THEN** the application SHALL fail at startup with a clear validation error listing the missing variables

#### Scenario: STORAGE_DRIVER not set defaults to local
- **WHEN** `STORAGE_DRIVER` is not set
- **THEN** it SHALL default to `local`

---

### Requirement: Storage Environment Configuration
The system SHALL validate the following environment variables at startup via Zod schema in `env.schema.ts`:

| Variable | Required when | Format |
|----------|--------------|--------|
| `STORAGE_DRIVER` | always (default: `local`) | `s3` \| `local` |
| `LOCAL_STORAGE_ROOT_DIR` | optional for `local` | non-empty string, default `data/uploads` |
| `LOCAL_STORAGE_PUBLIC_BASE_URL` | optional for `local` | URL string, default `http://localhost:3000/storage` |
| `S3_ENDPOINT` | `STORAGE_DRIVER=s3` | URL string |
| `S3_REGION` | `STORAGE_DRIVER=s3` | non-empty string |
| `S3_BUCKET` | `STORAGE_DRIVER=s3` | non-empty string |
| `S3_ACCESS_KEY_ID` | `STORAGE_DRIVER=s3` | non-empty string |
| `S3_SECRET_ACCESS_KEY` | `STORAGE_DRIVER=s3` | non-empty string |
| `S3_PUBLIC_BASE_URL` | `STORAGE_DRIVER=s3` | URL string |

#### Scenario: Valid S3 config passes validation
- **WHEN** `STORAGE_DRIVER=s3` and all `S3_*` variables are provided with valid values
- **THEN** the environment validation SHALL pass and the application SHALL start normally

#### Scenario: Missing S3 config fails validation
- **WHEN** `STORAGE_DRIVER=s3` and `S3_BUCKET` is not set
- **THEN** the application SHALL fail at startup with error message indicating `S3_BUCKET` is required

#### Scenario: Local driver ignores S3 vars
- **WHEN** `STORAGE_DRIVER=local` and no `S3_*` variables are set
- **THEN** the environment validation SHALL pass
- **AND** local storage SHALL use default local root and public base URL unless local override variables are set

---

### Requirement: Public URL Construction
The system SHALL provide a method to construct the public URL for a stored object. For the S3 adapter, the public URL SHALL be `{S3_PUBLIC_BASE_URL}/{key}`. For the local adapter, the public URL SHALL be `{LOCAL_STORAGE_PUBLIC_BASE_URL}/{key}` (configurable, defaulting to `http://localhost:3000/storage`).

#### Scenario: S3 public URL construction
- **WHEN** `getPublicUrl("seating-maps/uuid/map.svg")` is called on the S3 adapter
- **AND** `S3_PUBLIC_BASE_URL` is `https://assets.ticketbox.example.com`
- **THEN** it SHALL return `https://assets.ticketbox.example.com/seating-maps/uuid/map.svg`

#### Scenario: Local public URL construction
- **WHEN** `getPublicUrl("artist-bios/uuid/press-kit.pdf")` is called on the local adapter
- **THEN** it SHALL return `http://localhost:3000/storage/artist-bios/uuid/press-kit.pdf`

---

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

---

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

---

### Requirement: Cloudflare R2 Setup Documentation
The system SHALL include documentation for setting up Cloudflare R2 as the production object storage backend.

#### Scenario: Developer reads R2 setup guide
- **WHEN** a developer reads the R2 setup documentation
- **THEN** it SHALL cover: creating an R2 bucket, generating API tokens with appropriate permissions, configuring public access or custom domain, and the required `.env` variables with example values

#### Scenario: Documentation does not contain real secrets
- **WHEN** the R2 setup documentation or `.env.example` is committed to the repository
- **THEN** it SHALL NOT contain real API keys, secret access keys, or bucket names from any actual Cloudflare account
