# Đọc và nhập công thức cho giảng viên

Mở **Công thức Toán** trên thanh công cụ. Bấm **Nói ra công thức** để đọc tiếng Việt, hoặc gõ câu đọc rồi bấm **Chuyển lời đọc thành công thức**. **Lời đọc gốc** được giữ lại để đối chiếu với bản xem trước. Có thể sửa kết quả trước khi chèn. **Mẫu câu nói** có các nhóm ví dụ; bấm một ví dụ để điền và thử chuyển đổi.

## Bình phương, ngoặc và phân số

| Câu đọc / nội dung nhập | Kết quả |
| --- | --- |
| a bình / 2 + 3 | a² / 2 + 3 |
| A + b tất cả bình / 2 + 3 | (A + b)² / 2 + 3 |
| a cộng bê bình phương | a + b² |
| a cộng bê tất cả bình phương | (a + b)² |
| mở ngoặc a cộng bê đóng ngoặc lập phương | (a + b)³ |
| hai bình chia hai cộng ba | 2² / 2 + 3 |
| hai phần ba cộng một phần tư | 2 / 3 + 1 / 4 |
| a cộng bê tất cả chia hai cộng ba | (a + b) / 2 + 3 |
| a cộng bê tất cả bình chia mở ngoặc hai cộng ba đóng ngoặc | (a + b)² / (2 + 3) |
| âm hai bình | -2² |
| mở ngoặc âm hai đóng ngoặc bình | (-2)² |

“Bình” và “bình phương” áp dụng lên hạng ngay trước. “Tất cả” hoặc “toàn bộ” gom biểu thức phía trước trong ngoặc hiện tại, dừng ở dấu quan hệ (=, ≥, ⇒…), dấu ngắt câu, xuống dòng hoặc phần lời dẫn. Trong biểu thức nhiều tầng, nên đọc rõ từng cặp ngoặc. Ngoặc tròn, vuông và nhọn đều được hỗ trợ.

“Chia”, “chia cho”, “phần”, “trên” tạo dấu `/`. Dùng ngoặc cho tử hoặc mẫu có nhiều hạng. Ví dụ `a² / 2 + 3` khác `a² / (2 + 3)`. Hệ thống chuyển ký hiệu, không tự tính giá trị hay giải phương trình.

## Chữ cái và số

- Giữ nguyên chữ hoa/thường đã gõ, không tự viết hoa biến đầu câu.
- Có thể đọc tên chữ: bê → b, xê → c, dê/đê → d, ép → f, hát → h, em mờ → m, en nờ → n, ích/ích xì → x, i grec/y dài → y…
- Dùng “a hoa”, “bê thường”, “chữ x” để nói rõ tên biến. Ví dụ “a hoa cộng bê thường” → `A + b`.
- Đọc số nguyên với mười, mươi, trăm, nghìn/ngàn, triệu, tỷ/tỉ; hỗ trợ mốt, tư, lăm, linh/lẻ và bảy/bẩy. “Một trăm linh năm” → `105`; “hai triệu ba trăm nghìn” → `2300000`.
- Đọc từng chữ số: “một hai ba” → `123`. Phần thập phân giữ số 0 đầu: “âm hai phẩy không năm” → `-2,05`; “không phẩy không không một” → `0,001`.
- Có thể trộn chữ và số đã gõ: `2 phẩy 05`, `x cộng 3`, `4ac`; hỗ trợ dấu thập phân `,` hoặc `.`.

## Số mũ, chỉ số, căn

| Câu đọc | Kết quả |
| --- | --- |
| x mũ mười hai cộng y mũ âm hai | x¹² + y⁻² |
| x mũ n | xⁿ |
| x mũ mở ngoặc n cộng một đóng ngoặc | x^(n + 1) |
| x chỉ số mười hai cộng y chỉ số n | x₁₂ + yₙ |
| căn x cộng một bằng năm | √x + 1 = 5 |
| căn bậc hai của x cộng một bằng năm | √(x + 1) = 5 |
| căn của x cộng một hết căn chia hai | √(x + 1) / 2 |
| căn bậc ba của mở ngoặc x cộng tám đóng ngoặc | ∛(x + 8) |

“Mũ” và “lũy thừa” nhận số hoặc biến. Với mũ/chỉ số không có ký tự Unicode tương ứng, kết quả dùng `^(...)` hoặc `_(...)`. Nói “chỉ số” khi cần chỉ số dưới; không tự suy diễn `x 1` thành `x₁`.

“Căn x” lấy hạng kế tiếp. “Căn của…” lấy biểu thức đến dấu quan hệ, dấu ngắt câu, “hết căn”/“đóng căn”, hoặc hết cặp ngoặc được đọc ngay sau căn. Đọc rõ ngoặc và “hết căn” khi kết hợp nhiều căn hoặc phép toán bên ngoài căn.

## Các ký hiệu khác

Hỗ trợ cộng, trừ, nhân, cộng trừ; bằng, khác/không bằng, lớn/nhỏ/bé hơn, lớn/nhỏ hơn hoặc bằng, xấp xỉ; suy ra, tương đương; góc, độ, tam giác, véc tơ, vuông góc, song song; thuộc, không thuộc, tập con, hợp, giao, tập rỗng; delta/denta, alpha, beta, gamma, theta, lambda, pi, omega, sigma, tích phân, vô cùng; phần trăm, chấm phẩy, hai chấm và xuống dòng.

Đây là các quy tắc đọc công thức có cấu trúc, không phải bộ hiểu mọi câu tiếng Việt. Với lời giảng thông thường có từ trùng tên phép toán, có thể gõ trực tiếp và chèn mà không bấm chuyển đổi. Câu đang đọc dở hoặc thiếu ngoặc cần được kiểm tra và sửa trước khi chèn.

## Micro và kiểm chứng

Lời nhận diện tạm thời được cập nhật tại chỗ. Khi trình duyệt tự nối lại micro, lời đã đọc được nối lại trước khi chuyển đổi; “a cộng bê” rồi ngắt, sau đó “tất cả bình” vẫn tạo `(a + b)²`. Bấm dừng giữ lại lời đọc gốc. Sửa tay, chèn ký hiệu, xóa hoặc đóng hộp thoại sẽ dừng phiên hiện tại để kết quả đến muộn không ghi đè nội dung.

Nhận diện âm thanh phụ thuộc trình duyệt và quyền micro. Nếu không khả dụng, vẫn gõ và chuyển câu đọc được. Kiểm thử tự động dùng transcript và sự kiện micro giả lập; không thay thế kiểm tra độ chính xác với giọng nói thật.

Các mẫu trong giao diện được kiểm thử ở `tests/speechToMath.spec.ts`. Các luồng nhập, xem trước, lưu công thức, nối lại micro và màn hình nhỏ được kiểm thử ở `tests/mathFormula.spec.ts`.
