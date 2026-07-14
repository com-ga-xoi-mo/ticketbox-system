# Video 05 — "Production-Grade Highlight": Chứng minh độ tin cậy và an toàn của TicketBox

> **Mục tiêu video:** Chứng minh các luồng quan trọng vẫn hoạt động đúng khi có cạnh tranh mua vé, lỗi thanh toán, mất mạng, dữ liệu trùng hoặc tệp không an toàn. Video không cần mở mã nguồn.
>
> **Cấu trúc thống nhất:** Mỗi chương chỉ gồm **Thao tác** và **Lời thoại**. Lời thoại giải thích rõ: điều gì xảy ra trước, hệ thống kiểm tra gì, trạng thái nào thay đổi, và người dùng nhận kết quả gì.

---

## Chuẩn bị trước khi quay

1. Khởi động API, worker và các dịch vụ phụ trợ của hệ thống.
2. Chuẩn bị sẵn tài khoản audience, organizer, check-in staff và admin từ dữ liệu demo.
3. Chuẩn bị một loại vé chỉ còn đúng một vé để quay Chương 1.
4. Chuẩn bị hai phiên đăng nhập hoặc hai thiết bị cho các tình huống đồng thời và offline.
5. Chuẩn bị sẵn: một đơn thanh toán demo, một resale listing sắp hết hạn, một file CSV có cả dòng hợp lệ lẫn dòng lỗi, một file CSV tiếng Việt và một sơ đồ chỗ ngồi có nội dung không an toàn.
6. Khi cần chứng minh xử lý nền, chỉ mở trang trạng thái hoặc nhật ký kết quả đã chuẩn bị; không cần trình bày lệnh hay mã nguồn.

---

### Chương 1: Không bán vượt số vé khi nhiều người mua cùng lúc

[Thao tác]

1. Mở hai phiên mua vé A và B, cùng chọn loại vé chỉ còn một vé.
2. Điền thông tin đến bước xác nhận ở cả hai phiên.
3. Gửi yêu cầu giữ vé gần như cùng lúc.
4. Hiển thị kết quả: một phiên có đơn chờ thanh toán, phiên còn lại báo không đủ vé.
5. Để đơn chờ thanh toán hết thời gian giữ chỗ hoặc hủy đơn, sau đó tải lại trang mua vé.

[Lời thoại]

"Ở tình huống này chỉ còn đúng một vé, nhưng có hai khách cùng bấm mua. Khi một yêu cầu đến, TicketBox không dựa vào số vé mà trang đã hiển thị từ trước. Hệ thống kiểm tra lại số vé còn có thể giữ tại đúng thời điểm xử lý yêu cầu."

"Hệ thống tiếp nhận từng yêu cầu theo thứ tự xử lý thực tế. Yêu cầu được chấp nhận trước giữ lại vé cuối cùng và tạo đơn ở trạng thái chờ thanh toán. Ngay sau đó, số vé có thể mua giảm về không. Khi yêu cầu thứ hai được kiểm tra, vé cuối đã được giữ nên yêu cầu này bị từ chối với thông báo không đủ vé."

"Điểm cần quan sát là một vé chỉ tạo ra tối đa một lượt giữ chỗ thành công. Nếu người giữ vé không thanh toán kịp hoặc chủ động hủy, lượt giữ chỗ kết thúc và vé được trả lại để khách khác có thể mua. Nhờ vậy, hệ thống không phát hành hai quyền mua cho cùng một vé cuối."

---

### Chương 2: Thanh toán lặp lại không tạo thêm đơn hoặc thêm vé

[Thao tác]

1. Chọn một đơn đang chờ thanh toán.
2. Gửi lại thao tác bắt đầu thanh toán hai lần liên tiếp cho cùng đơn đó.
3. Hoàn tất thanh toán một lần.
4. Mô phỏng việc cổng thanh toán gửi lại cùng xác nhận thêm một lần.
5. Mở chi tiết đơn và danh sách vé của khách để đối chiếu số lượng.

[Lời thoại]

"Ở thực tế, người dùng có thể bấm lại nút thanh toán vì mạng chậm; cổng thanh toán cũng có thể gửi lại xác nhận khi chưa nhận được phản hồi. Hai việc này đều có thể lặp lại, nhưng chúng không được phép tạo thêm giao dịch hay phát hành thêm vé."

"Với cùng một đơn, lần yêu cầu đầu tiên được ghi nhận là lượt thanh toán đang xử lý. Nếu thao tác giống hệt đến lần nữa, hệ thống nhận ra đây vẫn là đơn và lượt thanh toán đó, nên trả về kết quả của lượt đang có thay vì khởi tạo một lượt mới."

"Khi xác nhận thanh toán hợp lệ đến, đơn chuyển sang đã thanh toán và vé được phát hành một lần. Nếu xác nhận y hệt được gửi lại sau đó, hệ thống chỉ nhận biết đó là thông tin đã xử lý: trạng thái đơn và số vé giữ nguyên. Trên màn hình, dù xác nhận xuất hiện hai lần, khách vẫn chỉ có đúng số vé đã mua."

---

### Chương 3: Bảo vệ luồng thanh toán khi cổng thanh toán đang lỗi

[Thao tác]

1. Chuẩn bị cổng thanh toán ở trạng thái không phản hồi hoặc trả lỗi.
2. Thử thanh toán nhiều lần liên tiếp và cho thấy các lần đầu nhận lỗi từ cổng.
3. Sau ngưỡng lỗi, thực hiện thêm một lần thanh toán và quan sát phản hồi được trả nhanh.
4. Khôi phục cổng thanh toán, chờ thời gian cho phép hệ thống kiểm tra lại.
5. Thử thanh toán lại và cho thấy giao dịch có thể tiếp tục.

[Lời thoại]

"Khi cổng thanh toán bên ngoài bị lỗi, điều nguy hiểm không chỉ là một giao dịch thất bại. Nếu tất cả khách tiếp tục gửi yêu cầu và cùng chờ phản hồi rất lâu, luồng thanh toán của toàn hệ thống sẽ bị nghẽn dù nguyên nhân nằm ở bên thứ ba."

"Ban đầu, TicketBox vẫn thử gửi yêu cầu thanh toán và ghi nhận các lỗi liên tiếp từ chính cổng đó. Khi lỗi lặp lại đủ nhiều, hệ thống tạm ngừng gọi cổng này. Các yêu cầu đến trong giai đoạn tạm ngừng nhận thông báo thất bại nhanh, để khách không phải chờ vô ích và hệ thống không tiếp tục dồn thêm tải vào dịch vụ đang gặp sự cố."

"Sau một khoảng chờ, hệ thống cho phép một lượt thử lại để kiểm tra cổng đã phục hồi hay chưa. Nếu lượt thử thành công, luồng thanh toán quay về bình thường. Nếu vẫn thất bại, giai đoạn bảo vệ tiếp tục. Các phần khác của TicketBox không vì một cổng thanh toán lỗi mà ngừng hoạt động."

---

### Chương 4: Xem concert nhanh nhưng vẫn nhận thông tin mới sau khi organizer sửa

[Thao tác]

1. Mở trang danh sách hoặc chi tiết concert lần đầu.
2. Mở lại cùng trang ở một phiên khác để cho thấy dữ liệu được trả nhanh.
3. Đăng nhập organizer, đổi tên hoặc banner của concert và lưu thay đổi.
4. Quay lại phía audience, tải lại trang concert.
5. Hiển thị tên hoặc banner mới vừa cập nhật.

[Lời thoại]

"Trang concert là phần được xem nhiều nhất. Với lượt xem đầu tiên, TicketBox lấy thông tin concert hiện tại và lưu một bản dùng tạm cho các lượt xem gần sau đó. Vì vậy khi nhiều audience cùng mở một concert không thay đổi, hệ thống có thể trả kết quả nhanh mà không phải lặp lại toàn bộ việc lấy dữ liệu."

"Điều quan trọng là bản dùng tạm này không được làm audience xem thông tin cũ. Ngay khi organizer lưu thay đổi, ví dụ đổi tên hoặc banner concert, dữ liệu đã lưu trước đó không còn được dùng cho concert này."

"Lần audience tải lại trang sau thay đổi sẽ lấy thông tin mới nhất, rồi dùng thông tin mới đó cho các lượt xem tiếp theo. Video cần chứng minh đủ hai vế: xem lặp lại có phản hồi nhanh, và sau khi organizer sửa, audience thấy nội dung mới chứ không phải bản cũ."

---

### Chương 5: Giới hạn thao tác nhạy cảm nhưng vẫn duy trì trải nghiệm xem concert

[Thao tác]

1. Thực hiện liên tiếp một thao tác nhạy cảm, chẳng hạn gửi yêu cầu thanh toán hoặc tra cứu có giới hạn.
2. Hiển thị các lần đầu được chấp nhận và lần vượt giới hạn nhận thông báo cần chờ.
3. Chờ hết khoảng thời gian giới hạn rồi thực hiện lại để cho thấy thao tác được mở lại.
4. Trong lúc mô phỏng dịch vụ hỗ trợ đếm lượt đang gặp lỗi, mở trang danh sách và chi tiết concert.
5. Thử một thao tác nhạy cảm trong cùng tình huống để đối chiếu với phần xem công khai.

[Lời thoại]

"Không phải mọi thao tác đều có mức rủi ro như nhau. Những thao tác có thể bị bot hoặc spam, như thanh toán, đặt vé hay yêu cầu nhạy cảm, được cấp một số lượt thực hiện trong một khoảng thời gian. Mỗi lần gọi hợp lệ sử dụng một lượt trong giới hạn đó."

"Khi người dùng vượt quá số lượt cho phép, hệ thống không tiếp tục xử lý yêu cầu mà trả thông báo rõ ràng để người dùng chờ rồi thử lại. Sau khi thời gian giới hạn trôi qua, lượt thực hiện được khôi phục và thao tác có thể tiếp tục. Điều này ngăn một tài khoản hoặc bot tạo quá nhiều yêu cầu trong thời gian ngắn."

"Chúng tôi cũng tách mức độ ưu tiên khi thành phần hỗ trợ việc đếm lượt gặp sự cố. Audience vẫn có thể xem catalog và chi tiết concert để không làm gián đoạn việc tìm sự kiện. Ngược lại, các thao tác có tác động lớn như thanh toán hoặc thay đổi dữ liệu vẫn được bảo vệ thận trọng cho đến khi hệ thống có thể xác minh an toàn trở lại."

---

### Chương 6: Check-in khi mất mạng và xử lý hai cổng quét cùng một vé

[Thao tác]

1. Trên hai thiết bị check-in, tải sẵn danh sách vé hợp lệ khi vẫn có mạng.
2. Ngắt mạng ở cả hai thiết bị.
3. Quét một vé hợp lệ trên thiết bị A và cho thấy kết quả được lưu để đồng bộ.
4. Quét chính vé đó trên thiết bị B; cả hai thiết bị vẫn ghi nhận thao tác offline.
5. Khôi phục mạng cho thiết bị A trước, chờ đồng bộ xong; sau đó khôi phục mạng cho thiết bị B.
6. Hiển thị kết quả cuối: một lượt được chấp nhận, lượt còn lại báo trùng hoặc xung đột.
7. Quét một mã không thuộc concert để minh họa kết quả không hợp lệ.

[Lời thoại]

"Trước khi mất mạng, ứng dụng check-in tải danh sách thông tin cần thiết cho concert xuống thiết bị. Vì vậy tại cổng vào, nhân viên vẫn có thể kiểm tra mã vé ngay cả khi tín hiệu yếu hoặc mất mạng hoàn toàn."

"Khi quét offline, thiết bị chưa khẳng định vé đã được chấp nhận trên toàn hệ thống. Nó lưu lại mã vé, thời điểm quét và kết quả tạm thời vào hàng đợi đồng bộ. Nhân viên vẫn biết mình đã quét vé nào, còn hệ thống sẽ gửi các lượt quét này đi ngay khi kết nối trở lại."

"Ở ví dụ này, hai cổng cùng quét một vé trong lúc offline. Khi thiết bị A có mạng trước, lượt quét của A được gửi lên và vé trở thành đã check-in. Khi thiết bị B đồng bộ sau đó, hệ thống kiểm tra lại trạng thái vé và phát hiện vé đã được chấp nhận ở cổng khác. B nhận kết quả xung đột thay vì được tính thêm một lượt vào cổng."

"Như vậy, thời gian hiển thị trên điện thoại không quyết định vé thuộc về cổng nào. Kết quả cuối được chốt khi lượt quét được đồng bộ. Nhân viên nhận được nhãn rõ ràng: hợp lệ, trùng, không hợp lệ hoặc xung đột, để biết có cần kiểm tra thủ công hay không."

---

### Chương 7: Import guest list không tạo khách trùng và không kẹt khi bị gián đoạn

[Thao tác]

1. Upload một file CSV có tên khách VIP tiếng Việt, trong đó có vài dòng hợp lệ và một vài dòng sai định dạng.
2. Mở trang trạng thái import, chờ batch chuyển từ đang chờ sang đang xử lý rồi hoàn tất.
3. Mở báo cáo kết quả để thấy dòng hợp lệ được nhận, dòng lỗi có lý do cụ thể.
4. Upload lại chính tệp đó và cho thấy hệ thống dẫn đến batch cũ thay vì tạo danh sách mới.
5. Dùng một batch đã được chuẩn bị ở trạng thái gián đoạn, sau đó cho thấy nó tiếp tục và hoàn tất.

[Lời thoại]

"Khi nhận file danh sách khách VIP, TicketBox trước hết xem toàn bộ nội dung tệp để nhận diện tệp đó. Lần upload đầu tiên tạo một batch import duy nhất. Batch này được đưa vào xử lý nền để nhân viên không phải chờ trên trang upload."

"Trong quá trình xử lý, từng dòng được kiểm tra độc lập. Dòng đúng được thêm vào danh sách khách; dòng sai không làm hỏng toàn bộ file mà được ghi lại cùng lý do, ví dụ thiếu dữ liệu bắt buộc hoặc sai định dạng. Vì vậy người quản lý biết chính xác cần sửa những dòng nào."

"Nếu người dùng upload lại đúng tệp đó vì tưởng lần trước chưa thành công, hệ thống nhận ra nội dung đã từng được tiếp nhận. Thay vì tạo thêm khách VIP trùng lặp, hệ thống mở lại batch ban đầu và trả về kết quả đã có."

"Nếu việc xử lý bị ngắt giữa chừng, batch không bị bỏ quên ở trạng thái đang xử lý mãi mãi. Sau thời gian an toàn, một lượt xử lý tiếp theo có thể tiếp nhận batch còn dang dở và hoàn thành nó. Kết quả là mỗi file chỉ có một lịch sử import, không tạo bản sao và không bị kẹt vĩnh viễn."

---

### Chương 8: Tác vụ nền tự xử lý resale listing đã hết hạn

[Thao tác]

1. Chuẩn bị một resale listing có thời gian hết hạn rất gần.
2. Mở trang listing trước khi hết hạn để cho thấy listing còn đang hoạt động.
3. Chờ tác vụ nền chạy hoặc mở màn hình trạng thái xử lý đã chuẩn bị.
4. Tải lại trang marketplace và ví vé của người bán.
5. Hiển thị listing đã đóng, người mua không thể mua nữa và vé về lại trạng thái có thể dùng của người bán.
6. Nếu có dữ liệu mô phỏng lỗi tạm thời, cho thấy tác vụ được thực hiện lại rồi hoàn tất, không tạo thêm vé.

[Lời thoại]

"Resale listing có thời hạn. Khi thời hạn qua đi, hệ thống cần xử lý dù người bán không mở ứng dụng và không có thao tác thủ công nào. Đây là nhiệm vụ của tác vụ nền."

"Tác vụ nền tìm các listing còn hoạt động nhưng đã hết hạn. Với mỗi listing phù hợp, hệ thống đóng listing để người mua không thể tiếp tục mua, đồng thời trả vé về trạng thái người bán có thể sử dụng lại. Hai thay đổi này phải đi cùng nhau để không có khoảng thời gian listing đã đóng nhưng vé lại bị kẹt."

"Nếu có lỗi tạm thời trong lúc xử lý, tác vụ chưa hoàn tất được đưa vào thử lại. Khi chạy lại, hệ thống kiểm tra trạng thái hiện có trước khi thay đổi, nên một listing đã xử lý xong không bị trả vé lần hai và không sinh dữ liệu trùng."

---

### Chương 9: Cùng một quy tắc nghiệp vụ cho mọi giao diện, lỗi hiển thị rõ cho người dùng

[Thao tác]

1. Thực hiện một thao tác bị từ chối do quy tắc nghiệp vụ, ví dụ mua listing đã hết hạn hoặc dùng thông tin nhận tiền chưa đầy đủ.
2. Thực hiện cùng tình huống qua giao diện khác đã chuẩn bị, nếu có.
3. Hiển thị thông báo người dùng nhận được: lý do rõ ràng, không lộ thông tin nội bộ.
4. Sửa đúng điều kiện bị thiếu rồi thực hiện lại để cho thấy luồng thành công.

[Lời thoại]

"TicketBox đặt quy tắc nghiệp vụ ở trung tâm của luồng xử lý: ví dụ listing đã hết hạn thì không thể mua, hoặc dữ liệu bắt buộc chưa đủ thì không thể tiếp tục. Giao diện chỉ gửi yêu cầu và hiển thị kết quả; nó không tự quyết định thay cho quy tắc này."

"Vì thế, dù người dùng đi từ trang web, ứng dụng check-in hay một điểm truy cập khác, cùng một điều kiện sẽ cho cùng một kết quả. Điều này tránh trường hợp một giao diện chặn được nhưng giao diện khác lại bỏ qua."

"Khi quy tắc không cho phép thao tác, hệ thống chuyển kết quả thành thông báo dễ hiểu: người dùng biết việc gì không hợp lệ và cần sửa gì để tiếp tục. Họ không nhìn thấy chi tiết vận hành nội bộ. Sau khi điều kiện được đáp ứng, cùng luồng đó được phép hoàn tất bình thường."

---

### Chương 10: Sơ đồ chỗ ngồi upload được làm an toàn trước khi hiển thị lại

[Thao tác]

1. Đăng nhập organizer và mở trang cấu hình sơ đồ chỗ ngồi.
2. Upload tệp sơ đồ thử nghiệm có kèm nội dung không an toàn.
3. Mở phần xem trước của sơ đồ đã được hệ thống tiếp nhận.
4. Cho thấy phần sơ đồ hợp lệ vẫn hiển thị và có thể chọn các khu vực.
5. Mở trang audience của concert hoặc tải lại trang organizer để xác nhận sơ đồ được dùng an toàn.
6. Upload thêm một sơ đồ bình thường để minh họa luồng cấu hình zone vẫn hoạt động như mong đợi.

[Lời thoại]

"Sơ đồ chỗ ngồi là tệp do organizer cung cấp, sau đó được hiển thị lại cho nhiều audience. Vì vậy hệ thống không thể tin toàn bộ nội dung có trong tệp upload."

"Khi nhận sơ đồ, TicketBox kiểm tra nội dung trước khi lưu và sử dụng. Những phần chỉ phục vụ việc vẽ sơ đồ, khu vực và nhãn được giữ lại. Những phần có thể kích hoạt hành vi ngoài ý muốn hoặc liên hệ ra bên ngoài bị loại bỏ."

"Vì thế, sau khi upload tệp thử nghiệm, người xem vẫn thấy sơ đồ và các zone hợp lệ để organizer cấu hình bán vé. Nhưng nội dung không an toàn không còn theo sơ đồ đến trang của audience. Đây là điểm quan trọng: giữ được chức năng thiết kế seating map mà không biến tệp upload thành rủi ro cho khách truy cập."

---

### Chương 11: Giữ nguyên tiếng Việt có dấu trong import và hiển thị

[Thao tác]

1. Upload file CSV chứa họ tên tiếng Việt có đầy đủ dấu.
2. Chờ import hoàn tất, sau đó tìm một khách vừa import trên trang quản lý hoặc tra cứu.
3. Mở thông tin khách hoặc thông báo liên quan để đối chiếu tên hiển thị.
4. Upload file đã được chuẩn bị với bảng mã không hợp lệ.
5. Hiển thị việc hệ thống từ chối tệp lỗi thay vì tạo danh sách tên bị hỏng.

[Lời thoại]

"Tên khách và danh sách khách VIP của TicketBox thường là tiếng Việt có dấu. Nếu tệp được đọc sai bảng mã, tên có thể biến thành ký tự lạ; lỗi đó sẽ lan sang check-in, email và tra cứu khách."

"Với file hợp lệ, TicketBox đọc nội dung theo chuẩn thống nhất rồi giữ nguyên tên khi tạo dữ liệu khách. Sau import, tên ở trang quản lý và các nơi sử dụng tiếp theo vẫn là đúng họ tên tiếng Việt ban đầu. Video cần đối chiếu trực tiếp giữa file và kết quả hiển thị để chứng minh điều này."

"Nếu tệp không thể đọc đúng theo chuẩn yêu cầu, hệ thống dừng import và báo rõ lỗi. Hệ thống không cố đoán rồi âm thầm lưu những tên đã bị hỏng. Nhờ vậy, dữ liệu đã vào hệ thống là dữ liệu có thể sử dụng an toàn cho các bước sau."

---

## Tóm tắt bằng chứng cần quay

| Chương | Bằng chứng trên màn hình | Kết quả cần thấy |
|---|---|---|
| 1 | Hai phiên cùng mua vé cuối | Chỉ một đơn giữ vé thành công; vé được trả lại khi hết hạn hoặc hủy |
| 2 | Thao tác và xác nhận thanh toán lặp | Một đơn, đúng số vé, không phát hành thêm |
| 3 | Cổng thanh toán lỗi rồi phục hồi | Lỗi nhanh trong giai đoạn bảo vệ; thử lại được sau khi phục hồi |
| 4 | Organizer sửa concert rồi audience tải lại | Audience nhận đúng nội dung mới |
| 5 | Thao tác vượt giới hạn và trang concert công khai | Thao tác nhạy cảm bị giới hạn; phần xem vẫn hoạt động |
| 6 | Hai thiết bị offline quét một vé | Một lượt được chấp nhận, lượt kia báo trùng hoặc xung đột |
| 7 | Upload lại cùng CSV và batch bị gián đoạn | Không tạo khách trùng; batch tiếp tục được |
| 8 | Resale listing hết hạn | Listing đóng và vé trở lại người bán đúng một lần |
| 9 | Thao tác vi phạm quy tắc | Thông báo rõ ràng, cùng điều kiện cho cùng kết quả |
| 10 | Upload sơ đồ thử nghiệm | Sơ đồ hợp lệ vẫn dùng được, nội dung không an toàn không được hiển thị |
| 11 | CSV tên tiếng Việt và CSV lỗi bảng mã | Tên đúng được giữ nguyên; tệp lỗi bị từ chối |

---

## Gợi ý dựng video

- Mở đầu 15–20 giây: “Video này không chỉ demo tính năng. Chúng tôi chứng minh TicketBox vẫn giữ đúng dữ liệu, bảo vệ người dùng và phục hồi đúng luồng khi có tình huống bất thường.”
- Ưu tiên quay kỹ Chương 1, 2, 5, 6, 7 và 10 vì trực quan và thể hiện rõ thứ tự xử lý.
- Mỗi chương chỉ cần hiển thị tình huống, hành động và kết quả. Dừng màn hình ở trạng thái cuối vài giây để người xem đối chiếu với lời thoại.
- Kết 15–20 giây: “Từ mua vé đồng thời, thanh toán lặp, check-in mất mạng đến import và upload tệp, các luồng đều có kết quả xác định, không tạo dữ liệu trùng và không bỏ người dùng vào trạng thái không rõ ràng.”
