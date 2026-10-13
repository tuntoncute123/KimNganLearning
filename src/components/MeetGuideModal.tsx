import React from 'react';
import {
  X,
  Tv,
  PictureInPicture2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface MeetGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MeetGuideModal: React.FC<MeetGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container guide-modal-width" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Tv className="text-primary" size={22} />
            <h2 className="modal-title">Quy Trình Dạy Kèm 1:1 Với Google Meet</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body guide-steps-list">
          {/* Bước 1 */}
          <div className="guide-step-card">
            <div className="step-number-badge">1</div>
            <div className="step-content">
              <div className="flex items-center gap-2 mb-1">
                <PictureInPicture2 size={18} className="text-primary" />
                <h3 className="step-title">Bật Video Nổi (Picture-in-Picture) Trên Google Meet</h3>
              </div>
              <p className="step-desc">
                Trong cuộc gọi Google Meet với học sinh, rê chuột vào ô video của học sinh hoặc nhấn menu dấu 3 chấm <code>⋮</code> &rarr; chọn <strong>"Mở cửa sổ thu nhỏ (Open Picture-in-Picture)"</strong>.
              </p>
              <div className="step-note">
                Khung video học sinh sẽ luôn nổi ở góc màn hình, giúp giáo viên quan sát biểu cảm học sinh xuyên suốt buổi dạy.
              </div>
            </div>
          </div>

          {/* Bước 2 */}
          <div className="guide-step-card">
            <div className="step-number-badge">2</div>
            <div className="step-content">
              <div className="flex items-center gap-2 mb-1">
                <Tv size={18} className="text-primary" />
                <h3 className="step-title">Chia Sẻ Tab HoloTutor Này ("Present a tab")</h3>
              </div>
              <p className="step-desc">
                Nhấn nút <strong>"Trình bày ngay (Present now)"</strong> trên Google Meet &rarr; Chọn thẻ <strong>"Một thẻ (A tab)"</strong> &rarr; Chọn tab <strong>"HoloTutor - Workspace Dạy Kèm 1:1"</strong>.
              </p>
              <div className="step-note">
                Chỉ chia sẻ đúng 1 tab này duy nhất. Tuyệt đối không cần chọn chia sẻ toàn màn hình hay cửa sổ khác.
              </div>
            </div>
          </div>

          {/* Bước 3 */}
          <div className="guide-step-card">
            <div className="step-number-badge">3</div>
            <div className="step-content">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={18} className="text-success" />
                <h3 className="step-title">Chuyển Đổi Tài Liệu Tức Thì Trong Cùng Một Tab</h3>
              </div>
              <p className="step-desc">
                Khi cần đổi từ <em>Lesson 01.pdf</em> sang <em>Vocabulary.pdf</em> hay <em>Exercise (ảnh)</em>, giáo viên chỉ cần nhấn vào tab tài liệu trên thanh công cụ HoloTutor.
              </p>
              <div className="step-note success-highlight">
                Học sinh trên Google Meet sẽ nhìn thấy nội dung thay đổi tức thì. Giáo viên không cần bấm "Dừng chia sẻ" rồi "Chia sẻ lại", tiết kiệm 100% thao tác thừa!
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary w-full" onClick={onClose}>
            <span>Đã hiểu, bắt đầu buổi dạy</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
