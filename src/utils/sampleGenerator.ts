/**
 * Helper sinh tài liệu mẫu (PDF và Ảnh) để giáo viên có thể thử nghiệm ngay lập tức
 * mà không cần phải tìm kiếm file bên ngoài.
 */

export function createSamplePdfBuffer(title: string, subtitle: string, pageCount: number = 2): ArrayBuffer {
  // Tạo tài liệu PDF 1.4 tiêu chuẩn với số trang tùy biến
  const pageObjects: string[] = [];
  const contentObjects: string[] = [];
  const kids: string[] = [];

  let objIndex = 5; // Bắt đầu từ obj 5

  for (let i = 1; i <= pageCount; i++) {
    const pageObjNum = objIndex++;
    const contentObjNum = objIndex++;
    kids.push(`${pageObjNum} 0 R`);

    const streamContent = `
BT
/F1 22 Tf
50 720 Td
(${title} - Trang ${i}) Tj
ET
BT
/F1 14 Tf
50 680 Td
(${subtitle}) Tj
ET
BT
/F1 12 Tf
50 630 Td
(1. Phan mo dau va muc tieu buoi hoc:) Tj
0 -25 Td
(- Giao vien co the giang giai truc tiep tren tai lieu nay.) Tj
0 -20 Td
(- Chuyen doi giua cac tab tai lieu ma khong can tat bat Google Meet.) Tj
0 -20 Td
(- Bat che do Laser Pointer o thanh cong cu de chi diem bai hoc.) Tj
0 -35 Td
(2. Tu vung va cau truc trong tam:) Tj
0 -20 Td
(- Point 1: Interactive 1-on-1 Workspace for tutoring) Tj
0 -20 Td
(- Point 2: IndexedDB secure offline storage) Tj
0 -20 Td
(- Point 3: Google Meet Picture-in-Picture smooth experience) Tj
0 -35 Td
(3. Bai tap van dung nhanh:) Tj
0 -20 Td
(- Hay chuyen sang tab Exercise.png tren thanh cong cu de lam bai!) Tj
ET
    `.trim();

    const streamLength = streamContent.length;

    pageObjects.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj\n`
    );

    contentObjects.push(
      `${contentObjNum} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`
    );
  }

  const pdfBody = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>
endobj
3 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
${pageObjects.join('\n')}
${contentObjects.join('\n')}
xref
0 ${objIndex}
0000000000 65535 f 
trailer
<< /Size ${objIndex} /Root 1 0 R >>
startxref
50
%%EOF`;

  const encoder = new TextEncoder();
  return encoder.encode(pdfBody).buffer as ArrayBuffer;
}

export function createSampleImageBuffer(title: string, exerciseNumber: string): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve(new ArrayBuffer(0));
      return;
    }

    // Nền trắng tinh tế với hoa văn lưới nhẹ cho vở bài tập
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header gradient sang trọng
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 180);
    grad.addColorStop(0, '#4f46e5');
    grad.addColorStop(1, '#6366f1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, 180);

    // Tiêu đề
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('HoloTutor - Phiếu Bài Tập', 60, 80);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#e0e7ff';
    ctx.fillText(`${title} • ${exerciseNumber}`, 60, 125);

    // Khung nội dung câu hỏi
    const drawCard = (y: number, qTitle: string, qContent: string[]) => {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(50, y, 800, 180, 12);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(qTitle, 80, y + 45);

      ctx.fillStyle = '#475569';
      ctx.font = '18px sans-serif';
      qContent.forEach((line, idx) => {
        ctx.fillText(line, 80, y + 85 + idx * 30);
      });
    };

    drawCard(220, 'Câu 1: Nhận định đúng sai (Vocabulary Check)', [
      'A. Google Meet hỗ trợ chia sẻ một tab riêng biệt mà không che các cửa sổ khác.',
      'B. HoloTutor lưu trữ tài liệu trong IndexedDB cục bộ của máy giáo viên.',
    ]);

    drawCard(430, 'Câu 2: Điền từ vào chỗ trống', [
      'Giáo viên bật cửa sổ nổi ____________ để vừa giảng bài vừa nhìn thấy học sinh.',
      'Đáp án gợi ý: Picture-in-Picture (PiP).',
    ]);

    drawCard(640, 'Câu 3: Bài tập thực hành tương tác', [
      'Hãy thử dùng công cụ Laser Pointer (bút laser màu đỏ rực) ở thanh điều khiển.',
      'Di chuyển chuột xung quanh câu hỏi này để hướng dẫn học sinh làm bài!',
    ]);

    // Footer ghi chú giáo viên
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 16px sans-serif';
    ctx.fillText('* Bài tập mẫu hiển thị dưới dạng hình ảnh chất lượng cao (PNG 900x1200)', 80, 900);

    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(new ArrayBuffer(0));
        return;
      }
      blob.arrayBuffer().then((buffer) => resolve(buffer));
    }, 'image/png');
  });
}
