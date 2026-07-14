# TicketBox Submission Validation Report

## 1. Requirement-to-Evidence Matrix

| Requirement Area | Classification | Implementation Path | Test/Evidence Path |
| :--- | :--- | :--- | :--- |
| **No-Oversell (Concurrent SVIP)** | Automated | `backend/src/ordering/infrastructure/database/prisma-inventory-reservation.repository.ts` | `backend/src/ordering/infrastructure/database/prisma-inventory-reservation.repository.spec.ts` |
| **Per-User Limits Under Load** | Automated | `backend/src/ordering/infrastructure/database/prisma-inventory-reservation.repository.ts` | `backend/src/ordering/application/use-cases/create-order.use-case.spec.ts` |
| **Traffic Spike Protection** | Automated | `backend/src/platform/rate-limiting/rate-limit.interceptor.ts` | `backend/src/platform/rate-limiting/rate-limit-route-metadata.spec.ts` |
| **Public Caching (Catalog)** | Automated | `backend/src/concert-management/application/cache/concert-cache-decorators.ts` | `backend/src/concert-management/application/cache/concert-cache-decorators.spec.ts` |
| **Payment Instability (Circuit Breaker)** | Automated | `backend/src/payment/infrastructure/redis/redis-payment-circuit-breaker.ts` | `backend/src/payment/infrastructure/redis/redis-payment-circuit-breaker.spec.ts` |
| **Duplicate Payment Prevention** | Automated | `backend/src/payment/infrastructure/redis/redis-payment-idempotency.store.ts` | `backend/src/payment/infrastructure/redis/redis-payment-idempotency.store.spec.ts` |
| **Offline Check-in / Sync** | Automated | `backend/src/checkin/application/use-cases/batch-sync.use-case.ts` | `backend/src/checkin/application/use-cases/batch-sync.use-case.spec.ts` |
| **CSV VIP Guest List Import** | Automated | `packages/backend/src/guest-list-import/application/use-cases/process-guest-list-import.use-case.ts` | `packages/backend/src/guest-list-import/application/use-cases/guest-list-use-cases.spec.ts`, `test/guest-list/guest-list.e2e-spec.ts` |
| **Admin Guest List UI** | Automated + Manual | `apps/web/src/features/admin/guest-list/` | `apps/web/src/features/admin/guest-list/*.spec.ts*` |
| **Mobile VIP Lookup** | Automated + Manual | `apps/checkin-mobile/src/features/vip-lookup/` | `apps/checkin-mobile/src/features/vip-lookup/*.spec.ts`, `apps/checkin-mobile/src/api/http-checkin-mobile-api-client.spec.ts` |
| **Notification Delivery (QR Email)** | Automated | `backend/src/notification/application/use-cases/deliver-notification.use-case.ts` | `backend/src/notification/purchase-confirmation-qr-delivery.integration.spec.ts` |
| **AI Artist Bio Generation** | Automated + Manual | `packages/backend/src/ai-artist-bio/` (pdf-validation, `infrastructure/pdf/`, `infrastructure/ai/gemini-artist-bio-generator.adapter.ts`, `infrastructure/queue/artist-bio.processor.ts`), `apps/web/src/features/artist-bio/` | `packages/backend/src/ai-artist-bio/**/*.spec.ts`, `apps/web/src/features/artist-bio/*.spec.*`, `docs/manual-tests/ai-artist-bio.md` |
| **RBAC / Security Boundaries** | Automated | `backend/src/identity/adapters/http/guards/roles.guard.ts` | `test/checkin/shared-api-contract-flow.integration.spec.ts` |
| **Database Migrations & Setup** | Automated | `prisma/migrations` | `npm run build:prisma` (Setup) |
| **Seed Data** | Automated | `prisma/seed.ts` | `npm run seed` |
| **Demo Readiness** | Manual | `docs/README.md` | Manual Video Demo |

## 2. Automated Evidence Commands

Before running tests, ensure Docker dependencies are running:
```bash
npm run start:deps  # PostgreSQL, Redis, Maildev
npm run build:api-types
```

### 2.1 Concurrency & Integrity
```bash
npx vitest run packages/backend/src/ordering/infrastructure/database/prisma-inventory-reservation.repository.spec.ts packages/backend/src/ordering/application/use-cases/create-order.use-case.spec.ts
```
**Mục tiêu (Pass Criteria):** Đảm bảo vé SVIP không bao giờ bán lố (no-oversell) và giới hạn mỗi user không bị vượt qua dù gọi API đồng thời (concurrent checkouts). 

### 2.2 Payment Reliability & Protection
```bash
npx vitest run packages/backend/src/payment/infrastructure/redis/redis-payment-circuit-breaker.spec.ts packages/backend/src/payment/infrastructure/redis/redis-payment-idempotency.store.spec.ts packages/backend/src/payment/application/use-cases/process-simulator-payment-callback.use-case.spec.ts packages/backend/src/platform/rate-limiting/rate-limit-route-metadata.spec.ts packages/backend/src/concert-management/application/cache/concert-cache-decorators.spec.ts
```
**Mục tiêu (Pass Criteria):** Rate Limit áp dụng đúng policies. Circuit Breaker ngắt kết nối khi lỗi. Không bị duplicate payment.

### 2.3 Offline Check-in & Sync
```bash
npx vitest run packages/backend/src/checkin/application/use-cases/batch-sync.use-case.spec.ts apps/checkin-mobile/src/features/offline-queue/sync-service.spec.ts
```
**Mục tiêu (Pass Criteria):** Đồng bộ batch offline không gây duplicate check-in, map đúng vé.

### 2.4 CSV Import
```bash
npm run test:api-types
npx vitest run packages/backend/src/guest-list-import/adapters/http/admin-guest-list.controller.spec.ts packages/backend/src/guest-list-import/adapters/http/admin-guest-list.mapper.spec.ts packages/backend/src/guest-list-import/application/use-cases/guest-list-use-cases.spec.ts
npm run verify:web
npm run verify:checkin-mobile
npx vitest run test/guest-list/guest-list-database.integration.spec.ts test/guest-list/guest-list.e2e-spec.ts
```
**Mục tiêu (Pass Criteria):** Shared contracts và public mapper không lộ storage/lease fields; ADMIN upload Base64 tạo canonical batch; cùng file trả `IDEMPOTENT_DUPLICATE`; worker/use case xử lý partial row failure; report reconciliation đúng; chỉ assigned CHECKIN_STAFF lookup được VIP active; invalid header thất bại atomically.

Test `test/guest-list/guest-list-database.integration.spec.ts` chứng minh scheduled integration riêng: tệp dưới `data/guest-list-inbox/<concertId>/*.csv` được discovery/archiving theo convention. Test và UI không cần nút discovery thủ công.

### 2.5 AI Artist Bio
```bash
npx vitest run packages/backend/src/ai-artist-bio/
npx vitest run --root apps/web apps/web/src/features/artist-bio
```
**Mục tiêu (Pass Criteria):** PDF hợp lệ được chấp nhận, PDF giả (sai đuôi, sai content-type, sai chữ ký nhị phân `%PDF-`, vượt dung lượng) bị từ chối trước khi lưu file; job chuyển `DRAFT → PROCESSING → READY_FOR_REVIEW`; PDF lỗi/không trích được text đưa job sang `FAILED` kèm `errorMessage` và retry backoff mũ 2 (tối đa 15 phút) tới `maxAttempts`; bio chỉ công khai sau khi organizer/admin bấm publish (chống hallucination); UI panel render đúng theo từng trạng thái.

Test chạy được **không cần API key**: `AiBioGeneratorPort` có adapter Gemini và một bộ sinh cục bộ tất định (deterministic fallback) tự động dùng khi không cấu hình key hoặc khi provider lỗi — xem `infrastructure/ai/artist-bio-generator.provider.ts`.

### 2.6 Tests Intentionally Not Run Automatically
- **Real VNPay/MoMo E2E:** Yêu cầu sandbox keys và UI interaction. Sử dụng Unit/Simulator thay thế.
- **Gemini live API:** Không gọi API thật trong test tự động. Pipeline được kiểm thử qua deterministic fallback; muốn chạy với Gemini thật thì đặt `GEMINI_API_KEY` rồi làm theo `docs/manual-tests/ai-artist-bio.md`.

## 3. Manual Checklists

### 3.1 VNPay Sandbox
- [ ] Môi trường: Sandbox VNPAY.
- [ ] IPN URL thiết lập trỏ về ngrok.
- [ ] Gen link thanh toán đúng signature.
- [ ] Thanh toán giả lập thành công.
- [ ] IPN callback cập nhật order status = PAID.
- [ ] Vé QR sinh ra.

### 3.2 MoMo Sandbox
- [ ] Môi trường: MoMo Sandbox.
- [ ] Redirect thanh công.
- [ ] IPN callback xác thực signature và update trạng thái.

### 3.3 Email Notification (Maildev)
- [ ] Bật `maildev`.
- [ ] Chốt đơn hàng, `deliver-notification` gửi email.
- [ ] Xem email trên maildev.
- [ ] QR Code đính kèm hợp lệ.

### 3.4 Frontend UX
- [ ] Chọn ghế, Checkout, hiển thị QR ticket.
- [ ] Tạo sự kiện, Dashboard Analytics.
- [ ] Admin duyệt sự kiện.

### 3.5 Mobile/Offline Check-in
- [ ] App đăng nhập staff.
- [ ] Tải dữ liệu Ticket Cache.
- [ ] Quét QR online.
- [ ] Ngắt mạng (Offline) -> Offline Queue.
- [ ] Mở mạng -> Tự động Background Sync lên server. Không duplicate.

### 3.6 Admin Guest List và Mobile VIP Lookup

- [ ] Chạy API, worker, web và mobile sau khi `npm run start:deps`, migrate và seed database.
- [ ] Đăng nhập `admin@ticketbox.test`, mở một concert rồi vào `/admin/concerts/<concertId>/guest-list`.
- [ ] Tải `guest-list-template.csv`, bổ sung một row VIP hợp lệ và một row lỗi, sau đó upload.
- [ ] Quan sát `PENDING`/`PROCESSING` chuyển sang `COMPLETED_WITH_ERRORS`; polling phải dừng khi terminal.
- [ ] Kiểm tra counters, failure evidence từng row và tải report JSON.
- [ ] Upload lại đúng cùng nội dung; UI phải báo canonical `IDEMPOTENT_DUPLICATE`, không tạo logical import thứ hai.
- [ ] Upload một CSV sai header; batch phải `FAILED`, không có report action và không thay đổi active guest projection.
- [ ] Đặt một CSV riêng dưới `data/guest-list-inbox/<concertId>/*.csv`; worker phải tự discovery theo `GUEST_LIST_DISCOVERY_CRON` mà không dùng nút trên UI.
- [ ] Đăng nhập mobile bằng `staff@ticketbox.test`, chọn đúng assignment, mở tab VIP và tìm guest active bằng email/phone/external ref.
- [ ] Tắt mạng: nút VIP lookup phải bị disable và request không xuất hiện trong offline scan queue.
- [ ] Dùng sai assignment hoặc guest đã cancel/không tồn tại: UI phải hiển thị forbidden hoặc not-found, không ghi nhận check-in.

Nếu PostgreSQL, Redis, worker hoặc emulator/device không sẵn sàng, ghi rõ bước nào bị block. Không suy diễn focused unit tests thành bằng chứng E2E/manual đã pass.

## 4. Gap Analysis

Các yêu cầu chức năng (Blueprint BP01–BP15, Cài đặt IM01–IM18) đã hoàn thành và có bằng chứng; xem mục 1 và 2.

- ~~**AI Artist Bio Generation:** Chưa có test evidence hoàn chỉnh.~~ **Đã đóng.** OpenSpec change `implement-ai-artist-bio` (archive `2026-06-18-implement-ai-artist-bio`) đã hoàn thành, cùng `2026-06-24-fix-artist-bio-bugs` và `2026-07-14-artist-bio-ai-press-kit`. Pipeline, worker, UI panel và test đầy đủ — chạy theo mục 2.5.

**Gap còn lại (không phải code — thuộc khâu nộp bài):**
- **Google Drive nộp bài:** chưa tạo thư mục public.
- **blueprint.pdf trên Drive:** Blueprint đã có trong repo (`blueprint/design.md`, `proposal.md`, `specs/`) nhưng chưa xuất PDF và tải lên Drive.
- **Gói `src/` + `data/` + `README.md` trên Drive:** đã có trong repo, chưa đóng gói lên Drive.
- **`clips/` video demo:** chưa quay (MP4 1080p, ~720 kbps, có camera thành viên và demo trực tiếp).
- **File text nộp LMS:** `{mã-nhóm}_{mssv1}_{mssv2}_{mssv3}_{mssv4}.txt` chứa link Drive — chưa tạo.
