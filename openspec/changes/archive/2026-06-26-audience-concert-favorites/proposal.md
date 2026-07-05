## Why

Khán giả (Audience) cần tính năng thả tim / lưu lại (Favorite) các sự kiện mà họ quan tâm để có thể dễ dàng xem lại sau trong hồ sơ cá nhân. Điều này giúp họ không bỏ lỡ các sự kiện mình yêu thích và tiện lợi hơn trong việc ra quyết định mua vé sau này.

## What Changes

- Thêm model `FavoriteConcert` vào Database Schema để lưu trữ quan hệ giữa `User` và `Concert`.
- Bổ sung module `favorites` ở Backend với kiến trúc Hexagonal Architecture.
- Thêm endpoints HTTP để thêm/xóa khỏi danh sách yêu thích, lấy danh sách đã lưu, và kiểm tra trạng thái thả tim.
- Cập nhật UI ở ứng dụng Audience Web: Thêm icon Trái tim vào `ConcertCard`, trang `EventDetailPage`, và tạo thêm trang `/me/favorites` quản lý sự kiện đã yêu thích.

## Capabilities

### New Capabilities
- `audience-concert-favorites`: Khả năng lưu trữ, quản lý và hiển thị danh sách các sự kiện mà khán giả yêu thích.

### Modified Capabilities

## Impact

- **Database:** Bổ sung thêm bảng `favorite_concerts` và cập nhật relation ở `users`, `concerts`.
- **Backend API:** Thêm các endpoint mới `/me/favorites/*`, không thay đổi hay breaking các API hiện có.
- **Frontend UI:** Thay đổi component `ConcertCard` và `EventDetailPage`, cần quản lý UI state cho nút yêu thích.
