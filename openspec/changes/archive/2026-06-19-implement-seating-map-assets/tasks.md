## 1. Inspect Schema and Current Routes

- [x] 1.1 Verify Prisma schema has all required models: `Asset` (with `AssetKind.SEATING_MAP`), `SeatingZone` (with `svgElementId`, unique constraint `[concertId, svgElementId]`), `TicketTypeZone` (composite PK `[ticketTypeId, seatingZoneId]`, `concertId` FK), `Concert.seatingMapAssetId` FK. Confirm no migration needed — if any field/enum/index is missing, add a migration.
- [x] 1.2 Review existing concert-management controllers (`OrganizerConcertController`, `AdminConcertController`, `OrganizerTicketTypeController`), use cases, and repository ports to identify integration points for new seating map endpoints.

## 2. Environment Configuration

- [x] 2.1 Add `SEATING_MAP_SVG_MAX_BYTES` to `packages/backend/src/platform/config/env.schema.ts` — `z.coerce.number().positive().default(5_242_880)` (5MB). Update `PlatformEnv` type.
- [x] 2.2 Add getter `seatingMapSvgMaxBytes` to `packages/backend/src/platform/config/platform-config.service.ts`.
- [x] 2.3 Update `.env.example` with `SEATING_MAP_SVG_MAX_BYTES=5242880` and comment explaining usage.

## 3. Domain Errors and Types

- [x] 3.1 Create `packages/backend/src/concert-management/domain/seating-map.errors.ts` — define domain error classes: `MissingSeatingMapFileError`, `InvalidSeatingMapContentTypeError`, `InvalidSeatingMapExtensionError`, `SeatingMapFileTooLargeError`, `UnsafeSeatingMapSvgError` (with `reasons: string[]` field), `DuplicateSvgElementIdError`, `CrossConcertZoneMappingError`.
- [x] 3.2 Create `packages/backend/src/concert-management/domain/seating-map.types.ts` — define input/output types: `UploadSeatingMapInput` (`concertId`, `userId`, `allowAdminOverride`, `fileBuffer: Buffer`, `originalName`, `mimeType`, `sizeBytes`), `UploadSeatingMapResult` (asset + concert info including `publicUrl`), `UpsertSeatingZoneInput` (`svgElementId`, `label`, `color?`, `displayOrder`, `status?`), `UpdateTicketTypeZoneMappingsInput` (`concertId`, `ticketTypeId`, `seatingZoneIds[]`).

## 4. SVG Safety Validation Service

- [x] 4.1 Create `packages/backend/src/concert-management/application/services/svg-safety-validator.ts` — pure function/class that receives `Buffer`, converts to string, checks blacklist patterns: `<script`, event handler attributes (`on\w+=`), `javascript:` URLs, `<iframe`, `<object`, `<embed`, `<foreignObject`, external `href`/`xlink:href` references, `data:text/html`. Returns `{ safe: boolean, reasons: string[] }`. No NestJS decorator — plain class for testability.

## 5. Upload Seating Map Use Case

- [x] 5.1 Create `packages/backend/src/concert-management/application/use-cases/upload-seating-map.use-case.ts` — receives `UploadSeatingMapInput`. Steps: (1) authorize via `AuthorizeConcertManagementUseCase`, (2) validate MIME type, extension, size, (3) validate SVG safety via `SvgSafetyValidator`, (4) compute SHA-256 checksum, (5) generate `assetId` UUID and storage key `seating-maps/{concertId}/{assetId}.svg`, (6) compute `publicUrl` with `ObjectStoragePort.getPublicUrl(storageKey)`, (7) call `ObjectStoragePort.putObject()`, (8) call repository to create asset with the generated `assetId`/`publicUrl` and associate with concert (mark old asset `ARCHIVED` if exists), (9) return result. Dependencies injected: `AuthorizeConcertManagementUseCase`, `ObjectStoragePort` (via `OBJECT_STORAGE`), `SeatingMapWriteRepositoryPort`, `PlatformConfigService`.

## 6. Seating Zone Upsert Use Case

- [x] 6.1 Create `packages/backend/src/concert-management/application/use-cases/upsert-seating-zones.use-case.ts` — receives `concertId`, `userId`, `allowAdminOverride`, `zones: UpsertSeatingZoneInput[]`. Steps: (1) authorize, (2) validate no duplicate `svgElementId` in request, (3) upsert zones via repository port by `(concertId, svgElementId)`, (4) return upserted zones.

## 7. Ticket-Type-Zone Mapping Use Case

- [x] 7.1 Create `packages/backend/src/concert-management/application/use-cases/update-ticket-type-zone-mappings.use-case.ts` — receives `concertId`, `ticketTypeId`, `userId`, `allowAdminOverride`, `seatingZoneIds[]`. Steps: (1) authorize, (2) verify ticket type belongs to concert, (3) verify all seating zone IDs belong to same concert — reject cross-concert, (4) replace `TicketTypeZone` records for this ticket type, (5) return mapped zones.

## 8. Repository Ports

- [x] 8.1 Create `packages/backend/src/concert-management/domain/ports/seating-map-write.port.ts` — define `SeatingMapWriteRepositoryPort` interface with methods: `createAssetAndAssociateConcertSeatingMap(assetData, concertId, oldAssetId?)`, `findAssetById(id)`. `assetData` must include generated `id`, `storageKey`, `publicUrl`, `originalName`, `contentType`, `sizeBytes`, `checksum`, and `uploadedById`. Define injection token `SEATING_MAP_WRITE_REPOSITORY`.
- [x] 8.2 Create `packages/backend/src/concert-management/domain/ports/seating-zone.port.ts` — define `SeatingZoneRepositoryPort` interface with methods: `upsertMany(concertId, zones[])`, `findByConcertId(concertId)`, `findByIds(ids[])`. Define injection token `SEATING_ZONE_REPOSITORY`.
- [x] 8.3 Create `packages/backend/src/concert-management/domain/ports/ticket-type-zone.port.ts` — define `TicketTypeZoneRepositoryPort` interface with methods: `replaceForTicketType(concertId, ticketTypeId, seatingZoneIds[])`, `findByTicketTypeId(ticketTypeId)`. Define injection token `TICKET_TYPE_ZONE_REPOSITORY`.

## 9. Prisma Repository Implementations

- [x] 9.1 Create `packages/backend/src/concert-management/infrastructure/database/prisma-seating-map-write.repository.ts` — implement `SeatingMapWriteRepositoryPort` using `PrismaService`. Use `$transaction()` to atomically: create `Asset` record with generated `id`, unique `storageKey`, and `publicUrl`; update `Concert.seatingMapAssetId`; mark old asset `ARCHIVED` if exists.
- [x] 9.2 Create `packages/backend/src/concert-management/infrastructure/database/prisma-seating-zone.repository.ts` — implement `SeatingZoneRepositoryPort` using `PrismaService`. `upsertMany()` uses `prisma.seatingZone.upsert()` in a loop or `createMany`/`updateMany` as appropriate, keyed on `(concertId, svgElementId)`.
- [x] 9.3 Create `packages/backend/src/concert-management/infrastructure/database/prisma-ticket-type-zone.repository.ts` — implement `TicketTypeZoneRepositoryPort` using `PrismaService`. `replaceForTicketType()` deletes existing `TicketTypeZone` rows and creates new ones in a transaction.

## 10. Controllers and DTOs

- [x] 10.1 Create `packages/backend/src/concert-management/adapters/http/dto/upsert-seating-zones.dto.ts` — DTO with `zones: Array<{ svgElementId: string, label: string, color?: string, displayOrder: number, status?: 'ACTIVE' | 'INACTIVE' }>`, validated with `class-validator` (`@ValidateNested`, `@Type`, enum validation for status).
- [x] 10.2 Create `packages/backend/src/concert-management/adapters/http/dto/update-zone-mappings.dto.ts` — DTO with `seatingZoneIds: string[]`, validated with `class-validator` (`@IsArray`, `@IsUUID`).
- [x] 10.3 Create `packages/backend/src/concert-management/adapters/http/organizer-seating-map.controller.ts` — `@Controller('organizer/concerts/:id')`, `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(Role.ORGANIZER)`. Endpoints: `POST seating-map` (multipart upload, `FileInterceptor('file', { storage: memoryStorage(), limits })`, transforms `Express.Multer.File` → `UploadSeatingMapInput`, `allowAdminOverride: false`), `PUT seating-zones` (JSON body, upsert zones), `PUT ticket-types/:typeId/zone-mappings` (JSON body, update mappings). Controller maps domain errors → HTTP exceptions (400, 403, 404).
- [x] 10.4 Add seating map endpoints to `packages/backend/src/concert-management/adapters/http/admin-concert.controller.ts` — `POST :id/seating-map` (multipart upload, `allowAdminOverride: true`), `PUT :id/seating-zones`, `PUT :id/ticket-types/:typeId/zone-mappings`. Same patterns as organizer but with admin authorization.
- [x] 10.5 If TypeScript lacks `Express.Multer.File` types, add `@types/multer` as a devDependency or define a local controller-only upload file type with `buffer`, `originalname`, `mimetype`, and `size`.

## 11. Module Registration

- [x] 11.1 Update `packages/backend/src/concert-management/concert-management.module.ts` — register new controllers (`OrganizerSeatingMapController`), providers (use cases: `UploadSeatingMapUseCase`, `UpsertSeatingZonesUseCase`, `UpdateTicketTypeZoneMappingsUseCase`; services: `SvgSafetyValidator`), repository bindings (`SEATING_MAP_WRITE_REPOSITORY`, `SEATING_ZONE_REPOSITORY`, `TICKET_TYPE_ZONE_REPOSITORY`). Import `OBJECT_STORAGE` from global `StorageModule` (already available via `BackendCoreModule`).

## 12. Public Catalog Integration Check

- [x] 12.1 Verify `PrismaPublicConcertCatalogRepository` already includes `seatingMapAsset`, `seatingZones`, `ticketTypes` with `zones` in its queries. Confirm `ConcertDetail` type already has `seatingMapAsset`, `seatingZones`, `ticketTypeZoneMappings` fields. Ensure public detail includes only `ACTIVE` seating zones and excludes ticket-to-zone mappings whose seating zone is inactive. If any relation, field, or active filtering is missing from the catalog query or response type, add it.

## 13. Tests

- [x] 13.1 Create `packages/backend/src/concert-management/application/services/__tests__/svg-safety-validator.spec.ts` — unit tests: valid SVG passes, SVG with `<script>` rejected, SVG with `onclick` rejected, SVG with `javascript:` URL rejected, SVG with `<iframe>` rejected, SVG with `<object>` rejected, SVG with `<embed>` rejected, SVG with `<foreignObject>` rejected, SVG with external `href` rejected, SVG with `data:text/html` rejected, SVG with multiple violations returns all reasons.
- [x] 13.2 Create `packages/backend/src/concert-management/application/use-cases/__tests__/upload-seating-map.use-case.spec.ts` — unit tests using in-memory fakes: valid multipart SVG upload stores object and asset metadata including `publicUrl`, unsafe SVG rejected before storage, missing file rejected (controller-level but verify use case rejects empty buffer), non-SVG content type rejected, oversized SVG rejected, organizer cannot upload to non-owned concert, admin can upload to any concert, re-upload marks old asset archived and creates new one with a different unique storage key, repeated upload of the same file does not violate storage key uniqueness, checksum is SHA-256 of buffer.
- [x] 13.3 Create `packages/backend/src/concert-management/application/use-cases/__tests__/upsert-seating-zones.use-case.spec.ts` — unit tests: seating zones persist with svgElementId, duplicate svgElementId in same request rejected, upsert updates existing zone by svgElementId, zones not in request are preserved, color is optional, status defaults to `ACTIVE`, status can be updated to `INACTIVE`.
- [x] 13.4 Create `packages/backend/src/concert-management/application/use-cases/__tests__/update-ticket-type-zone-mappings.use-case.spec.ts` — unit tests: ticket type maps to one zone, ticket type maps to many zones, zone maps to many ticket types, cross-concert mapping rejected, empty seatingZoneIds clears mappings, ticket type not in concert rejected.
- [x] 13.5 Create `packages/backend/src/concert-management/adapters/http/__tests__/organizer-seating-map.controller.spec.ts` — integration tests: valid upload returns 200 with asset info, missing file returns 400, wrong content type returns 400, oversized file returns 400, unsafe SVG returns 400, non-owner returns 403, unauthenticated returns 401, seating zone upsert returns 200, zone mapping update returns 200.
- [x] 13.6 Verify public catalog detail returns updated seating map metadata, active zones, and mappings to active zones after upload — add assertion in existing or new catalog test, including an inactive zone that must not appear publicly.

## 14. Demo Evidence and Documentation

- [x] 14.1 Create Postman/manual demo evidence checklist: (1) Upload SVG via Postman: `POST /organizer/concerts/:id/seating-map`, Body → form-data → key `file` type File → select `.svg` file. (2) Verify response has asset metadata. (3) Verify object exists at local `data/uploads/{storageKey}` such as `data/uploads/seating-maps/{concertId}/{assetId}.svg` (if `STORAGE_DRIVER=local`) or in Cloudflare R2 bucket under the same `storageKey` (if `STORAGE_DRIVER=s3`). (4) Verify DB has asset record: `SELECT * FROM assets WHERE kind = 'SEATING_MAP'`. (5) Upsert seating zones via `PUT /organizer/concerts/:id/seating-zones`. (6) Map ticket types to zones via `PUT /organizer/concerts/:id/ticket-types/:typeId/zone-mappings`. (7) Verify public catalog detail `GET /concerts/:slug` returns seating map metadata, active zones, and active-zone mappings.
- [x] 14.2 Update `.env.example` with `SEATING_MAP_SVG_MAX_BYTES` if not done in task 2.3.

## 15. Verification

- [x] 15.1 Run `npm run lint` — no lint errors.
- [x] 15.2 Run `npm run build` — TypeScript compiles successfully.
- [x] 15.3 Run `npm run test` — all tests pass including new seating map tests and existing concert-management tests.
- [x] 15.4 Manual smoke test: start app with `STORAGE_DRIVER=local`, upload SVG via Postman, verify file in `data/uploads/`, verify DB record, verify public catalog response.
