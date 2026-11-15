import React, { useRef, useEffect, useCallback } from 'react';
import {
  Move,
  Copy,
  Trash2,
  Edit3,
} from 'lucide-react';
import type { DrawTool, DrawStroke, Point } from '../types/document';

import { renderStroke } from '../drawing/renderStroke';
import { getStrokeBoundingBox, type ResizeHandle } from '../drawing/geometry';
import { useAnnotationInteraction } from '../hooks/useAnnotationInteraction';

export interface AnnotationCanvasProps {
  rotation?: number;
  resolutionScale?: number;
  width: number;
  height: number;
  activeTool: DrawTool;
  color: string;
  strokeWidth: number;
  strokes: DrawStroke[];
  onStrokesChange: (newStrokes: DrawStroke[]) => void;
  showGrid?: boolean;
  onOpenMathFormulaModal?: (clickPos: Point, editStroke?: DrawStroke) => void;
  onEditMathFormula?: (stroke: DrawStroke) => void;
  selectedStrokeId?: string | null;
  onSelectStroke?: (strokeId: string | null) => void;
}

  // Lưới ô vuông toạ độ (Grid)
  const drawGridLines = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.14)';
    ctx.lineWidth = 1;
    const gridSize = 25;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  };

export const AnnotationCanvas = React.memo<AnnotationCanvasProps>(({
  width,
  height,
  rotation = 0,
  resolutionScale = 1,
  activeTool,
  color,
  strokeWidth,
  strokes,
  onStrokesChange,
  showGrid = false,
  onOpenMathFormulaModal,
  onEditMathFormula,
  selectedStrokeId: externalSelectedId,
  onSelectStroke,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Chỉ thay đổi kích thước buffer GPU khi width hoặc height thực sự thay đổi (tránh huỷ/tạo buffer liên tục)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const dpr = Math.min(3, (window.devicePixelRatio || 1) * resolutionScale);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, [width, height, resolutionScale]);

  // Redraw the fixed document plane at the current display resolution.
  const renderStrokesDirect = useCallback(
    (strokesToRender: DrawStroke[], preview?: DrawStroke | null) => {
      const canvas = canvasRef.current;
      if (!canvas || width <= 0 || height <= 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(3, (window.devicePixelRatio || 1) * resolutionScale);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      if (showGrid) {
        drawGridLines(ctx, width, height);
      }

      strokesToRender.forEach((s) => renderStroke(ctx, s));

      if (preview) {
        renderStroke(ctx, preview);
      }
    },
    [width, height, showGrid, resolutionScale]
  );

  const { displayStrokes, livePreviewStroke, selectedStroke, isInteracting, setHoveredStrokeId, handlePointerDown, handlePointerMove, handlePointerUp, handleStartResize, handlePointerMoveResize, handlePointerUpResize, toggleStrokeDashed, changeStrokeColor, changeStrokeWidth, duplicateStroke, deleteStroke } = useAnnotationInteraction({
    canvasRef, width, height, rotation, activeTool, color, strokeWidth, strokes, onStrokesChange, onOpenMathFormulaModal, onEditMathFormula, externalSelectedId, onSelectStroke, renderStrokesDirect
  });

  // 2. Redraw thông thường khi strokes hoặc preview thay đổi
  useEffect(() => {
    renderStrokesDirect(displayStrokes, livePreviewStroke);
  }, [displayStrokes, livePreviewStroke, renderStrokesDirect]);

  // Cursor Class
  let cursorClass = 'pointer-draw';
  if (activeTool === 'select') cursorClass = 'pointer-select';
  if (activeTool === 'eraser') cursorClass = 'is-eraser-mode';
  if (activeTool === 'math-text') cursorClass = 'is-text-mode';
  if (activeTool === 'pen' || activeTool === 'highlighter') cursorClass = 'pointer-pen';

  // Tính vị trí Bounding Box và Floating Toolbar (ẩn khi đang kéo để giữ mượt)
  const selectedBox = selectedStroke ? getStrokeBoundingBox(selectedStroke) : null;
  const showFloatingBar = selectedStroke && !isInteracting && selectedBox;

  return (
    <div
      ref={containerRef}
      className="annotation-canvas-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      <canvas
        ref={canvasRef}
        className={`annotation-drawing-canvas ${cursorClass}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => setHoveredStrokeId(null)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
          touchAction: activeTool === 'select' ? 'pan-x pan-y' : 'none',
        }}
      />

      {/* OVERLAY KHUNG CHỌN, 8 TAY NẮM CO GIÃN & THANH CÔNG CỤ NHANH */}
      {showFloatingBar && selectedBox && (
        <div
          className="selection-active-overlay"
          style={{
            position: 'absolute',
            left: `${selectedBox.minX}px`,
            top: `${selectedBox.minY}px`,
            width: `${selectedBox.width}px`,
            height: `${selectedBox.height}px`,
            pointerEvents: 'none',
          }}
        >
          {/* Khung viền nét đứt màu xanh */}
          <div className="selection-box-border" />

          {/* 8 Tay nắm co giãn kích thước (Resize Handles) */}
          {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]).map((handle) => (
            <div
              key={handle}
              className={`selection-resize-handle handle-${handle}`}
              onPointerDown={(e) => handleStartResize(e, handle)}
              onPointerMove={handlePointerMoveResize}
              onPointerUp={handlePointerUpResize}
              title="Kéo co giãn kích thước hình"
            />
          ))}

          {/* THANH CÔNG CỤ NỔI NHANH (QUICK ACTIONS FLOATING TOOLBAR) */}
          <div
            className={`shape-quick-action-bar ${selectedBox.minY < 50 ? 'position-bottom' : 'position-top'}`}
            style={{ pointerEvents: 'auto' }}
          >
            {/* 1. Nút Tay nắm Kéo thả di chuyển */}
            <div className="quick-drag-indicator" title="Nhấp & kéo thả hình để di chuyển">
              <Move size={13} />
              <span className="drag-label">Kéo</span>
            </div>

            <div className="quick-action-divider" />

            {/* 2. Chuyển đổi Nét Đứt / Nét Liền (Cực tốt cho Toán Hình học không gian) */}
            <button
              type="button"
              className={`quick-action-btn ${selectedStroke.isDashed ? 'is-active' : ''}`}
              onClick={() => toggleStrokeDashed(selectedStroke.id)}
              title={selectedStroke.isDashed ? 'Đang nét đứt (Bấm để đổi nét liền)' : 'Đang nét liền (Bấm để đổi nét đứt)'}
            >
              <span className="dashed-sample">- - -</span>
              <span className="text-2xs font-semibold ml-1">
                {selectedStroke.isDashed ? 'Nét đứt' : 'Nét liền'}
              </span>
            </button>

            <div className="quick-action-divider" />

            {/* 3. Bảng màu nhanh */}
            <div className="quick-color-group">
              {['#ef4444', '#2563eb', '#0f172a', '#10b981', '#f97316', '#8b5cf6'].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`quick-color-dot ${selectedStroke.color === c ? 'is-active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => changeStrokeColor(selectedStroke.id, c)}
                  title={`Đổi màu`}
                />
              ))}
            </div>

            <div className="quick-action-divider" />

            {/* 4. Đổi cỡ nét (2px / 3.5px / 5px) */}
            <div className="quick-width-group">
              {[2, 3.5, 5].map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`quick-width-btn ${selectedStroke.width === w ? 'is-active' : ''}`}
                  onClick={() => changeStrokeWidth(selectedStroke.id, w)}
                  title={`Cỡ nét ${w}px`}
                >
                  <span
                    className="width-bar"
                    style={{ height: `${Math.max(2, w * 1.5)}px` }}
                  />
                </button>
              ))}
            </div>

            <div className="quick-action-divider" />

            {/* 5. Nhân đôi hình (Duplicate) */}
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => duplicateStroke(selectedStroke.id)}
              title="Nhân bản hình vẽ (Duplicate)"
            >
              <Copy size={13} />
            </button>

            {/* 6. Nếu là công thức Toán: Nút sửa */}
            {selectedStroke.tool === 'math-text' && (
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => {
                  if (onEditMathFormula) onEditMathFormula(selectedStroke);
                  else if (onOpenMathFormulaModal) onOpenMathFormulaModal(selectedStroke.points[0], selectedStroke);
                }}
                title="Sửa công thức toán"
              >
                <Edit3 size={13} />
              </button>
            )}

            {/* 7. Xoá hình */}
            <button
              type="button"
              className="quick-action-btn is-danger"
              onClick={() => deleteStroke(selectedStroke.id)}
              title="Xoá hình này (Delete)"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
