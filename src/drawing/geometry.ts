import type { DrawTool, DrawStroke, Point } from '../types/document';
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export const SHAPE_TOOLS: DrawTool[] = [
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

  // Tính Bounding Box của một nét vẽ bất kỳ
  export const getStrokeBoundingBox = (s: DrawStroke): BoundingBox => {
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
  };

  // Kiểm tra điểm pt có nằm trong hoặc gần nét vẽ stroke không
  export const isPointInStroke = (pt: Point, s: DrawStroke): boolean => {
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
    };
