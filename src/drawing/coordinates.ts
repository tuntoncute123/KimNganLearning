import type { Point } from '../types/document';

export function normalizeRotation(rotation: number) { return ((rotation % 360) + 360) % 360; }

export function surfaceTransform(width: number, height: number, scale: number, rotation: number) {
  const angle = normalizeRotation(rotation);
  const swapped = angle === 90 || angle === 270;
  const matrix = angle === 90 ? [0, scale, -scale, 0, height * scale, 0]
    : angle === 180 ? [-scale, 0, 0, -scale, width * scale, height * scale]
    : angle === 270 ? [0, -scale, scale, 0, 0, width * scale]
    : [scale, 0, 0, scale, 0, 0];
  return { width: (swapped ? height : width) * scale, height: (swapped ? width : height) * scale,
    css: `matrix(${matrix.join(',')})`, matrix };
}

// rect is the bounding rectangle AFTER CSS transforms and scrolling.
export function pointerToDocument(point: Point, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  width: number, height: number, rotation = 0): Point {
  const angle = normalizeRotation(rotation);
  const u = (point.x - rect.left) / rect.width;
  const v = (point.y - rect.top) / rect.height;
  if (angle === 90) return { x: v * width, y: (1 - u) * height };
  if (angle === 180) return { x: (1 - u) * width, y: (1 - v) * height };
  if (angle === 270) return { x: (1 - v) * width, y: u * height };
  return { x: u * width, y: v * height };
}
