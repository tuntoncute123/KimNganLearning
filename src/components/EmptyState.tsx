import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  FolderTree,
  User,
  BookOpen,
  Cloud,
} from 'lucide-react';
import { ThunderboltOutlined } from '@ant-design/icons';
import type { GoogleUser } from '../types/document';

interface EmptyStateProps {
  onFilesSelected: (files: FileList | File[], studentName: string, lessonName: string) => void;
  onLoadSample: (studentName: string, lessonName: string) => void;
  isModal?: boolean;
  onCloseModal?: () => void;
  googleUser?: GoogleUser | null;
  onOpenDriveSettings?: () => void;
  defaultStudentName?: string;
  defaultLessonName?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onFilesSelected,
  onLoadSample,
  isModal = false,
  onCloseModal,
  googleUser,
  onOpenDriveSettings,
  defaultStudentName = 'Học sinh A',
  defaultLessonName = 'Lesson 01',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [studentName, setStudentName] = useState(defaultStudentName);
  const [lessonName, setLessonName] = useState(defaultLessonName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files, studentName, lessonName);
      if (onCloseModal) onCloseModal();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files, studentName, lessonName);
      if (onCloseModal) onCloseModal();
    }
  };

  const content = (
    <div className={`empty-state-card ${isModal ? 'is-modal-inner' : ''}`}>
      {/* Khung cấu hình thư mục học sinh & buổi học */}
      <div className="folder-assign-box">
        <div className="folder-assign-header">
          <div className="flex items-center gap-2">
            <FolderTree size={17} className="text-primary" />
            <span className="font-semibold text-sm">Phân chia thư mục lưu trữ:</span>
          </div>
          {googleUser ? (
            <span className="badge-drive-active" title="Google Drive đang kích hoạt">
              <Cloud size={13} /> Lưu Google Drive: <strong>{googleUser.email}</strong>
            </span>
          ) : (
            <button
              type="button"
              className="badge-drive-setup-link"
              onClick={onOpenDriveSettings}
              title="Bật tính năng tự động lưu lên Google Drive"
            >
              <Cloud size={13} /> Kết nối Google Drive
            </button>
          )}
        </div>

        <div className="folder-inputs-grid">
          <div className="folder-input-group">
            <label className="input-mini-label">
              <User size={13} /> Tên Học Sinh / Lớp học:
            </label>
            <input
              type="text"
              className="folder-text-field"
              placeholder="Ví dụ: Học sinh Nam, Lớp IELTS..."
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>

          <div className="folder-input-group">
            <label className="input-mini-label">
              <BookOpen size={13} /> Buổi Học / Chủ đề:
            </label>
            <input
              type="text"
              className="folder-text-field"
              placeholder="Ví dụ: Lesson 01, Buổi 2 Từ vựng..."
              value={lessonName}
              onChange={(e) => setLessonName(e.target.value)}
            />
          </div>
        </div>

        <div className="folder-path-preview">
          <span className="preview-label">Đường dẫn đích:</span>
          <code className="preview-path-text">
            HoloTutor Materials / {studentName.trim() || 'Học sinh'} / {lessonName.trim() || 'Buổi học'}
          </code>
        </div>
      </div>

      {/* Khu vực Dropzone */}
      <div
        className={`dropzone-area ${isDragOver ? 'is-dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,image/png,image/jpeg,image/webp,image/jpg,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        <div className="dropzone-icon-circle">
          <UploadCloud size={38} className="text-primary" />
        </div>

        <h3 className="dropzone-title">
          Kéo thả tài liệu vào đây hoặc <span className="text-accent underline">chọn từ máy tính</span>
        </h3>

        <p className="dropzone-desc">
          Tài liệu sẽ được hiển thị ngay trong Workspace và tự động phân loại vào thư mục <strong>"{studentName} / {lessonName}"</strong>
        </p>

        <div className="dropzone-supported-tags">
          <span className="format-tag pdf">
            <FileText size={13} /> Sách / Bài giảng (.pdf)
          </span>
          <span className="format-tag word">
            <FileText size={13} /> Tài liệu Word (.docx)
          </span>
          <span className="format-tag img">
            <ImageIcon size={13} /> Bài tập chụp / Ảnh (.png, .jpg)
          </span>
        </div>
      </div>

      <div className="empty-state-tips-section">
        <div className="tip-item">
          <CheckCircle2 size={16} className="text-success flex-shrink-0" />
          <span><strong>Một tab duy nhất:</strong> Chỉ cần chia sẻ tab này trên Google Meet, chuyển tài liệu không làm gián đoạn luồng hình ảnh.</span>
        </div>
        <div className="tip-item">
          <CheckCircle2 size={16} className="text-success flex-shrink-0" />
          <span><strong>Bảo mật & Tự động:</strong> {googleUser ? 'File được tự động tải thẳng vào đúng thư mục trên Google Drive cá nhân của bạn.' : 'File được lưu trên bộ nhớ cục bộ IndexedDB, có thể kết nối Drive bất cứ lúc nào.'}</span>
        </div>
      </div>

      {!isModal && (
        <div className="sample-action-wrapper">
          <button
            type="button"
            className="btn btn-secondary sample-btn"
            onClick={() => onLoadSample(studentName, lessonName)}
          >
            <ThunderboltOutlined style={{ fontSize: '16px', color: '#f59e0b' }} />
            <span>Tải bộ tài liệu mẫu để thử ngay (Lesson 01 & Exercise 01)</span>
          </button>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="modal-backdrop" onClick={onCloseModal}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Thêm Tài Liệu Buổi Học</h2>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onCloseModal}
              aria-label="Đóng"
            >
              ×
            </button>
          </div>
          <div className="modal-body">{content}</div>
        </div>
      </div>
    );
  }

  return <div className="empty-state-full-screen">{content}</div>;
};
