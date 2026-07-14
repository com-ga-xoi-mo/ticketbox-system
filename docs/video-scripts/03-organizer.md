# Script quay video demo — Nhóm 2: NHÀ TỔ CHỨC (Organizer) & Nhóm 4: ADMIN

> Nguồn đối chiếu: `docs/video-script-use-cases.md` mục "2. NHÀ TỔ CHỨC" và hành vi hiện có của hệ thống.
> **Cấu trúc:** Mỗi cảnh tập trung vào thao tác của organizer, dữ liệu được cập nhật và kết quả audience hoặc staff nhận được.

## Tài khoản & dữ liệu dùng chung

- Organizer: `organizer@ticketbox.test` / mật khẩu `demoPassword`
- Admin: `admin@ticketbox.test` / mật khẩu `demoPassword` (bắt buộc phải dùng cho O5, vì route
  Guest List web UI là **Admin-only**, tổ chức viên không thấy trang này trong menu của mình)
- File demo bắt buộc có sẵn trước khi quay (đã tồn tại trong repo, không cần tạo lại):
  - `docs/demo/unsafe-seating-map.svg` — nội dung thật:
    ```svg
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
      <script>alert("unsafe")</script>
      <rect id="zone-unsafe" x="20" y="20" width="160" height="60" fill="#ef4444"/>
    </svg>
    ```
  - `docs/demo/test-seating-map.svg` — sơ đồ hợp lệ, nhiều `<path>`/`<rect>` có `id` dạng
    `zone-vip-left`, `zone-vip-right`, dùng làm sơ đồ đối chứng "sạch"
- Chuẩn bị ít nhất 1 concert của organizer đang ở trạng thái **DRAFT** (dùng cho O1, O2, O3) và
  1 concert khác đã **PUBLISHED** (dùng để demo tác động marketplace ở O1, và trạng thái read-only
  ở O2)
- Trình duyệt: mở sẵn tab DevTools → Network trước khi quay các cảnh liên quan tới bảo mật SVG và
  geocoding, lọc theo từ khóa `seating-map` / `locations/search`

---

## O1. Tạo & quản lý concert cơ bản

**Thời lượng ước tính:** 5–6 phút

**Chuẩn bị:**
- Đăng nhập bằng `organizer@ticketbox.test`
- Có sẵn một concert DRAFT do organizer này tạo để demo chỉnh sửa và publish.
- Mở sẵn một tab audience-web trỏ tới trang chủ marketplace (`/`) ở một cửa sổ trình duyệt khác
  (ẩn danh) để đối chiếu khi publish/cancel

### Cảnh 1 — Danh sách & tạo concert mới
[Thao tác] Vào `/organizer/concerts`, bấm "Tạo sự kiện" → điền form tại
`/organizer/concerts/new`: Tiêu đề, Slug (tự sinh từ tiêu đề, có thể sửa tay), Tên nghệ sĩ, Tên
địa điểm, Địa chỉ, ngày giờ bắt đầu/kết thúc, mô tả → Lưu.

[Lời thoại] "Đây là màn hình quản lý concert của Nhà tổ chức. Mỗi organizer chỉ nhìn thấy và
thao tác được trên các concert do chính mình tạo — hệ thống kiểm tra quyền sở hữu ở tầng backend,
không chỉ ẩn nút trên giao diện. Concert vừa tạo mặc định ở trạng thái DRAFT — bản nháp, chưa ai
mua vé được."


### Cảnh 2 — Cấu hình loại vé & cửa sổ mở bán
[Thao tác] Từ trang sửa concert, bấm "Edit Venue Map" (chỉ khả dụng vì concert đang DRAFT) →
sang trang Venue Maps → cuộn xuống khối "Phân loại vé" → bấm "Thêm loại vé" → điền Mã, Tên, Mô tả,
Giá (VND), Tổng số lượng, Thời gian bắt đầu/kết thúc bán, Tối đa mỗi người dùng → Tạo.

[Lời thoại] "Cấu hình loại vé và cửa sổ mở bán nằm chung màn hình với sơ đồ chỗ ngồi, vì hai
thứ này gắn chặt với nhau — mỗi loại vé sẽ được ánh xạ vào một hoặc nhiều khu vực ghế. Phần ánh xạ
khu vực chi tiết mình sẽ demo sâu ở video riêng về Sơ đồ chỗ ngồi. Ở đây form đã tự kiểm tra: giờ kết
thúc bán phải sau giờ bắt đầu, số lượng và giới hạn mỗi người phải từ 1 trở lên — những rule này
mirror đúng validate phía backend để tránh submit rồi mới nhận lỗi 400."

### Cảnh 3 — Upload poster
[Thao tác] Quay lại trang sửa concert, ở khối "Đa phương tiện" bấm vào ô "Poster (Khổ dọc)" →
chọn 1 file ảnh JPEG/PNG/WebP → quan sát spinner loading rồi ảnh preview cập nhật.

[Lời thoại] "Upload poster là multipart upload, giới hạn định dạng ảnh và kích thước file — nếu
chọn nhầm định dạng khác hệ thống sẽ báo lỗi ngay tại đây thay vì để lỗi rơi xuống tận backend."

### Cảnh 4 — Vòng đời DRAFT → PUBLISHED và tác động marketplace
[Thao tác] Quay lại `/organizer/concerts`, tìm đúng concert vừa cấu hình, bấm nút "Xuất bản".
Ngay sau đó, chuyển sang tab audience-web đã mở sẵn, refresh trang chủ / trang tìm kiếm.

[Lời thoại] "Bấm Xuất bản chuyển trạng thái từ DRAFT sang PUBLISHED. Ngay khi publish xong, sang
tab audience mình refresh lại — concert đã xuất hiện trên marketplace. Trước đó, khi còn DRAFT,
concert này hoàn toàn vô hình với khán giả."


---

## O2. Sơ đồ chỗ ngồi & bản đồ địa điểm

**Thời lượng ước tính:** 6 phút (video kỹ thuật nặng nhất trong nhóm Organizer)

**Chuẩn bị:**
- Đăng nhập `organizer@ticketbox.test`
- 1 concert DRAFT trống (chưa có seating map) để demo upload lần đầu
- Có sẵn `docs/demo/unsafe-seating-map.svg` và `docs/demo/test-seating-map.svg` trên máy
- Mở DevTools → Network, lọc `seating-map` trước khi bắt đầu upload

### Cảnh 1 — Trang Venue Maps và điều hướng
[Thao tác] Vào sidebar → "Venue Maps" (`/organizer/venue-maps`) → chọn concert DRAFT vừa chuẩn
bị → vào editor (`/organizer/venue-maps/:id`).

[Lời thoại] "Venue Maps là trang riêng để quản lý sơ đồ chỗ ngồi cho tất cả concert của
organizer, tách khỏi màn hình sửa thông tin chung."

### Cảnh 2 — Bằng chứng bảo mật: upload SVG độc hại
[Thao tác] Bấm "Chọn tệp SVG" → chọn `unsafe-seating-map.svg` → xem phần xem trước (preview)
hiện lên khu vực `zone-unsafe` màu đỏ, KHÔNG có popup `alert("unsafe")` nào bật lên → bấm "Tải lên &
Lưu" → mở tab Network, click vào request `POST .../seating-map` vừa gửi, xem tab Response.

[Lời thoại] "Đây là phần quan trọng nhất của video này. File SVG mình vừa chọn có chèn sẵn một
thẻ script gây alert — một kiểu tấn công XSS kinh điển nếu hệ thống nhúng SVG người dùng tải lên mà
không xử lý gì. Ngay khi preview hiện ra, không có popup nào bật lên — vì phía frontend đã tự lọc bỏ
thẻ script trước khi render preview. Nhưng bằng chứng thật sự nằm ở response của server: mình mở
Network tab, xem JSON trả về..."

**[Thao tác tiếp]** Chỉ vào field `removedElements` trong JSON response, đọc to giá trị (ví dụ
`["script"]`).

[Lời thoại] "Response ghi rõ `removedElements: ["script"]` — nghĩa là thẻ script đã bị loại bỏ
ngay tại backend trước khi file được lưu vào storage, chứ không phải chỉ ẩn ở giao diện."


### Cảnh 3 — Sơ đồ hợp lệ đối chứng, chọn zone, mapping ticket-type
[Thao tác] Bấm "Tải lên lại sơ đồ" → chọn `test-seating-map.svg` → thấy cảnh báo màu hổ phách
"Save sẽ thay SVG hiện tại và xoá các seating zone cùng mapping vé đang gắn với SVG cũ" → bấm Lưu →
sau khi lưu xong, click vào từng path trong SVG viewer bên trái, quan sát danh sách zone bên phải
được highlight tương ứng (và ngược lại, hover một zone trong danh sách để thấy path tương ứng sáng
lên trên SVG) → đặt tên, màu cho từng zone → mở modal "Gán khu vực" của một loại vé, tick chọn các
zone → Lưu ánh xạ.

[Lời thoại] "Đổi sang sơ đồ hợp lệ. Mỗi phần tử có `id` trong SVG tự động trở thành một khu vực
có thể chọn. Bấm vào path trên bản đồ thì zone tương ứng trong danh sách bên phải sáng lên, và ngược
lại — highlight hai chiều. Sau khi đặt tên các khu vực, mình gán một loại vé cho nhiều khu vực cùng
lúc — quan hệ N:N giữa ticket-type và zone, ví dụ vé VIP có thể truy cập cả khu VIP trái lẫn VIP
phải."

### Cảnh 4 — DRAFT-only lock
[Thao tác] Rời khỏi editor, quay lại danh sách concert, chọn 1 concert đã PUBLISHED trước đó
(hoặc publish luôn concert vừa cấu hình), rồi vào lại `/organizer/venue-maps/:id` của concert đó.

[Lời thoại] "Khi concert đã publish, quay lại trang sơ đồ chỗ ngồi sẽ thấy toàn bộ chuyển sang
chế độ Chỉ đọc — banner cảnh báo hiện ngay đầu trang, mọi input, nút thêm/sửa/xoá đều bị khoá."


### Cảnh 5 — Venue location picker (Leaflet + Nominatim)
[Thao tác] Quay lại trang sửa concert, cuộn tới khối "Địa điểm & Vị trí" → gõ tên địa điểm vào ô
tìm kiếm (ví dụ "Nhà hát Hòa Bình") → đợi ít nhất 3 ký tự → bấm "Tìm địa điểm" → chọn 1 kết quả từ
danh sách trả về → quan sát bản đồ Leaflet tự zoom tới marker → kéo thả marker sang vị trí khác để
tinh chỉnh toạ độ chính xác.

[Lời thoại] "Thay vì nhập tay latitude/longitude, organizer gõ tên địa điểm, hệ thống gọi dịch vụ
Nominatim của OpenStreetMap để tìm toạ độ, rồi có thể kéo thả marker để tinh chỉnh vị trí chính xác
trên bản đồ."


---

## O3. Marketplace authoring

**Thời lượng ước tính:** 4–5 phút

**Chuẩn bị:**
- Đăng nhập `organizer@ticketbox.test`, có sẵn 1 concert DRAFT hoặc PUBLISHED (các field này sửa
  được ở mọi trạng thái, không bị khoá theo DRAFT như seating map)
- Có sẵn ít nhất 2–3 nghệ sĩ đã tồn tại trong hệ thống để tìm và chọn (từ dữ liệu seed)

### Cảnh 1 — Gắn EventType
[Thao tác] Vào trang sửa concert, khối "Chi tiết sự kiện" → đổi dropdown "Loại sự kiện" từ Hoà
nhạc sang một giá trị khác rồi đổi lại (demo đủ 6 lựa chọn: Hoà nhạc, Hội thảo, Thể thao, Điện ảnh,
Kịch, Khuyến mãi).

[Lời thoại] "EventType quyết định concert này được phân loại ở đâu trên marketplace — ví dụ lọc
theo danh mục 'Thể thao' hay 'Điện ảnh' ở trang khám phá sự kiện."

### Cảnh 2 — Trường SEO
[Thao tác] Cuộn tới khối "Tối ưu tìm kiếm (SEO)" → điền Tiêu đề chia sẻ, Mô tả ngắn, URL ảnh
Thumbnail; sau đó xoá trắng cả 3 field để chỉ vào placeholder tự động sinh (`Tự động: "..."`).

[Lời thoại] "Ba trường SEO này hoàn toàn tuỳ chọn — nếu để trống, hệ thống tự dùng tiêu đề, mô tả
và poster của concert để hiển thị khi link được chia sẻ lên mạng xã hội hoặc lên Google."

### Cảnh 3 — Upload banner
[Thao tác] Khối "Đa phương tiện" → bấm vào ô Banner (khác với ô Poster ngay bên dưới) → chọn 1
ảnh ngang.

[Lời thoại] "Banner khác với Poster — Poster là ảnh dọc dùng làm ảnh đại diện chính, Banner là
ảnh ngang dùng cho các vị trí hiển thị nổi bật trên marketplace."

### Cảnh 4 — Liên kết nhiều nghệ sĩ theo thứ tự
[Thao tác] Khối "Nghệ sĩ liên kết" → gõ tìm và thêm nghệ sĩ A, rồi nghệ sĩ B, rồi nghệ sĩ C →
dùng nút mũi tên lên/xuống cạnh mỗi nghệ sĩ để đổi B lên vị trí đầu tiên → bấm "Lưu thay đổi" ở cuối
form.

[Lời thoại] "Có thể gắn nhiều nghệ sĩ cho một concert và sắp xếp thứ tự hiển thị bằng nút mũi
tên lên/xuống — không phải kéo-thả. Nghệ sĩ đứng đầu danh sách sau khi sắp xếp sẽ là nghệ sĩ chính."


---

## O4. AI Artist Bio

**Thời lượng ước tính:** 5 phút

**Chuẩn bị:**
- Đăng nhập `organizer@ticketbox.test`, có 1 concert bất kỳ
- Chuẩn bị sẵn 1 file PDF nhỏ (dưới 5MB) làm "press kit" mẫu — nội dung PDF không quan trọng, chỉ
  cần có text để trích xuất được
- Vì worker AI chạy nền qua BullMQ, cần đảm bảo `apps/worker` đang chạy trước khi quay, nếu không
  job sẽ kẹt ở trạng thái DRAFT/PROCESSING mãi mãi

### Cảnh 1 — Upload PDF press kit
[Thao tác] Trong trang sửa concert, cuộn tới khối "Tiểu sử nghệ sĩ (AI)" → bấm "Tải lên PDF press
kit" → chọn file PDF chuẩn bị sẵn.

[Lời thoại] "Thay vì organizer tự viết tiểu sử nghệ sĩ, hệ thống có thể tự sinh bằng AI từ một
file PDF press kit — tài liệu giới thiệu nghệ sĩ mà ban tổ chức thường có sẵn."

### Cảnh 2 — Trạng thái xử lý & polling
[Thao tác] Ngay sau khi upload, quan sát UI chuyển qua trạng thái "Đang xếp hàng tạo tiểu sử…"
rồi tự chuyển sang "Đang tạo tiểu sử…" mà không cần bấm refresh — để camera đứng yên khoảng 5–10
giây ở bước này.

[Lời thoại] "Không cần bấm F5 — giao diện tự động hỏi lại trạng thái mỗi 5 giây trong lúc job
đang chạy, và tự dừng hỏi ngay khi có kết quả."


### Cảnh 3 — Duyệt & publish
[Thao tác] Khi trạng thái chuyển sang hiển thị đoạn tiểu sử do AI sinh ra, đọc qua nội dung, rồi
bấm "Duyệt & công khai".

[Lời thoại] "Tiểu sử AI sinh ra được hiển thị để organizer xem lại trước khi công khai. Bấm
Duyệt & công khai để đẩy nội dung này lên trang chi tiết concert cho khán giả xem."


### Cảnh 4 — Trường hợp thất bại & thử lại
[Thao tác] (Tuỳ chọn, nếu có thể mô phỏng lỗi — ví dụ upload PDF rỗng/hỏng hoặc tắt adapter AI
tạm thời) Quan sát trạng thái FAILED hiện thông báo lỗi, số lần thử `retryCount/maxAttempts`, thời
điểm được thử lại tiếp theo, nút "Thử lại" bị disable cho tới khi qua thời điểm đó.

[Lời thoại] "Nếu job thất bại, hệ thống không cho bấm thử lại ngay lập tức — phải chờ đúng thời
gian backoff đã tính, tránh gọi dồn dập vào adapter AI đang gặp sự cố."

---

## O5. Guest-list VIP

**Thời lượng ước tính:** 6 phút

**Chuẩn bị:**
- Cần **cả 2 phiên đăng nhập**: `organizer@ticketbox.test` cho phần giới thiệu bối cảnh, và bắt buộc
  chuyển sang `admin@ticketbox.test` để vào trang `/admin/concerts/:id/guest-list` — route này chỉ
  cấp cho ADMIN trong router, tổ chức viên không có trang này
- Chuẩn bị sẵn 2 file CSV: 1 file hợp lệ (vài dòng khách VIP đúng định dạng theo CSV mẫu tải từ hệ
  thống) và 1 file có vài dòng cố tình sai định dạng để demo partial-failure
  để bỏ file CSV vào thư mục inbox cấu hình sẵn và quan sát log

### Cảnh 1 — Giới thiệu luồng nhập danh sách khách VIP

[Thao tác] Đăng nhập admin, mở concert và vào khu vực quản lý danh sách khách VIP. Chỉ vào nút upload file cùng bảng trạng thái các batch import.

[Lời thoại] "Mỗi danh sách khách VIP gắn với một concert. Admin upload file danh sách, hệ thống tạo một batch để theo dõi toàn bộ quá trình nhập dữ liệu của file đó."

[Lời thoại] "Tại đây người quản lý nhìn thấy batch đang chờ, đang xử lý hoặc đã hoàn tất; nhờ vậy có thể biết file nào đã được xử lý và file nào cần kiểm tra lại."

### Cảnh 2 — Nhập CSV từ nguồn đã chuẩn bị

[Thao tác] Chọn concert, đưa file CSV khách VIP đã chuẩn bị vào luồng nhập danh sách. Mở màn hình theo dõi batch để xem trạng thái thay đổi.

[Lời thoại] "Hệ thống nhận file theo concert đã chọn, tạo một batch import và đưa batch vào xử lý nền. Người quản lý có thể rời màn hình trong khi việc kiểm tra danh sách vẫn tiếp tục."

[Lời thoại] "Khi xử lý hoàn tất, batch hiển thị số dòng hợp lệ và các dòng cần sửa. Cách này giúp danh sách khách VIP được nhập theo một quy trình có thể theo dõi thay vì thêm từng người thủ công."

### Cảnh 3 — Luồng (b): Upload CSV qua web UI Admin
[Thao tác] Đăng nhập `admin@ticketbox.test`, vào `/admin/concerts/:id/guest-list` (từ trang danh
sách concert Admin) → bấm "Tải CSV template" để tải file mẫu → mở file mẫu cho khán giả xem cấu trúc
cột → chọn file CSV hợp lệ đã chuẩn bị → bấm "Upload CSV".

[Lời thoại] "Trang này có validate ngay từ phía client trước khi gửi — sai định dạng hay quá
kích thước sẽ báo lỗi tại đây, không cần đợi round-trip lên server. Sau khi upload, một batch mới
xuất hiện trong bảng Lịch sử import với đầy đủ counters: tổng dòng, hợp lệ, đã import, trùng, sai,
xung đột."

### Cảnh 4 — Upload lại đúng file (idempotent) & bằng chứng checksum
[Thao tác] Upload lại **chính xác** file CSV vừa dùng ở Cảnh 3 (không đổi 1 byte nào) → quan sát
thông báo hệ thống trả về ("Tệp đã được gửi trước đó; đang dùng batch #...") thay vì tạo batch mới,
và cột checksum trong bảng lịch sử vẫn là 1 dòng duy nhất.

[Lời thoại] "Đây là điểm quan trọng: upload lại đúng file này không tạo ra batch trùng lặp. Hệ
thống nhận ra qua checksum nội dung file, không phải theo tên file hay thời gian upload."


### Cảnh 5 — Partial failure & xem báo cáo
[Thao tác] Upload file CSV có vài dòng cố tình sai (thiếu cột bắt buộc, trùng định danh trong
cùng file) → sau khi batch chuyển COMPLETED_WITH_ERRORS, bấm "Xem report" → xem bảng chi tiết từng
dòng (IMPORTED/DUPLICATE/INVALID) → bấm tải JSON report.

[Lời thoại] "Một vài dòng lỗi không làm hỏng cả file — các dòng hợp lệ vẫn được import bình
thường, chỉ những dòng lỗi được đánh dấu riêng kèm lý do cụ thể, và toàn bộ chi tiết này tải được về
dưới dạng JSON để đối chiếu."

---

## O6. Dashboard & phòng chờ ảo

**Thời lượng ước tính:** 5 phút

**Chuẩn bị:**
- Đăng nhập `organizer@ticketbox.test`, có ít nhất vài concert với trạng thái khác nhau và một ít
  dữ liệu bán vé/check-in để dashboard không trống trơn
- Chọn 1 concert cụ thể để demo phần Phòng chờ ảo trong trang sửa concert

### Cảnh 1 — Organizer Dashboard
[Thao tác] Vào `/organizer/dashboard` → chỉ vào 3 thẻ KPI đầu trang (Tổng doanh thu, Sự kiện
đang hoạt động, Tỉ lệ check-in trung bình) → đổi dropdown khoảng thời gian của biểu đồ (7/14/30/90
ngày) để thấy đường biểu đồ tốc độ bán vé đổi theo → cuộn xuống bảng "Sự kiện đang hoạt động" → chỉ
vào donut "Trạng thái Check-in trực tiếp" bên phải → bấm Quick Actions "Quản lý sự kiện" và "Quản lý
sơ đồ ghế".

[Lời thoại] "Dashboard tổng quan cho organizer gồm 3 thẻ thống kê, biểu đồ tốc độ bán vé theo
khoảng thời gian tuỳ chọn, bảng các sự kiện đang hoạt động, biểu đồ tròn tỉ lệ check-in trực tiếp, và
lối tắt Quick Actions sang 2 màn hình hay dùng nhất."


### Cảnh 2 — Vào phần Phòng chờ ảo trong trang sửa concert
[Thao tác] Vào `/organizer/concerts/:id/edit` → cuộn xuống khối "Phòng chờ ảo" ở cuối form bên
trái → quan sát badge trạng thái hiện tại ("Đang tắt"/"Chờ bật thủ công"/...) và dòng chữ "Chế độ tự
động không phản ánh trạng thái tải Redis hiện tại".

[Lời thoại] "Cấu hình phòng chờ ảo nằm ngay trong trang sửa concert, dùng chung code giữa
Organizer và Admin. Badge ở đây cho biết chế độ vận hành hiện tại, và có ghi chú rõ: chế độ tự động
hiển thị ở đây là cấu hình đã lưu, không phản ánh tải Redis thời gian thực."

### Cảnh 3 — Sửa cấu hình, phân biệt draft chưa lưu vs đã lưu
[Thao tác] Bật toggle "Bật phòng chờ", để nguyên "Kích hoạt tự động" tắt, sửa số
`maxConcurrency` xuống còn 5 → quan sát dòng chữ hổ phách "Có thay đổi chưa lưu" xuất hiện ngay, và
cảnh báo "Giới hạn này rất thấp và có thể khiến người dùng chờ lâu. Chỉ nên dùng cho demo hoặc kiểm
thử" hiện ra ngay dưới ô nhập → bấm "Lưu cấu hình".

[Lời thoại] "Ngay khi sửa số, hệ thống báo có thay đổi chưa lưu — phân biệt rõ giữa draft đang
gõ dở trên trình duyệt và cấu hình thật sự đã lưu ở server. Vì mình vừa đặt ngưỡng concurrency rất
thấp, có cảnh báo ngay lập tức."


### Cảnh 4 — 3 nút ghi đè tức thời FORCE_ON / FORCE_OFF / NONE
[Thao tác] Sau khi đã lưu cấu hình với "Bật phòng chờ" = bật (bắt buộc, nếu chưa lưu lần nào các
nút này bị khoá kèm dòng chữ "Hãy lưu cấu hình lần đầu để sử dụng thao tác nhanh"), bấm lần lượt
"Bật ngay" (FORCE_ON) → quan sát badge chuyển "Đang bật thủ công" (xanh) ngay lập tức, không cần bấm
Lưu cấu hình; rồi bấm "Tắt ngay" (FORCE_OFF) → badge chuyển "Tắt khẩn cấp" (đỏ); rồi bấm "Trả về tự
động" (NONE) → badge chuyển theo đúng `autoActivate` đang cấu hình.

[Lời thoại] "3 nút này ghi đè tức thời, độc lập với các ô số bên trên — bấm phát là áp dụng ngay,
không cần bấm Lưu cấu hình trước."


---


---

# Phần Admin

## A1. Quản lý tài khoản & RBAC

**Thời lượng ước tính**: 4-5 phút

**Chuẩn bị**
- Đăng nhập web-admin (`apps/web`) bằng `admin@ticketbox.test` / `demoPassword`.
- Chuẩn bị sẵn ≥ 11 tài khoản trong hệ thống (seed đã có sẵn nhiều tài khoản `seed.staffNN@ticketbox.test`) để trang danh sách có phân trang thật (page size 10).

**Cảnh 1 — Trang danh sách tài khoản: phân trang + hover actions**
[Thao tác] Vào `/admin/accounts`, cuộn qua trang 1, bấm sang trang 2 (component `Pagination`, `PAGE_SIZE = 10` trong `apps/web/src/features/admin/accounts/AccountsList.tsx`). Di chuột qua một dòng tài khoản.
[Lời thoại] "Danh sách tài khoản phân trang 10 dòng/trang. Các nút 'Chỉnh sửa' và 'Đổi trạng thái' chỉ hiện khi rê chuột qua dòng — giữ giao diện gọn khi không thao tác."

**Cảnh 2 — Admin tạo tài khoản bất kỳ (không riêng check-in staff)**
[Thao tác] Bấm "Tạo tài khoản", điền tên hiển thị, email, mật khẩu, chọn vai trò (ví dụ ORGANIZER hoặc AUDIENCE, không chỉ CHECKIN_STAFF), lưu lại.
[Lời thoại] "Admin có thể tạo tài khoản với bất kỳ vai trò nào và đầy đủ trường hồ sơ — form này không upload avatar hộ người dùng, avatar do chính chủ tài khoản tự cập nhật sau."

**Cảnh 3 — Sửa tài khoản & đổi trạng thái (soft-delete only)**
[Thao tác] Bấm "Đổi trạng thái" trên 1 tài khoản, chuyển từ ACTIVE sang DISABLED, lưu.
[Lời thoại] "Hệ thống không xoá cứng tài khoản — chỉ vô hiệu hoá (soft-delete). Dữ liệu lịch sử liên quan (đơn hàng, vé, đánh giá...) vẫn được giữ nguyên vẹn."

### Cảnh 4 — Quyền truy cập trang quản trị

[Thao tác] Đăng xuất khỏi trang quản trị, thử mở lại một trang admin. Sau đó đăng nhập bằng tài khoản không phải admin và thử mở cùng trang. Cuối cùng đăng nhập admin và mở lại.

[Lời thoại] "Khi chưa đăng nhập, người dùng phải xác thực trước khi truy cập màn hình quản trị."

[Lời thoại] "Sau khi đã đăng nhập, hệ thống kiểm tra tiếp vai trò của tài khoản. Tài khoản không có quyền admin bị từ chối; admin mới có thể xem và thực hiện thao tác quản lý."


---

## A2. Cấp phát nhân viên soát vé hàng loạt

**Thời lượng ước tính**: 5 phút

**Chuẩn bị**
- Đăng nhập admin, vào trang chi tiết 1 concert đã `PUBLISHED`, tab "Nhân viên check-in" (panel `BulkCreateStaffPanel`).
- Chuẩn bị sẵn 1 email gốc **chưa từng tồn tại** trong hệ thống, ví dụ `giamsat.demo@ticketbox.test`, để tránh lỗi trùng email khi tạo.

**Cảnh 1 — Nhập thông tin cấp phát hàng loạt**
[Thao tác] Nhập Email cơ sở `giamsat.demo@ticketbox.test`, Số lượng `5`, Tiền tố tên hiển thị `Giám sát cổng`. Quan sát khối "Xem trước email" tự sinh ngay khi gõ (chưa gọi API).
[Lời thoại] "Hệ thống xem trước ngay các email sẽ được tạo: email đầu giữ nguyên, các email sau nối thêm số thứ tự."


[Thao tác] Bấm "Tạo". Sau khi thành công, bảng credential (tên hiển thị / email / **mật khẩu tài khoản**) hiện ngay dưới, kèm dòng chữ: "Mật khẩu sẽ không khả dụng sau khi làm mới trang."
[Lời thoại] "Đây là lần DUY NHẤT mật khẩu dạng plaintext được hiển thị. Nếu Admin refresh trang mà chưa lưu lại, sẽ không có cách nào lấy lại mật khẩu này — kể cả chính Admin cũng không xem lại được."


[Thao tác] Nhập một mật khẩu mở PDF ở ô "Mật khẩu mở PDF" (khác với mật khẩu tài khoản), bấm "Tải xuống PDF".
[Lời thoại] "PDF xuất ra được mã hoá bằng chính mật khẩu mình vừa đặt — ai không có mật khẩu này thì không mở được file, kể cả tải nhầm hay gửi sai người."
- Mở file PDF vừa tải, thử mở bằng trình đọc PDF bất kỳ — hệ thống sẽ hỏi mật khẩu trước khi hiển thị nội dung. Nhập đúng mật khẩu để mở, cho xem bảng đầy đủ: STT / Tên hiển thị / Email / Mật khẩu tài khoản.


[Thao tác] Copy 1 email + mật khẩu từ bảng, thử đăng nhập trên checkin-mobile-app.
[Lời thoại] "Tài khoản vừa tạo đăng nhập được ngay, và đã tự động có assignment vào đúng concert mình chọn lúc cấp phát — không cần thao tác gán thủ công riêng."

---

## A3. Kiểm duyệt nội dung

**Thời lượng ước tính**: 5 phút

**Chuẩn bị**
- Trước khi quay: có sẵn 1 review vi phạm trên 1 concert (tài khoản audience tạo review có nội dung không phù hợp), 1 tranh chấp resale ở trạng thái mở tranh chấp (`resale-dispute`), và 1 bình luận trên listing resale đã bị **3 người dùng khác nhau** gắn cờ trước (để minh hoạ ngưỡng auto-hide — xem giải thích kỹ thuật bên dưới).

**Cảnh 1 — Ẩn review vi phạm**
[Thao tác] Vào trang chi tiết concert trong Admin (`AdminConcertReviewsPanel`), tìm review vi phạm, bấm "Ẩn", tuỳ chọn nhập lý do.
[Lời thoại] "Review vi phạm bị ẩn khỏi trang công khai ngay lập tức, nhưng vẫn được lưu lại trong hệ thống — không xoá cứng — để có thể tra soát sau này."

**Cảnh 2 — Giải quyết tranh chấp resale**
[Thao tác] Vào `/admin/resale-disputes`, mở 1 tranh chấp đang chờ xử lý, xem bằng chứng 2 bên cung cấp, chọn bên thắng/thua, xác nhận quyết định.
[Lời thoại] "Khi buyer và seller trong giao dịch resale bất đồng — ví dụ buyer nói đã chuyển tiền nhưng seller không xác nhận — một trong hai bên có thể mở tranh chấp lúc đơn đang ở trạng thái chờ xác nhận. Admin xem xét rồi ra quyết định cuối cùng."
- [Lời thoại thêm] "Bên thua tranh chấp bị trừ điểm uy tín (trust score) — ảnh hưởng tới các giao dịch resale sau này của họ."

**Cảnh 3 — Gắn cờ/kiểm duyệt bình luận trên listing (cơ chế tự động theo ngưỡng)**
[Thao tác] Mở trang chợ vé resale (`/resale/:listingId`) bằng vai trò audience, tìm bình luận đã có sẵn 2 cờ từ trước, gắn cờ (report) bình luận đó bằng cờ thứ 3.
[Lời thoại] "Đây là điểm khác biệt cần nói rõ: hệ thống hiện tại KHÔNG có một trang duyệt-bằng-tay riêng cho Admin — kiểm duyệt bình luận là cơ chế tự động dựa trên số lượt gắn cờ cộng đồng."


[Thao tác] Vào `/admin/concerts/:id/edit`, tick checkbox "Featured" (`isFeatured`), nhập số vào ô "Display order" (`displayOrder`), lưu.
[Lời thoại] "Concert được đánh dấu Featured sẽ ưu tiên hiển thị ở khu vực nổi bật trên trang chủ marketplace, và displayOrder quyết định thứ tự giữa các concert Featured với nhau — số nhỏ hơn hiển thị trước."
[Thao tác] Mở lại trang chủ audience-web, refresh, chỉ ra vị trí concert vừa đánh dấu đã đổi.

[Lời thoại] "Sau khi concert được đánh dấu nổi bật và lưu, trang chủ audience sắp xếp lại vị trí hiển thị theo cấu hình vừa cập nhật."

---

## A4. Danh mục nghệ sĩ (Admin)

**Thời lượng ước tính**: 4 phút

**Chuẩn bị**
- Đăng nhập admin, có sẵn ≥ 1 nghệ sĩ đã tồn tại để test tìm kiếm/phân trang.

**Cảnh 1 — Danh sách nghệ sĩ: phân trang + tìm kiếm**
[Thao tác] Vào `/admin/artists`, gõ từ khoá tìm kiếm tên nghệ sĩ, quan sát danh sách lọc lại; chuyển trang nếu có nhiều nghệ sĩ.
[Lời thoại] "Trang quản trị nghệ sĩ có phân trang và tìm kiếm ngay trên server — khác với trang tài khoản vốn lọc phía client, danh sách nghệ sĩ gọi API có tham số phân trang/tìm kiếm riêng."

**Cảnh 2 — Tạo nghệ sĩ mới**
[Thao tác] Bấm "Thêm nghệ sĩ", điền tên, slug, mô tả ngắn, lưu.
[Lời thoại] "Nghệ sĩ tạo ở đây sẽ xuất hiện ngay trong danh sách liên kết nghệ sĩ khi Organizer tạo/sửa concert."

**Cảnh 3 — Sửa nghệ sĩ, quản lý active/inactive**
[Thao tác] Mở `/admin/artists/:id/edit`, chỉnh sửa thông tin, gạt trạng thái Active → Inactive, lưu.
[Lời thoại] "Đánh dấu Inactive để tạm ẩn nghệ sĩ khỏi trang khám phá công khai (audience-facing) mà không cần xoá dữ liệu — vẫn giữ được lịch sử liên kết với các concert cũ."

**Cảnh 4 — Upload avatar/poster nghệ sĩ**
[Thao tác] Trong trang sửa nghệ sĩ, upload ảnh đại diện (avatar) và ảnh poster.
[Lời thoại] "Ảnh được upload qua 2 endpoint multipart riêng — avatar và poster — lưu trên object storage (S3-compatible), trả về publicUrl để hiển thị ngay trên trang hồ sơ nghệ sĩ."

---

## A5. Bảo vệ nền tảng

### Cảnh 1 — Giới hạn thao tác nhạy cảm

[Thao tác] Thực hiện liên tiếp một thao tác nhạy cảm đã chuẩn bị để kiểm tra giới hạn. Hiển thị các lượt đầu được chấp nhận, lượt vượt giới hạn nhận thông báo chờ, sau đó thử lại khi thời gian chờ kết thúc.

[Lời thoại] "Các thao tác có nguy cơ bị spam hoặc lạm dụng được cấp số lượt thực hiện trong một khoảng thời gian. Mỗi yêu cầu hợp lệ sử dụng một lượt trong giới hạn đó."

[Lời thoại] "Khi vượt quá số lượt cho phép, hệ thống không tiếp tục xử lý yêu cầu mà thông báo thời điểm có thể thử lại. Sau khi khoảng chờ kết thúc, người dùng có thể thực hiện thao tác bình thường."

### Cảnh 2 — Duy trì phần xem công khai khi có sự cố phụ trợ

[Thao tác] Trong tình huống môi trường demo đã mô phỏng dịch vụ hỗ trợ tạm thời không sẵn sàng, mở trang danh sách concert và trang chi tiết concert. Sau đó thử một thao tác nhạy cảm.

[Lời thoại] "Khi một dịch vụ phụ trợ tạm gặp sự cố, TicketBox vẫn ưu tiên duy trì việc xem concert công khai để audience không bị gián đoạn khám phá sự kiện."

[Lời thoại] "Các thao tác có ảnh hưởng lớn vẫn được kiểm soát thận trọng cho đến khi hệ thống có thể xác minh an toàn. Nhờ vậy, lỗi ở một thành phần không làm toàn bộ nền tảng ngừng hoạt động hoặc mở ra nguy cơ lạm dụng."


## Kết video

[Lời thoại] "Organizer quản lý toàn bộ vòng đời concert, nội dung marketplace, danh sách khách và cấu hình vận hành. Admin quản lý tài khoản, nhân sự, nội dung, danh mục nghệ sĩ và các cơ chế bảo vệ nền tảng."
