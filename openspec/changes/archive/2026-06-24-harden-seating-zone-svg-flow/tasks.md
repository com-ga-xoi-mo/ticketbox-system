## 1. Domain layer — errors, types, ports

- [x] 1.1 Add new domain errors in `domain/seating-map.errors.ts`: `SeatingMapRequiredError`, `InvalidSvgElementIdError(invalidIds: string[])`, `ConcertNotDraftError`
- [x] 1.2 Update `domain/seating-map.types.ts`: add `SvgSanitizationResult` type (`{ sanitizedBuffer: Buffer, removedElements: string[] }`); add `SvgElementIdExtractionResult` type; update `UploadSeatingMapResult` to include `removedElements: string[]` and `extractedSvgElementIds: string[]`
- [x] 1.3 Update `domain/ports/seating-map-write.port.ts`: extend `CreateSeatingMapAssetData` to accept `metadata: { svgElementIds: string[] }`; ensure `createAssetAndAssociateConcertSeatingMap` signature accepts and persists metadata
- [x] 1.4 (READ path — blocking for D2) Extend the `SeatingMapAsset` domain type (`domain/seating-map.types.ts`) with `svgElementIds: string[]`; update `PrismaSeatingMapWriteRepository.toDomain` to map `metadata.svgElementIds` (default `[]`) so `findAssetById` surfaces the stored IDs for zone validation

## 2. SVG sanitizer (allowlist) — replaces denylist validator

- [x] 2.1 Install `linkedom` dependency in backend package (`pnpm --filter backend add linkedom`)
- [x] 2.2 Create `application/services/svg-sanitizer.ts`: implement `SvgSanitizer` class with `sanitize(buffer: Buffer): SvgSanitizationResult` method using allowlist approach — parse SVG with linkedom, walk DOM tree, remove disallowed elements and attributes, serialize back. Preserve `id` attributes. Allow `href`/`xlink:href` ONLY when value starts with `#` (local fragment); strip any external/absolute/`data:` ref. Restrict `url(...)` in `style`/presentation attrs to `url(#...)` local refs only. Return sanitized buffer and list of removed element/attribute types
- [x] 2.3 Create `application/services/svg-element-id-extractor.ts`: implement `SvgElementIdExtractor` class with `extract(svgContent: string): string[]` method — parse sanitized SVG, collect all element `id` attributes, return deduplicated array
- [x] 2.4 Write unit tests for `SvgSanitizer`: test script removal, event handler stripping, foreign element removal, id preservation, safe SVG passthrough, style sanitization
- [x] 2.5 Write unit tests for `SvgElementIdExtractor`: test extraction from `g`, `path`, `rect`, `circle` elements; empty SVG; SVG with no IDs; duplicate ID handling

## 3. Repository layer — zone reset on re-upload

- [x] 3.1 Update `PrismaSeatingMapWriteRepository.createAssetAndAssociateConcertSeatingMap`: within the existing `$transaction`, after swapping `seatingMapAssetId`, add `prisma.seatingZone.deleteMany({ where: { concertId } })` to delete all existing zones. Pass `metadata` to `prisma.asset.create`
- [x] 3.2 Write unit tests for the zone-reset behavior: verify zones deleted, TicketTypeZone cascade-deleted, TicketTypes preserved, metadata persisted in asset

## 4. Use case layer — upload hardening

- [x] 4.1 Update `UploadSeatingMapUseCase`: replace `SvgSafetyValidator` dependency with `SvgSanitizer` and `SvgElementIdExtractor`. After file metadata validation: (a) sanitize SVG, (b) extract element IDs from sanitized content, (c) recompute `checksum` and `sizeBytes` from the SANITIZED buffer (not the original), (d) pass sanitized buffer to storage and extracted IDs to repository as `metadata.svgElementIds`. Note: the original-file size limit check still runs against the uploaded bytes before sanitization
- [x] 4.2 Add draft-only guard to `UploadSeatingMapUseCase`: inject `ConcertWriteRepositoryPort` (authorize returns `void`, not the concert), call `findConcertById` after authorization, throw `ConcertNotDraftError` if status is not `DRAFT`
- [x] 4.3 Update existing `upload-seating-map.use-case.spec.ts`: add test cases for sanitizer integration, element ID extraction, draft guard rejection, zone reset verification

## 5. Use case layer — zone upsert hardening

- [x] 5.1 Update `UpsertSeatingZonesUseCase`: inject `ConcertWriteRepositoryPort` and `SeatingMapWriteRepositoryPort` as new dependencies. After authorization: (a) `findConcertById`, check status is `DRAFT` → throw `ConcertNotDraftError` if not, (b) check `concert.seatingMapAssetId` exists → throw `SeatingMapRequiredError` if null, (c) `findAssetById`, validate all `svgElementId` values are in the asset's `svgElementIds` (see task 1.4) → throw `InvalidSvgElementIdError` with invalid IDs if not. DTO stays unchanged (interpretation A: each submitted zone carries full fields; merge is collection-level)
- [x] 5.2 Write unit tests for `UpsertSeatingZonesUseCase`: test draft guard, seating map required, valid IDs pass, invalid IDs rejected, partial update preserves other zones, authorize fail

## 6. HTTP adapter layer — controllers, DTOs, error mapper

- [x] 6.1 Update `seating-map-error.mapper.ts`: add error mapping branches for `SeatingMapRequiredError` → `BadRequestException`, `InvalidSvgElementIdError` → `BadRequestException`, `ConcertNotDraftError` → `BadRequestException`
- [x] 6.2 Update `OrganizerSeatingMapController`: change `@Put('seating-zones')` to `@Patch('seating-zones')`. Keep body DTO and use case call unchanged
- [x] 6.3 Update `AdminConcertController`: change `@Put('concerts/:id/seating-zones')` to `@Patch('concerts/:id/seating-zones')`. Keep body DTO and use case call unchanged

## 7. Module wiring

- [x] 7.1 Update `concert-management.module.ts`: update `UploadSeatingMapUseCase` provider to inject `SvgSanitizer` and `SvgElementIdExtractor` instead of `SvgSafetyValidator`, AND add `CONCERT_WRITE_REPOSITORY` (for the draft guard, task 4.2) to its inject array + constructor. Register `SvgSanitizer` and `SvgElementIdExtractor` as providers
- [x] 7.2 Update `UpsertSeatingZonesUseCase` provider: add `CONCERT_WRITE_REPOSITORY` and `SEATING_MAP_WRITE_REPOSITORY` to inject array and constructor
- [x] 7.3 Remove `SvgSafetyValidator` provider registration (replaced by `SvgSanitizer`)

## 8. Verification

- [x] 8.1 Run `pnpm --filter backend build` — verify no compile errors
- [x] 8.2 Run `pnpm --filter backend test` — verify all existing and new tests pass
- [x] 8.3 Manual E2E verification: upload SVG for DRAFT concert → verify metadata contains extracted IDs; PATCH zones with valid IDs → success; PATCH zones with invalid ID → 400; upload new SVG → verify zones deleted; attempt upload on PUBLISHED concert → 400; attempt zone PATCH on PUBLISHED concert → 400
