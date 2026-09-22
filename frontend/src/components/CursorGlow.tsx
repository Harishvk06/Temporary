import React, { useEffect, useRef } from 'react';

/**
 * CursorGlow
 * A subtle radial-gradient "spotlight" that follows the pointer across the
 * whole page, adding a soft sense of interactive depth without affecting
 * layout, scroll behaviour, or any existing DOM structure.
 *
 * Pure overlay: fixed, pointer-events: none, z-index sits above the video
 * background but below interactive content chrome. Automatically disabled
 * on touch-only devices since there is no persistent pointer to track.
 */
export const CursorGlow: React.FC = () => {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (isTouchDevice) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let rafId = 0;

    const handleMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      // Smooth "lazy follow" easing so the glow trails the cursor gently
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="fixed top-0 left-0 w-[520px] h-[520px] -ml-[260px] -mt-[260px] pointer-events-none z-[5] hidden sm:block mix-blend-screen will-change-transform"
      style={{
        background:
          'radial-gradient(circle, rgba(47,217,244,0.14) 0%, rgba(196,192,255,0.08) 35%, rgba(0,0,0,0) 70%)',
      }}
      aria-hidden="true"
    />
  );
};