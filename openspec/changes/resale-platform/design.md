## Context

Resale listings hiện gắn chặt với event page (`/events/:slug/resale`). Người dùng chỉ có thể khám phá listings khi đã biết event cụ thể. Codebase đã có đầy đủ backend (feed API, SSE, DM WebSocket), frontend components (marketplace page, listing detail, comment thread, upvote) — chỉ cần tái tổ chức routing và nâng cấp feed API.

## Goals / Non-Goals

**Goals:**
- Platform `/resale` độc lập, hiển thị tất cả ACTIVE listings từ mọi event
- Filter: tìm theo tên concert, khoảng giá, sort mode
- `/resale/:listingId` thay thế `/events/:slug/resale/:listingId` — không còn phụ thuộc `slug`
- Navbar thêm "Resale" entry point
- Feed response bổ sung concert context (`concertTitle`, `concertSlug`, `concertStartsAt`) để hiển thị ngay trên listing card
- Redirect backward-compatible cho route cũ
- Event detail page giữ CTA "Xem vé resale" nhưng trỏ vào `/resale?concertId=<id>`

**Non-Goals:**
- Không thêm order book / price chart như exchange thật
- Không thay đổi backend purchase/transfer logic
- Không thêm authentication flow mới
- Không mobile app

## Decisions

### 1. Route strategy: thay thế hoàn toàn + redirect

`/events/:slug/resale` → redirect `302` sang `/resale?concertId=<id>` (cần fetch concertId từ slug trước khi redirect, hoặc đơn giản hơn: redirect sang `/resale` và để user filter).

Quyết định: Redirect `/events/:slug/resale` → `/resale` (đơn giản, không cần extra fetch), redirect `/events/:slug/resale/:listingId` → `/resale/:listingId`.

### 2. Backend: extend feed SQL, không tạo endpoint mới

`GET /resale/listings` hiện tại đã đủ — chỉ cần:
- JOIN `concerts` để lấy `title`, `slug`, `starts_at`
- Thêm optional WHERE clauses: `ILIKE` search trên `concert.title`, `BETWEEN` cho `asking_price_vnd`
- Backward compatible (tất cả params đều optional)

Không tạo `GET /resale` endpoint riêng vì sẽ duplicate logic.

### 3. Frontend: reuse components, không rewrite

`ResaleMarketplacePage` → đổi thành `ResalePlatformPage` (global, không cần `slug`/`concertId` bắt buộc).
`ResaleListingDetailPage` → giữ nguyên, chỉ update import path và bỏ dependency vào `slug`.
`CommentThread` → giữ nguyên.

### 4. Filter UI: collapsible filter panel, không modal

Theo pattern của Binance P2P: filter nằm trên đầu feed, search bar + price range inputs + sort tabs. Dùng shadcn `Input`, `Tabs`, inline — không dùng Dialog/Sheet để giữ listing feed luôn visible.

## Risks / Trade-offs

- [Redirect từ `/events/:slug/resale/:listingId` cần slug] → Không cần — `/resale/:listingId` hoàn toàn độc lập với slug, chỉ cần `listingId`
- [Concert search ILIKE trên large table] → Acceptable ở scale hiện tại; nếu cần scale thêm index `concerts.title`
- [Route cũ vẫn được bookmark] → Redirect xử lý, không break UX

## Migration Plan

1. Backend: cập nhật `getFeed` SQL — thêm concert JOIN + optional filters
2. Frontend: tạo `ResalePlatformPage` + `ResalePlatformListingDetailPage` tại routes mới
3. Router: thêm `/resale` và `/resale/:listingId`, thêm redirects cho routes cũ
4. Navbar: thêm "Resale" link
5. EventDetailPage: cập nhật CTA button
6. Không cần DB migration
