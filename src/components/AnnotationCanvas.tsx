import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Move,
  Copy,
  Trash2,
  Edit3,
} from 'lucide-react';
import type { DrawTool, DrawStroke, Point } from '../types/document';

interface AnnotationCanvasProps {
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

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

const SHAPE_TOOLS: DrawTool[] = [
  'line',
  'dashed-line',
  'arrow',
  'rect',
  'circle',
  'triangle',
  'right-angle',
  'coordinate-axes',
  'cube-3d',
  'pyramid-3d',
  'tetrahedron-3d',
  'cylinder-3d',
  'cone-3d',
  'sphere-3d',
];

export const AnnotationCanvas = React.memo<AnnotationCanvasProps>(({
  width,
  height,
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

  // Local drag/resize state: cập nhật mượt mà 120 FPS qua requestAnimationFrame
  // mà KHÔNG kích hoạt App.tsx re-render liên tục trên mỗi pixel di chuột!
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

  // Tính Bounding Box của một nét vẽ bất kỳ
  const getStrokeBoundingBox = useCallback((s: DrawStroke): BoundingBox => {
    if (s.points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    if (s.tool === 'math-text' && s.text) {
      const p0 = s.points[0];
      const fontSize = s.fontSize || 16;
      const estWidth = s.text.length * (fontSize * 0.6) + 28;
      const estHeight = fontSize + 16;
      return {
        minX: p0.x - 4,
        minY: p0.y - fontSize - 8,
        maxX: p0.x + estWidth,
        maxY: p0.y + 12,
        width: estWidth + 4,
        height: estHeight + 8,
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of s.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const pad = Math.max(8, (s.width || 2) + 2);
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    };
  }, []);

  // Kiểm tra điểm pt có nằm trong hoặc gần nét vẽ stroke không
  const isPointInStroke = useCallback(
    (pt: Point, s: DrawStroke): boolean => {
      const box = getStrokeBoundingBox(s);
      if (pt.x < box.minX || pt.x > box.maxX || pt.y < box.minY || pt.y > box.maxY) {
        return false;
      }

      // Các hình có diện tích bao quanh: click trong hộp bao là trúng
      if (s.tool === 'math-text' || SHAPE_TOOLS.includes(s.tool)) {
        return true;
      }

      // Với nét vẽ tự do (pen, highlighter): kiểm tra khoảng cách đến các điểm
      const threshold = Math.max(16, (s.width || 2) * 2.5);
      return s.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) <= threshold);
    },
    [getStrokeBoundingBox]
  );

  // Vẽ mũi tên ở đầu đoạn thẳng
  const drawArrowHead = (
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    headLength: number = 14
  ) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - Math.PI / 6),
      to.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + Math.PI / 6),
      to.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  // Các hàm hỗ trợ hình học 3D
  const drawSegment = (
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    isDashed: boolean = false
  ) => {
    ctx.save();
    if (isDashed) {
      ctx.setLineDash([7, 5]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  };

  const drawEllipseArc = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    startAngle: number,
    endAngle: number,
    isDashed: boolean = false
  ) => {
    ctx.save();
    if (isDashed) {
      ctx.setLineDash([7, 5]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 2), Math.max(ry, 2), 0, startAngle, endAngle);
    ctx.stroke();
    ctx.restore();
  };

  const drawPointDot = (
    ctx: CanvasRenderingContext2D,
    p: Point,
    radius: number = 3,
    fillColor: string = '#0f172a'
  ) => {
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Render 1 nét vẽ trên Canvas 2D
  const renderStroke = useCallback(
    (ctx: CanvasRenderingContext2D, s: DrawStroke) => {
      if (s.points.length === 0) return;

      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (s.tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = Math.max(16, s.width * 3);
      } else {
        ctx.globalAlpha = s.opacity ?? 1.0;
      }

      const p0 = s.points[0];
      const pLast = s.points[s.points.length - 1];

      switch (s.tool) {
        case 'pen':
        case 'highlighter': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < s.points.length; i++) {
            ctx.lineTo(s.points[i].x, s.points[i].y);
          }
          ctx.stroke();
          break;
        }

        case 'line': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(pLast.x, pLast.y);
          ctx.stroke();
          break;
        }

        case 'dashed-line': {
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(pLast.x, pLast.y);
          ctx.stroke();
          break;
        }

        case 'arrow': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(pLast.x, pLast.y);
          ctx.stroke();
          drawArrowHead(ctx, p0, pLast, Math.max(12, s.width * 3));
          break;
        }

        case 'rect': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          const rx = Math.min(p0.x, pLast.x);
          const ry = Math.min(p0.y, pLast.y);
          const rw = Math.abs(pLast.x - p0.x);
          const rh = Math.abs(pLast.y - p0.y);
          ctx.strokeRect(rx, ry, rw, rh);
          break;
        }

        case 'circle': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          const cx = (p0.x + pLast.x) / 2;
          const cy = (p0.y + pLast.y) / 2;
          const rx = Math.abs(pLast.x - p0.x) / 2;
          const ry = Math.abs(pLast.y - p0.y) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(rx, 2), Math.max(ry, 2), 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case 'triangle': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          const topX = (p0.x + pLast.x) / 2;
          const topY = p0.y;
          const botLeftX = p0.x;
          const botLeftY = pLast.y;
          const botRightX = pLast.x;
          const botRightY = pLast.y;

          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.lineTo(botLeftX, botLeftY);
          ctx.lineTo(botRightX, botRightY);
          ctx.closePath();
          ctx.stroke();
          break;
        }

        case 'right-angle': {
          const cornerX = p0.x;
          const cornerY = pLast.y;
          const arm1X = p0.x;
          const arm1Y = p0.y;
          const arm2X = pLast.x;
          const arm2Y = pLast.y;

          if (s.isDashed) ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(arm1X, arm1Y);
          ctx.lineTo(cornerX, cornerY);
          ctx.lineTo(arm2X, arm2Y);
          ctx.stroke();

          const sz = Math.min(16, Math.abs(arm1Y - cornerY) / 3, Math.abs(arm2X - cornerX) / 3);
          if (sz > 4) {
            const dirX = arm2X > cornerX ? 1 : -1;
            const dirY = arm1Y > cornerY ? 1 : -1;

            ctx.beginPath();
            ctx.moveTo(cornerX + dirX * sz, cornerY);
            ctx.lineTo(cornerX + dirX * sz, cornerY + dirY * sz);
            ctx.lineTo(cornerX, cornerY + dirY * sz);
            ctx.stroke();
          }
          break;
        }

        case 'coordinate-axes': {
          const originX = (p0.x + pLast.x) / 2;
          const originY = (p0.y + pLast.y) / 2;
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);

          // Trục Ox
          ctx.beginPath();
          ctx.moveTo(minX, originY);
          ctx.lineTo(maxX, originY);
          ctx.stroke();
          drawArrowHead(ctx, { x: minX, y: originY }, { x: maxX, y: originY }, 12);

          // Trục Oy
          ctx.beginPath();
          ctx.moveTo(originX, maxY);
          ctx.lineTo(originX, minY);
          ctx.stroke();
          drawArrowHead(ctx, { x: originX, y: maxY }, { x: originX, y: minY }, 12);

          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('x', maxX - 6, originY + 16);
          ctx.fillText('y', originX + 8, minY + 14);
          ctx.fillText('O', originX - 14, originY + 14);
          break;
        }

        // =====================================================================
        // 6 HÌNH HỌC KHÔNG GIAN 3D (CHUẨN SGK TOÁN 11-12)
        // =====================================================================

        case 'cube-3d': {
          // Hình Hộp Chữ Nhật / Hình Lập Phương 3D
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          const dx = w * 0.32;
          const dy = h * 0.28;

          // Mặt trước trực diện (A, B, C, D)
          const A = { x: minX, y: maxY };
          const B = { x: maxX - dx, y: maxY };
          const C = { x: maxX - dx, y: minY + dy };
          const D = { x: minX, y: minY + dy };

          // Mặt sau chiếu xiên (A', B', C', D')
          const A_prime = { x: minX + dx, y: maxY - dy }; // ĐỈNH KHUẤT
          const B_prime = { x: maxX, y: maxY - dy };
          const C_prime = { x: maxX, y: minY };
          const D_prime = { x: minX + dx, y: minY };

          // 3 cạnh khuất xuất phát từ đỉnh A' (Nét đứt chuẩn SGK)
          drawSegment(ctx, A, A_prime, true);
          drawSegment(ctx, A_prime, B_prime, true);
          drawSegment(ctx, A_prime, D_prime, true);

          // Các cạnh nhìn thấy (Nét liền, hoặc nét đứt nếu s.isDashed)
          const mainDashed = !!s.isDashed;
          drawSegment(ctx, A, B, mainDashed);
          drawSegment(ctx, B, C, mainDashed);
          drawSegment(ctx, C, D, mainDashed);
          drawSegment(ctx, D, A, mainDashed);

          drawSegment(ctx, B, B_prime, mainDashed);
          drawSegment(ctx, C, C_prime, mainDashed);
          drawSegment(ctx, D, D_prime, mainDashed);

          drawSegment(ctx, B_prime, C_prime, mainDashed);
          drawSegment(ctx, C_prime, D_prime, mainDashed);
          break;
        }

        case 'pyramid-3d': {
          // Hình Chóp Tứ Giác S.ABCD 3D (Đáy là hình bình hành)
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          // Đáy ABCD: A (sau-trái - đỉnh khuất), B (sau-phải), D (trước-trái), C (trước-phải)
          const A = { x: minX + w * 0.28, y: maxY - h * 0.28 };
          const B = { x: maxX - w * 0.08, y: maxY - h * 0.28 };
          const D = { x: minX, y: maxY };
          const C = { x: D.x + (B.x - A.x), y: maxY };

          // Đỉnh chóp S
          const S = { x: minX + w * 0.42, y: minY };

          // Các cạnh khuất (Nét đứt)
          drawSegment(ctx, A, B, true); // Đáy sau AB
          drawSegment(ctx, A, D, true); // Đáy trái sau AD
          drawSegment(ctx, S, A, true); // Cạnh bên khuất SA

          // Các cạnh nhìn thấy (Nét liền)
          const mainDashed = !!s.isDashed;
          drawSegment(ctx, D, C, mainDashed); // Đáy trước DC
          drawSegment(ctx, B, C, mainDashed); // Đáy phải BC
          drawSegment(ctx, S, D, mainDashed); // Cạnh bên SD
          drawSegment(ctx, S, C, mainDashed); // Cạnh bên SC
          drawSegment(ctx, S, B, mainDashed); // Cạnh bên SB
          break;
        }

        case 'tetrahedron-3d': {
          // Tứ Diện / Hình Chóp Tam Giác S.ABC 3D
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          // Đáy ABC: A (trước-trái), B (trước-giữa), C (sau-phải)
          const A = { x: minX, y: maxY - h * 0.16 };
          const B = { x: minX + w * 0.48, y: maxY };
          const C = { x: maxX, y: maxY - h * 0.12 };

          // Đỉnh S
          const S = { x: minX + w * 0.42, y: minY };

          // Cạnh đáy sau AC khuất bên trong hình (Nét đứt)
          drawSegment(ctx, A, C, true);

          // Các cạnh nhìn thấy (Nét liền)
          const mainDashed = !!s.isDashed;
          drawSegment(ctx, A, B, mainDashed);
          drawSegment(ctx, B, C, mainDashed);
          drawSegment(ctx, S, A, mainDashed);
          drawSegment(ctx, S, B, mainDashed);
          drawSegment(ctx, S, C, mainDashed);
          break;
        }

        case 'cone-3d': {
          // Hình Nón 3D (Đáy elip, nửa sau nét đứt, trục SO & bán kính R)
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          const cx = (minX + maxX) / 2;
          const ry = Math.min(h * 0.16, w * 0.3, 30);
          const cy = maxY - ry;
          const rx = w / 2;

          const S = { x: cx, y: minY };
          const O = { x: cx, y: cy };
          const rightEdge = { x: cx + rx, y: cy };
          const leftEdge = { x: cx - rx, y: cy };

          // Đáy elip: nửa sau nét đứt, nửa trước nét liền
          drawEllipseArc(ctx, cx, cy, rx, ry, Math.PI, 2 * Math.PI, true);
          drawEllipseArc(ctx, cx, cy, rx, ry, 0, Math.PI, !!s.isDashed);

          // 2 đường sinh bên
          drawSegment(ctx, S, leftEdge, !!s.isDashed);
          drawSegment(ctx, S, rightEdge, !!s.isDashed);

          // Trục đường cao SO và bán kính đáy OM nét đứt
          drawSegment(ctx, S, O, true);
          drawSegment(ctx, O, rightEdge, true);
          drawPointDot(ctx, O, 2.5, s.color);
          break;
        }

        case 'cylinder-3d': {
          // Hình Trụ 3D (2 đáy elip, trục nối 2 tâm)
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          const cx = (minX + maxX) / 2;
          const ry = Math.min(h * 0.16, w * 0.28, 25);
          const rx = w / 2;
          const cyTop = minY + ry;
          const cyBot = maxY - ry;

          // Đáy trên: Elip trọn vẹn nét liền
          drawEllipseArc(ctx, cx, cyTop, rx, ry, 0, 2 * Math.PI, !!s.isDashed);

          // Đáy dưới: nửa sau nét đứt, nửa trước nét liền
          drawEllipseArc(ctx, cx, cyBot, rx, ry, Math.PI, 2 * Math.PI, true);
          drawEllipseArc(ctx, cx, cyBot, rx, ry, 0, Math.PI, !!s.isDashed);

          // 2 đường sinh 2 bên
          drawSegment(ctx, { x: cx - rx, y: cyTop }, { x: cx - rx, y: cyBot }, !!s.isDashed);
          drawSegment(ctx, { x: cx + rx, y: cyTop }, { x: cx + rx, y: cyBot }, !!s.isDashed);

          // Trục đối xứng nối 2 tâm O1 - O2 nét đứt
          drawSegment(ctx, { x: cx, y: cyTop }, { x: cx, y: cyBot }, true);
          drawPointDot(ctx, { x: cx, y: cyTop }, 2.5, s.color);
          drawPointDot(ctx, { x: cx, y: cyBot }, 2.5, s.color);
          break;
        }

        case 'sphere-3d': {
          // Hình Cầu 3D (Vòng tròn ngoài, xích đạo elip nửa đứt nửa liền, tâm & bán kính)
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const R = Math.min(w, h) / 2;
          const ry = R * 0.32;

          // Vòng tròn biên ngoài
          ctx.save();
          ctx.setLineDash(s.isDashed ? [7, 5] : []);
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Vòng xích đạo: nửa sau nét đứt, nửa trước nét liền
          drawEllipseArc(ctx, cx, cy, R, ry, Math.PI, 2 * Math.PI, true);
          drawEllipseArc(ctx, cx, cy, R, ry, 0, Math.PI, !!s.isDashed);

          // Tâm O và bán kính R nét đứt
          drawSegment(ctx, { x: cx, y: cy }, { x: cx + R, y: cy }, true);
          drawPointDot(ctx, { x: cx, y: cy }, 2.5, s.color);
          break;
        }

        case 'math-text': {
          if (!s.text) break;
          const fontSize = s.fontSize || 16;
          ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
          const metrics = ctx.measureText(s.text);
          const textWidth = metrics.width;
          const paddingH = 10;
          const paddingV = 6;
          const boxHeight = fontSize + paddingV * 2;
          const boxWidth = textWidth + paddingH * 2;

          // Thẻ badge nổi bật cho công thức toán
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 2;
          ctx.beginPath();
          ctx.roundRect(p0.x, p0.y - fontSize - paddingV, boxWidth, boxHeight, 6);
          ctx.fill();
          ctx.shadowColor = 'transparent';

          ctx.strokeStyle = s.color || '#4f46e5';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = s.color || '#0f172a';
          ctx.fillText(s.text, p0.x + paddingH, p0.y - 2);
          break;
        }

        default:
          break;
      }

      ctx.restore();
    },
    []
  );

  // Lưới ô vuông toạ độ (Grid)
  const drawGridLines = (ctx: CanvasRenderingContext2D) => {
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

  // 1. Chỉ thay đổi kích thước buffer GPU khi width hoặc height thực sự thay đổi (tránh huỷ/tạo buffer liên tục)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, [width, height]);

  // 2. Redraw nhanh chỉ dùng clearRect (cực mượt, 120 FPS, không tạo GPU garbage)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (showGrid) {
      drawGridLines(ctx);
    }

    // Vẽ danh sách nét đã lưu / đang kéo
    displayStrokes.forEach((s) => renderStroke(ctx, s));

    // Vẽ nét preview khi đang vẽ nét mới
    if (livePreviewStroke) {
      renderStroke(ctx, livePreviewStroke);
    }
  }, [width, height, displayStrokes, livePreviewStroke, renderStroke, showGrid]);

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
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
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
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
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
    const pt = getCanvasCoords(e);
    const isPenLike = activeTool === 'pen' || activeTool === 'highlighter';
    const isShapeTool = SHAPE_TOOLS.includes(activeTool);

    // 1. Kiểm tra Double Click vào công thức toán học để sửa nhanh
    const now = Date.now();
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
      isDrawingRef.current = true;
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
      isDrawingRef.current = true;
      currentPointsRef.current = [pt];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      setLivePreviewStroke({
        id: `stroke_${Date.now()}`,
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
        isDraggingSelectionRef.current = true;
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
          isDraggingSelectionRef.current = true;
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
      isDrawingRef.current = true;
      currentPointsRef.current = [pt];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      setLivePreviewStroke({
        id: `stroke_${Date.now()}`,
        tool: activeTool,
        color,
        width: strokeWidth,
        points: [pt],
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoords(e);

    // A. Kéo thả di chuyển nét đang chọn (Drag-to-move)
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

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          setLocalModifiedStrokes(localModifiedRef.current);
        });
      }
      return;
    }

    // B. Co giãn hình đang chọn bằng Resize Handle
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

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          setLocalModifiedStrokes(localModifiedRef.current);
        });
      }
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
      id: `stroke_${Date.now()}`,
      points: target.points.map((p) => ({ x: p.x + 24, y: p.y + 24 })),
    };
    onStrokesChange([...strokes, duplicated]);
    setSelectedId(duplicated.id);
  };

  const deleteStroke = (id: string) => {
    onStrokesChange(strokes.filter((s) => s.id !== id));
    setSelectedId(null);
  };

  // Cursor Class
  let cursorClass = 'pointer-draw';
  if (activeTool === 'select') cursorClass = 'pointer-select';
  if (activeTool === 'eraser') cursorClass = 'is-eraser-mode';
  if (activeTool === 'math-text') cursorClass = 'is-text-mode';
  if (activeTool === 'pen' || activeTool === 'highlighter') cursorClass = 'pointer-pen';

  // Tính vị trí Bounding Box và Floating Toolbar (ẩn khi đang kéo để giữ mượt)
  const selectedBox = selectedStroke ? getStrokeBoundingBox(selectedStroke) : null;
  const showFloatingBar = selectedStroke && !isDrawingRef.current && !isDraggingSelectionRef.current && !isResizingRef.current && selectedBox;

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
        onPointerLeave={() => setHoveredStrokeId(null)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
          touchAction: 'none',
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
