import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Computes a CSS scale factor so that the content fills
 * available space while maintaining aspect ratio.
 */
export function useContentScale() {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const recalc = useCallback(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    // Reset scale to measure natural size
    inner.style.transform = 'scale(1)';
    const naturalW = inner.scrollWidth;
    const naturalH = inner.scrollHeight;

    const availW = container.clientWidth;
    const availH = container.clientHeight;

    if (naturalW === 0 || naturalH === 0) return;

    const s = Math.min(availW / naturalW, availH / naturalH, 2);
    setScale(s);
    inner.style.transform = `scale(${s})`;
  }, []);

  useEffect(() => {
    recalc();
    // Observe both container and inner for size changes
    const observer = new ResizeObserver(recalc);
    if (containerRef.current) observer.observe(containerRef.current);
    if (innerRef.current) observer.observe(innerRef.current);

    // Recalc after a frame to catch async content
    const raf = requestAnimationFrame(recalc);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [recalc]);

  return { containerRef, innerRef, scale };
}
