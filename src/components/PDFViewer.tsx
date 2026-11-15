import React, { useEffect, useRef, useState, useEffectEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { LaserPointer } from './LaserPointer';
import { AnnotationCanvas } from './AnnotationCanvas';
import { DocumentSurface } from './DocumentSurface';
import { Loader2, AlertCircle } from 'lucide-react';
import type { AnnotationBasis, DrawTool, DrawStroke } from '../types/document';

// Cấu hình worker cho pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PDFViewerProps {
  documentId: string;
  data: ArrayBuffer;
  annotationBasis: AnnotationBasis;
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
  annotationBasis,
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
  const [renderedKey, setRenderedKey] = useState('');
  const renderKey = [currentPage, zoom, rotation, annotationBasis.zoom, annotationBasis.rotation].join(':');
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number } | null>(null);

  const onDocumentLoaded = useEffectEvent((doc: pdfjsLib.PDFDocumentProxy) => {
    onPageChange(Math.max(1, Math.min(currentPage, doc.numPages)), doc.numPages);
  });

  useEffect(() => {
    let cancelled = false;
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(data.slice(0)),
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    });
    void loadingTask.promise.then((doc) => {
      if (cancelled) return;
      setPdfDoc(doc);
      setIsLoading(false);
      onDocumentLoaded(doc);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setErrorMsg(error instanceof Error ? error.message : 'Không thể đọc file PDF này.');
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
      void loadingTask.destroy().catch((error: unknown) => console.warn('Lỗi giải phóng PDF:', error));
    };
  }, [documentId, data]);

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const render = async () => {
      try {
        const page = await pdfDoc.getPage(Math.min(Math.max(currentPage, 1), pdfDoc.numPages));
        // A newer page/zoom may have been requested while getPage was pending.
        if (cancelled || !canvasRef.current || !containerRef.current) return;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;
        const container = containerRef.current;
        const unscaled = page.getViewport({ scale: 1, rotation });
        const measure = () => {
          const availableWidth = container.clientWidth - 48;
          if (availableWidth > 0) {
            onFitWidthCalculated?.(Math.max(0.4, Math.min(3, availableWidth / unscaled.width)));
          }
        };
        measure();
        resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(container);

        const viewport = page.getViewport({ scale: annotationBasis.zoom, rotation: annotationBasis.rotation });
        setViewportDims({ width: viewport.width, height: viewport.height });
        const pixelRatio = Math.min(3, (window.devicePixelRatio || 1) * zoom / annotationBasis.zoom);
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        renderTask = page.render({
          canvas, canvasContext: context, viewport,
          transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await renderTask.promise;
        if (!cancelled) setRenderedKey(renderKey);
      } catch (error: unknown) {
        if (cancelled || (error instanceof Error && error.name === 'RenderingCancelledException')) return;
        setErrorMsg(error instanceof Error ? error.message : 'Không thể hiển thị trang PDF.');
      }
    };
    void render();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      renderTask?.cancel();
    };
  }, [pdfDoc, currentPage, zoom, rotation, annotationBasis.zoom, annotationBasis.rotation, onFitWidthCalculated, renderKey]);

  // 3. Phím tắt chuyển trang nhanh cho giáo viên
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable], [role="dialog"], .modal-backdrop')) return;

      if (!pdfDoc) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (currentPage < pdfDoc.numPages) {
          onPageChange(currentPage + 1, pdfDoc.numPages);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
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
      <DocumentSurface width={viewportDims?.width || 1} height={viewportDims?.height || 1}
        scale={zoom / annotationBasis.zoom} rotation={rotation - annotationBasis.rotation} hidden={isLoading || !!errorMsg || renderedKey !== renderKey}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />

        {/* Lớp vẽ Annotation & Hình học Toán học đè trực tiếp lên trang PDF */}
        {viewportDims && (
          <AnnotationCanvas
            key={currentPage}
            rotation={rotation - annotationBasis.rotation}
            resolutionScale={zoom / annotationBasis.zoom}
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
          <LaserPointer rotation={rotation - annotationBasis.rotation} active={isLaserActive} containerRef={containerRef} />
        )}
      </DocumentSurface>
    </div>
  );
};
