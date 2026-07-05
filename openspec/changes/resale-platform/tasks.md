## 1. Backend — Feed API Extension

- [ ] 1.1 Cập nhật `getFeed()` trong `prisma-resale-listing.repository.ts`: JOIN thêm `concerts` table để lấy `title`, `slug`, `starts_at`; alias thành `concertTitle`, `concertSlug`, `concertStartsAt` trong SELECT
- [ ] 1.2 Thêm optional WHERE clause cho `search`: `AND c.title ILIKE $N` khi param `search` được truyền vào
- [ ] 1.3 Thêm optional WHERE clauses cho `priceMin` / `priceMax`: `AND l.asking_price_vnd >= $N` và `AND l.asking_price_vnd <= $N`
- [ ] 1.4 Cập nhật `GetFeedUseCase` và controller `getFeedAction` nhận thêm `@Query('search')`, `@Query('priceMin')`, `@Query('priceMax')` và pass xuống repository
- [ ] 1.5 **Verify**: Gọi `GET /resale/listings` — response mỗi item có `concertTitle`, `concertSlug`, `concertStartsAt`. Gọi với `?search=anh` — chỉ trả listings đúng concert. Gọi với `?priceMin=100000&priceMax=500000` — filter đúng.

## 2. Frontend — Resale Platform Pages

- [ ] 2.1 Tạo `apps/audience-web/src/features/resale/ResalePlatformPage.tsx` — global feed, không cần `slug`/`concertId` bắt buộc; đọc `?concertId` từ URL search params nếu có để pre-filter
- [ ] 2.2 Implement filter panel trong `ResalePlatformPage`: search input (debounced 400ms), price range inputs (min/max), sort tabs (Trending/Newest/Giá↑/Giá↓)
- [ ] 2.3 Listing card hiển thị concert context: `concertTitle` + `concertStartsAt` formatted, ngoài seller info, giá, upvote/comment count
- [ ] 2.4 Wire upvote button trên listing card (reuse `useToggleUpvote`)
- [ ] 2.5 Tạo `apps/audience-web/src/features/resale/ResalePlatformListingDetailPage.tsx` — wrapper của `ResaleListingDetailPage` hiện tại nhưng back button trỏ về `/resale` thay vì `/events/:slug/resale`; hoặc refactor `ResaleListingDetailPage` để `backHref` là prop
- [ ] 2.6 Cập nhật `shared/api/resale.ts` — hook `useResaleFeed` thêm params `search?: string`, `priceMin?: number`, `priceMax?: number`

## 3. Router — Routes Mới và Redirects

- [ ] 3.1 Thêm route `/resale` → `ResalePlatformPage` vào `router.tsx`
- [ ] 3.2 Thêm route `/resale/:listingId` → `ResalePlatformListingDetailPage` vào `router.tsx`
- [ ] 3.3 Thêm redirect `/events/:slug/resale` → `/resale` (dùng `<Navigate>` hoặc loader redirect)
- [ ] 3.4 Thêm redirect `/events/:slug/resale/:listingId` → `/resale/:listingId`

## 4. Navigation — Navbar và Event Detail CTA

- [ ] 4.1 Thêm link "Resale" vào `NavLinks` trong `PublicLayout.tsx`, đặt cạnh "Sự kiện", trỏ tới `/resale`
- [ ] 4.2 Cập nhật `EventDetailPage.tsx`: đổi CTA button "Xem vé resale" từ link `/events/${slug}/resale` sang `/resale?concertId=${concert.id}`

## 5. Verify End-to-End

- [ ] 5.1 **Verify**: Truy cập `/resale` — feed hiển thị listings từ tất cả events, filter search + price range hoạt động, sort tabs đổi kết quả
- [ ] 5.2 **Verify**: Truy cập `/resale/:listingId` — trang chi tiết hoạt động hoàn toàn (upvote SSE, comment, DM, mua)
- [ ] 5.3 **Verify**: Truy cập `/events/:slug/resale` — redirect sang `/resale`; truy cập `/events/:slug/resale/:listingId` — redirect sang `/resale/:listingId`
- [ ] 5.4 **Verify**: Navbar có link "Resale"; event detail page CTA trỏ đúng URL
- [ ] 5.5 **Verify**: `npm run build` (backend) và `tsc --noEmit` (frontend) — không có lỗi
