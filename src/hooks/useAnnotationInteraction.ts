import { useRef, useState, useEffect, useCallback, type RefObject } from 'react';
import type React from 'react';
import type { AnnotationCanvasProps } from '../components/AnnotationCanvas';
import type { DrawStroke, Point } from '../types/document';
import { SHAPE_TOOLS, getStrokeBoundingBox, isPointInStroke, type BoundingBox, type ResizeHandle } from '../drawing/geometry';
import { pointerToDocument } from '../drawing/coordinates';

type InteractionProps = Omit<AnnotationCanvasProps, 'selectedStrokeId'> & {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  externalSelectedId?: string | null;
  renderStrokesDirect: (strokes: DrawStroke[], preview?: DrawStroke | null) => void;
};

export function useAnnotationInteraction({ canvasRef, width, height, rotation = 0, activeTool, color, strokeWidth, strokes, onStrokesChange, onOpenMathFormulaModal, onEditMathFormula, externalSelectedId, onSelectStroke, renderStrokesDirect }: InteractionProps) {
  const [isInteracting, setIsInteracting] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const isDrawingRef = useRef(false);
  const isDraggingSelectionRef = useRef(false);
  const isResizingRef = useRef(false);
  const activeResizeHandleRef = useRef<ResizeHandle | null>(null);

  const dragStartPointRef = useRef<Point>({ x: 0, y: 0 });
  const resizeInitialBoxRef = useRef<BoundingBox | null>(null);
  const resizeInitialStrokeRef = useRef<DrawStroke | null>(null);
  const currentPointsRef = useRef<Point[]>([]);
  const lastClickInfoRef = useRef<{ time: number; point: Point }>({ time: 0, point: { x: 0, y: 0 } });

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [hoveredStrokeId, setHoveredStrokeId] = useState<string | null>(null);
  const [livePreviewStroke, setLivePreviewStroke] = useState<DrawStroke | null>(null);

  // Drag and resize previews remain local until the pointer is released.
  const [localModifiedStrokes, setLocalModifiedStrokes] = useState<DrawStroke[] | null>(null);
  const localModifiedRef = useRef<DrawStroke[] | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const selectedId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  const setSelectedId = useCallback(
    (id: string | null) => {
      setInternalSelectedId(id);
      if (onSelectStroke) onSelectStroke(id);
    },
    [onSelectStroke]
  );

  const displayStrokes = localModifiedStrokes || strokes;
  const selectedStroke = displayStrokes.find((s) => s.id === selectedId) || null;

  // Dọn dẹp RAF khi unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Phím tắt bàn phím: Delete / Backspace / Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable], [role="dialog"], .modal-backdrop')) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        onStrokesChange(strokes.filter((s) => s.id !== selectedId));
        setSelectedId(null);
      }
      if (e.key === 'Escape' && selectedId) {
        setSelectedId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, strokes, onStrokesChange, setSelectedId]);

  const getCanvasCoords = (e: React.PointerEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return pointerToDocument({ x: e.clientX, y: e.clientY }, rect, width, height, rotation);
  };

  const eraseNearPoint = (pt: Point) => {
    const threshold = 18;
    const remaining = strokes.filter((s) => {
      return !s.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < threshold);
    });
    if (remaining.length !== strokes.length) {
      onStrokesChange(remaining);
      if (selectedId && !remaining.some((s) => s.id === selectedId)) {
        setSelectedId(null);
      }
    }
  };

  // ===========================================================================
  // THAO TÁC POINTER (MƯỢT MÀ CHUẨN MIRO / GEOGEBRA / CLASSIN)
  // ===========================================================================

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // Ngăn chặn 300ms tap delay và gesture scroll của trình duyệt điện thoại
    if (activeTool !== 'select' && e.cancelable) e.preventDefault();

    const pt = getCanvasCoords(e);
    const isPenLike = activeTool === 'pen' || activeTool === 'highlighter';
    const isShapeTool = SHAPE_TOOLS.includes(activeTool);

    // 1. Kiểm tra Double Click vào công thức toán học để sửa nhanh
    const now = e.timeStamp;
    const lastClick = lastClickInfoRef.current;
    const isDoubleClick =
      now - lastClick.time < 350 &&
      Math.hypot(pt.x - lastClick.point.x, pt.y - lastClick.point.y) < 25;

    lastClickInfoRef.current = { time: now, point: pt };

    if (isDoubleClick) {
      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        if (s.tool === 'math-text' && s.text && isPointInStroke(pt, s)) {
          setSelectedId(s.id);
          if (onEditMathFormula) {
            onEditMathFormula(s);
          } else if (onOpenMathFormulaModal) {
            onOpenMathFormulaModal(pt, s);
          }
          lastClickInfoRef.current = { time: 0, point: { x: 0, y: 0 } };
          return;
        }
      }
    }

    // 2. Chế độ Tẩy
    if (activeTool === 'eraser') {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDrawingRef.current = true; setIsInteracting(true); pointerIdRef.current = e.pointerId;
      eraseNearPoint(pt);
      return;
    }

    // 3. Chế độ Chèn công thức Toán học
    if (activeTool === 'math-text') {
      if (onOpenMathFormulaModal) {
        onOpenMathFormulaModal(pt);
      }
      return;
    }

    // 4. QUY TẮC VÀNG CHO BÚT VẼ (PEN / HIGHLIGHTER):
    // LUÔN LUÔN VẼ NÉT MỚI 100%, KHÔNG BAO GIỜ CƯỚP CHUỘT ĐỂ KÉO NÉT CŨ!
    if (isPenLike) {
      setSelectedId(null);
      isDrawingRef.current = true; setIsInteracting(true); pointerIdRef.current = e.pointerId;
      currentPointsRef.current = [pt];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      setLivePreviewStroke({
        id: crypto.randomUUID(),
        tool: activeTool,
        color,
        width: strokeWidth,
        points: [pt],
      });
      return;
    }

    // 5. Nếu đang có hình được chọn: kiểm tra xem có click trúng hình đó để DI CHUYỂN không
    if (selectedId) {
      const currentSelected = strokes.find((s) => s.id === selectedId);
      if (currentSelected && isPointInStroke(pt, currentSelected)) {
        isDraggingSelectionRef.current = true; setIsInteracting(true); pointerIdRef.current = e.pointerId;
        dragStartPointRef.current = pt;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
    }

    // 6. Nếu ở công cụ SELECT: kiểm tra click vào nét khác để chọn & kéo
    if (activeTool === 'select') {
      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        if (isPointInStroke(pt, s)) {
          setSelectedId(s.id);
          isDraggingSelectionRef.current = true; setIsInteracting(true); pointerIdRef.current = e.pointerId;
          dragStartPointRef.current = pt;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }
      // Click ra ngoài khoảng trống: huỷ chọn
      setSelectedId(null);
      return;
    }

    // 7. Nếu ở công cụ HÌNH HỌC (2D, 3D):
    // Click ra ngoài hình đang chọn -> Bắt đầu vẽ hình mới ngay lập tức!
    if (isShapeTool) {
      setSelectedId(null);
      isDrawingRef.current = true; setIsInteracting(true); pointerIdRef.current = e.pointerId;
      currentPointsRef.current = [pt];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      setLivePreviewStroke({
        id: crypto.randomUUID(),
        tool: activeTool,
        color,
        width: strokeWidth,
        points: [pt],
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== null && pointerIdRef.current !== e.pointerId) return;
    if (isDrawingRef.current || isDraggingSelectionRef.current || isResizingRef.current) {
      if (activeTool !== 'select' && e.cancelable) e.preventDefault();
    }

    const pt = getCanvasCoords(e);

    // A. Preview the selected stroke at its dragged position.
    if (isDraggingSelectionRef.current && selectedId) {
      const dx = pt.x - dragStartPointRef.current.x;
      const dy = pt.y - dragStartPointRef.current.y;
      dragStartPointRef.current = pt;

      const baseList = localModifiedRef.current || strokes;
      const updatedStrokes = baseList.map((s) => {
        if (s.id === selectedId) {
          return {
            ...s,
            points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          };
        }
        return s;
      });
      localModifiedRef.current = updatedStrokes;

      renderStrokesDirect(updatedStrokes, livePreviewStroke);
      return;
    }

    // B. Co giãn hình đang chọn bằng Resize Handle: Vẽ trực tiếp qua GPU tức thì 0ms latency
    if (isResizingRef.current && selectedId && resizeInitialBoxRef.current && resizeInitialStrokeRef.current) {
      const handle = activeResizeHandleRef.current;
      const initialBox = resizeInitialBoxRef.current;
      const initialStroke = resizeInitialStrokeRef.current;

      let minX = initialBox.minX;
      let minY = initialBox.minY;
      let maxX = initialBox.maxX;
      let maxY = initialBox.maxY;

      if (handle?.includes('w')) minX = Math.min(pt.x, maxX - 20);
      if (handle?.includes('e')) maxX = Math.max(pt.x, minX + 20);
      if (handle?.includes('n')) minY = Math.min(pt.y, maxY - 20);
      if (handle?.includes('s')) maxY = Math.max(pt.y, minY + 20);

      const origW = initialBox.maxX - initialBox.minX || 1;
      const origH = initialBox.maxY - initialBox.minY || 1;
      const newW = maxX - minX;
      const newH = maxY - minY;

      const baseList = strokes;
      const updatedStrokes = baseList.map((s) => {
        if (s.id === selectedId) {
          return {
            ...s,
            points: initialStroke.points.map((p) => ({
              x: minX + ((p.x - initialBox.minX) / origW) * newW,
              y: minY + ((p.y - initialBox.minY) / origH) * newH,
            })),
          };
        }
        return s;
      });
      localModifiedRef.current = updatedStrokes;

      renderStrokesDirect(updatedStrokes, livePreviewStroke);
      return;
    }

    // C. Khi đang không vẽ: cập nhật hover ID nếu ở chế độ select
    if (!isDrawingRef.current) {
      if (activeTool === 'select') {
        let foundHoverId: string | null = null;
        for (let i = strokes.length - 1; i >= 0; i--) {
          if (isPointInStroke(pt, strokes[i])) {
            foundHoverId = strokes[i].id;
            break;
          }
        }
        if (foundHoverId !== hoveredStrokeId) {
          setHoveredStrokeId(foundHoverId);
        }
      }
      return;
    }

    // D. Đang vẽ (Drawing)
    if (activeTool === 'eraser') {
      eraseNearPoint(pt);
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      currentPointsRef.current.push(pt);
      setLivePreviewStroke((prev) =>
        prev ? { ...prev, points: [...currentPointsRef.current] } : null
      );
    } else {
      const p0 = currentPointsRef.current[0];
      setLivePreviewStroke((prev) =>
        prev ? { ...prev, points: [p0, pt] } : null
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== null && pointerIdRef.current !== e.pointerId) return;
    setIsInteracting(false); pointerIdRef.current = null;
    if (isResizingRef.current) {
      isResizingRef.current = false;
      activeResizeHandleRef.current = null;
      resizeInitialBoxRef.current = null;
      resizeInitialStrokeRef.current = null;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (localModifiedRef.current) {
        onStrokesChange(localModifiedRef.current);
        localModifiedRef.current = null;
        setLocalModifiedStrokes(null);
      }
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
      return;
    }

    if (isDraggingSelectionRef.current) {
      isDraggingSelectionRef.current = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (localModifiedRef.current) {
        onStrokesChange(localModifiedRef.current);
        localModifiedRef.current = null;
        setLocalModifiedStrokes(null);
      }
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
      return;
    }

    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    if (activeTool === 'eraser') return;

    if (livePreviewStroke && livePreviewStroke.points.length > 0) {
      const newStroke = livePreviewStroke;
      onStrokesChange([...strokes, newStroke]);

      // NẾU LÀ HÌNH HỌC (2D, 3D): Tự động chọn hình đó để giáo viên kéo chỉnh / co giãn / đổi nét đứt!
      // NẾU LÀ BÚT VẼ (PEN/HIGHLIGHTER): Không tự chọn để giáo viên viết tiếp chữ thứ 2, thứ 3 mượt mà!
      if (SHAPE_TOOLS.includes(newStroke.tool)) {
        setSelectedId(newStroke.id);
      } else {
        setSelectedId(null);
      }
    }

    setLivePreviewStroke(null);
    currentPointsRef.current = [];
  };

  // Bắt đầu co giãn bằng Resize Handle
  const handleStartResize = (e: React.PointerEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedStroke) return;

    pointerIdRef.current = e.pointerId;
    isResizingRef.current = true;
    activeResizeHandleRef.current = handle;
    resizeInitialBoxRef.current = getStrokeBoundingBox(selectedStroke);
    resizeInitialStrokeRef.current = { ...selectedStroke };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!isResizingRef.current) return;
    handlePointerMove(e as unknown as React.PointerEvent<HTMLCanvasElement>);
  };

  const handlePointerUpResize = (e: React.PointerEvent) => {
    if (!isResizingRef.current) return;
    pointerIdRef.current = null;
    isResizingRef.current = false;
    activeResizeHandleRef.current = null;
    resizeInitialBoxRef.current = null;
    resizeInitialStrokeRef.current = null;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (localModifiedRef.current) {
      onStrokesChange(localModifiedRef.current);
      localModifiedRef.current = null;
      setLocalModifiedStrokes(null);
    }
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  // Các action nhanh trên Floating Toolbar
  const toggleStrokeDashed = (id: string) => {
    onStrokesChange(
      strokes.map((s) => (s.id === id ? { ...s, isDashed: !s.isDashed } : s))
    );
  };

  const changeStrokeColor = (id: string, newColor: string) => {
    onStrokesChange(
      strokes.map((s) => (s.id === id ? { ...s, color: newColor } : s))
    );
  };

  const changeStrokeWidth = (id: string, newWidth: number) => {
    onStrokesChange(
      strokes.map((s) => (s.id === id ? { ...s, width: newWidth } : s))
    );
  };

  const duplicateStroke = (id: string) => {
    const target = strokes.find((s) => s.id === id);
    if (!target) return;
    const duplicated: DrawStroke = {
      ...target,
      id: crypto.randomUUID(),
      points: target.points.map((p) => ({ x: p.x + 24, y: p.y + 24 })),
    };
    onStrokesChange([...strokes, duplicated]);
    setSelectedId(duplicated.id);
  };

  const deleteStroke = (id: string) => {
    onStrokesChange(strokes.filter((s) => s.id !== id));
    setSelectedId(null);
  };


  return { displayStrokes, livePreviewStroke, selectedStroke, isInteracting, setHoveredStrokeId, handlePointerDown, handlePointerMove, handlePointerUp, handleStartResize, handlePointerMoveResize, handlePointerUpResize, toggleStrokeDashed, changeStrokeColor, changeStrokeWidth, duplicateStroke, deleteStroke };
}
