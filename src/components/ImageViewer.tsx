import React, { useEffect, useState, useRef } from 'react';
import { LaserPointer } from './LaserPointer';
import { AnnotationCanvas } from './AnnotationCanvas';
import { DocumentSurface } from './DocumentSurface';
import { Loader2 } from 'lucide-react';
import type { AnnotationBasis, DrawTool, DrawStroke } from '../types/document';

interface ImageViewerProps {
  documentId: string;
  data: ArrayBuffer;
  annotationBasis: AnnotationBasis;
  mimeType: string;
  zoom: number;
  rotation: number;
  isLaserActive: boolean;
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

export const ImageViewer: React.FC<ImageViewerProps> = ({
  documentId: _documentId,
  data,
  annotationBasis,
  mimeType,
  zoom,
  rotation,
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
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    setIsLoading(true);
    const blob = new Blob([data], { type: mimeType || 'image/png' });
    const url = URL.createObjectURL(blob);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [data, mimeType]);

  const handleImageLoaded = () => {
    setIsLoading(false);
    if (imgRef.current && containerRef.current) {
      const nw = imgRef.current.naturalWidth;
      const nh = imgRef.current.naturalHeight;
      setNaturalSize({ width: nw, height: nh });


    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !naturalSize.width) return;
    const measure = () => {
      const width = rotation % 180 ? naturalSize.height : naturalSize.width;
      onFitWidthCalculated?.(Math.max(0.4, Math.min(3, (container.clientWidth - 48) / width)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container); measure();
    return () => observer.disconnect();
  }, [naturalSize, rotation, onFitWidthCalculated]);

  const currentDisplayWidth = naturalSize.width > 0 ? naturalSize.width * annotationBasis.zoom : 0;
  const currentDisplayHeight = naturalSize.height > 0 ? naturalSize.height * annotationBasis.zoom : 0;

  return (
    <div
      ref={containerRef}
      className="image-viewport-container"
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
          <p>Đang tải hình ảnh bài giảng...</p>
        </div>
      )}

      {errorMsg && <div className="viewer-error-box" role="alert">{errorMsg}</div>}
      {imageUrl && (
        <DocumentSurface width={currentDisplayWidth || 1} height={currentDisplayHeight || 1}
          scale={zoom / annotationBasis.zoom} rotation={rotation} hidden={isLoading || !!errorMsg}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Bài giảng"
            onLoad={handleImageLoaded}
            onError={() => { setIsLoading(false); setErrorMsg('Không thể đọc hình ảnh. File có thể bị hỏng hoặc không được hỗ trợ.'); }}
            style={{
              display: 'block',
              width: currentDisplayWidth > 0 ? `${currentDisplayWidth}px` : 'auto',
              maxWidth: 'none',
              height: 'auto',
              transformOrigin: 'center center',
            }}
          />

          {/* Lớp vẽ Annotation trên ảnh */}
          {currentDisplayWidth > 0 && currentDisplayHeight > 0 && (
            <AnnotationCanvas
              rotation={rotation}
              resolutionScale={zoom / annotationBasis.zoom}
              width={currentDisplayWidth}
              height={currentDisplayHeight}
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

          <LaserPointer rotation={rotation} active={isLaserActive} containerRef={containerRef} />
        </DocumentSurface>
      )}
    </div>
  );
};
