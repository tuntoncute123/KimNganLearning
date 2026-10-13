import React, { useState, useEffect, useRef } from 'react';

interface LaserPointerProps {
  active: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const LaserPointer: React.FC<LaserPointerProps> = ({ active }) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  const trailIdRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastMousePosRef = useRef<{ clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    if (!active) {
      setPos(null);
      setTrail([]);
      lastMousePosRef.current = null;
      return;
    }

    const updateLaserPosition = (clientX: number, clientY: number) => {
      const container = rootRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // Kiểm tra chuột có nằm trong vùng bao của tài liệu không
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        // Tọa độ CHÍNH XÁC tương đối với container chứa LaserPointer (rootRef)
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        setPos({ x, y });

        // Tạo hiệu ứng vệt sáng mờ đuôi laser
        const newId = ++trailIdRef.current;
        setTrail((prev) => [...prev.slice(-6), { x, y, id: newId }]);
      } else {
        setPos(null);
        setTrail([]);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosRef.current = { clientX: e.clientX, clientY: e.clientY };
      updateLaserPosition(e.clientX, e.clientY);
    };

    const handleScroll = () => {
      if (lastMousePosRef.current) {
        updateLaserPosition(lastMousePosRef.current.clientX, lastMousePosRef.current.clientY);
      }
    };

    const handleMouseLeave = () => {
      setPos(null);
      setTrail([]);
      lastMousePosRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      {pos && (
        <>
          {/* Vệt sáng laser mờ dần */}
          {trail.map((t, idx) => (
            <div
              key={t.id}
              style={{
                position: 'absolute',
                left: t.x,
                top: t.y,
                width: '8px',
                height: '8px',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.45)',
                opacity: (idx + 1) / trail.length,
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.7)',
                pointerEvents: 'none',
                transition: 'opacity 0.15s ease',
              }}
            />
          ))}

          {/* Điểm laser chính: phát sáng rực rỡ, ngay tại đầu ngọn chuột */}
          <div
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: '14px',
              height: '14px',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              boxShadow: '0 0 12px #ef4444, 0 0 24px rgba(239, 68, 68, 0.9), inset 0 0 4px #ffffff',
              border: '2px solid #ffffff',
              pointerEvents: 'none',
            }}
          />
        </>
      )}
    </div>
  );
};
