import React, { useState } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  ExternalLink,
  Key,
  ShieldCheck,
  LogOut,
  LogIn,
  AlertCircle,
  FolderTree,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import type { GoogleUser } from '../types/document';

interface GoogleDriveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  isEnvConfigured?: boolean;
  onSaveClientId: (id: string) => void;
  user: GoogleUser | null;
  onLogin: () => void;
  onLogout: () => void;
  isConnecting: boolean;
  errorMsg: string | null;
}

export const GoogleDriveSettingsModal: React.FC<GoogleDriveSettingsModalProps> = ({
  isOpen,
  onClose,
  clientId,
  isEnvConfigured = false,
  onSaveClientId,
  user,
  onLogin,
  onLogout,
  isConnecting,
  errorMsg,
}) => {
  const [inputClientId, setInputClientId] = useState(clientId);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(!isEnvConfigured && !clientId);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveClientId(inputClientId.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container drive-settings-modal-width" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="drive-header-icon-box">
              <Cloud size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="modal-title">Cài Đặt Đồng Bộ Google Drive</h2>
              <p className="text-xs text-muted">Lưu trữ tài liệu tự động theo cây thư mục Học sinh & Buổi học</p>
            </div>
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

        {/* Body */}
        <div className="modal-body drive-modal-body">
          {/* Thông báo Production Ready nếu đã cấu hình qua biến môi trường */}
          {isEnvConfigured && (
            <div className="prod-badge-notice">
              <SafetyCertificateOutlined style={{ fontSize: '16px', color: 'var(--brand-primary)', flexShrink: 0 }} />
              <span>
                <strong>Môi trường Production:</strong> Hệ thống đã được cấu hình sẵn Google OAuth. Giáo viên chỉ cần bấm <em>"Kết nối Drive"</em> để bắt đầu sử dụng!
              </span>
            </div>
          )}

          {/* Trạng thái tài khoản */}
          <div className="drive-account-card">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  {user.picture ? (
                    <img src={user.picture} alt="Avatar" className="user-avatar-circle" />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{user.name || 'Giáo viên'}</span>
                      <span className="badge-connected">
                        <CheckCircle2 size={12} /> Đã kết nối
                      </span>
                    </div>
                    <span className="text-xs text-muted">{user.email}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-danger-outline btn-sm"
                  onClick={onLogout}
                  title="Đăng xuất khỏi Google Drive"
                >
                  <LogOut size={14} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="drive-disconnected-icon">
                    <Cloud size={22} className="opacity-50" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm">Chưa kết nối Google Drive</span>
                    <p className="text-xs text-muted">Đăng nhập tài khoản Google của bạn để tự động lưu bài giảng vào Drive cá nhân.</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!clientId || isConnecting}
                  onClick={onLogin}
                >
                  <LogIn size={15} />
                  <span>{isConnecting ? 'Đang kết nối...' : 'Kết nối Drive'}</span>
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="drive-error-alert">
              <AlertCircle size={16} className="text-danger flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cơ chế cây thư mục tự động */}
          <div className="drive-folder-concept-card">
            <div className="flex items-center gap-2 mb-2">
              <FolderTree size={16} className="text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Cấu trúc thư mục tự động tạo trên Google Drive</h4>
            </div>
            <div className="folder-tree-diagram">
              <div className="tree-node root">
                📁 <strong>HoloTutor Materials/</strong> <span className="text-muted">(Thư mục gốc)</span>
              </div>
              <div className="tree-node child-1">
                └── 📁 <strong>[Tên Học Sinh hoặc Lớp]/</strong> <span className="text-muted">(Ví dụ: Học sinh Nam)</span>
              </div>
              <div className="tree-node child-2">
                └── 📁 <strong>[Buổi Học]/</strong> <span className="text-muted">(Ví dụ: Lesson 01)</span>
              </div>
              <div className="tree-node child-3">
                ├── 📄 Vocabulary.pdf <span className="badge-drive-pill">Đã lưu Drive</span>
              </div>
              <div className="tree-node child-3">
                └── 🖼️ Exercise.png <span className="badge-drive-pill">Đã lưu Drive</span>
              </div>
            </div>
          </div>

          {/* Khu vực Cấu hình Google Client ID (Có thể gập mở) */}
          <div className="advanced-config-section">
            <button
              type="button"
              className="advanced-toggle-btn"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="flex items-center gap-1.5 font-semibold text-xs text-muted">
                <Key size={14} /> Cấu hình Google Client ID (Dành cho Developer / Tùy chỉnh)
              </span>
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAdvanced && (
              <div className="advanced-form-body mt-2">
                <form onSubmit={handleSave} className="drive-clientid-form">
                  <label className="field-label flex items-center justify-between">
                    <span className="text-xs text-muted">Google OAuth Client ID:</span>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="external-guide-link"
                    >
                      Google Cloud Console <ExternalLink size={12} />
                    </a>
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="text-input flex-1"
                      placeholder="Ví dụ: 123456789-xxxxxx.apps.googleusercontent.com"
                      value={inputClientId}
                      onChange={(e) => setInputClientId(e.target.value)}
                    />
                    <button type="submit" className="btn btn-secondary btn-sm">
                      Lưu
                    </button>
                  </div>
                  {saveSuccess && (
                    <p className="text-xs text-success flex items-center gap-1 mt-1">
                      <CheckCircle2 size={13} /> Đã lưu Client ID thành công!
                    </p>
                  )}
                </form>

                {/* Hướng dẫn tạo Client ID */}
                <div className="drive-setup-guide mt-3">
                  <h4 className="guide-title flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-success" /> Cách tạo Google Client ID trên Google Cloud (Làm 1 lần cho toàn bộ web):
                  </h4>
                  <ol className="guide-ordered-steps">
                    <li>
                      Tạo Project trên <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="underline font-semibold text-primary">Google Cloud Console</a>.
                    </li>
                    <li>
                      Vào <strong>APIs & Services</strong> &rarr; <strong>Library</strong> &rarr; Bật <strong>Google Drive API</strong>.
                    </li>
                    <li>
                      Vào <strong>Credentials</strong> &rarr; <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong> (chọn Web application, thêm domain web của bạn vào Authorized JavaScript origins).
                    </li>
                    <li>
                      Điền Client ID vào file <code>.env</code> (biến <code>VITE_GOOGLE_CLIENT_ID</code>) khi deploy lên Coolify/VPS.
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary w-full" onClick={onClose}>
            Đóng bảng cài đặt
          </button>
        </div>
      </div>
    </div>
  );
};
