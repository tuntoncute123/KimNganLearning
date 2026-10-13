import React, { useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  X,
  Plus,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Cloud,
} from 'lucide-react';
import type { DocumentItem } from '../types/document';

interface DocumentTabBarProps {
  documents: DocumentItem[];
  activeId: string | null;
  onSelectDoc: (id: string) => void;
  onCloseDoc: (id: string, e: React.MouseEvent) => void;
  onOpenUpload: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const DocumentTabBar: React.FC<DocumentTabBarProps> = ({
  documents,
  activeId,
  onSelectDoc,
  onCloseDoc,
  onOpenUpload,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      const offset = direction === 'left' ? -200 : 200;
      tabsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="document-tabbar-container">
      {/* Nút mở danh sách tài liệu tổng */}
      <button
        type="button"
        className={`sidebar-toggle-btn ${isSidebarOpen ? 'is-active' : ''}`}
        onClick={onToggleSidebar}
        title="Quản lý toàn bộ kho tài liệu"
        aria-label="Quản lý tài liệu"
      >
        <FolderOpen size={17} />
        <span className="sidebar-btn-label">Tài liệu ({documents.length})</span>
      </button>

      {/* Nút cuộn tab sang trái nếu nhiều file */}
      {documents.length > 3 && (
        <button
          type="button"
          className="tab-scroll-btn left"
          onClick={() => scrollTabs('left')}
          title="Cuộn sang trái"
          aria-label="Cuộn tab sang trái"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Vùng chứa danh sách Tab ngang */}
      <div className="tabs-scroll-viewport" ref={tabsScrollRef}>
        {documents.map((doc) => {
          const isActive = doc.id === activeId;
          const isPdf = doc.type === 'pdf';
          const isWord = doc.type === 'word';
          const isDriveSynced = !!doc.driveFileId;

          return (
            <div
              key={doc.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              className={`doc-tab-item ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectDoc(doc.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDoc(doc.id);
                }
              }}
              title={`${doc.name} ${doc.driveFolderPath ? `(${doc.driveFolderPath})` : ''} - ${isPdf ? `${doc.totalPages || 1} trang` : isWord ? 'Tài liệu Word' : 'Hình ảnh'}`}
            >
              <div className="tab-icon-wrapper">
                {isPdf ? (
                  <FileText size={15} className="text-pdf-icon" />
                ) : isWord ? (
                  <FileText size={15} className="text-word-icon" />
                ) : (
                  <ImageIcon size={15} className="text-img-icon" />
                )}
              </div>

              <span className="tab-title-text">{doc.name}</span>

              {isDriveSynced && (
                <span className="tab-drive-indicator" title="Tài liệu đã lưu trên Google Drive">
                  <Cloud size={11} className="text-success" />
                </span>
              )}

              {isPdf && doc.totalPages > 1 && (
                <span className="tab-page-badge">{doc.currentPage || 1}/{doc.totalPages}</span>
              )}

              <button
                type="button"
                className="tab-close-btn"
                onClick={(e) => onCloseDoc(doc.id, e)}
                title={`Đóng tài liệu ${doc.name}`}
                aria-label={`Đóng ${doc.name}`}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Nút cuộn tab sang phải */}
      {documents.length > 3 && (
        <button
          type="button"
          className="tab-scroll-btn right"
          onClick={() => scrollTabs('right')}
          title="Cuộn sang phải"
          aria-label="Cuộn tab sang phải"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Nút thêm file nhanh */}
      <button
        type="button"
        className="add-quick-tab-btn"
        onClick={onOpenUpload}
        title="Thêm tài liệu mới (PDF / Ảnh)"
        aria-label="Thêm tài liệu"
      >
        <Plus size={16} />
        <span className="add-btn-text">Thêm file</span>
      </button>
    </div>
  );
};
