## 1. Platform Storage Port & Domain Errors

- [x] 1.1 Tạo `packages/backend/src/platform/storage/object-storage.port.ts` — định nghĩa `ObjectStoragePort` interface với 5 methods (`putObject`, `getObject`, `deleteObject`, `objectExists`, `getPublicUrl`), type `PutObjectInput` (`key`, `content: Buffer`, `contentType: string`), và injection token `OBJECT_STORAGE = Symbol('ObjectStoragePort')`.
- [x] 1.2 Tạo `packages/backend/src/platform/storage/storage.errors.ts` — định nghĩa 3 domain error classes: `StorageUploadError`, `StorageObjectNotFoundError`, `StorageUnavailableError`. Tất cả extends base `Error`, chứa `cause` field cho original error.
- [x] 1.3 Tạo `packages/backend/src/platform/storage/index.ts` — barrel export cho port, types, errors, và `OBJECT_STORAGE` token.

## 2. Environment Configuration

- [x] 2.1 Mở rộng `packages/backend/src/platform/config/env.schema.ts` — thêm `STORAGE_DRIVER` (`z.enum(['s3', 'local']).default('local')`), local vars (`LOCAL_STORAGE_ROOT_DIR` default `data/uploads`, `LOCAL_STORAGE_PUBLIC_BASE_URL` default `http://localhost:3000/storage`), và conditional S3 vars (`S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`) với Zod `.refine()` — S3 vars bắt buộc khi `STORAGE_DRIVER=s3`, optional khi `local`. Update `PlatformEnv` type.
- [x] 2.2 Mở rộng `packages/backend/src/platform/config/platform-config.service.ts` — thêm getters: `storageDriver`, `localStorageRootDir`, `localStoragePublicBaseUrl`, `s3Endpoint`, `s3Region`, `s3Bucket`, `s3AccessKeyId`, `s3SecretAccessKey`, `s3PublicBaseUrl`.
- [x] 2.3 Cập nhật `.env.example` — thêm storage env vars với placeholder values và comments giải thích.

## 3. Storage Adapters

- [x] 3.1 Tạo `packages/backend/src/platform/storage/adapters/s3-compatible-object-storage.adapter.ts` — implement `ObjectStoragePort` dùng `@aws-sdk/client-s3` SDK. Constructor nhận config từ `PlatformConfigService` và optional `S3Client` để unit test inject fake client. Dùng `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, `HeadObjectCommand`. Wrap SDK errors thành domain errors (`StorageUploadError`, `StorageObjectNotFoundError`, `StorageUnavailableError`). Implement `deleteObject` idempotent và `getPublicUrl` trả `{S3_PUBLIC_BASE_URL}/{key}`.
- [x] 3.2 Tạo `packages/backend/src/platform/storage/adapters/local-object-storage.adapter.ts` — implement `ObjectStoragePort` dùng Node.js `fs/promises`. Ghi files vào `{LOCAL_STORAGE_ROOT_DIR}/{key}`. Implement `deleteObject` (xóa file, idempotent), `objectExists` (check file existence), `getPublicUrl` trả `{LOCAL_STORAGE_PUBLIC_BASE_URL}/{key}`. Throw `StorageObjectNotFoundError` khi `getObject` file không tồn tại.
- [x] 3.3 Tạo `packages/backend/src/platform/storage/adapters/in-memory-object-storage.adapter.ts` — implement `ObjectStoragePort` dùng `Map<string, { content: Buffer; contentType: string }>`. Dùng cho tests. Implement tất cả 5 methods. Thêm helper `clear()` để reset state giữa tests.
- [x] 3.4 Thêm `@aws-sdk/client-s3` vào root `package.json` dependencies. Chạy `npm install`.

## 4. Storage Module

- [x] 4.1 Tạo `packages/backend/src/platform/storage/storage.module.ts` — `StorageModule` là `@Global()` module với static method `forRoot()` trả `DynamicModule`. Import `PlatformConfigModule`. Provide `OBJECT_STORAGE` via factory: inject `PlatformConfigService`, switch trên `config.storageDriver` — `s3` → `new S3CompatibleObjectStorageAdapter(config)`, `local` → `new LocalObjectStorageAdapter(config)`. Export `OBJECT_STORAGE`.
- [x] 4.2 Cập nhật `packages/backend/src/platform/storage/index.ts` — thêm export `StorageModule`, và `InMemoryObjectStorageAdapter` (cho test imports).

## 5. Refactor ai-artist-bio Module

- [x] 5.1 Cập nhật `packages/backend/src/ai-artist-bio/ai-artist-bio.module.ts` — không gọi `StorageModule.forRoot()`; nhận `OBJECT_STORAGE` từ global `StorageModule` đã đăng ký trong `BackendCoreModule`. Xóa provider `{ provide: OBJECT_STORAGE, useClass: LocalObjectStorageAdapter }`. Xóa import `LocalObjectStorageAdapter` và import `OBJECT_STORAGE`, `ObjectStoragePort` từ `../platform/storage` thay vì `./domain/ports/object-storage.port`.
- [x] 5.2 Cập nhật `packages/backend/src/ai-artist-bio/application/use-cases/request-artist-bio.use-case.ts` — thay đổi import `ObjectStoragePort` và `PutObjectInput` từ `../../../platform/storage` thay vì `../../domain/ports/object-storage.port`.
- [x] 5.3 Cập nhật `packages/backend/src/ai-artist-bio/application/use-cases/process-artist-bio.use-case.ts` — thay đổi import `ObjectStoragePort` từ `../../../platform/storage` thay vì `../../domain/ports/object-storage.port`.
- [x] 5.4 Cập nhật `packages/backend/src/ai-artist-bio/testing/fakes.ts` — xóa local `InMemoryObjectStorage` class, import và re-export `InMemoryObjectStorageAdapter` từ `../../platform/storage`. Đảm bảo test files import từ fakes vẫn hoạt động.
- [x] 5.5 Xóa `packages/backend/src/ai-artist-bio/domain/ports/object-storage.port.ts` — file này không còn cần thiết.
- [x] 5.6 Xóa `packages/backend/src/ai-artist-bio/infrastructure/storage/local-object-storage.adapter.ts` — file này không còn cần thiết.

## 6. Integration vào Backend Modules

- [x] 6.1 Cập nhật `packages/backend/src/platform/backend-core.module.ts` — import `StorageModule.forRoot()` một lần để `OBJECT_STORAGE` available globally cho các modules cần. Export `StorageModule` nếu các app/module bên ngoài cần import token từ platform.

## 7. Tests

- [x] 7.1 Tạo `packages/backend/src/platform/storage/__tests__/in-memory-object-storage.adapter.spec.ts` — unit tests cho `InMemoryObjectStorageAdapter`: putObject/getObject roundtrip, getObject not found throws `StorageObjectNotFoundError`, deleteObject removes object, deleteObject idempotent, objectExists returns correct boolean, getPublicUrl format, clear() resets state.
- [x] 7.2 Tạo `packages/backend/src/platform/storage/__tests__/local-object-storage.adapter.spec.ts` — unit tests cho `LocalObjectStorageAdapter`: putObject creates file, getObject reads file, getObject not found throws error, deleteObject removes file, objectExists check, tạo directory structure. Dùng temp directory, cleanup after tests.
- [x] 7.3 Tạo `packages/backend/src/platform/storage/__tests__/s3-compatible-object-storage.adapter.spec.ts` — unit tests cho `S3CompatibleObjectStorageAdapter` bằng cách inject fake/mock `S3Client` vào constructor và mock `send()` method. Test: putObject sends PutObjectCommand, getObject sends GetObjectCommand, deleteObject sends DeleteObjectCommand và idempotent khi missing key, objectExists sends HeadObjectCommand, error wrapping (SDK error → domain error), getPublicUrl format.
- [x] 7.4 Tạo `packages/backend/src/platform/storage/__tests__/storage.module.spec.ts` — integration test cho `StorageModule.forRoot()`: test module compiles, test STORAGE_DRIVER=local creates LocalObjectStorageAdapter, test factory injection works, test module provides a singleton `OBJECT_STORAGE` binding.
- [x] 7.5 Tạo `packages/backend/src/platform/config/__tests__/env.schema.storage.spec.ts` — unit tests cho storage env validation: valid s3 config passes, missing S3_BUCKET with STORAGE_DRIVER=s3 fails, STORAGE_DRIVER=local without S3 vars passes, default STORAGE_DRIVER is local.
- [x] 7.6 Chạy existing `ai-artist-bio` tests — đảm bảo refactor không break test hiện có. Fix nếu cần.

## 8. Documentation

- [x] 8.1 Tạo `docs/cloudflare-r2-setup.md` — hướng dẫn: tạo Cloudflare R2 bucket, tạo API token với R2 permissions (Object Read & Write), cấu hình public access hoặc custom domain, env variables cần set, `.env.example` mẫu. Không chứa secret thật.

## 9. Verification Checklist

- [x] 9.1 Chạy `npm run lint` — không có lint errors.
- [x] 9.2 Chạy `npm run build` — TypeScript compile thành công, không có type errors.
- [x] 9.3 Chạy `npm run test` — tất cả tests pass bao gồm storage adapter tests và ai-artist-bio tests.
- [x] 9.4 Verify `STORAGE_DRIVER=local` — app start OK không cần S3 config.
- [x] 9.5 Verify `STORAGE_DRIVER=s3` thiếu config — app fail với clear validation error.
- [x] 9.6 Review: không có real secrets trong committed files.
- [x] 9.7 Review: `ObjectStoragePort` interface chỉ nằm ở `platform/storage/`, không duplicate ở `ai-artist-bio/`.
