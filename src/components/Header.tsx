import React from 'react';
import {
  HelpCircle,
  Sun,
  Moon,
  Cloud,
  FolderTree,
} from 'lucide-react';
import type { GoogleUser } from '../types/document';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenGuide: () => void;
  onOpenDriveSettings: () => void;
  googleUser: GoogleUser | null;
  activeDocName?: string;
  activeDocFolder?: string;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onOpenGuide,
  onOpenDriveSettings,
  googleUser,
  activeDocName,
  activeDocFolder,
  onToggleSidebar,
}) => {
  return (
    <header className="app-header">
      {/* Khối bên trái: Logo & Thương hiệu Kim Ngân LEARN */}
      <div className="header-brand-group">
        {onToggleSidebar && (
          <button
            type="button"
            className="mobile-header-sidebar-btn"
            onClick={onToggleSidebar}
            title="Mở cây thư mục bài giảng"
            aria-label="Cây thư mục"
          >
            <FolderTree size={16} />
          </button>
        )}

        <div className="brand-logo-container" title="Kim Ngân LEARN - Workspace Dạy Kèm 1:1">
          <img
            src="/kimngan-logo.png"
            alt="Kim Ngân LEARN"
            className="brand-logo-img"
          />
        </div>
      </div>

      {/* Khối ở giữa: Trạng thái Google Meet Stream & Tên bài học */}
      <div className="header-status-group">
        {activeDocName && (
          <div className="header-current-file">
            <span className="file-label">Đang giảng:</span>
            <span className="file-name" title={activeDocName}>{activeDocName}</span>
            {activeDocFolder && (
              <span className="file-folder-tag" title={activeDocFolder}>
                ({activeDocFolder})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Khối bên phải: Nút Drive, Hướng dẫn & Đổi Theme */}
      <div className="header-actions-group">
        {/* Nút trạng thái Google Drive */}
        <button
          type="button"
          className={`header-action-btn drive-header-btn ${googleUser ? 'is-connected' : ''}`}
          onClick={onOpenDriveSettings}
          title={
            googleUser
              ? `Google Drive đã kết nối (${googleUser.email}). Bấm để quản lý cài đặt.`
              : 'Kết nối Google Drive cá nhân để tự động lưu tài liệu theo thư mục'
          }
          aria-label="Cài đặt Google Drive"
        >
          <Cloud size={16} className={googleUser ? 'text-success' : 'opacity-70'} />
          <span className="btn-label-mobile-hidden">
            {googleUser ? 'Google Drive' : 'Nối Drive'}
          </span>
          {googleUser && <span className="drive-active-dot" />}
        </button>

        <button
          type="button"
          className="header-action-btn"
          onClick={onOpenGuide}
          title="Xem hướng dẫn chia sẻ Meet & bật PiP nổi"
          aria-label="Hướng dẫn dạy học"
        >
          <HelpCircle size={18} />
          <span className="btn-label-mobile-hidden">Cách dùng với Meet</span>
        </button>

        <button
          type="button"
          className="header-action-btn theme-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          aria-label="Đổi giao diện"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
