# Kim Ngân Learning

Workspace dạy kèm bằng React, TypeScript và Vite: đọc PDF, Word (.docx), hình ảnh; vẽ và ghi công thức trên bài giảng; bảng nháp; sao lưu cục bộ; kết nối Google Drive tùy chọn.

Có thêm **không gian giáo viên và học sinh** để quản lý lớp, lịch học, điểm danh, giao/nộp/chấm bài, học liệu và thông báo ngay trong trình duyệt hiện tại.

## Trang giáo viên và học sinh

Chuyển khu vực bằng thanh điều hướng trên cùng:

- **Phòng giảng bài** (`/#/workspace`, hoặc `/`): bộ đọc tài liệu và công cụ giảng dạy hiện có.
- **Giáo viên** (`/#/teacher`): tổng quan lớp/học sinh/bài chờ chấm/lịch sắp tới; tạo và sửa lớp; thêm học sinh mới hoặc hồ sơ có sẵn; lưu trữ/khôi phục lớp; xuất danh sách CSV.
- **Lịch học & điểm danh**: tạo/sửa buổi học, thời lượng, nội dung chuẩn bị, link HTTPS đến phòng học; phát hiện lịch trùng trong cùng lớp; điểm danh có mặt, đi muộn, vắng, có phép; đánh dấu cả lớp có mặt.
- **Bài tập & chấm điểm**: giao/sửa bài với hạn nộp, thang điểm, tài liệu đính kèm; xem bài đã nộp, tải file bài làm, chấm điểm và nhận xét; lọc bài chờ chấm; xuất bảng điểm CSV. Thang điểm không đổi sau khi có bài nộp.
- **Học liệu / Thông báo**: chia sẻ tài liệu từ kho cho từng lớp, mở lại trong phòng giảng bài hoặc tải bản gốc; đăng và xóa thông báo lớp.
- **Học sinh** (`/#/student`): chọn hồ sơ có sẵn để xem lớp của mình, lịch, thông báo, học liệu, bài tập và kết quả; lưu nháp, nộp/nộp lại bài chưa chấm, đính kèm PDF/DOCX/ảnh tối đa **10 MB**; xem điểm, nhận xét và lịch sử điểm danh. Bài nộp muộn được ghi rõ; bài đã chấm không sửa được. Điểm trung bình ở tổng quan là trung bình cộng các bài đã chấm sau khi quy mỗi bài về thang 10.

Luồng bắt đầu: **Giáo viên → Lớp học & học sinh → Tạo lớp → Danh sách học sinh → Thêm học sinh**, sau đó lên lịch/giao bài và chuyển sang Học sinh để thao tác với hồ sơ tương ứng. Các trang dùng được trên màn hình nhỏ và hỗ trợ bàn phím, dialog giữ focus, thông báo lỗi và trạng thái lưu.

Đây là **chế độ cục bộ dùng chung một trình duyệt**, theo phạm vi hiện tại: chọn vai trò/hồ sơ là điều hướng giao diện, **không phải xác thực hay phân quyền bảo mật**. Không có tài khoản đăng nhập, gửi email, thông báo đẩy hoặc đồng bộ lớp học sang máy khác. Nhiều tab cùng origin được cập nhật qua BroadcastChannel và khi cửa sổ lấy lại focus. Link phòng học chỉ mở dịch vụ bên ngoài, không tự tạo phòng Meet.

Dữ liệu lớp học dùng IndexedDB riêng `KimNgan_Learning_DB`, giao dịch đọc–sửa–ghi nguyên tử; chỉ báo thành công sau khi giao dịch hoàn tất. Kho tài liệu/ghi chú hiện có vẫn dùng database riêng. **Sao lưu workspace hiện chỉ chứa tài liệu và nét vẽ, không chứa lớp học, bài nộp, điểm danh hay điểm số**; bảng điểm/danh sách có thể xuất CSV. Xóa dữ liệu website sẽ xóa cả dữ liệu lớp học. Học liệu tham chiếu tài liệu gốc: nếu tài liệu bị xóa khỏi kho, giao diện thông báo thiếu file và giáo viên cần chia sẻ lại.

## Chạy tại máy

Yêu cầu Node.js 22.12+ hoặc phiên bản LTS mới tương thích với Vite 8.

```sh
npm ci
npm run dev
```

Để kết nối Google Drive, xem `.env.example`, khai báo `VITE_GOOGLE_CLIENT_ID` và cấu hình origin tương ứng trong Google Cloud. Các tính năng tài liệu cục bộ không cần tài khoản Google.

## Sử dụng

- **Đóng tab (×)** chỉ đóng phần đang xem. Tài liệu và nét vẽ vẫn nằm trong **Quản lý tài liệu**, có thể mở lại kể cả sau khi tải lại trang. Xóa tài liệu là thao tác riêng trong kho, có xác nhận.
- Tải PDF, DOCX, PNG, JPG, WEBP hoặc GIF, tối đa **100 MB mỗi file**. Định dạng và dung lượng được kiểm tra trước khi đọc toàn bộ nội dung.
- Nét vẽ dùng hệ tọa độ cố định của trang, đi cùng tài liệu khi zoom/xoay. Word hỗ trợ zoom; xoay áp dụng cho PDF và ảnh.
- **Xuất trang có ghi chú (PNG)** xuất trang PDF đang xem hoặc ảnh đang mở, gồm nội dung và nét vẽ, không có thanh công cụ. **In / Lưu PDF trang này** mở hộp thoại in của trình duyệt; chọn lưu PDF nếu trình duyệt hỗ trợ. Với Word, nút in xuất toàn bộ tài liệu kèm lớp ghi chú. Đây không phải chức năng gộp tất cả các trang PDF nguồn thành một file mới.
- **Sao lưu workspace** tải file JSON gồm tài liệu gốc, tiến độ, nét vẽ từng trang và bảng nháp. **Nhập bản sao lưu** thêm bản sao với ID mới, giữ dữ liệu đang có, ghép nội dung bảng nháp. File sai cấu trúc bị từ chối; lỗi ghi dữ liệu sẽ hủy toàn bộ lần nhập. Giới hạn bản sao lưu là **250 MB**; file sao lưu chứa nội dung tài liệu và không được mã hóa.
- Khi kết nối Drive, file được lưu và mở tại máy trước; tải bản gốc lên Drive chạy lần lượt ở nền. Mục Google Drive hiển thị kết quả từng file và nút thử lại. Nếu phiên đăng nhập hết hạn, đăng nhập lại rồi bấm thử tải lại. Đóng trình duyệt có thể ngắt tải; lần mở sau sẽ cho phép thử lại. Nhập bản sao lưu không tự tải lên Drive.

## Lưu dữ liệu

Tài liệu, tiến độ đọc, trạng thái tab, nét vẽ từng trang và bảng nháp nằm trong IndexedDB của trình duyệt. Đợi trạng thái lưu hoàn tất trước khi đóng trang. Xóa tài liệu sẽ xóa luôn nội dung và nét vẽ liên quan; xóa workspace cũng xóa bảng nháp. Lịch sử undo/redo chỉ tồn tại trong phiên và giới hạn 50 bước mỗi trang.

Database v3 tách metadata khỏi nội dung file, chỉ đọc nội dung tài liệu đang mở vào state của ứng dụng. Nâng cấp từ v1/v2 diễn ra trong giao dịch IndexedDB. Ghi chú v2 giữ hệ tọa độ tham chiếu theo mức zoom/xoay cuối đã lưu: dữ liệu cũ không ghi mức zoom tại thời điểm từng nét được vẽ, nên không thể tự sửa chính xác những nét đã lệch từ trước. Nên giữ bản sao lưu trước khi chỉnh lại các nét đó.

Drive chỉ nhận file gốc; nét vẽ chưa được đồng bộ qua Drive. Dùng xuất ảnh/PDF để gửi bài có ghi chú, hoặc bản sao lưu để chuyển workspace sang thiết bị khác. Đây chưa phải ứng dụng offline hoàn chỉnh: lần tải ứng dụng, font, đăng nhập Drive và một số tài nguyên PDF có thể cần mạng.

## Kiểm chứng

```sh
npm run build
npm run lint
npx playwright install chromium
npm run test:e2e
```

Kiểm tra nhiều trình duyệt:

```sh
npx playwright install chromium firefox webkit
CROSS_BROWSER=1 npm run test:e2e
```

Trên Linux thiếu thư viện hệ thống, chạy `npx playwright install-deps chromium firefox webkit` với quyền phù hợp. E2E khởi động bản production preview ở cổng 4173; có thể đổi bằng `PLAYWRIGHT_PORT=4182`. Khi phát triển, test có thể dùng lại preview tại cổng được chọn. Tránh chạy nhiều tiến trình kiểm thử cùng output directory.

Test dùng IndexedDB thật trong browser profile tạm; Drive/OAuth dùng phản hồi giả lập, không tải tài liệu vào tài khoản thật. Có kiểm tra lưu/đọc lại, đóng tab, nâng cấp v1/v2, tọa độ zoom/xoay, dữ liệu PNG xuất ra, chuẩn bị bản in, sao lưu/khôi phục, rollback khi giao dịch lỗi, file hỏng và tải Drive thất bại/hết phiên/thử lại. Luồng cảm ứng qua CDP chỉ chạy trên Chromium; không thay thế kiểm tra bút trên thiết bị vật lý.

`tests/learning.spec.ts` kiểm tra luồng tạo lớp → lưu nháp → nộp file → chấm điểm → học sinh xem nhận xét; CSV; lịch trùng; điểm danh; lọc theo lớp/hồ sơ; lưu trữ/khôi phục; chia sẻ học liệu; thông báo; lỗi giao dịch; và bố cục điện thoại.

Phần lớp học được tách thành `src/types/learning.ts`, `src/services/learningStore.ts`, `src/services/learningActions.ts`, `src/hooks/useLearning.ts`, các panel trong `src/components/learning/` và `src/learning.css`. Giao diện lớp học được lazy-load khi mở trang giáo viên/học sinh.

## Cấu trúc phần vẽ

- `src/drawing/coordinates.ts`: phép biến đổi tọa độ giữa màn hình và tài liệu.
- `src/drawing/geometry.ts`: hình học và kiểm tra chọn nét vẽ.
- `src/drawing/renderStroke.ts`: vẽ các nét/hình/công thức.
- `src/hooks/useAnnotationInteraction.ts`: thao tác pointer, kéo, co giãn và chọn nét.
- `src/components/DocumentSurface.tsx`: mặt phẳng chứa nội dung và ghi chú, cùng zoom/xoay.

## Có nên chuyển Next.js?

Hiện nên giữ Vite cho workspace này. Xem [đánh giá kiến trúc](docs/architecture.md) để biết lý do.
