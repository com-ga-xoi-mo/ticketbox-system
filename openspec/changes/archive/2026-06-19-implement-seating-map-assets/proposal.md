## Why

Change `implement-cloud-object-storage` vừa hoàn thành đã thiết lập shared `ObjectStoragePort` với local/Cloudflare R2 support. Theo `docs/team-change-plan.md`, Member 2 phụ trách Concert, Admin, Catalog — và change tiếp theo trong backlog là `implement-seating-map-assets`: cho phép organizer/admin upload file SVG seating map thật qua `multipart/form-data`, backend validate và reject SVG không an toàn trước khi lưu, lưu file qua shared storage, persist asset metadata vào bảng `assets`, associate asset với concert, tạo/cập nhật seating zones dựa trên `svgElementId`, và map ticket types vào seating zones. Đây là bước nối tiếp tự nhiên từ storage foundation sang feature-level asset management trong bounded context Concert Management.

## What Changes

- Thêm organizer route `POST /organizer/concerts/:concertId/seating-map` nhận `multipart/form-data` upload SVG seating map — chỉ concert owner mới được thao tác.
- Thêm admin route `POST /admin/concerts/:concertId/seating-map` — admin được thao tác mọi concert.
- Backend dùng NestJS `FileInterceptor('file')` / Multer memory storage để nhận file thật, đọc từ `file.buffer`, không ghi file tạm ra disk.
- Validate upload: bắt buộc có file, chỉ nhận `image/svg+xml`, chỉ nhận `.svg`, giới hạn size qua env `SEATING_MAP_SVG_MAX_BYTES`.
- SVG safety check: reject SVG chứa `<script>`, event handlers (`onclick`, `onload`, ...), external references (`xlink:href` URL ngoài, `<use href="http://..."`), `<iframe>`, `<object>`, `<embed>`, `javascript:` URL, hoặc nội dung nguy hiểm khác.
- Lưu SVG qua `ObjectStoragePort` (local hoặc Cloudflare R2 tuỳ `STORAGE_DRIVER`).
- Persist `AssetKind.SEATING_MAP` vào bảng `assets` với `storageKey`, `publicUrl`, `originalName`, `contentType`, `sizeBytes`, `checksum`, `uploadedById`.
- Associate asset với concert bằng cập nhật `concert.seatingMapAssetId`.
- Thêm API tạo/cập nhật seating zones cho concert: `svgElementId`, `label`, `color` (optional), `displayOrder`, `status` (optional, default `ACTIVE`).
- Thêm API map ticket types với seating zones: many-to-many, reject cross-concert mapping.
- Public catalog detail tiếp tục trả seating map asset metadata, active seating zones, và ticket-to-zone mappings tới active zones đúng với dữ liệu mới.
- Domain errors mới cho SVG validation failures, seating zone conflicts.
- Env config mới: `SEATING_MAP_SVG_MAX_BYTES`.

## Capabilities

### New Capabilities

_(Không tạo capability mới — tất cả requirements nằm trong concert-management)_

### Modified Capabilities

- `concert-management`: Thêm/refine requirements cho seating map SVG upload qua multipart/form-data, SVG safety validation, asset persistence, seating zone CRUD với `svgElementId`, và ticket-type-to-zone mapping management. Bổ sung admin route cho seating map upload bên cạnh organizer route.

## Impact

- **Code**: Thêm use cases (`UploadSeatingMapUseCase`, `UpsertSeatingZonesUseCase`, `UpdateTicketTypeZoneMappingsUseCase`), SVG validation service, domain errors, DTOs, controller endpoints, repository methods trong `packages/backend/src/concert-management/`.
- **Dependencies**: Không thêm runtime dependency mới — SVG validation dùng regex/string parsing đơn giản, không cần parser nặng. Nếu TypeScript thiếu type cho `Express.Multer.File`, có thể thêm `@types/multer` làm devDependency hoặc định nghĩa local upload-file type.
- **Configuration**: Thêm `SEATING_MAP_SVG_MAX_BYTES` vào `env.schema.ts` và `.env.example`.
- **Database**: Không thay đổi schema — bảng `assets`, `seating_zones`, `ticket_type_zones`, và `concerts.seating_map_asset_id` đã tồn tại trong Prisma schema hiện tại.
- **API**: Thêm 6 endpoints mới: organizer/admin upload seating map, organizer/admin upsert seating zones, organizer/admin update ticket-type-zone mappings. Public catalog detail không đổi endpoint, chỉ trả thêm dữ liệu khi có.
- **Storage**: Seating map SVGs lưu theo key convention `seating-maps/{concertId}/{assetId}.svg` qua shared `ObjectStoragePort` để mỗi upload có key duy nhất và không vi phạm unique constraint `assets.storage_key`.
