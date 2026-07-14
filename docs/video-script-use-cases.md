# TicketBox — Danh sách Use Case cho Video Demo

> Nguồn: tổng hợp từ `openspec/specs/*/spec.md` (76 capability) và `blueprint/proposal.md`.
> Mục đích: video nộp bài / bảo vệ đồ án. Chia theo actor. Mỗi video dự kiến 3-5 phút.
> Số trong ngoặc `(N scenario)` là số lượng scenario Gherkin trong spec — dùng để ước lượng độ nặng, không phải số phút.

---

## 1. KHÁN GIẢ (Audience)

### 1.1 Khám phá & tài khoản
- **audience-web-foundation** (36) — khung ứng dụng web audience, routing, layout chung
- **audience-homepage-discovery** (17) — trang chủ, gợi ý sự kiện
- **audience-event-search** (32) — tìm kiếm sự kiện
- **catalog-search-api** (27) — API tìm kiếm/lọc catalog
- **audience-event-detail** (45) — trang chi tiết concert
- **marketplace-homepage** (25) — trang chủ marketplace (nhiều loại sự kiện)
- **marketplace-event-types** (12) — phân loại loại sự kiện
- **marketplace-seo** (12) — SEO cho trang public
- **audience-concert-favorites** (5) — yêu thích / theo dõi concert
- **auth-registration** (7) — đăng ký tài khoản
- **auth-login** (9) — đăng nhập
- **audience-google-sign-in** (26) — đăng nhập bằng Google
- **jwt-token** (4) — phiên đăng nhập JWT
- **audience-account-profile** (19) — trang hồ sơ tài khoản
- **console-self-account-management** (10) — tự quản lý avatar/mật khẩu

### 1.2 Mua vé (luồng chính)
- **virtual-waiting-room** (25) — phòng chờ ảo khi nhu cầu cao
- **audience-checkout** (65) — luồng checkout
- **checkout-pricing-breakdown** (15) — chi tiết giá, phí dịch vụ
- **promotion-validation** (21) — mã khuyến mãi
- **audience-promo-ui** (15) — UI áp mã khuyến mãi
- **payment-reliability** (45) — VNPAY/MoMo, callback, idempotency, circuit breaker
- **ticket-purchase** (60) — vòng đời đơn hàng, giữ chỗ tồn kho, chống oversell
- **cancel-pending-order-api** (6) — hủy đơn pending

### 1.3 Sau khi mua
- **audience-order-history** (29) — lịch sử đơn hàng
- **audience-ticket-wallet** (36) — ví vé, QR code
- **ticket-gifting-api** (22) — API tặng vé
- **ticket-gifting-ui** (18) — UI tặng vé
- **concert-reviews** (22) — đánh giá concert sau khi tham dự
- **audience-notification-center** (10) — trung tâm thông báo
- **audience-support-center** (19) — hỗ trợ/khiếu nại
- **notification-delivery** (50) — gửi email/in-app, nhắc lịch 24h
- **global-notifications** (2) — thông báo toàn hệ thống

### 1.4 Cơ chế bán vé đặc biệt
- **presale-lottery** (44) — bốc thăm presale
- **official-waitlist** (23) — danh sách chờ khi sold-out

### 1.5 Chợ vé P2P (Resale marketplace)
- **resale-platform-hub** (10) — trang tổng resale
- **resale-marketplace** (26) — luồng chợ vé
- **ticket-resale-listing** (17) — đăng bán vé
- **listing-social-interactions** (18) — tương tác (bình luận/thích) trên listing
- **resale-direct-messaging** (16) — nhắn tin người mua-bán
- **resale-p2p-order** (20) — đơn hàng P2P
- **resale-transfer** (17) — chuyển nhượng vé
- **resale-dispute** (8) — khiếu nại/tranh chấp
- **seller-trust-profile** (14) — điểm uy tín người bán
- **seller-bank-profile** (7) — hồ sơ ngân hàng người bán (nhận tiền)
- **users-bank-profile-port** (7) — port truy cập hồ sơ ngân hàng (kỹ thuật)
- **resale-port-contracts** (7) — hợp đồng kiểu dữ liệu resale (kỹ thuật)
- **queue-resilience** (8) — độ bền hàng đợi xử lý resale (kỹ thuật)

---

## 2. NHÀ TỔ CHỨC (Organizer)

- **concert-management** (186) — CRUD concert, loại vé, cửa sổ mở bán
- **web-concert-management** (81) — màn hình quản lý concert (web)
- **venue-map-management** (1) — quản lý sơ đồ địa điểm
- **seating-zone-svg-hardening** (22) — upload/sanitize sơ đồ chỗ ngồi SVG
- **ai-artist-bio** (20) — upload PDF press kit → AI sinh tiểu sử nghệ sĩ → duyệt → publish
- **artist-discovery** (61) — trang khám phá nghệ sĩ (public-facing nhưng do organizer quản trị data)
- **guest-list-import** (41) — nhập CSV danh sách khách mời VIP (sponsor)
- **web-organizer-dashboard** (6) — dashboard tổng quan
- **analytics-dashboards** (3) — biểu đồ phân tích
- **analytics-reports** (3) — báo cáo xuất

---

## 3. NHÂN VIÊN SOÁT VÉ (Check-in staff)

- **checkin-mobile-app** (49) — app React Native: login, load assignment, UI quét QR
- **checkin-offline-sync** (104) — quét QR online/offline, hàng đợi, đồng bộ lại, chống trùng
- (VIP gate lookup thuộc **guest-list-import**, endpoint `POST /guest-list/lookup`)

---

## 4. ADMIN (Quản trị nền tảng)

- **identity-access** (57) — xác thực, RBAC, quản lý tài khoản admin
- **rbac-guards** (9) — guard phân quyền (kỹ thuật)
- **staff-management** (19) — tạo hàng loạt tài khoản check-in staff
- **platform-protection** (12) — rate limiting, chống bot/flood
- **project-governance** (6) — quy trình OpenSpec (không phải use case demo được)

---

## 5. KỸ THUẬT / HẠ TẦNG (không phải use case người dùng — dùng cho video "production-grade highlight")

- **shared-api-contracts** (116) — kiểu dữ liệu API dùng chung
- **cloud-object-storage** (34) — lưu trữ object (S3/R2)
- **location-geocoding** (30) — geocode địa chỉ venue (Nominatim)
- **domain-error-handling** (6) — chuẩn hóa lỗi domain → HTTP
- **encoding-hardening** (10) — xử lý UTF-8/tiếng Việt trong CSV, email
- **demo-seed-data** (12) — dữ liệu mẫu idempotent
- **submission-readiness** (26) — checklist nộp bài (README, seed, docker, test evidence)
- **web-app-shell** (16) — khung điều hướng console (dùng chung Organizer/Admin)
- **web-auth** (14) — xác thực phía console web (dùng chung Organizer/Admin)

---

## Tổng hợp nhóm video đề xuất

| Nhóm | Số video | Ghi chú |
|------|----------|---------|
| Audience | 9 (A1–A9) | A4 (mua vé) và A9 (resale) có thể cần 5-7 phút |
| Organizer | 4 (O1–O4) | |
| Check-in staff | 2 (S1–S2) | |
| Admin | 2-3 (Ad1–Ad3) | Ad3 (platform protection) tùy chọn |
| Highlight kỹ thuật | 1 | Chứng minh yêu cầu phi chức năng: chống oversell, idempotency, circuit breaker, cache, offline conflict |
| **Tổng** | **~18-19 video** | 3-5 phút/video |

---

## Bước tiếp theo

Khi bạn xác nhận danh sách này đã đủ/đúng, tôi sẽ viết script chi tiết (lời thoại + shot list + thao tác click cụ thể + dữ liệu demo cần chuẩn bị) cho từng video, theo đúng thứ tự trên.
