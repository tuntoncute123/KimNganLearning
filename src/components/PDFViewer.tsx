import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { LaserPointer } from './LaserPointer';
import { AnnotationCanvas } from './AnnotationCanvas';
import { Loader2, AlertCircle } from 'lucide-react';
import type { DrawTool, DrawStroke } from '../types/document';

// Cấu hình worker cho pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFViewerProps {
  documentId: string;
  data: ArrayBuffer;
  currentPage: number;
  zoom: number;
  rotation: number;
  isLaserActive: boolean;
  onPageChange: (newPage: number, totalPages: number) => void;
  onZoomChange: (newZoom: number) => void;
  onFitWidthCalculated?: (scale: number) => void;
  // Props cho bộ vẽ Math & Annotation
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

export const PDFViewer: React.FC<PDFViewerProps> = ({
  documentId,
  data,
  currentPage,
  zoom,
  rotation,
  isLaserActive,
  onPageChange,
  onZoomChange: _onZoomChange,
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number } | null>(null);

  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // 1. Tải tài liệu PDF từ ArrayBuffer
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMsg(null);

    const loadPDF = async () => {
      try {
        const dataCopy = data.slice(0);
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(dataCopy),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) {
          doc.cleanup();
          return;
        }

        setPdfDoc(doc);
        setIsLoading(false);
        onPageChange(currentPage > doc.numPages ? 1 : currentPage, doc.numPages);
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('Lỗi khi mở tài liệu PDF:', err);
          setErrorMsg(err instanceof Error ? err.message : 'Không thể đọc file PDF này.');
          setIsLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [documentId, data]);

  // 2. Render trang hiện tại lên Canvas với chất lượng Retina / High-DPI
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      const pageNum = Math.min(Math.max(currentPage, 1), pdfDoc.numPages);
      const page = await pdfDoc.getPage(pageNum);

      const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
      if (onFitWidthCalculated && containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 48;
        if (availableWidth > 0 && unscaledViewport.width > 0) {
          const fitScale = Math.max(0.4, Math.min(3.0, availableWidth / unscaledViewport.width));
          onFitWidthCalculated(fitScale);
        }
      }

      const viewport = page.getViewport({ scale: zoom, rotation });
      setViewportDims({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);

      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const renderContext = {
        canvas: canvas,
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'RenderingCancelledException') {
        return;
      }
      console.warn('Lỗi vẽ trang PDF:', err);
    }
  }, [pdfDoc, currentPage, zoom, rotation]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // 3. Phím tắt chuyển trang nhanh cho giáo viên
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (!pdfDoc) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (currentPage < pdfDoc.numPages) {
          onPageChange(currentPage + 1, pdfDoc.numPages);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (currentPage > 1) {
          onPageChange(currentPage - 1, pdfDoc.numPages);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pdfDoc, onPageChange]);

  return (
    <div
      ref={containerRef}
      className="pdf-viewport-container"
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
          <p>Đang tải trang bài giảng...</p>
        </div>
      )}

      {errorMsg && (
        <div className="viewer-error-box">
          <AlertCircle size={32} className="text-danger" />
          <p className="font-semibold">Không thể đọc file PDF</p>
          <span className="text-sm opacity-80">{errorMsg}</span>
        </div>
      )}

      {/* Vùng hiển thị Canvas của PDF */}
      <div
        className={`canvas-wrapper-card ${isLaserActive ? 'is-laser-mode' : ''}`}
        style={{
          position: 'relative',
          display: isLoading || errorMsg ? 'none' : 'inline-block',
          boxShadow: 'var(--shadow-canvas)',
          borderRadius: '6px',
          backgroundColor: '#ffffff',
          transition: 'box-shadow 0.2s ease',
          margin: '0 auto',
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />

        {/* Lớp vẽ Annotation & Hình học Toán học đè trực tiếp lên trang PDF */}
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

        {/* Lớp Laser Pointer phủ đè lên canvas */}
        {viewportDims && (
          <LaserPointer active={isLaserActive} containerRef={containerRef} />
        )}
      </div>
    </div>
  );
};
