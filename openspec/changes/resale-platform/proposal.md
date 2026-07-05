## Why

Hiện tại chức năng resale vé gắn liền với từng event page (`/events/:slug/resale`), khiến người dùng chỉ có thể xem listing khi đang ở trang event đó. Điều này hạn chế khả năng khám phá cơ hội mua vé resale trên toàn nền tảng — tương tự như việc P2P trading trên các sàn như OKX/Binance chỉ chạy khi người dùng đang xem một coin cụ thể. Cần tách resale thành một platform độc lập tại `/resale` để tối đa hóa liquidity và trải nghiệm người mua.

## What Changes

- **New**: Trang `/resale` — global resale marketplace feed, hiển thị tất cả ACTIVE listings từ mọi event, có filter theo event/concert, loại vé, khoảng giá, sort (trending, newest, price_asc, price_desc)
- **New**: Trang `/resale/:listingId` — trang chi tiết listing độc lập, thay thế `/events/:slug/resale/:listingId`
- **BREAKING**: Route `/events/:slug/resale` và `/events/:slug/resale/:listingId` được redirect sang `/resale` và `/resale/:listingId`
- **Modified**: Navbar thêm link "Resale" cạnh "Sự kiện"
- **Modified**: Event detail page thêm banner/CTA trỏ vào `/resale?concertId=<id>` thay vì vào page riêng
- **Modified**: Backend `GET /resale/listings` bổ sung filter `search` (tìm theo tên event/concert), `priceMin`, `priceMax`, `ticketTypeId` để hỗ trợ filter nâng cao
- **Modified**: Feed response bổ sung `concertTitle`, `concertSlug`, `concertStartsAt` cho mỗi listing (để hiển thị context event mà không cần navigate)

## Capabilities

### New Capabilities

- `resale-platform-hub`: Trang `/resale` — global marketplace feed với multi-filter (event search, price range, sort), infinite scroll, upvote real-time qua SSE, và trang `/resale/:listingId` chi tiết độc lập với comment thread, DM, purchase flow

### Modified Capabilities

- `resale-marketplace`: Feed API bổ sung filters `search`, `priceMin`, `priceMax`; response thêm `concertTitle`, `concertSlug`, `concertStartsAt` per listing

## Impact

- **Frontend**: Thêm 2 routes mới (`/resale`, `/resale/:listingId`), redirect 2 routes cũ, cập nhật `PublicLayout` navbar, cập nhật `EventDetailPage` CTA
- **Backend**: Cập nhật `GET /resale/listings` query SQL — thêm filter params + join concert để lấy `title`, `slug`, `startsAt`
- **Router**: `router.tsx` thêm routes, đổi redirect
- **Không breaking với backend**: Chỉ thêm optional query params, response fields mới — backwards compatible
