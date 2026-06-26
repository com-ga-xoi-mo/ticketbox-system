## Context

Audience members cần khả năng đánh dấu các sự kiện họ quan tâm để xem lại sau. Hiện tại dự án đang sử dụng kiến trúc Hexagonal Architecture cho Backend và React/Vite cho Frontend.

## Goals / Non-Goals

**Goals:**
- Tích hợp model `FavoriteConcert` vào hệ thống Database hiện tại (Prisma).
- Xây dựng module `favorites` ở Backend đúng chuẩn Hexagonal Architecture (Port/Adapter).
- Xây dựng giao diện UI ở Frontend để tương tác trực quan (Thả tim).

**Non-Goals:**
- Không gửi notification/email tự động khi một sự kiện được favorite mở bán.
- Không chia sẻ danh sách favorite cho user khác xem (chỉ mang tính chất cá nhân).

## Decisions

- **Kiến trúc Module Backend:** Tạo thư mục `packages/backend/src/favorites/` mới thay vì gộp chung vào `identity` hay `ordering`. Điều này giữ tính độc lập cho chức năng Favorites.
- **Port/Adapter Pattern:** Sẽ định nghĩa `FavoriteRepositoryPort` trong `domain` và implement bằng `PrismaFavoriteRepository` ở `infrastructure/database`. Controller (Adapter) sẽ gọi UseCases.
- **Phân trang (Pagination):** API GET `/me/favorites` hiện tại sẽ không yêu cầu phân trang phức tạp (vì một user thường không favorite hàng trăm sự kiện), nhưng có thể sort theo `createdAt` desc.

## Risks / Trade-offs

- **Risk:** Query N+1 khi lấy danh sách sự kiện yêu thích kèm thông tin poster.
- **Mitigation:** Sử dụng `include` hợp lý trong Prisma để join bảng `Concert` và `Asset` trong 1 query duy nhất.
