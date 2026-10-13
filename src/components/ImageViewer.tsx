import React, { useEffect, useState, useRef } from 'react';
import { LaserPointer } from './LaserPointer';
import { AnnotationCanvas } from './AnnotationCanvas';
import { Loader2 } from 'lucide-react';
import type { DrawTool, DrawStroke } from '../types/document';

interface ImageViewerProps {
  documentId: string;
  data: ArrayBuffer;
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

      if (onFitWidthCalculated && nw > 0) {
        const availableWidth = containerRef.current.clientWidth - 48;
        if (availableWidth > 0) {
          const fit = Math.max(0.4, Math.min(3.0, availableWidth / nw));
          onFitWidthCalculated(fit);
        }
      }
    }
  };

  const currentDisplayWidth = naturalSize.width > 0 ? naturalSize.width * zoom : 0;
  const currentDisplayHeight = naturalSize.height > 0 ? naturalSize.height * zoom : 0;

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

      {imageUrl && (
        <div
          className={`canvas-wrapper-card ${isLaserActive ? 'is-laser-mode' : ''}`}
          style={{
            position: 'relative',
            display: isLoading ? 'none' : 'inline-block',
            boxShadow: 'var(--shadow-canvas)',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            transition: 'transform 0.15s ease',
            margin: '0 auto',
          }}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Bài giảng"
            onLoad={handleImageLoaded}
            style={{
              display: 'block',
              width: currentDisplayWidth > 0 ? `${currentDisplayWidth}px` : 'auto',
              maxWidth: 'none',
              height: 'auto',
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'width 0.1s ease',
            }}
          />

          {/* Lớp vẽ Annotation trên ảnh */}
          {currentDisplayWidth > 0 && currentDisplayHeight > 0 && (
            <AnnotationCanvas
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

          <LaserPointer active={isLaserActive} containerRef={containerRef} />
        </div>
      )}
    </div>
  );
};
