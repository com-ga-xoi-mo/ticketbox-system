# Video Script — Nhóm 3: CHECK-IN STAFF

> Nguồn đối chiếu: `docs/video-script-use-cases.md` (mục 3) và hành vi hiện có của hệ thống.
> Phần kỹ thuật chỉ mô tả luồng chính, điều kiện được kiểm tra và kết quả hiển thị; không dùng tên hàm, biến hoặc chi tiết triển khai.
>
> Tài khoản demo dùng cho video Check-in:
> - `staff@ticketbox.test` / `demoPassword` — role `CHECKIN_STAFF`

---

## S1. Đăng nhập & quét QR online (checkin-mobile-app)

**Thời lượng ước tính**: 4-5 phút

**Chuẩn bị**
- 1 điện thoại thật hoặc máy ảo Android/iOS chạy Expo Go / build dev của `apps/checkin-mobile`, kết nối Wi-Fi bình thường (KHÔNG bật máy bay ở video này).
- Khởi động sẵn ứng dụng check-in và trang quản trị, đồng thời chuẩn bị dữ liệu demo cần thiết.
- Trước khi quay: dùng tài khoản `admin@ticketbox.test` trên web-admin gán assignment cho `staff@ticketbox.test` vào 1 concert đang `PUBLISHED` (xem Ad1/console phần "check-in staff assignment") — nếu chưa gán, màn `AssignmentScreen` sẽ trống.
- Chuẩn bị sẵn 3 vé QR để quét: 1 vé hợp lệ chưa check-in, 1 vé đã check-in trước đó (để test duplicate), 1 ảnh QR rác/không tồn tại trong hệ thống (để test invalid). Vé lấy từ email/ví vé của tài khoản `audience@ticketbox.test` sau khi mua vé concert đó.

**Cảnh 1 — Đăng nhập**
[Thao tác] Mở app check-in-mobile, nhập `staff@ticketbox.test` / `demoPassword`, bấm Đăng nhập.
[Lời thoại] "Đây là ứng dụng di động dành cho nhân viên soát vé tại cổng. Mình đăng nhập bằng tài khoản đã được Admin cấp — vai trò CHECKIN_STAFF."
- Sau khi login thành công, app tự gọi API tải danh sách assignment (ca trực/cổng được phân công) — màn hình chuyển sang `AssignmentScreen` nếu có nhiều hơn 1 assignment, hoặc thẳng vào `ScannerScreen` nếu chỉ có 1.

**Cảnh 2 — Chọn assignment / vào màn quét**
[Thao tác] Nếu có nhiều assignment, chọn đúng concert + cổng đã được gán, bấm vào để mở scanner.
[Lời thoại] "Mỗi nhân viên chỉ thấy những ca trực còn hiệu lực (status ACTIVE) — assignment bị Admin/Organizer thu hồi sẽ không hiện ở đây nữa."


[Thao tác] Đưa camera vào QR vé hợp lệ chưa check-in.
[Lời thoại] "Vé hợp lệ — banner xanh 'Ticket Valid' hiện ngay, có icon check-circle."
- Banner do `resultBanner()` trong `apps/checkin-mobile/src/features/scanner/scanner-screen-state.ts` render: tone `success`, title "Ticket Valid".

**Cảnh 4 — Quét lại chính vé đó → duplicate**
[Thao tác] Quét lại đúng QR vừa quét ở Cảnh 3.
[Lời thoại] "Quét lại vé đã vào cổng — banner cam 'Already Checked In', không cho vào 2 lần."


[Thao tác] Quét QR rác (ảnh chụp mã QR ngẫu nhiên hoặc QR của vé thuộc concert khác).
[Lời thoại] "QR không khớp bất kỳ vé nào trong hệ thống — banner đỏ 'Invalid Ticket'."
- Nếu dùng QR của vé đúng nhưng khác concert: `ScanValidationService` trả `reasonCode: WRONG_CONCERT` (vé "belongs to a different concert") — vẫn hiển thị tone lỗi nhưng message khác, nên nói rõ 2 trường hợp: QR hoàn toàn không tồn tại (INVALID_TICKET) và QR đúng vé nhưng sai concert (WRONG_CONCERT).

**Cảnh 6 — Không có quyền theo assignment → unassigned**
[Thao tác] Dùng một staff khác (hoặc đăng xuất, đăng nhập tài khoản CHECKIN_STAFF khác chưa được gán concert này) rồi thử quét.
[Lời thoại] "Nhân viên chưa được gán vào concert này — banner đỏ 'Not Authorized', hệ thống không tiết lộ thêm thông tin về vé."

---

## S2. Offline sync & VIP lookup (checkin-offline-sync)

**Thời lượng ước tính**: 6 phút (video kỹ thuật nặng nhất trong nhóm)

**Chuẩn bị**
- 2 thiết bị/máy ảo cùng đăng nhập **chung tài khoản** `staff@ticketbox.test` với cùng assignment (concert + cổng) — mô phỏng 2 máy quét ở 2 cổng vật lý khác nhau nhưng dùng chung 1 tài khoản (tình huống thực tế khi 1 nhân viên có 2 thiết bị dự phòng, hoặc 2 máy soát vé sát nhau).
- Bật chế độ máy bay (Airplane mode) trên cả 2 thiết bị để mô phỏng mất mạng — `NetInfoNetworkMonitor` (apps/checkin-mobile/src/features/offline-queue/netinfo-network-monitor.ts) dùng thư viện `@react-native-community/netinfo`, nhận biết máy bay/mất Wi-Fi gần như ngay lập tức qua `NetInfo.addEventListener`.
- Chuẩn bị 1 vé QR dùng để test conflict — vé phải **còn hợp lệ và chưa check-in** trước khi cả 2 máy vào chế độ máy bay.
- Quan trọng: phải mở app và vào màn scanner (để tải `ticket-cache`) **trước khi** bật máy bay, nếu không cache rỗng và cả 2 máy sẽ chỉ xếp hàng đợi (queued) chứ không tự phân biệt được accepted/invalid ngay tại chỗ.

**Cảnh 1 — Cache vé tải sẵn khi còn mạng**
[Thao tác] Khi còn mạng, chọn assignment, vào scanner — quan sát không có banner "Offline cache unavailable" ở App.tsx.
[Lời thoại] "Trước khi ra hiện trường, app đã tự tải sẵn danh sách vé của concert này về máy — để lúc mất mạng vẫn quét được."


[Thao tác] Bật Airplane mode trên máy A và máy B. Trên máy A, quét vé test conflict → banner "Saved Offline" (tone neutral). Ngay sau đó trên máy B, quét **cùng QR đó** → cũng banner "Saved Offline".
[Lời thoại] "Cả 2 máy đang offline. Cùng một chiếc vé bị quét ở 2 cổng — máy nào cũng chấp nhận tạm thời và xếp vào hàng đợi cục bộ, vì lúc này chưa máy nào biết máy kia đã quét."


[Thao tác] Tắt máy bay trên **máy A trước**. Chờ vài giây, quan sát panel Sync tự động đồng bộ (không cần bấm nút — `SyncService` lắng nghe `network.onStatusChange`, tự trigger khi có mạng lại). Sau khi máy A đồng bộ xong (banner "Đã đồng bộ", pendingCount = 0), **mới** tắt máy bay trên máy B.
[Lời thoại] "Máy A có mạng trước — vé của máy A được server xử lý trước và được công nhận ACCEPTED thật sự. Bây giờ mình cho máy B online."
[Thao tác] Quan sát máy B: panel Sync chạy, kết quả trả về đánh dấu `conflict` thay vì accepted.
[Lời thoại] "Máy B gửi lên sau — server phát hiện vé này đã được máy khác check-in rồi, nên trả về CONFLICT chứ không phải trùng vé thông thường."


[Lời thoại] "Tổng kết: một lượt đồng bộ trả về 4 loại kết quả khác nhau — accepted (vé hợp lệ, thật sự vào cổng), duplicate (cùng máy quét lại), invalid (QR sai/vé sai concert/vé đã hủy), và conflict (máy khác đã nhận vé này trước). Không có trường hợp nào bị gộp chung hay báo lỗi mơ hồ."
[Thao tác] Có thể dùng thêm 1 vé QR rác quét khi cả 2 máy đang offline để minh hoạ luôn nhánh `invalid` (không có trong cache → đánh dấu invalid ngay tại máy, không cần chờ đồng bộ vì `TicketCacheRepository.lookup` trả null → "hash not in cache → invalid" trong `scan-workflow.ts`).

[Lời thoại] "Mã không nằm trong danh sách vé hợp lệ được nhận biết ngay trên thiết bị. Nhân viên không cần chờ đồng bộ để biết mã này không thể dùng check-in."

**Cảnh 5 — Tab tra cứu VIP (tách biệt khỏi quét QR, chỉ hoạt động online)**
[Thao tác] Bật lại mạng đầy đủ trên 1 máy, chuyển sang tab "VIP" ở thanh điều hướng dưới. Nhập tên/số điện thoại khách VIP đã có trong guest-list của concert.
[Lời thoại] "Tab tra cứu VIP tách hẳn khỏi luồng quét QR — dùng khi khách VIP không có vé điện tử mà chỉ có tên trong danh sách khách mời."
[Thao tác] Bật máy bay lại, thử bấm tra cứu VIP → hiện banner "Online required" ngay lập tức, không gọi API.

[Lời thoại] "Tra cứu VIP cần kết nối để lấy thông tin mới nhất. Khi offline, ứng dụng báo rõ yêu cầu này thay vì trả về kết quả không chắc chắn."


---


## Kết video

[Lời thoại] "Nhân viên check-in đăng nhập theo đúng assignment, quét vé online, tiếp tục làm việc khi mất mạng và đồng bộ lại với kết quả rõ ràng khi có kết nối."
