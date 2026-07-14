# Script quay video demo — Nhóm 1: KHÁN GIẢ (Audience) — Phần lõi

> Nguồn đối chiếu phạm vi: `docs/video-script-use-cases.md`, mục 1.1–1.4.
> **Cấu trúc:** Mỗi cảnh chỉ nêu thao tác và lời thoại, tập trung vào hành động của người dùng, thứ tự xử lý và kết quả nhìn thấy được.

## Quy ước chung cho cả 6 video

**Tài khoản demo** (đã seed, mật khẩu chung `demoPassword`):
- `audience@ticketbox.test` — audience có sẵn đơn hàng/vé cũ
- `organizer@ticketbox.test` — organizer để bật/tắt phòng chờ, chỉnh mã khuyến mãi
- `admin@ticketbox.test` — admin, dùng khi cần chỉnh cấu hình toàn cục
- Một địa chỉ Gmail **thật do người quay tự chuẩn bị** để test đăng nhập Google (Google Client ID đã cấu hình sẵn trong `.env`, cần một tài khoản Google thật để bấm nút thật trên UI)
- Một email **chưa từng đăng ký** để quay cảnh Đăng ký mới, ví dụ `demo-new-user+<ngày>@ticketbox.test`

**Công cụ cần mở sẵn trước khi quay**:
- Maildev tại `http://localhost:1080` (xem email quên mật khẩu, do `docker-compose.yml` chạy container `ticketbox-maildev`)
- DevTools (tab Network + Application/Storage) trên trình duyệt để minh họa JWT, request idempotency-key, SSE
- Hai cửa sổ trình duyệt riêng biệt (một cửa sổ ẩn danh + một cửa sổ thường, hoặc 2 profile khác nhau) để quay các cảnh 2-phiên-song-song (chống oversell, phòng chờ, số vé còn lại)
- Concert demo gợi ý: **"Chi Dep Dap Gio Re Song Gala"** (slug `chi-dep-dap-gio-re-song-2026`) có ticket-type tồn kho nhỏ (180 vé ở tier thấp nhất) — dễ đẩy về gần hết để demo sold-out/oversell mà không cần seed lại dữ liệu.

**Dữ liệu cần chuẩn bị riêng trước khi bấm quay** (không có sẵn trong seed mặc định, phải set up thủ công):
- Bật Virtual Waiting Room cho concert demo (Organizer → sửa concert → mục "Phòng chờ ảo" → set `maxConcurrency = 1`, `admissionTtlSeconds` khoảng 60–120 giây, `manualOverride = FORCE_ON`) — bắt buộc phải làm bước này trước khi quay A5, nếu không phòng chờ sẽ không kích hoạt vì seed không bật sẵn.

---

## A1. Đăng ký & Đăng nhập

**Thời lượng ước tính**: 5–6 phút

**Chuẩn bị**:
- Chưa đăng nhập ở audience-web (`apps/audience-web`, thường chạy ở `http://localhost:5173`)
- Một email Google thật để test Google Sign-In
- Một email mới hoàn toàn để test đăng ký
- Maildev mở sẵn ở tab khác (`http://localhost:1080`)
- Biết trước: JWT hết hạn sau **1 giờ** (`JWT_EXPIRY=1h` trong `.env`), không có refresh token — audience-web lưu token trong `localStorage` (`ticketbox_audience_token`) và tự đăng xuất khi nhận response 401.

### Cảnh 1 — Đăng ký tài khoản mới
[Thao tác] Vào `/register`, điền Email, Họ và tên, Số điện thoại (tùy chọn), Mật khẩu ≥ 8 ký tự, Xác nhận mật khẩu. Bấm "Đăng ký".
[Lời thoại] "Đây là trang đăng ký dành cho khán giả. Ngoài email và mật khẩu, hệ thống có thu thêm số điện thoại — trường này không bắt buộc, dùng cho các kịch bản liên hệ sau này. Sau khi đăng ký, tài khoản mặc định được gán vai trò AUDIENCE và được đăng nhập luôn, không cần xác thực email trước."

Mở DevTools → Application → Local Storage, chỉ vào key `ticketbox_audience_token`.
[Lời thoại] "Có thể thấy ngay sau khi đăng ký, hệ thống đã lưu một access token JWT vào localStorage của trình duyệt — đây chính là phiên đăng nhập."


### Cảnh 2 — Đăng xuất, đăng nhập lại bằng email/mật khẩu vừa tạo
[Thao tác] Đăng xuất. Vào `/login`, nhập đúng email vừa đăng ký nhưng **sai mật khẩu**. Bấm "Đăng nhập".
[Lời thoại] "Thử đăng nhập với mật khẩu sai để xem hệ thống phản hồi thế nào."
[Thao tác] Chỉ vào thông báo lỗi "Email hoặc mật khẩu không đúng."
[Lời thoại] "Thông báo lỗi luôn chung chung dù sai email hay sai mật khẩu. Cách này tránh để người ngoài đoán được email nào đã có tài khoản."
[Thao tác] Nhập lại đúng mật khẩu, đăng nhập thành công, vào thẳng "Vé của tôi".

[Lời thoại] "Đăng nhập đúng sẽ tạo phiên mới và đưa audience đến khu vực vé của mình, nơi các vé đã mua được quản lý tập trung."

### Cảnh 3 — Đăng nhập / Đăng ký bằng Google
[Thao tác] Đăng xuất. Vào `/login`, bấm nút Google Sign-In, chọn tài khoản Google thật đã chuẩn bị.
[Lời thoại] "TicketBox hỗ trợ đăng nhập bằng Google ở cả trang Login lẫn trang Register — trước đây nút này chỉ có ở trang Login, giờ đã có cả hai nơi. Lần đầu đăng nhập Google, hệ thống tự tạo tài khoản audience mới; những lần sau sẽ nhận diện và đăng nhập vào đúng tài khoản đó."
[Thao tác] Đăng xuất, quay lại thử đăng nhập Google bằng **email trùng với tài khoản email/mật khẩu đã đăng ký ở Cảnh 1**.
[Lời thoại] "Trường hợp email Google trùng với một tài khoản đã đăng ký bằng mật khẩu từ trước, hệ thống sẽ không tự động gộp — nó yêu cầu liên kết tường minh, và ở đây báo lỗi 'Email này đã có tài khoản TicketBox, hãy đăng nhập bằng mật khẩu' để tránh chiếm đoạt tài khoản qua việc giả mạo email."

### Cảnh 4 — Quên mật khẩu / Đặt lại mật khẩu
[Thao tác] Từ trang Login, bấm "Quên mật khẩu?" → vào `/forgot-password`, nhập email đã đăng ký ở Cảnh 1, bấm "Gửi yêu cầu".
[Lời thoại] "Đây là luồng quên mật khẩu đã có thể sử dụng đầy đủ trên hệ thống."
[Thao tác] Chuyển qua tab Maildev (`localhost:1080`), mở email vừa nhận, copy link reset.
[Lời thoại] "Vì đây là môi trường demo, email được bắt lại bởi Maildev thay vì gửi thật. Link reset có dạng `/reset-password?token=...`."
[Thao tác] Dán link vào trình duyệt, nhập mật khẩu mới (≥ 8 ký tự) + xác nhận, bấm "Cập nhật mật khẩu". Chờ tự động chuyển hướng về Login, đăng nhập bằng mật khẩu mới.

[Lời thoại] "Sau khi mật khẩu mới được lưu, mật khẩu cũ không còn dùng được. Việc đăng nhập lại xác nhận tài khoản đã chuyển sang thông tin bảo mật mới."


### Cảnh 5 — Kết
[Lời thoại] "Như vậy phần đăng ký, đăng nhập, Google Sign-In, quên/đặt lại mật khẩu, và cơ chế phiên JWT đã được trình bày đầy đủ. Phần tiếp theo sẽ đi vào khám phá sự kiện."

---

## A2. Khám phá sự kiện

**Thời lượng ước tính**: 5–6 phút

**Chuẩn bị**: Đã đăng nhập bằng `audience@ticketbox.test`. Concert demo: "Chi Dep Dap Gio Re Song Gala" (còn nhiều vé) và một concert khác đã hết hạn/sold-out nếu có sẵn trong seed để đối chứng trạng thái.

### Cảnh 1 — Trang chủ (Homepage / Marketplace homepage)
[Thao tác] Vào `/` (trang chủ audience-web).
[Lời thoại] "Trang chủ có hero carousel giới thiệu các sự kiện nổi bật, thanh tìm kiếm ngay đầu trang, danh mục sự kiện theo thành phố dạng tab, và lưới danh mục phổ biến bên dưới."
[Thao tác] Lướt qua carousel, bấm đổi tab thành phố (ví dụ Hà Nội → TP.HCM) để cho thấy danh sách concert đổi theo, bấm vào một category card.

[Lời thoại] "Đổi thành phố hoặc chọn danh mục sẽ thay đổi tập concert đang được hiển thị, giúp audience bắt đầu khám phá từ nhu cầu cụ thể."

### Cảnh 2 — Tìm kiếm & lọc sự kiện
[Thao tác] Dùng thanh tìm kiếm ở trang chủ, gõ từ khóa tên concert (ví dụ "Anh Trai"), xem gợi ý/kết quả. Vào trang danh sách `/events`, thử lọc theo thành phố, loại sự kiện, khoảng ngày, khoảng giá, rồi đổi cách sắp xếp (mới nhất/giá tăng/giá giảm).
[Lời thoại] "Bộ lọc ở đây hỗ trợ tìm theo văn bản, thành phố, loại sự kiện, khoảng ngày và khoảng giá cùng lúc. Một điểm hay là các lựa chọn lọc được lưu thẳng vào URL."
[Thao tác] Copy URL sau khi lọc, dán vào tab mới để cho thấy bộ lọc được giữ nguyên. Sau đó thử một từ khóa không tồn tại để lên trạng thái "không có kết quả".

[Lời thoại] "Các điều kiện lọc nằm trong đường dẫn nên khi mở lại đường dẫn đó, trang khôi phục đúng lựa chọn. Nếu không có concert phù hợp, hệ thống hiển thị trạng thái không có kết quả thay vì để trang trống."

### Cảnh 3 — Trang chi tiết sự kiện: sơ đồ chỗ ngồi & trạng thái mở bán
[Thao tác] Vào trang chi tiết concert demo. Chỉ vào sơ đồ chỗ ngồi tương tác (SVG theo từng khu vực/ticket-type), hover/click từng khu vực để bảng loại vé bên cạnh highlight tương ứng.
[Lời thoại] "Sơ đồ chỗ ngồi này được organizer upload dưới dạng SVG và ánh xạ theo từng zone với từng loại vé. Nếu concert nào chưa có sơ đồ SVG, hệ thống sẽ fallback về ảnh tĩnh."
[Thao tác] Chỉ vào chỉ báo trạng thái mở bán (ví dụ "Đang mở bán" / "Sắp mở bán" / "Đã đóng") của từng loại vé.

[Lời thoại] "Trạng thái mở bán cho biết ngay loại vé có thể mua ở thời điểm hiện tại, cần chờ đến thời điểm mở bán hay đã kết thúc bán."

### Cảnh 4 — Chứng minh số vé còn lại cập nhật realtime bằng 2 phiên
[Thao tác] Mở 2 cửa sổ trình duyệt (một thường, một ẩn danh) cùng vào trang chi tiết concert demo, cùng nhìn số vé còn lại của một loại vé sắp hết (ví dụ chỉ còn 3 vé). Ở cửa sổ 1, chọn mua 2 vé loại đó và thanh toán xong (có thể lướt nhanh, chi tiết luồng thanh toán sẽ quay kỹ ở video A5). Sau đó refresh cửa sổ 2.
[Lời thoại] "Sau khi cửa sổ 1 mua thành công 2 vé, số vé còn lại ở cửa sổ 2 giảm tương ứng. Nếu đẩy hết tồn kho của loại vé này, trạng thái sẽ chuyển hẳn sang Sold Out và nút chọn mua bị khóa."

### Cảnh 5 — Bản đồ địa điểm, tiểu sử nghệ sĩ, đánh giá
[Thao tác] Cuộn xuống phần bản đồ (Leaflet) hiển thị đúng vị trí venue.
[Lời thoại] "Bản đồ dùng tọa độ venue đã được organizer chọn sẵn qua Nominatim khi tạo concert, hiển thị lại bằng Leaflet ở đây — không phải nhập tay tọa độ."
[Thao tác] Cuộn tiếp xuống phần tiểu sử nghệ sĩ đã publish, và phần đánh giá (review) của concert.

[Lời thoại] "Phần cuối trang bổ sung bối cảnh về nghệ sĩ và trải nghiệm của người đã tham dự, giúp audience có thêm thông tin trước khi quyết định mua vé."

### Cảnh 6 — SEO meta tag
[Thao tác] Bấm chuột phải → "View Page Source" (hoặc DevTools → Elements → thẻ `<head>`) ngay trên trang chi tiết concert.
[Lời thoại] "Mỗi trang — chủ, danh sách, chi tiết — đều có thẻ meta SEO riêng: title, description, Open Graph, được sinh động theo nội dung concert, phục vụ chia sẻ mạng xã hội và index công cụ tìm kiếm."
[Thao tác] Chỉ vào các thẻ `<meta property="og:...">`, `<title>` tương ứng với tên concert.

[Lời thoại] "Thông tin chia sẻ của trang được đặt theo concert đang xem, vì vậy khi gửi liên kết, tiêu đề và mô tả phản ánh đúng sự kiện đó."

---

## A3. Khám phá nghệ sĩ

**Thời lượng ước tính**: 4 phút

**Chuẩn bị**: Đã đăng nhập `audience@ticketbox.test`. Nghệ sĩ demo có sẵn trong seed, ví dụ "Son Tung M-TP" (slug `son-tung-mtp`), "My Tam", "Den Vau"...

### Cảnh 1 — Danh sách & tìm kiếm nghệ sĩ
[Thao tác] Vào trang danh sách nghệ sĩ (`/artists` hoặc menu tương ứng). Gõ từ khóa tìm một nghệ sĩ.
[Lời thoại] "Đây là trang khám phá nghệ sĩ dành riêng cho khán giả — trước đây trong tài liệu bị xếp nhầm sang phần Organizer, thực chất đây là tính năng public."

### Cảnh 2 — Nghệ sĩ được yêu thích nhiều nhất
[Thao tác] Chỉ vào khu vực "Top Favorite Artists" trên trang danh sách/trang chủ nghệ sĩ.
[Lời thoại] "Danh sách này xếp hạng theo số lượt favorite thực tế từ khán giả."

### Cảnh 3 — Trang hồ sơ nghệ sĩ theo slug
[Thao tác] Bấm vào một nghệ sĩ để vào trang hồ sơ (URL dạng `/artists/son-tung-mtp`).
[Lời thoại] "Mỗi nghệ sĩ có một trang hồ sơ riêng theo slug, gồm tiểu sử, ảnh đại diện/poster."
[Thao tác] Cuộn xuống phần Timeline sự kiện của nghệ sĩ này.
[Lời thoại] "Timeline liệt kê các concert nghệ sĩ này từng/sẽ tham gia, sắp xếp theo thời gian."

### Cảnh 4 — Follow / Favorite nghệ sĩ
[Thao tác] Bấm nút "Theo dõi" (Follow) và nút "Yêu thích" (Favorite) trên trang hồ sơ nghệ sĩ — chỉ ra đây là 2 hành động khác nhau.
[Lời thoại] "Follow và Favorite là hai khái niệm tách biệt trong hệ thống — follow để nhận thông báo khi có sự kiện mới của nghệ sĩ, favorite là đánh dấu yêu thích, ảnh hưởng tới bảng xếp hạng Top Favorite vừa xem."
[Thao tác] Refresh trang, cho thấy trạng thái follow/favorite được giữ nguyên (không bị mất khi tải lại).

[Lời thoại] "Việc tải lại trang chứng minh hai lựa chọn được lưu cho đúng tài khoản, không chỉ là thay đổi tạm thời trên giao diện."

---

## A4. Yêu thích & tài khoản cá nhân

**Thời lượng ước tính**: 4 phút

**Chuẩn bị**: Đã đăng nhập `audience@ticketbox.test`.

### Cảnh 1 — Yêu thích concert
[Thao tác] Vào trang chi tiết một concert, bấm icon trái tim (favorite) để toggle yêu thích. Vào trang "Concert yêu thích" (`/favorites` hoặc mục tương ứng trong Account).
[Lời thoại] "Khán giả có thể đánh dấu yêu thích ngay trên trang chi tiết concert. Danh sách các concert đã thích được gom lại ở một trang riêng, tiện theo dõi các show sắp mở bán."
[Thao tác] Bấm lại icon trái tim để bỏ yêu thích, quay lại trang danh sách để xác nhận concert đã biến mất khỏi danh sách.

[Lời thoại] "Khi bỏ yêu thích, concert được xóa khỏi danh sách cá nhân ngay để danh sách luôn phản ánh các show audience còn muốn theo dõi."

### Cảnh 2 — Trang tài khoản
[Thao tác] Vào `/account`.
[Lời thoại] "Trang tài khoản là trung tâm điều hướng — từ đây có thể sang đơn hàng, vé, yêu thích, hồ sơ ngân hàng (cho người bán lại vé), lịch sử giao dịch."
[Thao tác] Chỉ lướt qua các mục điều hướng trên trang.

[Lời thoại] "Từ trang tài khoản, audience có thể đi đến đúng nhóm thông tin cần quản lý mà không phải tìm lại trong menu của toàn hệ thống."

### Cảnh 3 — Sửa hồ sơ tự phục vụ
[Thao tác] Vào mục sửa hồ sơ, đổi tên hiển thị, số điện thoại, bấm Lưu.
[Lời thoại] "Đổi thông tin hồ sơ áp dụng ngay, không cần admin can thiệp."
[Thao tác] Đổi avatar — upload ảnh mới qua `AvatarUploader`.
[Lời thoại] "Ảnh đại diện được validate định dạng/kích thước trước khi upload lên storage."

### Cảnh 4 — Đổi mật khẩu tự phục vụ
[Thao tác] Vào mục đổi mật khẩu, nhập mật khẩu hiện tại + mật khẩu mới, Lưu.
[Lời thoại] "Đổi mật khẩu tự phục vụ yêu cầu xác nhận đúng mật khẩu cũ trước khi cho đổi — không cho đổi mù."
[Thao tác] Đăng xuất, đăng nhập lại bằng mật khẩu mới để xác nhận đã đổi thành công.

[Lời thoại] "Đăng nhập lại thành công bằng mật khẩu mới chứng minh thay đổi đã có hiệu lực cho những phiên đăng nhập về sau."

---

## A5. Luồng mua vé chính (Golden Path)

**Thời lượng ước tính**: 7–8 phút — video quan trọng nhất, nhiều khối giải thích kỹ thuật.

**Chuẩn bị**:
- Concert demo đã được **Organizer bật Virtual Waiting Room** với `manualOverride = FORCE_ON`, `maxConcurrency = 1`, `admissionTtlSeconds` khoảng 90–120 giây (làm trước khi quay, qua Organizer console → sửa concert → mục Phòng chờ ảo).
- Chuẩn bị một loại vé còn số lượng thấp để minh họa trạng thái sắp hết vé và hết vé.
- Promo code `WELCOME10` (giảm 10%, tối đa 200.000đ) — dùng để demo áp mã.
- 2 phiên trình duyệt độc lập (2 tài khoản audience khác nhau, hoặc 1 tài khoản + 1 ẩn danh dùng tài khoản audience phụ) để demo chống oversell và demo phòng chờ.
- Sẵn 3 cổng thanh toán sandbox: SIMULATOR (tự hoàn tất ngay), MOMO, VNPAY.

### Cảnh 1 — Vào phòng chờ ảo (Virtual Waiting Room)
[Thao tác] Từ trang chi tiết concert demo, chọn loại vé + số lượng, bấm "Mua vé" để vào `/checkout`. Vì phòng chờ đang `FORCE_ON`, trang checkout sẽ hiện thẳng khối "Phòng chờ mua vé" thay vì form xác nhận đơn thông thường.
[Lời thoại] "Vì tổ chức đã bật phòng chờ ảo cho concert này, thay vì vào thẳng bước xác nhận đơn, khán giả được đưa vào hàng chờ trước."
[Thao tác] Mở DevTools → Network, chỉ vào request `GET /waiting-room/:concertId/stream-token` rồi request `GET /waiting-room/:concertId/stream` (loại `eventsource`), quan sát vị trí hàng chờ tự cập nhật vài giây một lần mà không cần bấm refresh.

[Lời thoại] "Vị trí hàng chờ được cập nhật tự động. Audience chỉ cần chờ đến lượt, không phải tải lại trang hay gửi lại yêu cầu mua vé."


### Cảnh 2 — Tới lượt, admission token, tạo đơn giữ chỗ
[Thao tác] Đợi (hoặc vì `maxConcurrency=1` và chỉ một mình đang xếp hàng nên gần như vào ngay) tới khi trạng thái đổi thành "Đã đến lượt bạn vào thanh toán", bấm "Tiếp tục đặt vé".
[Lời thoại] "Ngay khi tới lượt, hệ thống cấp một admission token gắn với đúng phiên này. Token đó được gửi kèm khi tạo đơn hàng."
[Thao tác] Nhập mã khuyến mãi `WELCOME10` ở ô mã giảm giá, bấm Áp dụng — quan sát breakdown giá cập nhật (giảm giá + phí dịch vụ) ngay trên khung tóm tắt bên phải. Bấm "Xác nhận đặt vé".
[Lời thoại] "Ngay khi bấm xác nhận, đơn hàng được tạo ở trạng thái chờ thanh toán, kèm đồng hồ đếm ngược 15 phút giữ chỗ."


### Cảnh 3 — Chống oversell: 2 tab mua cùng vé cuối cùng
[Thao tác] Trước khi thanh toán đơn ở Cảnh 2, dùng phiên trình duyệt thứ hai (tài khoản audience khác) cũng chọn mua đúng loại vé đó với số lượng bằng đúng số vé còn lại. Nếu phòng chờ FORCE_ON đang giữ `maxConcurrency=1`, tạm chuyển `manualOverride` về `NONE`/tắt để 2 phiên vào thẳng bước tạo đơn (chỉ để tách riêng phần demo chống oversell với phần demo phòng chờ, tránh gây nhiễu).
[Lời thoại] "Giờ mô phỏng tình huống hai người cùng bấm mua vé cuối cùng gần như đồng thời."
[Thao tác] Bấm "Xác nhận đặt vé" ở cả hai tab liên tiếp thật nhanh. Một tab sẽ tạo đơn thành công, tab còn lại nhận lỗi kiểu "Không đủ số lượng vé" (`InsufficientTicketInventoryError`).

[Lời thoại] "Một yêu cầu giữ được vé tạo đơn chờ thanh toán; yêu cầu còn lại được báo không đủ vé. Kết quả này cho thấy cùng một số vé không thể được giữ cho hai người."


### Cảnh 4 — Giới hạn lượt dùng mã khuyến mãi

[Thao tác] Dùng mã khuyến mãi có số lượt sử dụng còn lại thấp. Áp mã cho một đơn hợp lệ để thấy giá giảm. Sau khi số lượt cho phép đã được dùng hết, dùng tài khoản khác áp lại chính mã đó.

[Lời thoại] "Mỗi mã khuyến mãi có điều kiện áp dụng và số lượt được dùng. Khi khách nhập mã, hệ thống kiểm tra mã còn hiệu lực, có phù hợp với đơn hàng và còn lượt sử dụng hay không. Nếu hợp lệ, phần tóm tắt đơn cập nhật ngay số tiền giảm và tổng tiền phải thanh toán."

[Lời thoại] "Khi số lượt cho phép đã được sử dụng hết, lần áp mã tiếp theo bị từ chối và đơn hàng giữ nguyên giá ban đầu. Khách được báo rõ mã không còn áp dụng được, thay vì vẫn tiếp tục checkout với mức giá sai."

### Cảnh 5 — Idempotent payment & Circuit breaker khi khởi tạo thanh toán
[Thao tác] Quay lại đơn hàng đã tạo, bấm nút thanh toán hai lần liên tiếp rồi mở chi tiết đơn và ví vé.

[Lời thoại] "Khi khách bấm thanh toán lặp lại, TicketBox nhận diện các thao tác này cùng thuộc một đơn đang chờ thanh toán. Hệ thống giữ nguyên một lượt thanh toán cho đơn đó, không tạo thêm đơn hay giữ thêm vé."

[Lời thoại] "Sau khi thanh toán thành công, đơn chuyển sang đã thanh toán và vé được phát hành đúng một lần. Nếu khách thao tác lại hoặc nhận lại cùng xác nhận, họ vẫn xem cùng một đơn và đúng số vé đã mua."

### Cảnh 6 — Cổng thanh toán tạm thời lỗi

[Thao tác] Trong môi trường demo đã chuẩn bị cổng thanh toán ở trạng thái lỗi, thử thanh toán nhiều lần. Hiển thị phản hồi nhanh sau các lỗi liên tiếp, sau đó khôi phục cổng và thử lại.

[Lời thoại] "Khi cổng thanh toán đang lỗi liên tiếp, TicketBox tạm dừng gửi thêm yêu cầu đến cổng đó. Người dùng nhận kết quả nhanh thay vì chờ lâu trong một giao dịch khó hoàn tất."

[Lời thoại] "Sau một khoảng chờ, hệ thống thử lại để kiểm tra cổng đã hoạt động chưa. Khi cổng phục hồi, luồng thanh toán tiếp tục bình thường."

### Cảnh 7 — Thanh toán thành công & polling kết quả
[Thao tác] Quay lại flow bình thường, hoàn tất thanh toán qua SIMULATOR (tự động outcome success) hoặc thử một lượt qua VNPay sandbox / MoMo sandbox thật (quét QR/redirect theo hướng dẫn sandbox). Trong lúc chờ, quan sát trang "Đang xử lý thanh toán..." tự động polling.
[Lời thoại] "Trang kết quả thanh toán tự động gọi lại API chi tiết đơn hàng mỗi 3 giây cho tới khi đơn chuyển sang trạng thái cuối — Paid, Failed, Cancelled hay Expired — không cần người dùng tự bấm refresh. Với MoMo, nếu người dùng quay lại qua trình duyệt trước khi có IPN chính thức, trang có thêm một bước đồng bộ dự phòng gọi thẳng API IPN; còn với VNPay, kết quả bắt buộc phải được xác nhận qua IPN từ backend, trang chỉ đọc lại trạng thái chứ không tự suy luận kết quả từ URL callback."
[Thao tác] Khi đơn chuyển `PAID`, bấm "Xem vé" để dẫn sang trang vé.

[Lời thoại] "Khi đơn đã thanh toán, nút này dẫn trực tiếp đến vé đã được phát hành để audience có thể dùng ngay tại cổng vào."

---

## A6. Sau khi mua

**Thời lượng ước tính**: 4–5 phút

**Chuẩn bị**: Tài khoản `audience@ticketbox.test` (hoặc tài khoản vừa mua ở A5) có ít nhất: 1 đơn đã thanh toán (PAID) với vé đã phát hành, và tạo thêm 1 đơn mới rồi **không thanh toán** để có trạng thái PENDING_PAYMENT dùng cho demo hủy đơn.

### Cảnh 1 — "Đơn hàng của tôi"
[Thao tác] Vào `/account/orders` (hoặc `/orders`). Chỉ vào danh sách đơn với badge trạng thái trực quan cho từng đơn (PAID, PENDING_PAYMENT, EXPIRED, CANCELLED...).
[Lời thoại] "Trang này liệt kê toàn bộ đơn hàng, mỗi đơn có huy hiệu trạng thái riêng để nhận diện nhanh."

### Cảnh 2 — Đơn đang chờ thanh toán: đếm ngược, tiếp tục thanh toán, hủy đơn
[Thao tác] Bấm vào đơn đang ở trạng thái PENDING_PAYMENT (chưa hết hạn 15 phút). Chỉ vào đồng hồ đếm ngược thời gian giữ chỗ còn lại. Bấm nút "Tiếp tục thanh toán" để cho thấy quay lại đúng bước chọn cổng thanh toán chứ không phải tạo đơn mới.
[Lời thoại] "Đơn pending vẫn giữ nguyên vé đã đặt trong 15 phút, có thể tiếp tục thanh toán bất cứ lúc nào trong khung giờ đó."
[Thao tác] Quay lại trang chi tiết đơn, lần này bấm "Hủy đơn". Xác nhận trong dialog.
[Lời thoại] "Khi hủy đơn thủ công, tồn kho vé được trả lại ngay lập tức — có thể quay lại trang chi tiết concert để thấy số vé còn lại tăng trở lại đúng bằng số vé của đơn vừa hủy."

### Cảnh 3 — Trang chi tiết đơn & hành động hậu mãi
[Thao tác] Vào trang chi tiết đơn đã PAID. Chỉ vào breakdown giá (giảm giá + phí dịch vụ) hiển thị lại y hệt lúc checkout, danh sách vé thuộc đơn, và các nút hành động hỗ trợ (liên hệ hỗ trợ, tải hóa đơn...).

[Lời thoại] "Chi tiết đơn giữ lại đúng tổng tiền, ưu đãi, phí và các vé thuộc đơn. Audience có thể xem lại chứng từ và tiếp cận các hành động hậu mãi từ cùng màn hình."

### Cảnh 4 — "Vé của tôi" — ví vé
[Thao tác] Vào `/account/tickets`. Chỉ vào danh sách vé với trạng thái trực quan (ISSUED, CHECKED_IN, LISTED_FOR_RESALE, TRANSFERRED...).
[Lời thoại] "Đây là ví vé — nơi tổng hợp toàn bộ vé đã mua, phân biệt rõ vé nào còn dùng được, vé nào đã check-in, vé nào đang rao bán lại hay đã chuyển nhượng."

### Cảnh 5 — Chi tiết vé: QR code & độ sáng màn hình
[Thao tác] Bấm vào một vé còn hiệu lực (ISSUED) để vào trang chi tiết vé. Chỉ vào mã QR lớn giữa màn hình và dòng chữ nhắc "Tăng độ sáng màn hình để quét dễ hơn" ngay dưới QR.
[Lời thoại] "Mã QR được tối ưu kích thước lớn, tương phản cao, kèm gợi ý tăng độ sáng màn hình — phục vụ đúng tình huống thực tế là quét ở cổng soát vé, ánh sáng ngoài trời hoặc nơi đông người."
[Thao tác] Nếu vé đã bị check-in trước đó (dùng vé demo khác), cho thấy QR bị làm mờ kèm icon check xanh phủ lên.

[Lời thoại] "Sau khi vé đã được sử dụng để check-in, mã không còn được dùng để vào cổng thêm lần nữa; trạng thái hiển thị giúp chủ vé nhận biết điều này."

### Cảnh 6 — Nút "Bán vé này" (Sell My Ticket)
[Thao tác] Trên một vé ISSUED còn đủ điều kiện (concert còn cách giờ diễn ra hơn 2 giờ), chỉ vào nút "Bán lại vé" ngay trên trang chi tiết vé.
[Lời thoại] "Đây là điểm vào của luồng bán lại vé — chỉ hiện khi vé còn hợp lệ và cách giờ diễn ra concert đủ xa. Chi tiết luồng resale đầy đủ sẽ nằm trong video riêng về chợ vé P2P, ở đây chỉ demo điểm khởi đầu để khán giả biết tính năng này nằm ở đâu."
[Thao tác] Bấm nút, điền giá rao bán (không vượt 110% giá gốc — hệ thống sẽ báo lỗi nếu nhập vượt), xác nhận đăng bán.
[Lời thoại] "Ngay sau khi đăng bán, mã QR gốc của vé bị ẩn đi và trạng thái vé chuyển thành 'Đang rao bán' — tránh trường hợp vừa rao bán vừa mang vé đi vào cổng bằng QR cũ."
[Thao tác] Chỉ vào trạng thái "Đang rao bán" hiển thị ngay trong ví vé, cùng số lượt upvote/bình luận nếu đã có tương tác.

[Lời thoại] "Ví vé hiển thị rõ vé đang tham gia giao dịch bán lại, giúp audience phân biệt vé còn dùng được với vé đang chờ kết quả giao dịch."

---

## Kết video

[Lời thoại] "Audience có thể tạo tài khoản, tìm concert, theo dõi nghệ sĩ, mua vé, thanh toán và quản lý vé của mình. Mỗi bước đều hiển thị trạng thái rõ ràng để người dùng biết cần làm gì tiếp theo."
