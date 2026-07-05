## ADDED Requirements

### Requirement: Global Resale Feed Page

Hệ thống SHALL cung cấp trang `/resale` hiển thị tất cả ACTIVE resale listings từ mọi event trên nền tảng, không yêu cầu người dùng phải biết trước event cụ thể.

#### Scenario: Load global feed

- **WHEN** người dùng truy cập `/resale`
- **THEN** hệ thống hiển thị danh sách ACTIVE listings từ tất cả events, mặc định sort theo `trending`, 20 items/page với infinite scroll

#### Scenario: Filter theo concert

- **WHEN** người dùng nhập text vào search bar
- **THEN** feed chỉ hiển thị listings thuộc concerts có tên chứa text đó (case-insensitive)

#### Scenario: Filter theo khoảng giá

- **WHEN** người dùng nhập `priceMin` và/hoặc `priceMax`
- **THEN** feed chỉ hiển thị listings có `askingPriceVnd` trong khoảng đó

#### Scenario: Sort modes

- **WHEN** người dùng chọn tab sort (Trending / Newest / Giá tăng / Giá giảm)
- **THEN** feed re-fetch và hiển thị kết quả theo sort đó

### Requirement: Listing Card Hiển Thị Concert Context

Mỗi listing card trên global feed SHALL hiển thị thông tin concert (`concertTitle`, `concertStartsAt`) để người dùng biết vé thuộc event nào mà không cần navigate.

#### Scenario: Listing card context

- **WHEN** listing card render
- **THEN** hiển thị: tên concert, ngày/giờ sự kiện, loại vé, giá bán, giá gốc, seller name + trust tier, upvote count, comment count

### Requirement: Global Listing Detail Page

Hệ thống SHALL cung cấp trang `/resale/:listingId` hoạt động độc lập, không phụ thuộc vào `slug` của event.

#### Scenario: Direct access

- **WHEN** người dùng truy cập `/resale/:listingId`
- **THEN** trang hiển thị đầy đủ: chi tiết listing, upvote (SSE real-time), comment thread, nút mua, nút nhắn tin người bán

### Requirement: Route Redirect Backward Compatibility

Hệ thống SHALL redirect các routes cũ sang routes mới để không break bookmarks/links cũ.

#### Scenario: Old event resale route redirect

- **WHEN** người dùng truy cập `/events/:slug/resale`
- **THEN** hệ thống redirect sang `/resale`

#### Scenario: Old listing detail redirect

- **WHEN** người dùng truy cập `/events/:slug/resale/:listingId`
- **THEN** hệ thống redirect sang `/resale/:listingId`

### Requirement: Navbar Entry Point

Navbar SHALL có link "Resale" cạnh "Sự kiện" để người dùng có thể access `/resale` từ bất kỳ trang nào.

#### Scenario: Navbar link

- **WHEN** người dùng nhìn vào navbar (cả desktop và mobile menu)
- **THEN** thấy link "Resale" dẫn tới `/resale`

### Requirement: Event Detail Page CTA Update

Trang event detail SHALL có CTA "Xem vé resale" trỏ vào `/resale?concertId=<id>` thay vì `/events/:slug/resale`.

#### Scenario: Event resale CTA

- **WHEN** event có `resaleEnabled=true` và người dùng đang xem event detail
- **THEN** có button/link "Xem vé resale" navigate tới `/resale?concertId=<concertId>`
