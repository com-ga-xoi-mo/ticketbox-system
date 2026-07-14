## Why

Hiện tại luồng Virtual Waiting Room sẽ giải phóng (release) slot chờ của người dùng ngay lập tức khi họ bấm "Thanh toán" và tạo đơn hàng (`PENDING_PAYMENT`). Điều này khiến hệ thống đưa thêm người dùng mới vào hàng chờ trong lúc những người cũ đang tiến hành thanh toán, có thể gây ra trải nghiệm xấu: người mới vào thấy hết vé do toàn bộ số lượng vé đang bị "khóa" tạm thời trong 15 phút của quy trình thanh toán.
Việc giữ slot của người dùng trong suốt quá trình thanh toán (cho đến khi thành công hoặc bị hủy) sẽ đảm bảo giới hạn `maxConcurrency` thực sự phản ánh số người đang tranh vé, tránh đưa thêm người vào khi vé đã bị giữ hết.

## What Changes

- Xoá lệnh giải phóng slot chờ (`waitingRoomAdmissionPort.release`) bên trong `CreateOrderUseCase` khi đơn hàng vừa được khởi tạo.
- Thêm lời gọi `releaseAdmissionSlot` ở các Use Cases hoàn tất thanh toán (như `IssueTicketsForPaidOrderUseCase`) và hủy đơn hàng (`CancelOrderUseCase`, `ExpireOrderUseCase` nếu có, hoặc worker xử lý timeout).
- Cập nhật tài liệu thiết kế (spec) cho quy trình quản lý trạng thái của hàng chờ.

## Capabilities

### New Capabilities
- Không có.

### Modified Capabilities
- `virtual-waiting-room`: Thay đổi vòng đời của một slot chờ, kéo dài thời gian nắm giữ slot cho tới khi thanh toán kết thúc hoặc đơn hàng bị hủy/hết hạn.

## Impact

- **Affected code**: `packages/backend/src/ordering/application/use-cases/create-order.use-case.ts`, `packages/backend/src/ordering/application/use-cases/issue-tickets-for-paid-order.use-case.ts`, `packages/backend/src/ordering/application/use-cases/cancel-order.use-case.ts`, `packages/backend/src/ordering/application/use-cases/expire-pending-orders.use-case.ts` (và tương đương).
- **APIs**: Không thay đổi API hợp đồng (contracts).
- **Systems**: Ảnh hưởng đến trải nghiệm hàng chờ; người dùng có thể phải đợi lâu hơn (vì slot bị chiếm trong 15 phút chờ thanh toán), nhưng bù lại họ có cơ hội mua vé cao hơn khi được admission (không bị tình trạng "hết vé ảo" do vé đang bị lock).
