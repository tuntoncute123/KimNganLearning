import React, { useRef, useState, useEffect } from 'react';
import { AnnotationCanvas } from './AnnotationCanvas';
import {
  Grid2X2,
  Trash2,
  X,
} from 'lucide-react';
import { CalculatorOutlined } from '@ant-design/icons';
import type { DrawTool, DrawStroke } from '../types/document';

interface MathScratchpadProps {
  isOpen: boolean;
  onClose: () => void;
  activeTool: DrawTool;
  color: string;
  strokeWidth: number;
  strokes: DrawStroke[];
  onStrokesChange: (newStrokes: DrawStroke[]) => void;
  onClear: () => void;
  onOpenMathFormulaModal?: (pos: { x: number; y: number }, editStroke?: DrawStroke) => void;
  onEditMathFormula?: (stroke: DrawStroke) => void;
  selectedStrokeId?: string | null;
  onSelectStroke?: (id: string | null) => void;
}

export const MathScratchpad: React.FC<MathScratchpadProps> = ({
  isOpen,
  onClose,
  activeTool,
  color,
  strokeWidth,
  strokes,
  onStrokesChange,
  onClear,
  onOpenMathFormulaModal,
  onEditMathFormula,
  selectedStrokeId,
  onSelectStroke,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 500,
    height: 700,
  });
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Cập nhật kích thước canvas theo khung chứa
  useEffect(() => {
    if (!isOpen) return;

    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="math-scratchpad-panel">
      {/* Header của bảng nháp */}
      <div className="scratchpad-header">
        <div className="flex items-center gap-2">
          <div className="scratchpad-title-badge">
            <CalculatorOutlined style={{ fontSize: '14px', color: 'var(--brand-primary)' }} />
            <span className="font-bold text-xs uppercase tracking-wide">Lề Nháp Giải Toán</span>
          </div>
          <span className="text-xs text-muted">Song song bài giảng</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`scratchpad-mini-btn ${showGrid ? 'is-active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
            title={showGrid ? 'Tắt lưới ô vuông toạ độ' : 'Bật lưới ô vuông toạ độ'}
          >
            <Grid2X2 size={15} />
            <span className="text-xs">Lưới</span>
          </button>

          <button
            type="button"
            className="scratchpad-mini-btn"
            disabled={strokes.length === 0}
            onClick={() => {
              if (confirm('Dọn sạch bảng nháp này?')) {
                onClear();
              }
            }}
            title="Dọn sạch bảng nháp"
          >
            <Trash2 size={15} />
            <span className="text-xs">Xóa</span>
          </button>

          <button
            type="button"
            className="scratchpad-close-btn"
            onClick={onClose}
            title="Đóng lề nháp"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Vùng vẽ bảng nháp Toán */}
      <div className="scratchpad-canvas-wrapper" ref={containerRef}>
        <AnnotationCanvas
          width={dimensions.width}
          height={dimensions.height}
          activeTool={activeTool}
          color={color}
          strokeWidth={strokeWidth}
          strokes={strokes}
          onStrokesChange={onStrokesChange}
          showGrid={showGrid}
          onOpenMathFormulaModal={onOpenMathFormulaModal}
          onEditMathFormula={onEditMathFormula}
          selectedStrokeId={selectedStrokeId}
          onSelectStroke={onSelectStroke}
        />
      </div>
    </div>
  );
};
