# TicketBox — Danh sách Use Case đầy đủ cho Video Demo

> Cập nhật lần 2 — đối chiếu lại với **75 spec** hiện có trong `openspec/specs/`, **93 change đã archive**, và **code thực tế** trong `apps/` + `packages/backend/src/` (một số tính năng đã code nhưng spec chưa sync kịp — đã bổ sung bên dưới).
> Đánh dấu: 🆕 = use case mới xuất hiện từ lần liệt kê trước · 🔄 = hành vi đã **thay đổi**, mô tả cũ không còn đúng.
> Mỗi mục con dưới một capability là một **Requirement** thực tế trong spec — dùng làm checklist khi viết lời thoại/thao tác cho từng cảnh quay.

---

## 1. KHÁN GIẢ (Audience)

### 1.1 Đăng ký / Đăng nhập / Tài khoản
**auth-registration**
- Tự đăng ký tài khoản (role AUDIENCE mặc định)
- Trang đăng ký cho audience, form thu số điện thoại

**auth-login**
- Đăng nhập kèm kiểm tra thông tin đăng nhập
- Tài khoản không active không đăng nhập được

**audience-google-sign-in**
- Backend xác thực Google credential
- Người dùng Google cũ nhận session TicketBox
- Lần đầu đăng nhập Google tự tạo tài khoản audience
- Email đã tồn tại yêu cầu liên kết tài khoản tường minh
- Nút Google Sign-In trên trang Login
- 🆕 Nút Google Sign-In trên trang **Register** (trước đây chỉ có ở Login)

**🆕 Quên mật khẩu / Đặt lại mật khẩu** *(đã code trong `identity` module + `ForgotPasswordPage`/`ResetPasswordPage`, nhưng spec riêng chưa được sync — vẫn là use case thật, cần quay)*
- `POST /auth/forgot-password` — nhập email, nhận link reset qua mail
- `POST /auth/reset-password` — nhập token từ email + mật khẩu mới

**audience-account-profile / console-self-account-management**
- Trang tài khoản hiển thị hồ sơ, điều hướng sang đơn hàng/vé
- Sửa hồ sơ, đổi avatar, đổi mật khẩu (tự phục vụ)

### 1.2 Khám phá sự kiện
**audience-homepage-discovery / marketplace-homepage**
- Hero sự kiện nổi bật (carousel)
- Thanh tìm kiếm ở trang chủ
- Danh mục sự kiện theo thành phố (tab)
- Lưới danh mục phổ biến (categories)

**audience-event-search / catalog-search-api**
- Tìm kiếm theo văn bản, lọc theo thành phố, loại sự kiện, khoảng ngày, khoảng giá
- Sắp xếp kết quả, trạng thái không có kết quả, URL lưu filter

**audience-event-detail**
- Sơ đồ chỗ ngồi tương tác theo ticket-type + fallback ảnh tĩnh
- Chỉ báo trạng thái mở bán / sold-out
- Số vé còn lại theo từng loại vé phản ánh thay đổi sau khi có người giữ chỗ/thanh toán; có thể dùng hai phiên audience để chứng minh chuyển trạng thái còn vé → sold-out
- Bộ chọn số lượng vé
- Bản đồ dùng tọa độ venue đã lưu (Leaflet)
- Hiển thị tiểu sử nghệ sĩ đã publish
- Hiển thị đánh giá (review) của concert

**marketplace-seo**
- Meta tag SEO ở trang chi tiết, trang danh sách, trang chủ

**🆕 artist-discovery** *(trang khám phá nghệ sĩ dành cho audience — trước đây tôi xếp nhầm sang Organizer)*
- Danh sách nghệ sĩ công khai + tìm kiếm
- Trang hồ sơ nghệ sĩ theo slug
- Nghệ sĩ được yêu thích nhiều nhất
- Timeline sự kiện của một nghệ sĩ
- Audience **follow** nghệ sĩ / **favorite** nghệ sĩ

**audience-concert-favorites**
- Toggle yêu thích concert, xem danh sách đã thích, kiểm tra trạng thái đã thích

### 1.3 Mua vé (luồng chính)
**virtual-waiting-room**
- Cấu hình phòng chờ theo từng concert (do organizer/admin bật)
- Audience tham gia hàng chờ khi lượng truy cập bị throttle, thấy vị trí realtime qua SSE
- Cấp token admission ngắn hạn khi tới lượt
- 🔄 **Slot phòng chờ giữ tới khi thanh toán xong** — không còn giải phóng ngay sau khi tạo đơn; chỉ giải phóng khi thanh toán thành công, đơn bị hủy, hoặc hết hạn
- 🔄 Fix: nút "Vào lại phòng chờ" bấm được khi trạng thái `NOT_JOINED` (trước đây bị disable nhầm)

**audience-checkout**
- Tạo đơn hàng, đếm ngược thời gian giữ chỗ, khởi tạo thanh toán, polling kết quả
- Trang chi tiết đơn hàng, trang "đơn hàng của tôi"
- Yêu cầu đăng nhập trước khi checkout, xử lý lỗi checkout

**checkout-pricing-breakdown / promotion-validation / audience-promo-ui**
- Nhập mã khuyến mãi ở checkout, xem chi tiết breakdown giá (giảm giá + phí dịch vụ)
- Mã bị từ chối ngay lúc tạo đơn nếu không hợp lệ
- Breakdown giá cũng hiện lại ở trang chi tiết/lịch sử đơn hàng

**payment-reliability**
- Thanh toán qua VNPay sandbox / MoMo sandbox
- Idempotent checkout/payment (bấm trùng không tạo 2 đơn)
- Circuit breaker khi cổng thanh toán lỗi, reconciliation, khôi phục đơn đã thanh toán thành công

> ⚠️ **Lưu ý — không phải use case thật**: `audience-checkout` có một requirement "Audience web can expose temporary lottery operator controls for testing" — đây là control tạm thời chỉ để test luồng lottery, không phải tính năng dành cho người dùng thật. Đừng đưa vào script như một use case chính thức.

**ticket-purchase**
- Giữ chỗ tồn kho (chống oversell), giới hạn số vé/người dùng
- Vòng đời đơn hàng, phát hành vé QR
- Checkout trong cửa sổ presale lottery yêu cầu là **winner** còn hạn ngạch
- Checkout yêu cầu admission token khi phòng chờ đang active

### 1.4 Sau khi mua
**audience-order-history / cancel-pending-order-api**
- "Đơn hàng của tôi" liệt kê tất cả đơn, trạng thái có chỉ báo trực quan
- Đơn pending hiện đếm ngược, có nút "tiếp tục thanh toán" và "hủy đơn"
- Trang chi tiết đơn hiện đủ thông tin + hành động hỗ trợ hậu mãi

**audience-ticket-wallet**
- "Vé của tôi" liệt kê tất cả vé, trạng thái trực quan
- Trang chi tiết vé với QR (tối ưu độ sáng màn hình khi ở cổng soát vé)
- 🆕 Nút **"Bán vé này"** (Sell My Ticket) ngay trên vé đủ điều kiện
- Vé đang rao bán / đã chuyển nhượng hiện trạng thái tương ứng ngay trong ví vé

**ticket-gifting-api / ticket-gifting-ui**
- Gửi tặng vé qua email, người nhận chấp nhận/từ chối
- Người gửi hủy được lượt chuyển đang chờ; tự hết hạn sau 48 giờ
- Trang landing để người nhận accept/decline qua link
- Thông báo trong app khi có kết quả chuyển vé

### 1.5 Cơ chế bán vé đặc biệt — 🔄 ĐÃ ĐỔI NGỮ NGHĨA HOÀN TOÀN
> Bản trước mô tả sai. Đây là bản đúng theo `refactor-waitlist-and-lottery-to-public-pool` (2026-07-14).

**official-waitlist — chỉ còn vai trò "thông báo", KHÔNG giữ chỗ, KHÔNG ưu tiên**
- Tham gia waitlist khi ticket-type sold-out
- Rời khỏi waitlist
- Xem trạng thái waitlist của mình
- Khi vé "hết → có lại" (dù do hủy/hết hạn/admin điều chỉnh), **toàn bộ** người đăng ký được thông báo cùng lúc, một lần/đợt sold-out — sau đó ai mua trước thì được, không có suất riêng, không đếm ngược 15 phút
- Không liên quan gì tới chợ vé resale

**presale-lottery — bốc thăm, người thắng mua tự do trong suốt cửa sổ presale**
- Organizer cấu hình lottery cho một ticket-type
- Audience đăng ký / rút đăng ký lottery
- Xem trạng thái đăng ký
- Quay số công bằng, có thể chạy thủ công (organizer), kết quả có thể audit
- Người thắng được mua **bất kỳ lúc nào** từ lúc quay số tới khi mở bán công khai, không có TTL cá nhân, số lượng mua bị giới hạn đúng bằng số suất đã thắng
- Thông báo cho người đăng ký khi có kết quả quay số

### 1.6 Hậu mãi / Thông báo / Hỗ trợ
**notification-delivery**
- Sau khi đơn thanh toán thành công, audience nhận thông báo xác nhận trong app và **email chứa QR e-ticket** (có thể kiểm chứng trên Maildev)
- Worker tự gửi email/in-app reminder khi concert sắp diễn ra trong cửa sổ 24 giờ
- Đây là luồng khác với thao tác chủ động “gửi lại vé” ở Support Center

**concert-reviews**
- Người mua đã xác thực tạo 1 đánh giá/concert, có validate input
- Chủ đánh giá sửa/xóa được đánh giá của mình
- Danh sách công khai loại trừ review đã bị ẩn

**audience-notification-center**
- Hộp thư thông báo trong app, phân loại + deep link, trạng thái đã đọc, bộ lọc/đếm số chưa đọc
- 🆕 **Thông báo realtime qua SSE** — badge chưa đọc tự cập nhật trong vài giây, không cần reload (dùng stream-token ngắn hạn + Redis pub/sub cầu nối worker↔API)

**audience-support-center**
- Tạo yêu cầu hỗ trợ / theo dõi yêu cầu
- Yêu cầu hoàn tiền + theo dõi
- Gửi lại vé qua email, tải xác nhận đơn/vé

**🆕 global-notifications** *(UX nền tảng, xuất hiện cả bên console lẫn audience)*
- Toast thông báo toàn cục (thư viện `sonner`)
- Dialog xác nhận chuẩn hóa (thay các confirm rời rạc)

### 1.7 Chợ vé P2P (Resale marketplace) — 🔄 MỞ RỘNG LỚN so với bản liệt kê trước
**ticket-resale-listing**
- Người có vé đăng bán vé đã phát hành trực tiếp từ ví vé ("Sell My Ticket") — **thu hồi QR gốc ngay khi đăng**
- Giá rao bán bị giới hạn trần **110% giá gốc**
- Người bán tự hủy listing → khôi phục lại vé/QR gốc
- Listing tự động hết hạn trước giờ diễn ra sự kiện
- Người bán xem danh sách listing của mình

**seller-bank-profile**
- Bắt buộc có hồ sơ ngân hàng trước khi tạo listing
- Lưu/cập nhật hồ sơ ngân hàng
- Hồ sơ ngân hàng hiển thị cho buyer khi đơn P2P được khởi tạo

**resale-marketplace / resale-platform-hub** — 🆕 trang chợ vé kiểu "mạng xã hội"
- Feed cộng đồng hiển thị listing như bài đăng (social-post style)
- 🆕 Trang **`/resale`** — feed toàn nền tảng, lọc theo tên concert / khoảng giá, sắp xếp (trending/mới nhất/giá tăng/giá giảm), infinite scroll
- 🆕 Trang chi tiết listing độc lập **`/resale/:listingId`**
- Card listing hiện kèm context concert (tên, slug, ngày giờ)
- Navbar có mục "Resale"; trang chi tiết sự kiện có banner CTA trỏ sang resale hub
- Mua listing resale (giá không áp dụng promotion), listing chuyển trạng thái RESERVED khi có đơn P2P đang mở

**🆕 listing-social-interactions**
- Upvote/downvote listing (ảnh hưởng thứ hạng feed)
- Bình luận công khai theo luồng (threaded) trên từng listing
- Người dùng có thể gắn cờ (flag) bình luận vi phạm để kiểm duyệt

**🆕 resale-direct-messaging**
- Buyer nhắn tin trực tiếp cho seller ngay từ listing
- Hộp thư DM xem được các luồng hội thoại
- Tin nhắn realtime qua WebSocket
- Nội dung tin nhắn giới hạn dạng text, có giới hạn độ dài

**🆕 resale-p2p-order**
- Buyer khởi tạo đơn P2P để "khóa" listing
- Buyer xác nhận đã thanh toán kèm bằng chứng
- Seller xác nhận đã nhận tiền → kích hoạt chuyển vé
- Mỗi bên có thể hủy đơn ở trạng thái RESERVED, **trừ khi** buyer đã xác nhận thanh toán
- Cả hai bên xem được trạng thái đơn P2P

**🆕 resale-transfer**
- Chuyển vé tạo ticket mới cho buyer, ghi nhận giao dịch tài chính (ResaleTransaction)
- Quá trình chuyển là atomic
- QR được cấp lại (regenerate) khi delist hoặc hết hạn
- Ghi sổ payout cho seller; **phí nền tảng 5%** chỉ thu khi đơn COMPLETED

**🆕 seller-trust-profile**
- Điểm uy tín tính từ lịch sử hoạt động trên nền tảng, hiện badge trên listing
- Trang hồ sơ công khai của người bán
- Chống gian lận điểm uy tín (rate-limit); thua tranh chấp bị trừ điểm
- Theo dõi số lần buyer vi phạm (bad-faith) lặp lại
- 🆕 Trang **lịch sử giao dịch/payout** riêng của seller tại `/account/transactions` (đối chiếu số tiền nhận sau khi trừ phí 5%)

**🆕 resale-dispute**
- Một trong hai bên có thể mở tranh chấp với đơn ở trạng thái PENDING_CONFIRM
- Admin giải quyết tranh chấp (xem ở mục Admin bên dưới)
- Bên thua tranh chấp bị trừ điểm uy tín

---

## 2. NHÀ TỔ CHỨC (Organizer)

**concert-management / web-concert-management**
- CRUD concert (organizer chỉ trên concert mình sở hữu; admin trên mọi concert)
- Vòng đời concert: tạo ở **DRAFT**, cấu hình xong thì **PUBLISHED**, có thể **CANCELLED**; nên quay rõ trạng thái thay đổi và tác động tới marketplace
- Cấu hình loại vé, cửa sổ mở bán
- Upload poster (multipart, giới hạn kích thước, validate)
- Upload sơ đồ chỗ ngồi SVG, quản lý seating-zone, mapping ticket-type ↔ zone
- 🆕 **Trang "Venue Maps"** riêng (sidebar) để chọn concert rồi vào editor: hiển thị SVG, click/hover chọn zone, highlight 2 chiều SVG↔danh sách zone, form loại vé theo VND, mapping N:N, cảnh báo khi re-upload
- 🔄 Editor chỉ cho sửa khi concert ở trạng thái **DRAFT** — non-DRAFT hiện read-only kèm banner giải thích
- 🆕 **Bằng chứng bảo mật cụ thể để quay**: upload file `docs/demo/unsafe-seating-map.svg` (chứa sẵn `<script>alert("unsafe")</script>`) và cho thấy hệ thống **allowlist-sanitize** SVG trước khi lưu — script bị loại bỏ, chỉ giữ phần tử vẽ hợp lệ. File `docs/demo/test-seating-map.svg` dùng làm sơ đồ hợp lệ để đối chứng.
- 🆕 **Venue location picker** — bản đồ Leaflet + tìm địa chỉ qua Nominatim + kéo thả marker, tích hợp ngay trong form tạo/sửa concert (dùng chung `location-geocoding` backend)
- 🆕 Gắn loại sự kiện (**EventType**) và trường **SEO** khi tạo/sửa concert
- 🆕 Upload/thay **banner** cho concert
- 🆕 Liên kết **nhiều nghệ sĩ** theo thứ tự (ordered selector), đồng bộ nghệ sĩ chính về trường legacy `artistName`
- 🔄 **Phần "Phòng chờ ảo" ngay trong trang sửa concert** (dùng chung Organizer/Admin) — load/sửa cấu hình đầy đủ, phân biệt rõ draft chưa lưu vs. đã lưu, validate theo field + chéo field, cảnh báo khi cấu hình concurrency thấp, và 3 nút ghi đè tức thời: **FORCE_ON / FORCE_OFF / NONE**

**location-geocoding** *(hạ tầng phục vụ Venue location picker ở trên)*
- Endpoint tìm kiếm địa điểm, rate limit 1 req/s, cache 7 ngày, map lỗi HTTP rõ ràng

**ai-artist-bio**
- Upload PDF press kit, validate, lưu trữ
- Trích xuất + làm sạch text từ PDF
- Gọi AI adapter sinh tiểu sử, theo dõi trạng thái job (poll khi đang chạy)
- Organizer xem, chỉnh sửa, duyệt và publish tiểu sử lên trang chi tiết concert

**guest-list-import** *(nhập liệu backend)*
- Thả file CSV vào thư mục theo lịch quét tự động (scheduled discovery)
- Validate CSV, xử lý lỗi từng dòng (partial failure)
- Upsert khách mời idempotent theo checksum
- Nhân viên soát vé tra cứu VIP tại cổng

**🆕 web-guest-list-management** *(giao diện web — KHÁC với endpoint fallback đã có, đây là UI Admin thật)*
- Route riêng theo concert, chỉ ADMIN: `/admin/concerts/:id/guest-list`
- Upload CSV có validate ràng buộc (kích thước/định dạng) trước khi gửi
- Theo dõi batch import theo trạng thái (canonical batch monitoring)
- Xem báo cáo import theo từng dòng, tải báo cáo JSON, tải **CSV mẫu** (template)

**web-organizer-dashboard**
- Thẻ thống kê tổng quan cho organizer
- Biểu đồ tròn trạng thái concert + bảng concert gần đây
- Quick Actions dành riêng cho organizer

**analytics-dashboards / analytics-reports** *(dùng chung Admin + Organizer, xem thêm mục Admin)*
- Tổng quan vận hành, lọc theo khoảng thời gian động
- Data grid báo cáo có lọc/phân trang/xuất CSV (chi tiết ở mục Admin)

**check-in staff assignment**
- Admin/Organizer gán hoặc bỏ gán check-in staff theo concert và tùy chọn gate; staff chỉ dùng được assignment còn hiệu lực của mình trên mobile
- Nên quay liên tiếp cảnh phân công ở console → staff đăng nhập/chọn assignment → quét hoặc tra cứu VIP để chứng minh boundary theo role và concert

---

## 3. NHÂN VIÊN SOÁT VÉ (Check-in staff)

**checkin-mobile-app**
- Đăng nhập, phiên làm việc của nhân viên soát vé
- Tải danh sách assignment (ca trực/cổng được phân công)
- Giao diện quét QR, banner kết quả quét nổi bật: ACCEPTED, vé đã dùng (duplicate), QR không hợp lệ và không có quyền theo assignment
- 🆕 **Tab tra cứu VIP** (online-only, ràng buộc theo assignment đang chọn) — tách riêng khỏi luồng quét QR

**checkin-offline-sync**
- Check-in online qua QR, validate vé, xác thực assignment, lưu kết quả
- Hàng đợi quét offline khi mất mạng, chế độ nhận biết tình trạng mạng
- Đồng bộ theo batch khi có mạng lại, phát hiện + xử lý xung đột (trùng vé)
- Kiểm soát hiển thị nút đồng bộ theo mode online/offline
- Cache vé trên máy để vẫn quét được khi offline (độ mới của cache)
- Cảnh lỗi cần quay: quét offline rồi đồng bộ gặp conflict/trùng vé; kết quả batch phải phân biệt accepted, duplicate, invalid và conflict

---

## 4. ADMIN (Quản trị nền tảng)

**identity-access / rbac-guards**
- Phiên JWT cho hành động được bảo vệ; các route admin/organizer/check-in đều có guard theo role
- Admin quản lý tài khoản người dùng (soft-delete only, không xóa cứng)
- Tự phục vụ: đổi hồ sơ/mật khẩu/avatar của chính Admin

**staff-management** — 🔄 rộng hơn tên gọi "chỉ tạo check-in staff"
- Bảng tài khoản có phân trang, thao tác khi hover
- 🆕 **Admin tạo/sửa tài khoản bất kỳ** với đầy đủ trường hồ sơ (không riêng gì check-in staff) — không upload avatar hộ user
- **Cấp phát hàng loạt tài khoản check-in staff**: nhập email gốc + số lượng + tiền tố tên hiển thị → hệ thống tự sinh email dạng `abc@x.com, abc1@x.com, abc2@x.com...` và mật khẩu riêng cho từng tài khoản, gán role CHECKIN_STAFF, gán vào concert đã chọn
- Trả credential **một lần duy nhất** trong response (không lưu mật khẩu thô để tải lại sau)
- 🆕 **Xuất PDF có mật khẩu bảo vệ** chứa toàn bộ credential vừa tạo

**🆕 Kiểm duyệt nội dung** (gộp từ nhiều spec)
- Ẩn review vi phạm (`concert-reviews`)
- 🆕 Giải quyết tranh chấp resale — trang `admin/resale-disputes` (`resale-dispute`)
- Gắn cờ/kiểm duyệt bình luận trên listing (`listing-social-interactions`)
- 🆕 Admin-only: đánh dấu concert **Featured** + thứ tự hiển thị (`displayOrder`) trên marketplace

**🆕 Danh mục nghệ sĩ (Admin)** — `admin/artists`
- API quản trị nghệ sĩ có phân trang/tìm kiếm (protected)
- Tạo/sửa nghệ sĩ, quản lý trạng thái active/inactive
- Upload avatar/poster nghệ sĩ

**analytics-dashboards / analytics-reports**
- Tổng quan vận hành riêng cho Admin (khác Organizer, có cách ly dữ liệu)
- Lọc theo khoảng thời gian động, theme "Midnight Venue" + `recharts`
- Data grid "Analytics & Reports": lọc động, phân trang, **xuất CSV**

**platform-protection**
- Rate limit dựa trên Redis, graceful degradation khi quá tải
- Rate limit riêng cho geocoding search

**Bằng chứng integrity/reliability** *(quay bằng terminal/test/API, không phải thao tác UI độc lập)*
- No-oversell và giới hạn vé mỗi user dưới checkout đồng thời
- Idempotent checkout/payment và callback dedupe
- Circuit breaker/reconciliation khi payment gateway lỗi; rate-limit/graceful degradation khi traffic tăng
- 🆕 Concurrent promo code usage không vượt giới hạn lượt dùng khi nhiều người bấm áp mã cùng lúc (`promotion-validation`)
- Cần gắn các bằng chứng này vào video technical highlight hoặc đoạn evidence cuối video, thay vì chỉ đọc lời mô tả cơ chế

**project-governance** *(quy trình OpenSpec nội bộ — không phải use case demo được, bỏ qua khi quay)*

---

## 5. KỸ THUẬT / HẠ TẦNG (không demo như use case người dùng — dùng cho video "production-grade highlight")

- **cloud-object-storage** — S3-compatible adapter (Cloudflare R2), in-memory adapter cho test, vòng đời banner/poster
- **shared-api-contracts** — bộ Zod contract dùng chung FE/BE, kiểm chứng runtime qua HTTP boundary
- **domain-error-handling** — use-case ném domain error, exception filter dịch sang HTTP; không gọi thẳng BullMQ trong use-case
- **encoding-hardening** — xử lý BOM UTF-8, tiếng Việt round-trip trong CSV/email/API
- **queue-resilience** — các queue resale phải propagate lỗi cho BullMQ, có retry, transactional khi expiry hàng loạt
- **demo-seed-data** — seed idempotent, vé seed quét QR được luôn, seed đủ nghệ sĩ/concert để demo mọi tính năng
- **submission-readiness** — checklist nộp bài: README, seed, docker, evidence test tự động + thủ công, video demo evidence
- **web-app-shell / web-auth** — khung điều hướng + auth dùng chung Admin/Organizer (route phân theo role: `/admin/...` vs `/organizer/...`)
- 🆕 **audience-web-foundation** — workspace riêng cho audience-web (routing công khai, route boundary theo phiên đăng nhập, API client/query provider, design system nền) — bản tương đương của `web-app-shell/web-auth` nhưng cho phía audience
- 🆕 **resale-port-contracts / users-bank-profile-port** — module resale không import trực tiếp Prisma hay tầng infrastructure của `users`, chỉ qua domain port có kiểu tường minh — điểm chứng minh kiến trúc "clean/hexagonal" nếu cần trình bày trong video kỹ thuật

> ⚠️ Lưu ý kỹ thuật khi quay: vì route đã tách hẳn theo role (`separate-admin-organizer-features`), cần **2 phiên đăng nhập riêng** (1 tài khoản ADMIN, 1 tài khoản ORGANIZER) để quay đủ 2 luồng — không thể demo cả hai trong cùng 1 lần đăng nhập.

> ⚠️ Phát hiện dọn dẹp: thư mục `openspec/specs/web-staff-management/` tồn tại nhưng **rỗng** (không có `spec.md`) — có vẻ là artifact còn sót lại từ một lần sync, nội dung thật đã nằm trong `staff-management` ở trên. Không phải use case cần quay.

---

## Bảng tổng hợp nhóm video (cập nhật số lượng)

| Nhóm | Video trước | Video sau khi cập nhật | Lý do tăng |
|------|:---:|:---:|------|
| Audience | 9 | **11** | Tách "Khám phá nghệ sĩ" riêng; tách chợ resale thành 2 video (đăng bán/khám phá vs. giao dịch DM+escrow+dispute) |
| Organizer | 4 | **6** | Tách "Sơ đồ chỗ ngồi & bản đồ địa điểm" và "Marketplace authoring" thành video riêng; guest-list giờ có cả UI web thật |
| Check-in staff | 2 | 2 | Không đổi nhiều, chỉ thêm tab VIP lookup vào S1/S2 |
| Admin | 2-3 | **5** | Thêm: cấp phát staff hàng loạt (đủ nặng để tách riêng), kiểm duyệt nội dung, danh mục nghệ sĩ admin |
| Kỹ thuật highlight | 1 | 1 | Giữ nguyên, có thể thêm nhắc tới SSE realtime + queue-resilience |
| **Tổng** | ~18-19 | **~25** | |

Danh sách này giờ đã đối chiếu với toàn bộ 75 spec + code thực tế (bao gồm cả tính năng đã code nhưng spec chưa sync như quên/đặt-lại mật khẩu). Bạn có thể dùng trực tiếp để viết lời thoại/shot-list chi tiết cho từng video.
