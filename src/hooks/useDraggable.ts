import { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';

// Hook tro giup keo tha popup (draggable modal) dinh vi truc tiep tai vi tri con tro chuot/nut da bam
export function useDraggable(
  isOpen: boolean,
  clickPos?: { x: number; y: number } | null,
  estimatedModalSize: { width: number; height: number } = { width: 520, height: 460 }
) {
  const [position, setPosition] = useState<{ x: number; y: number; isAbsolute: boolean }>({
    x: 0,
    y: 0,
    isAbsolute: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  // Tinh toan vi tri popup xuat hien ngay tai toa do con tro chuot/nut da bam khi mo
  useEffect(() => {
    if (isOpen) {
      if (clickPos && typeof window !== 'undefined' && clickPos.x > 0 && clickPos.y > 0) {
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const modalW = Math.min(screenW - 24, estimatedModalSize.width);
        const modalH = Math.min(screenH - 24, estimatedModalSize.height);

        let targetLeft: number;
        let targetTop: number;

        // Neu bam o ben phai man hinh (nhu nut vi o Header), can mep phai theo diem bam
        if (clickPos.x > screenW / 2) {
          targetLeft = clickPos.x - modalW;
        } else {
          // Neu bam o ben trai man hinh, can mep trai theo diem bam
          targetLeft = clickPos.x;
        }

        // Neu bam o phan duoi man hinh, dat phia tren diem bam
        if (clickPos.y > screenH / 2) {
          targetTop = clickPos.y - modalH - 8;
        } else {
          // Neu bam o phan tren man hinh, dat phia duoi diem bam
          targetTop = clickPos.y + 8;
        }

        // Gioi han an toan 12px ngat khuat khoi mep man hinh
        const minLeft = 12;
        const maxLeft = Math.max(minLeft, screenW - modalW - 12);
        targetLeft = Math.max(minLeft, Math.min(maxLeft, targetLeft));

        const minTop = 12;
        const maxTop = Math.max(minTop, screenH - modalH - 12);
        targetTop = Math.max(minTop, Math.min(maxTop, targetTop));

        setPosition({ x: targetLeft, y: targetTop, isAbsolute: true });
      } else {
        setPosition({ x: 0, y: 0, isAbsolute: false });
      }
    }
  }, [isOpen, clickPos?.x, clickPos?.y, estimatedModalSize.width, estimatedModalSize.height]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }

    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { x: position.x, y: position.y };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  }, [position.x, position.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition((prev) => ({
      x: initialPosRef.current.x + dx,
      y: initialPosRef.current.y + dy,
      isAbsolute: prev.isAbsolute,
    }));
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  }, [isDragging]);

  const modalStyle: CSSProperties = position.isAbsolute
    ? {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'transform 0.05s ease-out, left 0.05s ease-out, top 0.05s ease-out',
      }
    : {
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDragging ? 'none' : 'transform 0.05s ease-out',
      };

  return {
    position,
    isDragging,
    modalStyle,
    dragHeaderProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      style: { cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' as const }
    }
  };
}
