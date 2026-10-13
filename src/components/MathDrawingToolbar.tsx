import React, { useState } from 'react';
import {
  MousePointer,
  PenTool,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Columns,
  Square,
  Circle,
  Triangle,
  MoveRight,
  Minus,
  Grid2X2,
  ChevronDown,
  CornerDownRight,
  Type,
  Box,
  Pyramid,
  Cone,
  Cylinder,
  Globe,
  Shapes,
} from 'lucide-react';
import type { DrawTool } from '../types/document';

interface MathDrawingToolbarProps {
  activeTool: DrawTool;
  onSelectTool: (tool: DrawTool) => void;
  color: string;
  onSelectColor: (color: string) => void;
  strokeWidth: number;
  onSelectStrokeWidth: (w: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: () => void;
  isScratchpadOpen: boolean;
  onToggleScratchpad: () => void;
  hasDrawings: boolean;
  onOpenMathFormulaModal: () => void;
}

export const MATH_SHAPES_2D: { tool: DrawTool; label: string; icon: React.ReactNode }[] = [
  { tool: 'line', label: 'Đoạn thẳng', icon: <Minus size={16} /> },
  { tool: 'dashed-line', label: 'Nét đứt (Đường cao)', icon: <span style={{ fontWeight: 'bold', fontSize: '13px' }}>- - -</span> },
  { tool: 'arrow', label: 'Mũi tên (Vectơ)', icon: <MoveRight size={16} /> },
  { tool: 'triangle', label: 'Tam giác', icon: <Triangle size={16} /> },
  { tool: 'rect', label: 'Hình chữ nhật', icon: <Square size={16} /> },
  { tool: 'circle', label: 'Đường tròn / Elip', icon: <Circle size={16} /> },
  { tool: 'right-angle', label: 'Ký hiệu góc vuông', icon: <CornerDownRight size={16} /> },
  { tool: 'coordinate-axes', label: 'Hệ trục toạ độ Oxy', icon: <Grid2X2 size={16} /> },
];

export const MATH_SHAPES_3D: { tool: DrawTool; label: string; icon: React.ReactNode }[] = [
  { tool: 'pyramid-3d', label: 'Hình chóp tứ giác S.ABCD', icon: <Pyramid size={16} /> },
  { tool: 'tetrahedron-3d', label: 'Tứ diện / Chóp tam giác S.ABC', icon: <Shapes size={16} /> },
  { tool: 'cube-3d', label: 'Hình hộp / Lập phương 3D', icon: <Box size={16} /> },
  { tool: 'cone-3d', label: 'Hình nón 3D (Đáy elip)', icon: <Cone size={16} /> },
  { tool: 'cylinder-3d', label: 'Hình trụ 3D (2 đáy elip)', icon: <Cylinder size={16} /> },
  { tool: 'sphere-3d', label: 'Hình cầu 3D (Xích đạo)', icon: <Globe size={16} /> },
];

export const ALL_MATH_SHAPES = [...MATH_SHAPES_2D, ...MATH_SHAPES_3D];

const PEDAGOGICAL_COLORS = [
  { value: '#ef4444', label: 'Đỏ (Sửa bài)' },
  { value: '#2563eb', label: 'Xanh dương (Ghi chú)' },
  { value: '#0f172a', label: 'Đen (Viết lời giải)' },
  { value: '#10b981', label: 'Xanh lá (Công thức)' },
  { value: '#f97316', label: 'Cam' },
  { value: '#eab308', label: 'Vàng dạ quang' },
  { value: '#8b5cf6', label: 'Tím' },
  { value: '#ffffff', label: 'Trắng' },
];

export const MathDrawingToolbar: React.FC<MathDrawingToolbarProps> = ({
  activeTool,
  onSelectTool,
  color,
  onSelectColor,
  strokeWidth,
  onSelectStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPage,
  isScratchpadOpen,
  onToggleScratchpad,
  hasDrawings,
  onOpenMathFormulaModal,
}) => {
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);

  const currentShape = ALL_MATH_SHAPES.find((s) => s.tool === activeTool);

  return (
    <aside className="math-drawing-floating-bar glass-panel" aria-label="Thanh công cụ vẽ Toán">
      {/* 1. Công cụ cơ bản & Chọn di chuyển */}
      <div className="math-tool-group">
        <button
          type="button"
          className={`math-btn ${activeTool === 'select' ? 'is-active' : ''}`}
          onClick={() => onSelectTool('select')}
          title="Chọn & Kéo thả di chuyển nét vẽ (Select & Move)"
          aria-label="Chọn di chuyển"
        >
          <MousePointer size={16} />
        </button>

        <button
          type="button"
          className={`math-btn ${activeTool === 'pen' ? 'is-active' : ''}`}
          onClick={() => onSelectTool('pen')}
          title="Bút viết lời giải"
          aria-label="Bút viết"
        >
          <PenTool size={16} />
        </button>

        <button
          type="button"
          className={`math-btn ${activeTool === 'highlighter' ? 'is-active' : ''}`}
          onClick={() => onSelectTool('highlighter')}
          title="Bút dạ quang (Tô sáng từ khoá, công thức)"
          aria-label="Dạ quang"
        >
          <Highlighter size={16} />
        </button>

        {/* 2. Menu Hình học Toán học 2D & 3D */}
        <div className="relative-container">
          <button
            type="button"
            className={`math-btn math-shape-trigger ${currentShape ? 'is-active' : ''}`}
            onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)}
            title="Công cụ hình học 2D & 3D (Đoạn thẳng, chóp, lập phương, nón, trụ, cầu...)"
            aria-label="Công cụ Hình học Toán"
          >
            {currentShape ? currentShape.icon : <Shapes size={16} />}
            <span className="text-xs font-semibold ml-1">Hình</span>
            <ChevronDown size={11} className="ml-0.5 opacity-70" />
          </button>

          {isShapeMenuOpen && (
            <div className="math-shape-dropdown-menu">
              <div className="shape-dropdown-section">
                <div className="dropdown-menu-header">📐 Hình Học Phẳng (2D)</div>
                <div className="shape-items-grid">
                  {MATH_SHAPES_2D.map((shape) => (
                    <button
                      key={shape.tool}
                      type="button"
                      className={`shape-item-btn ${activeTool === shape.tool ? 'is-selected' : ''}`}
                      onClick={() => {
                        onSelectTool(shape.tool);
                        setIsShapeMenuOpen(false);
                      }}
                    >
                      <span className="shape-icon-box">{shape.icon}</span>
                      <span className="shape-label-text">{shape.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="shape-dropdown-divider" />

              <div className="shape-dropdown-section">
                <div className="dropdown-menu-header flex items-center justify-between">
                  <span>📦 Hình Học Không Gian (3D)</span>
                  <span className="badge-3d-tag">SGK Chuẩn</span>
                </div>
                <div className="shape-items-grid">
                  {MATH_SHAPES_3D.map((shape) => (
                    <button
                      key={shape.tool}
                      type="button"
                      className={`shape-item-btn shape-3d-btn ${activeTool === shape.tool ? 'is-selected' : ''}`}
                      onClick={() => {
                        onSelectTool(shape.tool);
                        setIsShapeMenuOpen(false);
                      }}
                    >
                      <span className="shape-icon-box">{shape.icon}</span>
                      <span className="shape-label-text">{shape.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Nút Chèn Công Thức Toán Học */}
        <button
          type="button"
          className={`math-btn math-formula-trigger-btn ${activeTool === 'math-text' ? 'is-active' : ''}`}
          onClick={() => {
            onSelectTool('math-text');
            onOpenMathFormulaModal();
          }}
          title="Chèn công thức & ký hiệu Toán học (√, x², π, Δ, ⊥, //...)"
          aria-label="Công thức Toán"
        >
          <Type size={16} />
          <span className="math-fx-label">f(x)</span>
        </button>

        <button
          type="button"
          className={`math-btn ${activeTool === 'eraser' ? 'is-active' : ''}`}
          onClick={() => onSelectTool('eraser')}
          title="Tẩy nét vẽ"
          aria-label="Tẩy"
        >
          <Eraser size={16} />
        </button>
      </div>

      <div className="math-divider" />

      {/* 4. Bảng màu & Nét */}
      {activeTool !== 'select' && activeTool !== 'eraser' && (
        <>
          <div className="math-tool-group color-palette-group">
            {PEDAGOGICAL_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`color-dot-btn ${color === c.value ? 'is-selected' : ''}`}
                style={{ backgroundColor: c.value }}
                onClick={() => onSelectColor(c.value)}
                title={c.label}
                aria-label={c.label}
              />
            ))}
          </div>

          <div className="math-divider" />

          {/* Chọn độ dày nét */}
          <div className="math-tool-group">
            {[2, 4, 6].map((w) => (
              <button
                key={w}
                type="button"
                className={`stroke-width-btn ${strokeWidth === w ? 'is-selected' : ''}`}
                onClick={() => onSelectStrokeWidth(w)}
                title={`Độ dày ${w}px`}
              >
                <span
                  className="stroke-preview-circle"
                  style={{ width: `${w * 2 + 2}px`, height: `${w * 2 + 2}px`, backgroundColor: color }}
                />
              </button>
            ))}
          </div>

          <div className="math-divider" />
        </>
      )}

      {/* 5. Undo, Redo & Xóa trang */}
      <div className="math-tool-group">
        <button
          type="button"
          className="math-btn"
          disabled={!canUndo}
          onClick={onUndo}
          title="Hoàn tác nét vẽ (Ctrl + Z)"
          aria-label="Hoàn tác"
        >
          <Undo2 size={16} />
        </button>

        <button
          type="button"
          className="math-btn"
          disabled={!canRedo}
          onClick={onRedo}
          title="Làm lại nét vẽ (Ctrl + Y)"
          aria-label="Làm lại"
        >
          <Redo2 size={16} />
        </button>

        <button
          type="button"
          className="math-btn"
          disabled={!hasDrawings}
          onClick={() => {
            if (confirm('Xóa sạch tất cả nét vẽ trên trang hiện tại?')) {
              onClearPage();
            }
          }}
          title="Xóa tất cả nét vẽ trên trang này"
          aria-label="Xóa nét vẽ"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="math-divider" />

      {/* 6. Nút mở rộng Lề nháp giải toán (Split-screen) */}
      <div className="math-tool-group">
        <button
          type="button"
          className={`math-btn scratchpad-toggle-btn ${isScratchpadOpen ? 'is-active' : ''}`}
          onClick={onToggleScratchpad}
          title={isScratchpadOpen ? 'Đóng lề nháp Toán' : 'Mở rộng lề nháp giải toán bên phải (Bảng nháp song song)'}
          aria-label="Lề nháp giải toán"
        >
          <Columns size={16} />
          <span className="scratchpad-btn-label">
            {isScratchpadOpen ? 'Đóng nháp' : 'Lề nháp Toán'}
          </span>
        </button>
      </div>
    </aside>
  );
};
