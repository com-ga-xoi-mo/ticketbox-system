# Nhóm Audience (nâng cao) — Script quay video demo chi tiết

> Nguồn đối chiếu: `docs/video-script-use-cases.md` (mục 1.5, 1.6, 1.7) và hành vi hiện có của hệ thống.
> **Cấu trúc:** Mỗi cảnh trình bày thao tác, diễn biến của luồng và kết quả người dùng nhìn thấy.

## Chuẩn bị chung cho cả 5 video

- **Backend + worker + Postgres + Redis + Maildev** chạy qua `docker-compose` (hoặc `pnpm dev` theo README). Maildev UI tại `http://localhost:1080` — dùng để xem email QR / gift invitation / reset password thật.
- **audience-web** chạy tại cổng dev (Vite) mặc định — dùng 2 cửa sổ trình duyệt (một thường, một ẩn danh/Chrome profile khác) để đóng vai 2 tài khoản khác nhau cùng lúc.
- **Tài khoản demo** (mật khẩu chung `demoPassword`):
  - `audience@ticketbox.test` — tài khoản audience chính ("An" — dùng làm buyer/người mua chính trong hầu hết video).
  - `seed.audience00@ticketbox.test` … `seed.audience19@ticketbox.test` — 20 tài khoản audience có sẵn trong seed (`prisma/seed.ts`, hàm `seedAudienceUsers`), cùng mật khẩu `demoPassword`. Dùng `seed.audience01@ticketbox.test` làm **tài khoản thứ hai** (seller / người nhận quà / người thắng lottery thứ hai) — không cần tự đăng ký, seed đã tạo sẵn.
  - `organizer@ticketbox.test` / `admin@ticketbox.test` — dùng khi cần trigger hành động organizer/admin (cấu hình lottery, resolve dispute, xử lý payout).
- **Mã khuyến mãi có sẵn trong seed** (`seedPromotions` trong `prisma/seed.ts`): `WELCOME10` (giảm 10%, tối đa 200.000đ, `maxUsagePerUser: 1`), `SAVE50K` (giảm cố định 50.000đ), `VIP15` (giảm 15%, tối đa 500.000đ), `EARLYBIRD` (giảm cố định 100.000đ), `EXPIRED20` (đã hết hạn/inactive — dùng để demo case bị từ chối).

---

## Video A7 — Mã khuyến mãi & Tặng vé

**Thời lượng ước tính:** 5–6 phút

### Chuẩn bị
- Đăng nhập `audience@ticketbox.test` / `demoPassword`, đã có sẵn 1 vé `ISSUED` trong ví (nếu seed chưa có, mua nhanh 1 vé concert bất kỳ trước khi quay để có vé demo tặng).
- Mở sẵn Maildev (`localhost:1080`) ở một tab khác.
- Đăng nhập song song `seed.audience01@ticketbox.test` ở trình duyệt/tab ẩn danh thứ hai — đóng vai người nhận vé tặng.

### Cảnh 1 — Nhập mã khuyến mãi hợp lệ lúc checkout
[Thao tác] Chọn một concert đang mở bán → chọn loại vé, số lượng → vào `/checkout` → mở khối "Mã khuyến mãi" (component `PromoCodeInput`, hook `usePromoValidation` — `apps/audience-web/src/features/checkout/`), nhập `WELCOME10` → bấm áp dụng.

[Lời thoại] "Ở bước thanh toán, mình có thể nhập mã khuyến mãi. Nhập `WELCOME10` — mã này giảm 10%, tối đa 200 nghìn đồng. Hệ thống xác thực mã ngay lập tức trước khi cho tạo đơn — nếu sai hoặc hết hạn thì đơn sẽ không được tạo."

[Thao tác] Sau khi áp dụng, chỉ ra khối "chi tiết giá" (breakdown): giá gốc, số tiền giảm, phí dịch vụ, tổng cộng.

[Lời thoại] "Breakdown giá hiện rõ: giá vé gốc, phần giảm từ mã khuyến mãi, và phí dịch vụ tính riêng — không gộp mập mờ vào giá vé."


### Cảnh 2 — Mã không hợp lệ bị từ chối ngay
[Thao tác] Xóa mã `WELCOME10`, nhập `EXPIRED20` → bấm áp dụng.

[Lời thoại] "Thử mã đã hết hạn — `EXPIRED20`. Hệ thống từ chối ngay tại bước nhập, không phải sau khi thanh toán mới báo lỗi."

[Thao tác] Nhập lại `WELCOME10`, hoàn tất checkout, thanh toán qua VNPay/MoMo sandbox (theo script thanh toán chung nếu có), xác nhận đơn `PAID`.

[Lời thoại] "Khi đơn được thanh toán, mã giảm đã áp dụng trở thành một phần của lịch sử đơn hàng và số tiền cuối cùng không thay đổi sau đó."

### Cảnh 3 — Breakdown giá hiện lại ở lịch sử đơn hàng
[Thao tác] Vào "Đơn hàng của tôi" → mở chi tiết đơn vừa tạo.

[Lời thoại] "Breakdown giá không chỉ hiện lúc checkout — mở lại đơn hàng bất kỳ lúc nào, thông tin giảm giá và phí dịch vụ vẫn hiển thị đầy đủ, không bị mất sau khi thanh toán xong."

### Cảnh 4 — Tặng vé qua email
[Thao tác] Vào `/account/tickets` (Ví vé) → mở chi tiết một vé `ISSUED` (`TicketDetailPage.tsx`) → bấm nút mở modal tặng vé (`showGiftModal`) → nhập email `seed.audience01@ticketbox.test` → gửi.

[Lời thoại] "Mình có thể tặng vé này cho người khác qua email — không cần họ có tài khoản trước, chỉ cần nhập email người nhận."

[Thao tác] Mở Maildev, chỉ email gift invitation vừa gửi tới, mở link trong email (dạng `/transfers/:token`).

[Lời thoại] "Email chứa link nhận vé. Đây chính là link mà người nhận sẽ dùng để chấp nhận hoặc từ chối."


### Cảnh 5 — Người nhận Accept / Decline
[Thao tác] Chuyển qua tab đăng nhập `seed.audience01@ticketbox.test`, dán link `/transfers/:token` (`GiftTransferPage.tsx`) → bấm "Chấp nhận".

[Lời thoại] "Người nhận không cần đăng nhập bằng đúng email đã nhận thư — trang landing công khai này xử lý theo token. Bấm chấp nhận, vé sẽ chuyển chủ sở hữu ngay."

[Thao tác] Quay lại tài khoản người gửi, vào ví vé, xác nhận vé đã biến mất khỏi ví (đã chuyển) và có thông báo in-app kết quả chuyển vé (Notification Center).

[Lời thoại] "Sau khi người nhận chấp nhận, quyền sở hữu vé chuyển sang ví của người nhận. Ví người gửi không còn hiển thị vé này và thông báo xác nhận giúp cả hai bên theo dõi kết quả."

### Cảnh 6 — Người gửi hủy lượt chuyển đang chờ
[Thao tác] Gửi tặng một vé khác, KHÔNG accept ngay — quay lại tài khoản người gửi, vào chi tiết vé, bấm "Hủy lượt chuyển".

[Lời thoại] "Nếu người nhận chưa phản hồi, người gửi vẫn có quyền hủy lượt chuyển bất kỳ lúc nào trong thời gian chờ — vé quay lại trạng thái bình thường trong ví."

**[Lời thoại kết]** "Nếu không ai thao tác gì, lượt chuyển tự động hết hạn sau tối đa 48 giờ — đúng theo cơ chế vừa giải thích."

---

## Video A8 — Cơ chế bán vé đặc biệt (Waitlist thông báo & Presale Lottery)

**Thời lượng ước tính:** 6 phút

> ⚠️ **Đây là video quan trọng nhất về mặt "sửa hiểu lầm"**: bản mô tả cũ về waitlist/lottery không còn đúng.
### Cảnh 1 — Bối cảnh: waitlist giờ chỉ còn vai trò thông báo
[Lời thoại] "Trước khi vào demo, cần nói rõ: cơ chế waitlist trong TicketBox đã đổi hoàn toàn so với các phiên bản trước. Waitlist bây giờ **không giữ chỗ, không có suất ưu tiên, không đếm ngược 15 phút** cho riêng ai. Nó chỉ đơn thuần là: đăng ký nhận thông báo khi vé quay lại."

[Thao tác] Vào trang chi tiết concert, chọn ticket-type đã sold-out → chỉ vào nút "Báo tôi khi có vé" (label thật trong code: `TicketWaitlistControls`, `apps/audience-web/src/features/concerts/EventDetailPage.tsx`).

[Lời thoại] "Khi một loại vé hết, audience có thể đăng ký nhận thông báo. Việc đăng ký này không giữ vé và không tạo đơn hàng."

### Cảnh 2 — Hai tài khoản cùng tham gia waitlist
[Thao tác] Ở tài khoản `audience@ticketbox.test`, bấm "Báo tôi khi có vé". Giao diện chuyển sang khối hiển thị: "Bạn sẽ được thông báo khi vé quay lại" kèm dòng chữ nhỏ "Waitlist không giữ chỗ — khi có vé bạn hãy vào mua như bình thường." Lặp lại thao tác này ở tài khoản `seed.audience01@ticketbox.test` trên trình duyệt còn lại.

[Lời thoại] "Chú ý dòng chữ nhỏ này — hệ thống nói thẳng với người dùng: đây không phải giữ chỗ. Cả hai tài khoản mình vừa đăng ký đều bình đẳng — không ai có suất riêng."

### Cảnh 3 — Vé "hết → có lại": TOÀN BỘ subscriber được báo cùng lúc
[Thao tác] Ở một đơn hàng `PENDING_PAYMENT` khác đang giữ chỗ loại vé này (hoặc hủy một đơn `PAID` nếu policy cho phép hoàn), thực hiện hành động làm giải phóng tồn kho (hủy đơn đang giữ chỗ, hoặc chờ đơn hết hạn tự động) để `available` chuyển từ `0` lên `>0`. Sau đó chờ tối đa 60 giây (chu kỳ quét của worker) rồi xem cả 2 tài khoản: cả hai đều nhận được thông báo gần như đồng thời trong Notification Center / email.

[Lời thoại] "Mình vừa hủy một đơn đang giữ chỗ loại vé này, làm tồn kho có lại. Chờ khoảng một phút — đây là chu kỳ quét ngầm của worker — và xem: **cả hai tài khoản đều nhận được thông báo cùng lúc**, không ai được ưu tiên báo trước."


### Cảnh 4 — Organizer cấu hình Presale Lottery

[Thao tác] Đăng nhập organizer, mở concert và cấu hình thời gian mở đăng ký, thời điểm quay số, thời điểm mở bán công khai cùng số suất thắng. Lưu cấu hình rồi quay lại trang concert bằng tài khoản audience.

[Lời thoại] "Organizer xác định rõ khi nào audience được đăng ký quay số, khi nào hệ thống thực hiện quay số và có bao nhiêu suất được chọn. Những mốc này tạo thành một lịch trình thống nhất cho toàn bộ concert."

[Lời thoại] "Sau khi cấu hình được lưu, audience chỉ nhìn thấy nút đăng ký trong đúng khoảng thời gian cho phép. Trước khi mở hoặc sau khi đóng, hệ thống không nhận thêm đăng ký, nên danh sách người tham gia không thay đổi ngoài lịch trình đã công bố."

### Cảnh 5 — Audience đăng ký lottery
[Thao tác] Cả 2 tài khoản audience vào trang chi tiết concert, thấy nút "Đăng ký bốc thăm mua vé" (chỉ hiện khi đang trong cửa sổ đăng ký) → bấm đăng ký.

[Lời thoại] "Đăng ký lottery không tốn tiền, không giữ chỗ — chỉ là ghi danh chờ quay số."

### Cảnh 6 — Quay số

[Thao tác] Đến thời điểm quay số đã cấu hình, đăng nhập organizer và thực hiện thao tác quay số. Sau đó chuyển về tài khoản audience để xem kết quả.

[Lời thoại] "Khi đến thời điểm quay, hệ thống xét danh sách những người đã đăng ký trong cửa sổ hợp lệ và chọn người thắng theo số suất organizer đã cấu hình."

[Lời thoại] "Mỗi audience nhìn thấy kết quả của chính mình. Người thắng nhận quyền mua trong đợt presale; người chưa trúng không thể dùng quyền mua của người khác."


### Cảnh 7 — Người thắng mua tự do trong cửa sổ presale, giới hạn đúng số suất thắng
[Thao tác] Tài khoản thắng thấy khối "Bạn đã trúng bốc thăm" kèm badge "Được mua: N vé" và dòng chữ "Bạn được mua trong đợt presale — không giữ chỗ, không đếm ngược." → bấm "Mua vé trúng thăm" → checkout thành công. Lặp lại checkout một lần nữa (nếu còn suất) để cho thấy có thể mua nhiều lần miễn chưa vượt số đã thắng; sau khi mua đủ số suất, thử mua thêm để hệ thống chặn.

[Lời thoại] "Không có đồng hồ đếm ngược nào ở đây cả. Người thắng có thể quay lại mua bất cứ lúc nào trong suốt cửa sổ presale, thậm chí chia nhỏ ra nhiều lần mua — miễn tổng số vé mua không vượt quá số suất đã thắng."


### Cảnh 8 — Tổng kết so sánh
[Lời thoại] "Tóm lại: Waitlist là kênh **thông báo thụ động, bình đẳng, không giữ chỗ** — ai vào mua trước thì được. Lottery là **cơ chế phân bổ chủ động qua quay số công bằng, có thể kiểm chứng lại**, và người thắng được đặc quyền mua tự do trong cửa sổ presale với hạn ngạch rõ ràng, không phải đặc quyền vĩnh viễn hay có đồng hồ đếm ngược riêng."

---

## Video A9 — Hậu mãi, Thông báo & Hỗ trợ

**Thời lượng ước tính:** 5–6 phút

### Chuẩn bị
- Đăng nhập `audience@ticketbox.test`.
- Có sẵn ít nhất 1 đơn `PAID` với vé thuộc một concert đã diễn ra hoặc sắp diễn ra (để review + support + resend).
- Mở DevTools → tab Network (lọc `stream` hoặc `EventSource`) để quan sát kết nối SSE.

### Cảnh 1 — Đánh giá concert
[Thao tác] Vào trang chi tiết concert đã mua vé và đã xác thực (`ConcertReviewsSection` trong `EventDetailPage.tsx`) → viết 1 đánh giá (rating + nội dung) → gửi. Sau đó sửa nội dung đánh giá, rồi xóa.

[Lời thoại] "Chỉ người đã mua vé xác thực mới được đánh giá, mỗi người một đánh giá cho mỗi concert. Mình có toàn quyền sửa hoặc xóa đánh giá của chính mình."

[Thao tác] Đăng nhập tài khoản khác, vào cùng trang, chỉ ra danh sách đánh giá công khai không hiện đánh giá đã bị ẩn bởi Admin (nếu có sẵn ví dụ đã bị admin ẩn từ trước).

[Lời thoại] "Đánh giá bị ẩn không còn xuất hiện trong danh sách công khai, vì vậy audience chỉ nhìn thấy các nội dung đang được phép hiển thị."

### Cảnh 2 — Notification Center & badge chưa đọc
[Thao tác] Vào `/account/notifications` (`NotificationCenterPage.tsx`). Chỉ ra: phân loại thông báo, deep link (bấm vào một thông báo nhảy thẳng tới đơn hàng/vé liên quan), bộ lọc theo trạng thái đọc/chưa đọc, số đếm chưa đọc trên icon chuông.

[Lời thoại] "Đây là hộp thư thông báo trong app — mỗi thông báo có phân loại, có thể bấm để đi thẳng tới nội dung liên quan, và có bộ đếm số chưa đọc."

### Cảnh 3 — 🆕 Realtime qua SSE: giải thích kỹ thuật đầy đủ
[Thao tác] Mở DevTools Network, để nguyên tab Notification Center, chỉ vào request `GET /me/notifications/stream-token` (mint token) và ngay sau đó `GET /me/notifications/stream?token=...` (kiểu `eventsource`, trạng thái `pending` kéo dài — đặc trưng SSE).

[Lời thoại] "Badge chưa đọc tự cập nhật mà không cần bấm reload. Đứng sau nó là một luồng Server-Sent Events."


### Cảnh 4 — Support Center
[Thao tác] Vào `/account/support` (`SupportCenterPage.tsx`) → tạo yêu cầu hỗ trợ mới (chọn đơn/vé liên quan, chọn category, nhập nội dung) → gửi → xem lại yêu cầu vừa tạo (`/account/support/requests/:id`).

[Lời thoại] "Từ trang hỗ trợ, mình tạo một yêu cầu mới gắn với đơn hàng cụ thể. Có thể theo dõi trạng thái xử lý ngay tại đây."

[Thao tác] Kiểm tra tính đủ điều kiện hoàn tiền (`GET /me/refund-eligibility`) rồi tạo yêu cầu hoàn tiền (`/account/support/refunds/:id`).

[Lời thoại] "Trước khi tạo yêu cầu, hệ thống kiểm tra đơn có thỏa điều kiện hoàn tiền. Nếu đủ điều kiện, yêu cầu được ghi nhận để theo dõi xử lý ở bước tiếp theo."

[Thao tác] Bấm "Gửi lại vé qua email" (endpoint `POST /me/orders/:id/resend-tickets` hoặc `POST /me/tickets/:id/resend`) → mở Maildev xác nhận email QR mới đã tới.

[Lời thoại] "Đây là thao tác chủ động — khác với email xác nhận tự động lúc mua vé. Người dùng có thể chủ động yêu cầu gửi lại vé bất cứ lúc nào, ví dụ khi lỡ xóa email cũ."

[Thao tác] Tải xác nhận đơn hàng (`GET /me/orders/:id/confirmation`) và tải vé (`GET /me/tickets/:id/download`).

[Lời thoại] "Audience có thể lấy lại xác nhận đơn và tệp vé từ đơn đã mua, đảm bảo luôn có chứng từ và thông tin vé khi cần."

### Cảnh 5 — Global notifications (toast & dialog)
[Thao tác] Thực hiện một hành động thành công bất kỳ (vd hủy waitlist, gửi yêu cầu hỗ trợ) → chỉ ra toast góc màn hình (thư viện `sonner`). Thực hiện một hành động có tính phá hủy (vd hủy đơn, hủy listing resale nếu đã quay video trước đó) → chỉ ra dialog xác nhận chuẩn hóa xuất hiện trước khi thực thi, thay vì `window.confirm()` mặc định của trình duyệt.

[Lời thoại] "Toàn bộ thông báo ngắn trong app dùng chung một thư viện toast, và các hành động cần xác nhận đều đi qua cùng một dialog chuẩn hóa — đồng nhất trải nghiệm giữa mọi tính năng, kể cả những tính năng khác nhau như hủy vé hay hủy listing chợ vé."

---

## Video A10 — Chợ vé P2P: Đăng bán & Khám phá

**Thời lượng ước tính:** 6 phút

### Chuẩn bị
- `audience@ticketbox.test` — đóng vai **seller**, có sẵn ít nhất 1 vé `ISSUED` cho một concert **chưa** diễn ra trong vòng 2 giờ tới (do có cutoff resale).
- `seed.audience01@ticketbox.test` — đóng vai người khám phá/tương tác cộng đồng (upvote, bình luận).
- Concert của vé demo phải bật `resaleEnabled = true` (kiểm tra trước khi quay; nếu seed không sẵn, phối hợp với script Organizer để bật).

### Cảnh 1 — Bắt buộc hồ sơ ngân hàng trước khi đăng bán
[Thao tác] Từ ví vé, mở chi tiết vé, bấm "Bán lại vé" khi **chưa** có hồ sơ ngân hàng → hệ thống chặn, điều hướng/gợi ý sang `/account/bank-profile` (`BankProfilePage.tsx`) → nhập tên chủ tài khoản, số tài khoản, tên ngân hàng → lưu (`PUT /me/bank-profile`).

[Lời thoại] "Trước khi đăng bán vé, bắt buộc phải có hồ sơ ngân hàng — đây là nơi buyer sẽ chuyển tiền, và hệ thống dùng nó để hiện thông tin thanh toán ngay khi có đơn P2P được khởi tạo."

### Cảnh 2 — Đăng bán vé ("Sell My Ticket") & thu hồi QR gốc
[Thao tác] Quay lại chi tiết vé, bấm "Bán lại vé" → form `ResaleListingForm` hiện ngay trong `TicketDetailPage` → nhập giá rao bán **vượt quá 110% giá gốc** → gửi, quan sát lỗi bị từ chối. Sửa lại giá trong ngưỡng cho phép → gửi thành công.

[Lời thoại] "Giá rao bán bị giới hạn trần 110% giá gốc — không thể phe vé giá cắt cổ trên chính nền tảng. Thử nhập giá vượt trần, hệ thống từ chối ngay."

[Thao tác] Sau khi đăng thành công, quay lại chi tiết vé trong ví — chỉ ra trạng thái vé đổi thành "Đang rao bán", QR gốc không còn hiển thị/quét được nữa.

[Lời thoại] "Khi vé được đăng bán, QR gốc bị thu hồi để vé không thể vừa dùng tại cổng vừa được giao dịch cho người khác."


### Cảnh 3 — Hủy listing → khôi phục vé & QR mới
[Thao tác] Từ trang quản lý listing của tôi, hủy listing vừa tạo.

[Lời thoại] "Nếu đổi ý, người bán tự hủy listing bất cứ lúc nào (khi chưa có ai đặt mua) — vé quay lại ví, nhưng chú ý: mã QR không phục hồi mã cũ, mà được **cấp lại một mã hoàn toàn mới**."

[Thao tác] Mở lại chi tiết vé, chỉ ra QR mới khác QR cũ (không phải khôi phục nguyên trạng).

[Lời thoại] "Hủy listing trả vé về ví của người bán với QR mới. QR cũ tiếp tục không có hiệu lực để tránh dùng lại thông tin trước khi đăng bán."

### Cảnh 4 — Chợ vé kiểu mạng xã hội: feed `/resale`
[Thao tác] Vào `/resale` (`ResalePlatformPage.tsx`) — feed toàn nền tảng. Demo: gõ tìm theo tên concert, lọc khoảng giá, đổi sắp xếp (trending/mới nhất/giá tăng/giá giảm), cuộn xuống để trigger infinite scroll (endpoint `GET /resale/listings` với `page`/`limit`).

[Lời thoại] "Đây không phải một danh sách khô khan — nó được trình bày như một feed mạng xã hội, mỗi listing là một bài đăng kèm ngữ cảnh concert: tên, slug, ngày giờ diễn ra."

[Thao tác] Mở một listing bất kỳ sang `/resale/:listingId` (trang chi tiết độc lập).

[Lời thoại] "Trang chi tiết tập trung toàn bộ thông tin của một listing, gồm giá, người bán, tương tác và các bước giao dịch có thể thực hiện."

### Cảnh 5 — Upvote realtime & bình luận threaded
[Thao tác] Mở cùng một listing detail trên 2 tab (2 tài khoản khác nhau). Ở tab A, bấm upvote. Quan sát tab B: số upvote tự tăng mà không cần reload.

[Lời thoại] "Lượt upvote được cập nhật cho những người đang xem cùng listing, vì vậy mọi người thấy mức quan tâm mới mà không cần tự tải lại trang."


[Thao tác] Viết bình luận, trả lời (reply) một bình luận tạo thread lồng nhau, sau đó gắn cờ (flag) một bình luận để minh họa kiểm duyệt.

[Lời thoại] "Bình luận hỗ trợ trả lời lồng nhau theo luồng, và bất kỳ ai cũng có thể gắn cờ bình luận vi phạm để đội kiểm duyệt Admin xử lý sau."

### Cảnh 6 — 🔧 Queue resilience: listing tự hết hạn theo batch, có retry
[Lời thoại] "Một câu hỏi kỹ thuật quan trọng: điều gì đảm bảo listing tự động hết hạn đúng giờ trước khi sự kiện diễn ra, kể cả khi job xử lý bị lỗi giữa chừng?"


---

## Video A11 — Chợ vé P2P: Giao dịch (DM, Order, Transfer, Dispute, Trust)

**Thời lượng ước tính:** 6 phút

### Chuẩn bị
- Tiếp nối video A10: `audience@ticketbox.test` (seller) đã có 1 listing `ACTIVE`.
- `seed.audience01@ticketbox.test` đóng vai **buyer**, có hồ sơ ngân hàng/tài khoản sẵn sàng thanh toán ngoài băng (chuyển khoản thật hoặc giả lập).
- `admin@ticketbox.test` để xử lý dispute và payout.

### Cảnh 1 — Nhắn tin trực tiếp buyer → seller (WebSocket)
[Thao tác] Buyer mở listing detail, bấm nhắn tin cho seller, gõ tin nhắn đầu tiên (`POST /resale/listings/:id/messages`). Mở `/account/messages` (Resale Inbox) ở cả 2 tài khoản, gửi qua lại vài tin nhắn, quan sát tin nhắn đến ngay lập tức ở phía kia mà không cần F5.

[Lời thoại] "Buyer nhắn tin trực tiếp cho seller ngay từ trang listing. Tin nhắn tới theo thời gian thực qua kết nối hai chiều."


### Cảnh 2 — Khởi tạo đơn P2P: khóa listing
[Thao tác] Buyer bấm "Mua" trên listing → `POST /resale/purchase/initiate` → nhận về thông tin đơn (`RESERVED`) kèm **thông tin ngân hàng của seller** (đã cấu hình ở A10) để chuyển khoản.

[Lời thoại] "Khi buyer khởi tạo mua, listing bị khóa ngay — chuyển sang trạng thái RESERVED, không ai khác đặt mua được nữa. Buyer nhận thông tin ngân hàng của seller để chuyển khoản ngoài hệ thống."

[Thao tác] Mở tab thứ 3 (một buyer khác) thử mua cùng listing này → bị từ chối vì listing không còn `ACTIVE`.

[Lời thoại] "Khi listing đã được buyer đầu tiên giữ để giao dịch, buyer khác không thể tạo thêm đơn cho chính listing đó."

### Cảnh 3 — Buyer xác nhận thanh toán kèm bằng chứng
[Thao tác] Buyer bấm "Đã thanh toán", nhập `paymentProofUrl` (link ảnh chuyển khoản) → `POST /resale/orders/:id/confirm-payment` → đơn chuyển `PENDING_CONFIRM`.

[Lời thoại] "Buyer xác nhận đã chuyển tiền kèm ảnh chứng minh. Từ lúc này, đơn không thể bị buyer hoặc seller tự hủy nữa — chỉ có thể tiến tới xác nhận nhận tiền hoặc mở tranh chấp."

[Thao tác] Thử hủy đơn từ phía seller ở trạng thái này → bị chặn (`CannotCancelAfterPaymentConfirmedError`).

[Lời thoại] "Sau khi buyer đã xác nhận thanh toán, seller không thể tự hủy đơn. Điều này giữ nguyên quyền lợi của buyer trong giai đoạn chờ seller xác nhận."

### Cảnh 4 — Seller xác nhận nhận tiền → chuyển vé atomic
[Thao tác] Seller vào `/resale/orders/:id`, bấm "Xác nhận đã nhận tiền" (`POST /resale/orders/:id/confirm-receipt`). Ngay sau đó kiểm tra: listing chuyển `SOLD`, vé gốc của seller chuyển `TRANSFERRED`, buyer có **vé mới** trong ví (`/account/tickets`) với QR mới, đơn P2P chuyển `COMPLETED`.

[Lời thoại] "Khi seller xác nhận đã nhận tiền, giao dịch hoàn tất theo một chuỗi thống nhất: listing đóng, vé cũ không còn thuộc seller và buyer nhận vé mới với QR mới."


### Cảnh 5 — Hủy đơn & tự động escalate nếu seller im lặng
[Lời thoại] "Hệ thống còn có 2 lớp bảo vệ thời gian, chạy hoàn toàn tự động ở background."

**[Thao tác/giải thích]** Không nhất thiết phải chờ đủ thời gian thật trên video — có thể nói bằng lời kèm minh họa log:
- Nếu buyer khởi tạo đơn nhưng không xác nhận thanh toán trong **15 phút**, `ResaleOrderReservedExpiryProcessor` tự hủy đơn, đưa listing về lại `ACTIVE`.
- Nếu buyer đã xác nhận thanh toán nhưng seller không xác nhận nhận tiền trong **2 giờ**, `ResaleOrderConfirmExpiryProcessor` **tự động mở tranh chấp thay hệ thống** (gọi `RaiseDisputeUseCase` với `userId: 'SYSTEM'`, `reason: 'SELLER_NO_RESPONSE'`) — bảo vệ buyer khỏi việc bị seller "ngâm" tiền vô thời hạn.

[Lời thoại] "Đây không phải hành vi người dùng chủ động — mà là hai job nền tự chạy đúng hạn để đảm bảo không giao dịch nào bị treo vô thời hạn."

### Cảnh 6 — Mở tranh chấp thủ công & Admin giải quyết
[Thao tác] Ở một đơn khác đang `PENDING_CONFIRM`, buyer chủ động bấm "Mở tranh chấp" (`POST /resale/orders/:id/dispute`, nhập lý do) → đơn chuyển `IN_DISPUTE`.

[Lời thoại] "Mở tranh chấp chuyển đơn sang trạng thái cần giải quyết, để giao dịch không tiếp tục bị xác nhận hoặc hủy tùy ý khi hai bên đang bất đồng."

[Thao tác] Đăng nhập `admin@ticketbox.test`, vào `admin/resale-disputes` → xử lý: chọn "complete" (buyer thắng — vé vẫn được chuyển như bình thường qua `ExecutePurchaseUseCase`, đồng thời bắn sự kiện `compute-trust` với `event: 'dispute_loss'` để **trừ điểm uy tín seller**) hoặc "cancel" (seller thắng — hủy đơn, không trừ điểm ai).

[Lời thoại] "Nếu buyer thắng tranh chấp, vé vẫn được chuyển bình thường — nhưng seller bị trừ điểm uy tín vì đã không xác nhận đúng hạn hoặc bị xác định sai."

### Cảnh 7 — Hồ sơ uy tín người bán & chống gian lận điểm
[Thao tác] Vào `/sellers/:userId` (`SellerProfilePage.tsx`) của seller vừa giao dịch — chỉ ra badge tier (`NEW`/`TRUSTED`/`HIGHLY_TRUSTED`/`TOP_SELLER`), số giao dịch hoàn tất, thời gian phản hồi trung bình.

[Lời thoại] "Hồ sơ người bán tổng hợp kết quả các giao dịch đã hoàn thành và thời gian phản hồi, giúp buyer đánh giá trước khi chọn giao dịch."


### Cảnh 8 — Trang lịch sử giao dịch/payout
[Thao tác] Vào `/account/transactions` (`TransactionHistoryPage.tsx`, seller) → xem danh sách giao dịch: giá bán, phí nền tảng 5%, số tiền thực nhận, trạng thái payout (`PENDING`).

[Lời thoại] "Phí nền tảng 5% được trừ ngay khi giao dịch hoàn tất — đối chiếu số tiền thực nhận ngay tại trang này."

[Thao tác] Đăng nhập admin, gọi `PATCH /admin/resale/transactions/:id/payout` để đánh dấu đã chi trả → quay lại trang seller, trạng thái payout đổi.

[Lời thoại] "Lưu ý: việc chi trả cho seller ở bản demo này được Admin xác nhận thủ công sau khi đã chuyển khoản ngoài hệ thống — đây không phải một cổng thanh toán tự động, mà là bước đối soát cuối cùng."

---

## Kết video

[Lời thoại] "Các luồng đặc biệt gồm mã khuyến mãi, tặng vé, waitlist, quay số presale, thông báo và resale đều có trạng thái rõ ràng từ lúc bắt đầu đến khi hoàn tất."
