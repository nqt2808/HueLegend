import { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';

// Hook tro giup keo tha popup (draggable modal) dinh vi truc tiep tai vi tri con tro chuot/nut da bam
export function useDraggable(
  isOpen: boolean,
  clickPos?: { x: number; y: number } | null
) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: -9999,
    y: -9999,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  // Tinh toan va dat vi tri popup xuat hien ngay tai vi tri con tro chuot khi click
  useEffect(() => {
    if (!isOpen) {
      setPosition({ x: -9999, y: -9999 });
      return;
    }

    // Raf dam bao modal element da mounted va browser da layout xong de lay bouding client rect chinh xac
    const timer = requestAnimationFrame(() => {
      const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      let modalW = 520;
      let modalH = 460;

      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        if (rect.width > 0) modalW = rect.width;
        if (rect.height > 0) modalH = rect.height;
      }

      let targetLeft = (winWidth - modalW) / 2;
      let targetTop = (winHeight - modalH) / 2;

      if (clickPos && typeof clickPos.x === 'number' && typeof clickPos.y === 'number' && !isNaN(clickPos.x) && !isNaN(clickPos.y) && (clickPos.x > 0 || clickPos.y > 0)) {
        // Neu con tro o nua phai man hinh, dat goc tren ben phai popup vao vi tri click
        // Neu con tro o nua trai man hinh, dat goc tren ben trai popup vao vi tri click
        targetLeft = clickPos.x > winWidth / 2 ? clickPos.x - modalW + 20 : clickPos.x - 20;
        targetTop = clickPos.y + 12;

        // Neu hien thi theo targetTop bi tran phia duoi man hinh, day popup hien thi phia tren con tro chuot
        if (targetTop + modalH > winHeight - 16) {
          targetTop = Math.max(16, clickPos.y - modalH - 12);
        }
      }

      // Clamped trong khung man hinh an toan (cach le toi thieu 16px)
      const clampedLeft = Math.max(16, Math.min(targetLeft, winWidth - modalW - 16));
      const clampedTop = Math.max(16, Math.min(targetTop, winHeight - modalH - 16));

      setPosition({ x: clampedLeft, y: clampedTop });
    });

    return () => cancelAnimationFrame(timer);
  }, [isOpen, clickPos?.x, clickPos?.y]);

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
    setPosition({
      x: initialPosRef.current.x + dx,
      y: initialPosRef.current.y + dy,
    });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  }, [isDragging]);

  const isPositionReady = position.x >= 0 && position.y >= 0;

  const modalStyle: CSSProperties = {
    position: 'fixed',
    left: `${isPositionReady ? position.x : 0}px`,
    top: `${isPositionReady ? position.y : 0}px`,
    opacity: isPositionReady ? 1 : 0,
    visibility: isPositionReady ? 'visible' : 'hidden',
    transition: isDragging ? 'none' : 'opacity 0.15s ease-out',
  };

  return {
    modalRef,
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

