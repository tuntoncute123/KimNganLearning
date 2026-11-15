# Đánh giá Next.js — 14/11/2026

## Quyết định hiện tại

**Tiếp tục dùng React + TypeScript + Vite cho workspace dạy học. Chưa chuyển toàn bộ sang Next.js.**

Dự án hiện là một SPA: đọc PDF/DOCX/ảnh cục bộ, vẽ trên canvas, lưu IndexedDB, đổi tài liệu, chia sẻ màn hình qua Meet và tải bản gốc lên Drive bằng OAuth phía trình duyệt. Chưa có hệ thống tài khoản riêng, API backend, trang nội dung công khai theo URL hay dữ liệu cần dựng HTML trên server.

Các tác vụ tốn tài nguyên chính (đọc PDF/Word và vẽ) vẫn phải chạy ở trình duyệt. Next.js không tự khắc phục lỗi lưu dữ liệu, render canvas hoặc quản lý trạng thái. Với ứng dụng hiện tại, tách tải thư viện nặng và sửa vòng đời tài liệu đem lại lợi ích trực tiếp hơn việc đổi framework.

## Khi nào nên cân nhắc Next.js?

| Nhu cầu | Hướng xử lý |
| --- | --- |
| Workspace cá nhân, tài liệu cục bộ, chia sẻ màn hình | Giữ Vite; tiếp tục cải thiện độ ổn định, tải theo nhu cầu và trải nghiệm dạy học. |
| Trang khóa học, bài viết, hồ sơ giáo viên công khai cần SEO và URL riêng | Next.js phù hợp cho phần website công khai; có thể giữ workspace hiện tại ở phần ứng dụng riêng. |
| Tài khoản giáo viên/học sinh, phân quyền, lớp học, đồng bộ nhiều thiết bị | Cần backend và cơ sở dữ liệu; Next.js là một lựa chọn tích hợp UI/API, Vite với backend riêng cũng đáp ứng được. |
| Thanh toán, webhook, khóa API bí mật, OAuth xử lý trên server | Cần môi trường chạy server. Cân nhắc Next.js nếu muốn cùng quản lý giao diện và backend trong một dự án. |
| Muốn PDF, Word hoặc nét vẽ mượt hơn | Đo và tối ưu worker, tải theo nhu cầu, canvas, bộ nhớ và trạng thái; đổi framework không tự giải quyết. |

## Chi phí chuyển đổi cần tính

- Tách phần đọc `window`, `localStorage`, IndexedDB và canvas khỏi quá trình render trên server. Chỉ thêm `'use client'` chưa đảm bảo mọi đoạn đọc browser API đều an toàn khi prerender.
- Thiết kế routing, ranh giới Server/Client Components, cách phân phối PDF worker và chiến lược lưu dữ liệu.
- Nếu dùng tính năng server: bổ sung vận hành backend, tài khoản, phân quyền và kiểm soát truy cập. Next.js không tự cung cấp việc đồng bộ tài liệu hay phân quyền nghiệp vụ.
- Nếu chỉ dùng static export: vẫn có thể hosting tĩnh, nhưng không có các khả năng cần server như Server Actions hay Route Handlers phụ thuộc request. Lợi ích so với SPA một màn hình hiện tại hạn chế.
- IndexedDB gắn với origin. Đổi domain, subdomain hoặc protocol phải có kế hoạch xuất/nhập dữ liệu cục bộ; tránh để người dùng tưởng tài liệu bị mất.

Nếu xuất hiện nhu cầu server rõ ràng, nên triển khai một luồng cụ thể trước (ví dụ lớp học có tài khoản), sau đó quyết định chuyển phần còn lại. Giữ các module xử lý tài liệu và lưu trữ độc lập giúp tái sử dụng mã.

## Cải thiện trong lượt này

- Lưu nét vẽ từng trang và bảng nháp vào IndexedDB; phục hồi sau khi mở lại. Undo/redo của trang giới hạn 50 bước trong phiên, kết quả thao tác được lưu.
- Nâng database từ v1 lên v2 bằng cách thêm store nét vẽ, giữ nguyên tài liệu cũ. Xóa tài liệu đồng thời xóa nét vẽ liên quan trong cùng giao dịch.
- Chỉ báo lưu thành công sau khi giao dịch hoàn tất; hiển thị lỗi đọc/lưu thay vì chỉ ghi console, giữ nét vẽ chưa lưu trong bộ nhớ để có thể thử lưu lại.
- Tải bộ đọc PDF và Word khi cần. Đặt preload helper vào chunk riêng để nó không kéo PDF vào tải ban đầu.
- Dùng PDF worker cùng phiên bản từ dependency; hủy render cũ, giải phóng loading task khi chuyển tài liệu và tính lại fit-width khi vùng đọc đổi kích thước.
- Sửa thứ tự Hooks trong kho tài liệu; sửa chuyển từ màn hình chính qua tab; thêm bộ mẫu không làm biến mất tài liệu đang có.

## Giới hạn tại thời điểm đánh giá ban đầu

- Nét vẽ và bảng nháp chỉ lưu trên thiết bị/browser hiện tại; chưa được nhúng vào file hay đồng bộ lên Google Drive. Dữ liệu có thể mất nếu người dùng xóa dữ liệu website.
- Undo/redo không khôi phục qua lần tải lại trang; nét vẽ cuối cùng có khôi phục.
- Cần tiếp tục chuẩn hóa tọa độ annotation khi zoom/xoay trên các loại tài liệu, cải thiện tải lên và thông báo lỗi Drive, kiểm tra trên Safari/Firefox và thiết bị cảm ứng.
- Lint còn các cảnh báo có sẵn ở component vẽ, ảnh, Word và một số toolbar/modal; lỗi Hooks chặn lint đã được sửa.

## Nguồn chính thức đã đối chiếu

- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components): khi nào cần browser API và tương tác phía client, lợi ích của phần chạy server.
- [Next.js: Static exports](https://nextjs.org/docs/app/guides/static-exports): hosting tĩnh, prerender và các tính năng không được hỗ trợ khi xuất tĩnh.

## Kết quả kiểm chứng trước đợt cải tiến tiếp theo

Build TypeScript/Vite thành công. Lint có 0 lỗi và 19 cảnh báo còn lại. 7/7 bài kiểm thử Chromium đã đạt trên production preview, bao phủ tải thư viện theo nhu cầu, đọc PDF/Word, mở/đóng kho tài liệu, chuyển trang nhanh, lưu nét vẽ từng trang, undo/redo, tải lại, bảng nháp, xóa dữ liệu, nâng cấp database v1 và giao dịch bị hủy rồi thử lưu lại. Chưa kiểm chứng OAuth/Drive bằng tài khoản thật.

JavaScript tải ban đầu giảm từ khoảng 953 kB xuống 350 kB (chưa nén, tính các asset JS của bản build; giảm khoảng 63%). Đây là số đo dung lượng gói, không phải cam kết thời gian tải hay FPS. Thư viện PDF/Word vẫn được tải khi mở tài liệu tương ứng.


## Cập nhật sau đợt cải tiến workspace

- Đóng tab được tách khỏi xóa tài liệu, trạng thái mở/đóng được lưu lại.
- Database v3 tách metadata và nội dung file; chỉ tài liệu đang mở được tải vào state. Migration và nhập bản sao lưu dùng giao dịch nguyên tử.
- Nội dung và nét vẽ nằm cùng một mặt phẳng, biến đổi zoom/xoay chung. Tọa độ pointer được đổi ngược về mặt phẳng này. Dữ liệu v2 dùng mức zoom/xoay cuối đã lưu làm hệ tham chiếu; không suy ra được zoom lịch sử của từng nét đã lệch trước đó.
- File được lưu cục bộ trước khi tải Drive. Hàng đợi, lỗi từng file, yêu cầu đăng nhập lại và thử lại có phản hồi trên giao diện.
- Có sao lưu/nhập workspace; xuất PNG và in/lưu PDF cho trang PDF hoặc ảnh đang xem; in toàn bộ Word kèm ghi chú. Xuất toàn bộ PDF nhiều trang thành file mới chưa được triển khai.
- Phần hình học, phép biến đổi tọa độ, render nét và tương tác pointer đã được tách module. Kiểm thử bổ sung bao phủ tọa độ, sao lưu, rollback, xuất ảnh và lỗi Drive giả lập. Hướng dẫn chạy trên Chromium/Firefox/WebKit ở README.

Giới hạn còn giữ: chưa đồng bộ nét vẽ lên Drive; chưa hỗ trợ nhiều người cùng sửa; chưa là ứng dụng offline đầy đủ; undo/redo không khôi phục qua lần tải lại trang. OAuth với tài khoản thật và bút cảm ứng trên thiết bị vật lý cần kiểm tra trong môi trường sử dụng.

### Kiểm chứng đợt cải tiến

Bản production đã build thành công. 22 kịch bản chạy trên Chromium, Firefox và WebKit: **64 lượt đạt, 2 lượt bỏ qua** (luồng touch qua CDP chỉ chạy Chromium). Kiểm tra trên Linux dùng cấu hình tạm với preview cổng 4182 và thư viện hệ thống giải nén trong `/tmp`; không thay đổi cấu hình máy hay tài khoản Drive. Đã kiểm tra giao diện desktop 1440×1000 và tablet 700×900. Drive dùng phản hồi giả lập; phần in kiểm tra nội dung chuẩn bị cho hộp thoại in, không kiểm tra máy in vật lý. Phần workspace còn 3 cảnh báo lint về state trong effect ở LaserPointer, ImageViewer và MathFormulaModal.
