## Why

TicketBox cần lưu trữ binary assets (seating map SVG, poster, PDF press kit, QR codes, CSV) nhưng hiện tại chỉ có `LocalObjectStorageAdapter` nằm riêng trong module `ai-artist-bio` — không dùng được cho các module khác và không phù hợp production. Cần một shared, production-ready object storage foundation dùng Cloudflare R2 (S3-compatible) để tất cả các module có thể upload/download assets qua một `ObjectStoragePort` duy nhất. Change này tách riêng storage infrastructure ra khỏi `implement-seating-map-assets` vì storage foundation là shared concern — seating map, poster upload, CSV import, QR generation đều cần, và nếu gộp chung sẽ tạo change quá lớn, khó review, và block các feature khác cần storage.

## What Changes

- **Tạo shared `ObjectStoragePort`** tại `packages/backend/src/platform/storage/` — di chuyển interface từ `ai-artist-bio/domain/ports/` sang platform layer để mọi module dùng chung.
- **Implement `S3CompatibleObjectStorageAdapter`** dùng `@aws-sdk/client-s3` SDK, tương thích Cloudflare R2 và bất kỳ S3-compatible provider nào.
- **Giữ `LocalObjectStorageAdapter`** như dev/test fallback, cũng di chuyển sang platform layer.
- **Tạo `StorageModule`** (NestJS global dynamic module) tự chọn adapter theo `STORAGE_DRIVER` env var (`s3` | `local`) và được import một lần ở `BackendCoreModule`.
- **Refactor `ai-artist-bio`** module để inject shared `OBJECT_STORAGE` từ platform storage thay vì tự provide `LocalObjectStorageAdapter`.
- **Mở rộng `PlatformConfigService`** với storage-related config: `STORAGE_DRIVER`, `LOCAL_STORAGE_ROOT_DIR`, `LOCAL_STORAGE_PUBLIC_BASE_URL`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`.
- **Thêm `InMemoryObjectStorageAdapter`** cho unit/integration tests — không gọi Cloudflare thật.
- **Thêm documentation** hướng dẫn setup Cloudflare R2: tạo bucket, API token, public domain, env mẫu.
- **Verification checklist**: lint, unit tests cho adapters, config validation, integration test stub.

## Capabilities

### New Capabilities
- `cloud-object-storage`: Shared platform-level object storage abstraction với S3-compatible adapter (Cloudflare R2), local dev fallback, config-driven adapter selection, storage key convention, và public URL construction.

### Modified Capabilities
_(Không có thay đổi requirement-level cho spec hiện tại — chỉ refactor infrastructure của `ai-artist-bio` để dùng shared port)_

## Impact

- **Code**: Thêm `packages/backend/src/platform/storage/` (port, adapters, module). Refactor `ai-artist-bio` module imports. Xóa/deprecate port riêng trong `ai-artist-bio/domain/ports/object-storage.port.ts`.
- **Dependencies**: Thêm `@aws-sdk/client-s3` vào root `package.json`.
- **Configuration**: Thêm storage env vars mới (`STORAGE_DRIVER`, `LOCAL_STORAGE_*`, `S3_*`). Local dev chỉ cần `STORAGE_DRIVER=local` và có default cho local storage.
- **Infrastructure**: Production cần Cloudflare R2 bucket + API token. Dev/test dùng local filesystem hoặc in-memory.
- **Database**: Không thay đổi schema — bảng `assets` đã tồn tại; các feature upload sau sẽ tạo asset records/metadata khi cần.
- **API**: Không thay đổi public API — change này chỉ tạo internal infrastructure.
- **Other modules**: Sau change này, `implement-seating-map-assets`, poster upload, CSV import chỉ cần inject `ObjectStoragePort` để dùng.
