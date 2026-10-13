import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  Zap,
  AlignJustify,
} from 'lucide-react';
import type { DocType } from '../types/document';

interface ToolbarProps {
  docType: DocType;
  currentPage: number;
  totalPages: number;
  zoom: number;
  rotation: number;
  isLaserActive: boolean;
  isFullscreen: boolean;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onFitWidth: () => void;
  onResetZoom: () => void;
  onRotate: () => void;
  onToggleLaser: () => void;
  onToggleFullscreen: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  docType,
  currentPage,
  totalPages,
  zoom,
  rotation: _rotation,
  isLaserActive,
  isFullscreen,
  onPageChange,
  onZoomChange,
  onFitWidth,
  onResetZoom,
  onRotate,
  onToggleLaser,
  onToggleFullscreen,
}) => {
  const [inputPage, setInputPage] = useState<string>(String(currentPage));

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(inputPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    } else {
      setInputPage(String(currentPage));
    }
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="floating-toolbar-wrapper" role="toolbar" aria-label="Thanh điều khiển bài giảng">
      <div className="floating-toolbar glass-panel">
        {/* 1. Bộ điều khiển trang (Chỉ hiển thị cho PDF có nhiều trang) */}
        {docType === 'pdf' && totalPages > 0 && (
          <>
            <div className="toolbar-group">
              <button
                type="button"
                className="toolbar-btn"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                title="Trang trước (Phím mũi tên Trái)"
                aria-label="Trang trước"
              >
                <ChevronLeft size={18} />
              </button>

              <form onSubmit={handlePageSubmit} className="toolbar-page-form">
                <input
                  type="text"
                  inputMode="numeric"
                  className="toolbar-page-input"
                  value={inputPage}
                  onChange={(e) => setInputPage(e.target.value)}
                  onBlur={handlePageSubmit}
                  title="Nhập số trang và nhấn Enter"
                  aria-label="Số trang hiện tại"
                />
                <span className="toolbar-page-total">/ {totalPages}</span>
              </form>

              <button
                type="button"
                className="toolbar-btn"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                title="Trang sau (Phím mũi tên Phải)"
                aria-label="Trang sau"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="toolbar-divider" />
          </>
        )}

        {/* 2. Bộ điều khiển Zoom */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            disabled={zoom <= 0.4}
            onClick={() => onZoomChange(Math.max(0.4, Number((zoom - 0.15).toFixed(2))))}
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
          >
            <ZoomOut size={17} />
          </button>

          <button
            type="button"
            className="toolbar-badge-btn"
            onClick={onResetZoom}
            title="Đặt lại tỉ lệ 100%"
            aria-label="Đặt lại tỉ lệ 100%"
          >
            <span className="zoom-value">{zoomPercent}%</span>
          </button>

          <button
            type="button"
            className="toolbar-btn"
            disabled={zoom >= 3.0}
            onClick={() => onZoomChange(Math.min(3.0, Number((zoom + 0.15).toFixed(2))))}
            title="Phóng to"
            aria-label="Phóng to"
          >
            <ZoomIn size={17} />
          </button>

          <button
            type="button"
            className="toolbar-btn"
            onClick={onFitWidth}
            title="Vừa chiều ngang màn hình"
            aria-label="Vừa chiều rộng"
          >
            <AlignJustify size={17} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* 3. Xoay tài liệu (chỉ dành cho PDF và Ảnh) */}
        {docType !== 'word' && (
          <>
            <div className="toolbar-group">
              <button
                type="button"
                className="toolbar-btn"
                onClick={onRotate}
                title="Xoay trang 90 độ"
                aria-label="Xoay 90 độ"
              >
                <RotateCw size={17} />
              </button>
            </div>

            <div className="toolbar-divider" />
          </>
        )}

        {/* 4. Con trỏ Laser giảng bài & Toàn màn hình */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn laser-toggle-btn ${isLaserActive ? 'is-active' : ''}`}
            onClick={onToggleLaser}
            title={isLaserActive ? 'Tắt con trỏ Laser' : 'Bật con trỏ Laser (Chỉ điểm bài học)'}
            aria-label="Bật tắt con trỏ Laser"
          >
            <Zap size={17} className={isLaserActive ? 'text-laser' : ''} />
            <span className="laser-label-text">{isLaserActive ? 'Laser ON' : 'Laser'}</span>
          </button>

          <button
            type="button"
            className="toolbar-btn"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình giảng dạy'}
            aria-label="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </div>
    </div>
  );
};
