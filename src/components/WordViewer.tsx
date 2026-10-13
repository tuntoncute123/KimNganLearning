import React, { useEffect, useRef, useState, useCallback } from 'react';
import { renderAsync } from 'docx-preview';
import { LaserPointer } from './LaserPointer';
import { AnnotationCanvas } from './AnnotationCanvas';
import { Loader2, AlertCircle } from 'lucide-react';
import type { DrawTool, DrawStroke } from '../types/document';

interface WordViewerProps {
  documentId: string;
  data: ArrayBuffer;
  zoom: number;
  rotation: number;
  isLaserActive: boolean;
  onZoomChange: (newZoom: number) => void;
  onFitWidthCalculated?: (scale: number) => void;
  // Props cho Annotation & Toán
  activeDrawTool: DrawTool;
  drawColor: string;
  drawStrokeWidth: number;
  pageStrokes: DrawStroke[];
  onPageStrokesChange: (newStrokes: DrawStroke[]) => void;
  onOpenMathFormulaModal?: (pos: { x: number; y: number }, editStroke?: DrawStroke) => void;
  onEditMathFormula?: (stroke: DrawStroke) => void;
  selectedStrokeId?: string | null;
  onSelectStroke?: (id: string | null) => void;
}

export const WordViewer: React.FC<WordViewerProps> = ({
  documentId: _documentId,
  data,
  zoom,
  rotation: _rotation,
  isLaserActive,
  onFitWidthCalculated,
  activeDrawTool,
  drawColor,
  drawStrokeWidth,
  pageStrokes,
  onPageStrokesChange,
  onOpenMathFormulaModal,
  onEditMathFormula,
  selectedStrokeId,
  onSelectStroke,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordBodyRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number } | null>(null);

  // Đo kích thước sau khi docx-preview render xong
  const updateDimensions = useCallback(() => {
    if (!wordBodyRef.current) return;
    const cardEl = wordBodyRef.current;
    const width = cardEl.scrollWidth || cardEl.offsetWidth || 820;
    const height = cardEl.scrollHeight || cardEl.offsetHeight || 1160;

    if (width > 0 && height > 0) {
      setViewportDims({ width, height });

      if (containerRef.current && onFitWidthCalculated) {
        const availableW = containerRef.current.clientWidth - 48;
        if (availableW > 0 && width > 0) {
          const fitScale = Number((availableW / width).toFixed(2));
          onFitWidthCalculated(Math.min(1.4, Math.max(0.4, fitScale)));
        }
      }
    }
  }, [onFitWidthCalculated]);

  // Render file Word bằng docx-preview
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMsg(null);

    const renderWordDocument = async () => {
      try {
        if (!wordBodyRef.current) return;
        wordBodyRef.current.innerHTML = '';

        await renderAsync(data, wordBodyRef.current, undefined, {
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          className: 'docx-preview-doc',
        });

        if (!isCancelled) {
          setIsLoading(false);
          // Đợi DOM áp dụng style CSS và tính toán kích thước
          setTimeout(() => {
            if (!isCancelled) {
              updateDimensions();
            }
          }, 80);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Lỗi khi render tài liệu Word:', err);
          setErrorMsg(err?.message || 'Không thể đọc nội dung file .docx này.');
          setIsLoading(false);
        }
      }
    };

    renderWordDocument();

    return () => {
      isCancelled = true;
    };
  }, [data, updateDimensions]);

  // Lắng nghe resize cửa sổ để tính lại fit-width
  useEffect(() => {
    const handleResize = () => {
      updateDimensions();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateDimensions]);

  return (
    <div
      ref={containerRef}
      className="word-viewport-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 80px 16px',
        backgroundColor: 'var(--bg-canvas)',
        userSelect: isLaserActive || activeDrawTool !== 'select' ? 'none' : 'auto',
      }}
    >
      {isLoading && (
        <div className="viewer-state-message">
          <Loader2 className="animate-spin text-primary" size={36} />
          <p>Đang tải tài liệu Word (.docx)...</p>
        </div>
      )}

      {errorMsg && (
        <div className="viewer-error-box">
          <AlertCircle size={32} className="text-danger" />
          <p className="font-semibold">Không thể đọc file Word</p>
          <span className="text-sm opacity-80">{errorMsg}</span>
          <p className="text-xs text-muted mt-2">
            Gợi ý: Mở file trên Microsoft Word và bấm "Save As PDF" để có trải nghiệm tối ưu nhất.
          </p>
        </div>
      )}

      {/* Thẻ hiển thị nội dung Word */}
      <div
        className={`canvas-wrapper-card word-canvas-wrapper ${isLaserActive ? 'is-laser-mode' : ''}`}
        style={{
          position: 'relative',
          display: isLoading || errorMsg ? 'none' : 'inline-block',
          boxShadow: 'var(--shadow-canvas)',
          borderRadius: '6px',
          backgroundColor: '#ffffff',
          transform: zoom !== 1 ? `scale(${zoom})` : undefined,
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease',
          margin: '0 auto',
        }}
      >
        <div ref={wordBodyRef} className="docx-render-target" />

        {/* Lớp vẽ Annotation & Hình học Toán học đè trực tiếp lên trang Word */}
        {viewportDims && (
          <AnnotationCanvas
            width={viewportDims.width}
            height={viewportDims.height}
            activeTool={activeDrawTool}
            color={drawColor}
            strokeWidth={drawStrokeWidth}
            strokes={pageStrokes}
            onStrokesChange={onPageStrokesChange}
            onOpenMathFormulaModal={onOpenMathFormulaModal}
            onEditMathFormula={onEditMathFormula}
            selectedStrokeId={selectedStrokeId}
            onSelectStroke={onSelectStroke}
          />
        )}

        {/* Lớp Laser Pointer phủ đè lên Word */}
        {viewportDims && (
          <LaserPointer active={isLaserActive} />
        )}
      </div>
    </div>
  );
};
