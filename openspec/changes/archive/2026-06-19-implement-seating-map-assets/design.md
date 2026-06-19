## Context

TicketBox backend là NestJS modular monolith theo clean/hexagonal architecture. Module `concert-management` đã có đầy đủ:

- Controllers: `PublicConcertController`, `OrganizerConcertController`, `AdminConcertController`
- Use cases: CRUD concerts, ticket types, authorization
- Repositories: Prisma-based read/write cho concerts và ticket types
- Domain: errors, repository ports với injection tokens

Prisma schema đã có sẵn tất cả models cần thiết:
- `Concert` với `seatingMapAssetId` FK → `Asset`
- `SeatingZone` với `svgElementId`, `label`, `color`, `displayOrder`, `status`, unique constraint `(concertId, svgElementId)`
- `TicketTypeZone` bảng pivot many-to-many giữa `TicketType` và `SeatingZone`, composite PK `(ticketTypeId, seatingZoneId)`, có `concertId`
- `Asset` với `kind` enum (`SEATING_MAP`), `storageKey`, `contentType`, `sizeBytes`, `checksum`, `originalName`, `uploadedById`, `status`, `metadata`

Change `implement-cloud-object-storage` đã hoàn thành shared `ObjectStoragePort` tại `platform/storage/` với:
- `OBJECT_STORAGE` injection token (global via `StorageModule.forRoot()`)
- `putObject`, `getObject`, `deleteObject`, `objectExists`, `getPublicUrl`
- Local adapter (`STORAGE_DRIVER=local`) và S3 adapter (`STORAGE_DRIVER=s3`)
- Storage key convention: `{context}/{entityId}/{filename}`

`AuthorizeConcertManagementUseCase` đã có — kiểm tra `concert.createdById === userId` với `allowAdminOverride` support.

`PrismaConcertReadRepository.findBySlug()` đã include `seatingZones`, `ticketTypes` với `ticketTypeZones` → `seatingZone`, `posterAsset`, `seatingMapAsset` — public catalog detail đã trả đủ relations.

### Stakeholders
- **Member 2** (owner): Concert, Admin, Catalog
- **Downstream**: Public catalog consumers, frontend rendering seating map

## Goals / Non-Goals

**Goals:**
- Cho phép organizer upload file SVG seating map thật qua `multipart/form-data` endpoint
- Admin có thể upload seating map cho bất kỳ concert nào qua admin route
- Validate và reject unsafe SVG trước khi lưu vào storage
- Lưu SVG qua shared `ObjectStoragePort` — không tạo storage abstraction mới
- Persist asset metadata vào bảng `assets` với `AssetKind.SEATING_MAP`
- Associate asset với concert qua `concert.seatingMapAssetId`
- API tạo/cập nhật seating zones với `svgElementId`, `label`, `color`, `displayOrder`
- API map ticket types ↔ seating zones (many-to-many), reject cross-concert mapping
- Giữ clean hexagonal boundaries: controller không chứa business logic, domain không import Prisma/Multer/SDK

**Non-Goals:**
- Không implement direct browser-to-R2 upload / presigned URL
- Không dùng JSON `contentBase64` cho upload — chỉ `multipart/form-data`
- Không implement full drag-and-drop seating map editor
- Không implement checkout, reservation, payment
- Không implement Redis caching/invalidation (thuộc `implement-concert-caching`)
- Không redesign database — schema hiện tại đã đủ
- Không implement poster upload trong change này
- Không implement CDN caching, image resize

## Decisions

### 1. Multipart/form-data upload qua NestJS FileInterceptor + Multer memory storage

**Quyết định**: Sử dụng `@UseInterceptors(FileInterceptor('file'))` với Multer `memoryStorage()`. Controller nhận `@UploadedFile() file: Express.Multer.File`, extract `{ buffer, originalname, mimetype, size }` và truyền xuống application layer dưới dạng input đơn giản (không truyền `Express.Multer.File` vào use case).

**Request shape:**
```http
POST /organizer/concerts/:concertId/seating-map
Content-Type: multipart/form-data
Authorization: Bearer <jwt>

file = stadium-map.svg  (field name: "file", type: File)
```

**Controller transform:**
```typescript
// Controller chuyển Multer file thành application input
const input: UploadSeatingMapInput = {
  concertId,
  userId: user.userId,
  allowAdminOverride: false, // true for admin route
  fileBuffer: file.buffer,
  originalName: file.originalname,
  mimeType: file.mimetype,
  sizeBytes: file.size,
};
```

**Response shape (success 200):**
```json
{
  "asset": {
    "id": "uuid",
    "kind": "SEATING_MAP",
    "storageKey": "seating-maps/{concertId}/{assetId}.svg",
    "contentType": "image/svg+xml",
    "sizeBytes": 45230,
    "originalName": "stadium-map.svg",
    "checksum": "sha256:...",
    "publicUrl": "http://localhost:3000/storage/seating-maps/{concertId}/{assetId}.svg"
  },
  "concert": {
    "id": "uuid",
    "seatingMapAssetId": "uuid"
  }
}
```

**Error responses:**
- `400 Bad Request`: missing file, wrong content type, wrong extension, oversized, unsafe SVG
- `401 Unauthorized`: no/invalid JWT
- `403 Forbidden`: organizer không sở hữu concert
- `404 Not Found`: concert không tồn tại

**Multer limits:**
```typescript
FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: configService.seatingMapSvgMaxBytes },
})
```

**Lý do**: NestJS FileInterceptor là standard pattern. Memory storage tránh ghi file tạm ra disk — file SVG nhỏ (< 10MB typical), buffer trong memory chấp nhận được. Controller chỉ làm DTO transform, không validate SVG content.

**Alternatives considered:**
- *Disk storage + stream*: phức tạp hơn, cần cleanup temp files, không cần cho file nhỏ.
- *Custom middleware*: mất integration với NestJS DI/interceptor chain.
- *JSON base64 upload*: không standard cho file upload, bloat payload 33%.

### 2. SVG safety validation dùng string/regex parsing — reject-first approach

**Quyết định**: Tạo `SvgSafetyValidator` service trong application layer. Validator nhận `Buffer`, convert sang string, check blacklist patterns:

**Unsafe patterns (reject nếu tìm thấy):**

| Pattern | Lý do |
|---------|-------|
| `<script` tag | XSS execution |
| Event handlers: `on\w+=` (onclick, onload, onerror, onmouseover, ...) | XSS via inline handlers |
| `javascript:` URL | XSS via href/xlink:href |
| `<iframe` | Frame injection |
| `<object` | Embedded object |
| `<embed` | Embedded content |
| `<foreignObject` | Embed HTML/scripts inside SVG |
| External references: `xlink:href="http`, `href="http`, `url("http` | SSRF/data exfiltration |
| `data:text/html` | Data URL XSS |
| `<use` với external href | External SVG injection |

**Validation order:**
1. Check file exists (controller level)
2. Check MIME type === `image/svg+xml` (controller level)
3. Check extension === `.svg` (controller level)
4. Check size <= `SEATING_MAP_SVG_MAX_BYTES` (Multer limits + application double-check)
5. SVG safety check — string pattern matching (use case level, via `SvgSafetyValidator`)

**Lý do**: Full XML DOM parser (e.g., `DOMParser`, `xml2js`) thêm dependency và phức tạp hơn. Regex-based blacklist đủ cho use case reject-first: nếu SVG chứa bất kỳ unsafe pattern nào thì reject, không cần parse structure. Blueprint spec nói rõ "reject before storing" — không cần sanitize (strip tags), chỉ cần reject.

**Alternatives considered:**
- *DOMPurify + jsdom*: sanitize thay vì reject — phức tạp hơn, thêm 2 heavy dependencies, risk false positives khi strip valid SVG elements.
- *xml2js parse + traverse*: correct nhưng heavyweight, cần handle malformed XML edge cases.
- *Hybrid (regex reject + optional DOMPurify sanitize)*: có thể thêm sau nếu cần nhưng overkill cho phase này.

### 3. Storage key convention cho seating maps

**Quyết định**: Storage key pattern: `seating-maps/{concertId}/{assetId}.svg`

- `context` = `seating-maps` (kebab-case, plural)
- `entityId` = concert UUID
- `assetId` = UUID generated by the use case before upload; the same UUID is used as the new `Asset.id`
- extension is fixed to `.svg`

**Khi re-upload**: 
1. Generate new `assetId` and storage key `seating-maps/{concertId}/{assetId}.svg`
2. Upload object mới qua `ObjectStoragePort.putObject()`
3. Tạo asset record mới với `id = assetId`, `storageKey`, và `publicUrl = storage.getPublicUrl(storageKey)`
4. Update `concert.seatingMapAssetId`
5. Nếu concert đã có old asset → mark old asset `ARCHIVED` và best-effort xóa object cũ qua `ObjectStoragePort.deleteObject(oldKey)`

**Lý do**: `assets.storage_key` hiện unique trong Prisma schema. Nếu dùng fixed filename `map.svg`, re-upload cùng concert nhưng tạo asset record mới sẽ gây `P2002` unique constraint giống lỗi upload trùng ở AI artist bio. UUID key giúp mỗi asset record có storage key duy nhất, vẫn giữ được invariant mỗi concert chỉ trỏ tới 1 active seating map tại một thời điểm qua `concert.seatingMapAssetId`.

### 4. Asset persistence trong cùng transaction với concert update

**Quyết định**: Upload use case thực hiện trong 1 transaction:
1. `ObjectStoragePort.putObject()` — upload file (ngoài transaction vì là external call)
2. Prisma transaction:
   a. Tạo `Asset` record (`id`, `kind: SEATING_MAP`, `storageKey`, `publicUrl`, `contentType`, `sizeBytes`, `checksum`, `originalName`, `uploadedById`)
   b. Update `concert.seatingMapAssetId` = new asset ID
   c. Nếu có old asset → mark `status: ARCHIVED`
3. Nếu transaction fail → best-effort `deleteObject()` để cleanup orphan file

**Checksum**: SHA-256 hash của file buffer, stored dạng `sha256:{hex}`.

**Lý do**: Asset metadata và concert association phải atomic — nếu 1 fail thì rollback cả 2. Storage upload là external I/O nên nằm ngoài DB transaction, nhưng cleanup orphan file nếu DB fail.

### 5. Seating zone upsert API

**Quyết định**: Endpoint nhận array of zones, upsert by `(concertId, svgElementId)`:

**Request:**
```http
PUT /organizer/concerts/:concertId/seating-zones
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "zones": [
    { "svgElementId": "zone-vip", "label": "VIP", "color": "#FFD700", "displayOrder": 1, "status": "ACTIVE" },
    { "svgElementId": "zone-ga", "label": "General Admission", "displayOrder": 2 },
    { "svgElementId": "zone-cat1", "label": "CAT1", "color": "#4169E1", "displayOrder": 3, "status": "INACTIVE" }
  ]
}
```

**Response (200):**
```json
{
  "zones": [
    { "id": "uuid", "concertId": "uuid", "svgElementId": "zone-vip", "label": "VIP", "color": "#FFD700", "displayOrder": 1, "status": "ACTIVE" },
    ...
  ]
}
```

**Upsert logic**: Dùng `unique(concertId, svgElementId)` constraint. Nếu zone đã tồn tại với cùng `svgElementId` trong concert → update `label`, `color`, `displayOrder`. Nếu chưa tồn tại → create. Zones không có trong request payload sẽ không bị xóa (append/update only, không destructive).

**Validation:**
- `svgElementId` required, non-empty string
- `label` required, non-empty string
- `color` optional, hex color format nếu có
- `displayOrder` required, non-negative integer
- `status` optional, enum `ACTIVE | INACTIVE`, default `ACTIVE`
- Duplicate `svgElementId` trong cùng request → reject

**Lý do**: Upsert pattern phù hợp với workflow: organizer upload SVG, xem element IDs, rồi save zones. Append-only tránh mất zone đã có ticket type mappings.

### 6. Ticket-type-to-zone mapping API

**Quyết định**: Endpoint set mappings cho 1 ticket type:

**Request:**
```http
PUT /organizer/concerts/:concertId/ticket-types/:ticketTypeId/zone-mappings
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "seatingZoneIds": ["zone-uuid-1", "zone-uuid-2"]
}
```

**Response (200):**
```json
{
  "ticketTypeId": "uuid",
  "mappedZones": [
    { "seatingZoneId": "uuid", "svgElementId": "zone-vip", "label": "VIP" },
    { "seatingZoneId": "uuid", "svgElementId": "zone-cat1", "label": "CAT1" }
  ]
}
```

**Validation:**
- Tất cả `seatingZoneIds` phải thuộc cùng `concertId` với ticket type → reject cross-concert mapping
- Ticket type phải thuộc cùng `concertId` → reject nếu không match
- Empty array `[]` → xóa tất cả mappings cho ticket type đó

**Implementation**: Delete existing `TicketTypeZone` records cho ticket type, insert mới. Đơn giản hơn diff/merge.

**Lý do**: Replace-all pattern đơn giản cho UI — frontend gửi toàn bộ zone selection, backend replace. Tránh phức tạp add/remove individual mappings.

### 7. Authorization reuse pattern

**Quyết định**: Tất cả seating map/zone/mapping endpoints reuse `AuthorizeConcertManagementUseCase`:

```typescript
// Organizer route: allowAdminOverride = false
await this.authorizeConcertManagement.execute({
  concertId, userId, allowAdminOverride: false
});

// Admin route: allowAdminOverride = true
await this.authorizeConcertManagement.execute({
  concertId, userId, allowAdminOverride: true
});
```

**Lý do**: Không duplicate ownership logic. `AuthorizeConcertManagementUseCase` đã handle `ConcertNotFoundError` và `UnauthorizedConcertAccessError`.

### 8. Env config: `SEATING_MAP_SVG_MAX_BYTES`

**Quyết định**: Thêm `SEATING_MAP_SVG_MAX_BYTES` vào `env.schema.ts`:
```typescript
SEATING_MAP_SVG_MAX_BYTES: z.coerce.number().positive().default(5_242_880) // 5MB default
```

Getter trong `PlatformConfigService`:
```typescript
get seatingMapSvgMaxBytes(): number {
  return this.configService.get('SEATING_MAP_SVG_MAX_BYTES');
}
```

**Lý do**: Configurable per environment. Default 5MB đủ cho SVG seating map phức tạp. Multer `limits.fileSize` dùng giá trị này, application layer double-check.

### 9. Repository ports mới cho seating zones và asset write

**Quyết định**: Thêm repository ports trong concert-management domain:

```typescript
export const SEATING_MAP_WRITE_REPOSITORY = Symbol('SeatingMapWriteRepository');
export const SEATING_ZONE_REPOSITORY = Symbol('SeatingZoneRepository');
export const TICKET_TYPE_ZONE_REPOSITORY = Symbol('TicketTypeZoneRepository');

export interface SeatingZoneRepository {
  upsertMany(concertId: string, zones: UpsertSeatingZoneData[]): Promise<SeatingZone[]>;
  findByConcertId(concertId: string): Promise<SeatingZone[]>;
  findByIds(ids: string[]): Promise<SeatingZone[]>;
}

export interface SeatingMapWriteRepository {
  createAssetAndAssociateConcertSeatingMap(
    assetData: CreateAssetData,
    concertId: string,
    oldAssetId?: string,
  ): Promise<Asset>;
}

export interface TicketTypeZoneRepository {
  replaceForTicketType(concertId: string, ticketTypeId: string, seatingZoneIds: string[]): Promise<void>;
}
```

**Lý do**: Giữ hexagonal boundary — use case không biết Prisma. Repository port cho phép test với in-memory implementations.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Regex-based SVG validation có thể bỏ sót attack vector | Unsafe SVG lọt qua | Blacklist covers OWASP SVG attack vectors phổ biến. Future: thêm DOMPurify nếu cần. Assets served với `Content-Security-Policy` headers. |
| Multer memory storage giữ toàn bộ file trong memory | Memory spike với file lớn | `SEATING_MAP_SVG_MAX_BYTES` default 5MB — chấp nhận được. Multer `limits.fileSize` reject sớm trước khi đọc hết. |
| Upload file rồi DB transaction fail → orphan file trên storage | Wasted storage space | Best-effort `deleteObject()` trong catch block. Orphan files nhỏ (SVG), có thể cleanup định kỳ nếu cần. |
| Replace-all zone mappings xoá rồi insert → brief inconsistency | Concurrent reads thấy empty mappings | Thực hiện trong Prisma transaction — atomic. |
| Concurrent uploads cho cùng concert | Race condition tạo duplicate assets | Chấp nhận: last-write-wins. `concert.seatingMapAssetId` update cuối cùng thắng. Old assets marked ARCHIVED. |
| SVG element IDs phụ thuộc vào nội dung file | Frontend cần parse SVG để biết IDs | Đây là workflow expected: organizer upload SVG, frontend render và hiển thị element IDs, organizer chọn zones. Backend không tự extract IDs từ SVG. |
