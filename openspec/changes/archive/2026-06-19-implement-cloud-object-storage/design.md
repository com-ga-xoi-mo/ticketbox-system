## Context

TicketBox backend là NestJS modular monolith theo clean/hexagonal architecture. Hiện tại, module `ai-artist-bio` có `ObjectStoragePort` riêng với duy nhất `LocalObjectStorageAdapter` ghi file vào local filesystem (`data/uploads/`). Không có S3/cloud adapter, không có storage config trong env schema.

Nhiều feature sắp tới cần object storage: seating map SVG upload, poster upload, PDF press kit, QR code assets, CSV import. Nếu mỗi module tự implement storage port riêng sẽ vi phạm DRY và tạo fragmented infrastructure.

Blueprint design (`blueprint/design.md`) đã lên kế hoạch `platform/storage/` là shared storage layer với `ObjectStoragePort`, S3-compatible adapter cho Cloudflare R2, và local adapter cho dev/test.

### Current State
- `ObjectStoragePort` interface: `putObject(input: PutObjectInput): Promise<void>` + `getObject(key: string): Promise<Buffer>` — nằm trong `ai-artist-bio/domain/ports/`
- `LocalObjectStorageAdapter` — ghi vào `{cwd}/data/uploads/`, nằm trong `ai-artist-bio/infrastructure/storage/`
- `InMemoryObjectStorage` — test fake nằm trong `ai-artist-bio/testing/fakes.ts`
- `OBJECT_STORAGE = Symbol('ObjectStoragePort')` — injection token
- `ai-artist-bio.module.ts` hardcode `useClass: LocalObjectStorageAdapter`, không có factory pattern
- `PlatformConfigService` dùng `ConfigService<PlatformEnv, true>` với Zod validation qua `env.schema.ts`
- Pattern cho provider switching đã có precedent: `AI_ARTIST_BIO_PROVIDER` enum (`local` | `gemini`) với factory `createArtistBioGenerator`

### Stakeholders
- **Member 2** (owner): Concert, Admin, Catalog modules
- **Downstream consumers**: `implement-seating-map-assets` (change #5), poster upload, CSV import, QR generation
- **`ai-artist-bio` module**: cần refactor để dùng shared port

## Goals / Non-Goals

**Goals:**
- Tạo shared `ObjectStoragePort` interface tại `platform/storage/` mà mọi module inject được
- Implement `S3CompatibleObjectStorageAdapter` dùng `@aws-sdk/client-s3` SDK, tương thích Cloudflare R2
- Giữ `LocalObjectStorageAdapter` ở platform layer như dev/test fallback
- Tạo `InMemoryObjectStorageAdapter` cho unit/integration test — không gọi external service
- Config-driven adapter selection qua `STORAGE_DRIVER` env var (`s3` | `local`)
- Thêm storage env vars vào `env.schema.ts` với Zod validation
- Refactor `ai-artist-bio` module để inject shared `OBJECT_STORAGE` từ platform storage thay vì provide adapter riêng
- Document Cloudflare R2 setup guide
- Sau change này, `implement-seating-map-assets` chỉ cần `@Inject(OBJECT_STORAGE) storage: ObjectStoragePort`

**Non-Goals:**
- Không implement seating map upload, SVG sanitization, zone extraction (thuộc `implement-seating-map-assets`)
- Không implement presigned URL / direct browser-to-R2 upload
- Không thay đổi database schema; bảng `assets` đã tồn tại, nhưng change này không tạo upload endpoint hay asset records mới
- Không implement poster upload UI, CSV import UI, admin upload UI
- Không tạo REST endpoint cho upload trong change này
- Không implement CDN caching, image resize, content transformation

## Decisions

### 1. Port interface giữ nguyên method signature hiện tại, thêm lifecycle helpers và public URL helper

**Quyết định**: Shared `ObjectStoragePort` sẽ có 5 methods:
```typescript
export interface PutObjectInput {
  key: string;
  content: Buffer;
  contentType: string;
}

export interface ObjectStoragePort {
  putObject(input: PutObjectInput): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  objectExists(key: string): Promise<boolean>;
  getPublicUrl(key: string): string;
}
```

**Lý do**: `putObject` và `getObject` giữ nguyên API hiện tại của `ai-artist-bio` — migration nhỏ cho code đang dùng. Thêm `deleteObject` và `objectExists` vì seating map replacement, asset cleanup sẽ cần. Thêm `getPublicUrl` để các feature upload có thể persist `assets.publicUrl` mà không cần biết public domain của provider. `contentType` đã có trong `PutObjectInput` — S3 cần nó cho `Content-Type` header.

**Alternatives considered**:
- *Stream-based API*: `putObject(key, stream, contentType)` — phức tạp hơn, chưa cần cho file size dưới 100MB. Có thể thêm sau.
- *Presigned URL approach*: trả presigned upload URL cho client — tốt cho large file nhưng phức tạp hơn, chưa cần trong phase này.

### 2. `@aws-sdk/client-s3` thay vì S3 REST API trực tiếp

**Quyết định**: Dùng `@aws-sdk/client-s3` v3 SDK.

**Lý do**: SDK v3 là tree-shakeable, support S3-compatible providers bao gồm Cloudflare R2. Tự implement S3 REST API (signing v4, multipart) là reinventing the wheel, error-prone, và maintenance burden.

**Alternatives considered**:
- *`minio` client*: lightweight hơn nhưng ít ecosystem support, v7 API khác biệt.
- *`@cloudflare/r2` SDK*: không tồn tại — Cloudflare khuyến khích dùng S3-compatible SDK.

### 3. `StorageModule` là global NestJS dynamic module với `forRoot()` pattern

**Quyết định**: Tạo `StorageModule.forRoot()` nhận config từ `PlatformConfigService`, export `OBJECT_STORAGE` provider, và đánh dấu `StorageModule` là `@Global()`. `BackendCoreModule` import `StorageModule.forRoot()` đúng một lần; các module feature như `ai-artist-bio` chỉ inject `OBJECT_STORAGE` hoặc import `StorageModule` nếu cần metadata, không tự gọi `forRoot()`.

```typescript
@Module({})
@Global()
export class StorageModule {
  static forRoot(): DynamicModule {
    return {
      module: StorageModule,
      imports: [PlatformConfigModule],
      providers: [
        {
          provide: OBJECT_STORAGE,
          inject: [PlatformConfigService],
          useFactory: (config: PlatformConfigService) => {
            switch (config.storageDriver) {
              case 's3':
                return new S3CompatibleObjectStorageAdapter(config);
              case 'local':
                return new LocalObjectStorageAdapter(config);
            }
          },
        },
      ],
      exports: [OBJECT_STORAGE],
    };
  }
}
```

**Lý do**: `OBJECT_STORAGE` là platform-level singleton dùng chung bởi nhiều bounded contexts. Import `forRoot()` nhiều lần có thể tạo nhiều adapter instance và làm test/DI khó đoán. `@Global()` + một import ở `BackendCoreModule` giữ cấu hình storage tập trung.

**Alternatives considered**:
- *Conditional module import*: `imports: [isProd ? S3Module : LocalModule]` — ít flexible, không theo chuẩn NestJS dynamic module.
- *Separate modules per adapter*: quá granular cho use case đơn giản này.

### 4. Storage key convention: `{context}/{entityId}/{filename}`

**Quyết định**: Storage keys tuân theo pattern:
```
{context}/{entityId}/{filename}
```
Ví dụ:
- `artist-bios/{bioId}/press-kit.pdf`
- `seating-maps/{concertId}/map.svg`
- `posters/{concertId}/poster.jpg`

**Lý do**: Hierarchical keys giúp:
- Dễ browse trong R2 dashboard
- Scope isolation per entity — dễ cleanup khi xóa entity
- Tránh collision — entity ID (UUID) đảm bảo uniqueness
- Consistent across all modules

**Convention rules**:
- `context`: kebab-case, plural noun (vd: `artist-bios`, `seating-maps`, `posters`)
- `entityId`: UUID v4
- `filename`: original hoặc generated, lowercase, no spaces

### 5. Public URL construction: `{baseUrl}/{key}`

**Quyết định**: Public URL = `{baseUrl}/{key}`. Với R2/S3 adapter, `baseUrl` là `S3_PUBLIC_BASE_URL` (custom domain hoặc R2.dev public URL). Với local adapter, `baseUrl` là `LOCAL_STORAGE_PUBLIC_BASE_URL`, default `http://localhost:3000/storage`.

**Lý do**: Cloudflare R2 hỗ trợ custom domain cho public access. URL construction đơn giản, deterministic, không cần query object metadata. Adapter sẽ có method `getPublicUrl(key: string): string` trả URL mà không gọi S3 API. Local URL là fallback phục vụ dev/demo và không phải production storage path.

**Alternatives considered**:
- *Presigned URL*: an toàn hơn cho private objects nhưng phức tạp, expire time management, không cần cho public assets.
- *CDN proxy URL*: tốt cho caching nhưng out of scope, có thể add Cloudflare CDN domain sau.

### 6. Error handling: wrap SDK exceptions thành domain errors

**Quyết định**: Adapter catch SDK exceptions và throw domain-level errors:
- `StorageUploadError` — khi `putObject` fail (network, permission, quota)
- `StorageObjectNotFoundError` — khi `getObject` key không tồn tại
- `StorageUnavailableError` — khi S3 endpoint unreachable

`deleteObject` phải idempotent: nếu key không tồn tại thì hoàn tất không lỗi. `objectExists` trả `false` cho missing key.

**Lý do**: Application layer không nên biết về S3 SDK. Domain errors cho phép use case handle gracefully (retry, fallback message cho user) mà không couple vào infrastructure.

### 7. Config validation: `STORAGE_DRIVER=s3` yêu cầu tất cả `S3_*` vars

**Quyết định**: Trong `env.schema.ts`, dùng Zod `.refine()` hoặc discriminated union:
- `STORAGE_DRIVER=local`: không cần `S3_*` vars
- `STORAGE_DRIVER=s3`: yêu cầu `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` — tất cả non-empty
- Local adapter dùng `LOCAL_STORAGE_ROOT_DIR` default `data/uploads` và `LOCAL_STORAGE_PUBLIC_BASE_URL` default `http://localhost:3000/storage`.

**Lý do**: Fail-fast khi startup nếu thiếu config — không để runtime crash khi first upload.

### 8. Secret management: env vars only, no `.env` commit

**Quyết định**: 
- `.env.example` chứa placeholder keys, không chứa giá trị thật
- `.env` nằm trong `.gitignore`
- Docs hướng dẫn tạo Cloudflare R2 API token với minimal permissions

**Lý do**: Standard practice. Không leak secret qua git history.

### 9. Refactor `ai-artist-bio`: dùng shared storage token, xóa local port

**Quyết định**:
- `BackendCoreModule` import `StorageModule.forRoot()`
- `ai-artist-bio.module.ts` không gọi `StorageModule.forRoot()` và không tự provide storage adapter
- Xóa `{ provide: OBJECT_STORAGE, useClass: LocalObjectStorageAdapter }` khỏi `ai-artist-bio` providers
- `ai-artist-bio/domain/ports/object-storage.port.ts` bị xóa — import thay từ `platform/storage/`
- `ai-artist-bio/infrastructure/storage/local-object-storage.adapter.ts` bị xóa
- Use cases import `ObjectStoragePort` từ `../../platform/storage/` (hoặc barrel export)
- `ai-artist-bio/testing/fakes.ts` — `InMemoryObjectStorage` được thay bằng re-export/alias tới `platform/storage/adapters/in-memory-object-storage.adapter`

**Lý do**: Single source of truth cho `ObjectStoragePort`. Không duplicate interface/adapter.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| `@aws-sdk/client-s3` bundle size lớn | Tăng ~500KB node_modules | SDK v3 tree-shakeable, chỉ import `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, `HeadObjectCommand` |
| Cloudflare R2 API incompatibility edge cases | Một số S3 features không support (lifecycle, versioning) | Chỉ dùng basic operations (Put/Get/Delete/Head) — tất cả đều R2 support |
| Breaking `ai-artist-bio` khi refactor | Module test fail | Chạy existing tests sau refactor, interface giữ nguyên method signature |
| `STORAGE_DRIVER=local` có thể accidentally dùng trên production | Data loss nếu container restart | Log warning khi `NODE_ENV=production && STORAGE_DRIVER=local`. Docs rõ ràng. |
| Secret leak qua logs | S3 credentials in error stack traces | Không log credentials. Error handler strip sensitive fields trước khi log. |
| Network failure khi upload | User thấy lỗi | `StorageUnavailableError` cho phép use case trả friendly error message + retry guidance |
| Mock S3 SDK khó trong unit test | Test brittle | Adapter constructor nhận optional `S3Client` để test inject fake client thay vì mock module toàn cục |
