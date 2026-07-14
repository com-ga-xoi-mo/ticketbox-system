## Context

Trong hệ thống bán vé, Virtual Waiting Room đóng vai trò điều tiết số lượng người mua (concurrency) vào trang chi tiết sự kiện và thực hiện việc chọn vé. Số người này được quản lý qua khái niệm "Active" (đang thao tác). 
Tuy nhiên, hiện tại slot chờ của một user bị huỷ (release) ngay lập tức khi họ bấm "Thanh toán" (lúc gọi `CreateOrderUseCase`). Thời điểm này user bắt đầu được giữ vé (reserve inventory) trong 15 phút, nhưng lại không chiếm slot phòng chờ nữa. Do đó, hệ thống sẽ đẩy lượng lớn người dùng mới vào hàng chờ. Nếu lượng vé đã bị giữ hết, những người này sẽ thấy "Hết vé". Điều này gây ra trải nghiệm "hết vé ảo" tồi tệ.

## Goals / Non-Goals

**Goals:**
- Thay đổi thời điểm release slot chờ: từ lúc bắt đầu thanh toán (tạo đơn) sang lúc KẾT THÚC thanh toán (hoặc khi đơn hàng bị hủy/hết hạn).
- Đảm bảo giới hạn `maxConcurrency` thực sự phản ánh số người dùng đang ở trong quá trình mua vé (bao gồm cả việc chọn vé lẫn thanh toán).

**Non-Goals:**
- Không thay đổi thuật toán xếp hàng (Queue/Priority) của phòng chờ.
- Không thay đổi thời gian giữ vé (reservation TTL) hiện tại là 15 phút.

## Decisions

1. **Tạo mới hàm `consumeAndHoldSlot` trong `WaitingRoomAdmissionPort`:**
   - Tại `CreateOrderUseCase`, thay vì gọi `release()`, ta sẽ gọi `consumeAndHoldSlot({ concertId, userId, holdTtlMinutes: this.reservationTtlMinutes })`.
   - Hành vi của hàm này ở tầng Redis sẽ gồm 2 việc:
     - **Xoá Admission Token:** Để tránh lỗ hổng người dùng mở nhiều tab checkout thêm các đơn hàng khác bằng cùng một token.
     - **Gia hạn thời gian (Extend TTL) trong Active Set:** Tự động điều chỉnh score của `userId` trong Redis ZSet `active:${concertId}` thành `now + holdTtlMinutes`. Tham số `holdTtlMinutes` được lấy động từ cấu hình (thường là 15 phút) giúp hệ thống đồng bộ TTL mà không phải hardcode.

2. **Bổ sung lệnh release slot tại các Use Case liên quan đến kết thúc quá trình thanh toán:**
   - `IssueTicketsForPaidOrderUseCase`: Gọi `release()` khi người dùng thanh toán thành công để nhả slot sớm.
   - `CancelOrderUseCase` / `CancelPendingOrderUseCase`: Gọi `release()` khi đơn hàng bị huỷ sớm.
   - Các job dọn dẹp đơn hết hạn: Token trên Redis sẽ tự động hết hạn cùng lúc với đơn hàng, worker `reclaimExpired` của phòng chờ sẽ tự xoá user khỏi hàng chờ một cách an toàn. Mọi thứ tự động đồng bộ.

3. **Gia hạn `admissionTtlSeconds` nếu cần thiết:**
   - Vì user chiếm slot trong suốt quá trình thanh toán, chúng ta cần chắc chắn TTL của admission token trên Redis ít nhất phải bằng hoặc lớn hơn thời gian giữ vé (ví dụ 15 phút). Quyết định này sẽ do System Admin/Organizer thiết lập trên cấu hình, tuy nhiên hệ thống có thể cần tự gia hạn (extend TTL) khi tạo đơn hàng nếu thời gian còn lại không đủ 15 phút. Trong phạm vi thiết kế này, trước mắt chúng ta có thể gọi hàm `waitingRoomAdmissionPort.extend()` nếu có, hoặc để cấu hình TTL đủ dài. (Quyết định: Không thay đổi logic TTL hiện tại, chỉ thay đổi luồng release).

## Risks / Trade-offs

- **Risk:** Lượng người chờ bên ngoài sẽ phải đợi lâu hơn. 
  **Trade-off:** Trải nghiệm chờ lâu nhưng khi vào được là CÓ VÉ vẫn tốt hơn là vào nhanh nhưng thấy "Hết vé" rồi lại phải chờ người khác nhả vé ra.
- **Risk:** Nếu user thanh toán bằng trình duyệt khác hoặc tắt tab ngang, lệnh huỷ đơn/nhả slot có thể không được gọi ngay.
  **Mitigation:** `admissionTtlSeconds` của token trong Redis sẽ tự động hết hạn, đồng thời có cron job dọn dẹp các đơn hàng PENDING quá 15 phút sẽ hỗ trợ nhả slot.
