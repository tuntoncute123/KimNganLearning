import type { ReactNode } from 'react';
import { surfaceTransform } from '../drawing/coordinates';

// Both document pixels and drawings live in one fixed coordinate plane.
export function DocumentSurface({ width, height, scale, rotation, hidden, children }:
  { width: number; height: number; scale: number; rotation: number; hidden?: boolean; children: ReactNode }) {
  const transform = surfaceTransform(width, height, scale, rotation);
  return <div className="document-surface" data-rotation={rotation} data-scale={scale}
    style={{ position: 'relative', flexShrink: 0, margin: '0 auto', width: transform.width,
      height: transform.height, display: hidden ? 'none' : 'block' }}>
    <div className="document-plane canvas-wrapper-card" style={{ position: 'absolute', top: 0, left: 0,
      width, height, transform: transform.css, transformOrigin: '0 0', background: '#fff', boxShadow: 'var(--shadow-canvas)' }}>
      {children}
    </div>
  </div>;
}
