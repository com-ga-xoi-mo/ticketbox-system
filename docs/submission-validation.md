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
| **CSV VIP Guest List Import** | Automated | `backend/src/guest-list-import/application/use-cases/guest-list-use-cases.ts` | `backend/src/guest-list-import/application/use-cases/guest-list-use-cases.spec.ts` |
| **Notification Delivery (QR Email)** | Automated | `backend/src/notification/application/use-cases/deliver-notification.use-case.ts` | `backend/src/notification/purchase-confirmation-qr-delivery.integration.spec.ts` |
| **AI Artist Bio Generation** | Gap | `N/A` | `N/A` |
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
npx vitest run packages/backend/src/guest-list-import/application/use-cases/guest-list-use-cases.spec.ts
```
**Mục tiêu (Pass Criteria):** Bỏ qua row lỗi, không duplicate khách mời, xử lý import 1 chiều.

### 2.5 Tests Intentionally Not Run Automatically
- **Real VNPay/MoMo E2E:** Yêu cầu sandbox keys và UI interaction. Sử dụng Unit/Simulator thay thế.
- **AI Integration Tests:** Yêu cầu OpenAI API keys.

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

## 4. Gap Analysis
- **AI Artist Bio Generation:** Chưa có test evidence hoàn chỉnh, cần OpenSpec change riêng (`implement-ai-artist-bio`).
