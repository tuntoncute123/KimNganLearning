# Kim Ngân Learning

Workspace dạy kèm bằng React, TypeScript và Vite: đọc PDF, Word (.docx), hình ảnh; vẽ và ghi công thức trên bài giảng; bảng nháp; lưu cục bộ; kết nối Google Drive tùy chọn.

## Chạy tại máy

Yêu cầu Node.js 22.12+ hoặc phiên bản LTS mới tương thích với Vite 8.

```sh
npm ci
npm run dev
```

Để kết nối Google Drive, xem `.env.example`, khai báo `VITE_GOOGLE_CLIENT_ID` và cấu hình origin tương ứng trong Google Cloud. Các tính năng tài liệu cục bộ không cần tài khoản Google.

## Kiểm chứng

```sh
npm run build
npm run lint
npx playwright install chromium
npm run test:e2e
```

Trên Linux thiếu thư viện hệ thống cho Chromium, chạy `npx playwright install-deps chromium` với quyền phù hợp. E2E khởi động bản production preview ở cổng 4173; cần để cổng này trống khi chạy CI. Khi phát triển, test có thể dùng lại preview đang chạy ở cổng này. Test dùng dữ liệu mẫu và IndexedDB thật trong browser profile tạm, không dùng tài khoản Drive.

## Lưu dữ liệu

Tài liệu, tiến độ đọc, nét vẽ từng trang và bảng nháp nằm trong IndexedDB của trình duyệt. Trạng thái lưu nét vẽ hiển thị dưới thanh đầu trang. Đợi lưu xong trước khi đóng trang. Xóa tài liệu sẽ xóa luôn nét vẽ của tài liệu; xóa workspace cũng xóa bảng nháp. Lịch sử undo/redo chỉ tồn tại trong phiên và giới hạn 50 bước mỗi trang.

Google Drive hiện nhận file gốc được tải lên; nét vẽ chưa được nhúng vào file hay đồng bộ qua Drive. Đây chưa phải ứng dụng offline hoàn chỉnh: lần tải ứng dụng, font, đăng nhập Drive và một số tài nguyên PDF có thể cần mạng.

## Có nên chuyển Next.js?

Hiện nên giữ Vite cho workspace này. Xem [đánh giá kiến trúc](docs/architecture.md) để biết lý do, các trường hợp nên chuyển và giới hạn còn lại.
