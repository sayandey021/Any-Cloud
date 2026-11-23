import { useCallback, useRef } from 'react';

/**
 * Hook to enable smooth horizontal mouse wheel scrolling and click-and-drag panning
 * on any horizontally scrollable container.
 */
export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>() {
  const cleanupRef = useRef<(() => void) | null>(null);

  const setRef = useCallback((node: T | null) => {
    // Run cleanup if there was a previous element
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!node) return;

    // Convert vertical mouse wheel into horizontal scroll
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        node.scrollLeft += e.deltaY;
      }
    };

    // Drag-to-scroll support
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let hasDragged = false;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDown = true;
      hasDragged = false;
      startX = e.pageX - node.offsetLeft;
      scrollStart = node.scrollLeft;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const x = e.pageX - node.offsetLeft;
      const walk = x - startX;
      if (Math.abs(walk) > 3) {
        hasDragged = true;
        node.scrollLeft = scrollStart - walk;
      }
    };

    const handleMouseUp = () => {
      if (isDown && hasDragged) {
        const captureClick = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
        };
        window.addEventListener('click', captureClick, { capture: true, once: true });
      }
      isDown = false;
      hasDragged = false;
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    node.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    cleanupRef.current = () => {
      node.removeEventListener('wheel', handleWheel);
      node.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return setRef;
}
