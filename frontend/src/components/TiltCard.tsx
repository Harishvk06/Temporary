import React, { useCallback, useRef, useState } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt rotation in degrees. Defaults tuned for subtle card use. */
  maxTilt?: number;
  /** How far the card lifts toward the viewer on hover (px). */
  liftZ?: number;
  glare?: boolean;
  style?: React.CSSProperties;
}

/**
 * TiltCard
 * Wraps any content in a mouse-reactive 3D tilt + specular glare effect,
 * following the same interaction pattern already used in
 * ParallaxShowcase3D so the whole page feels consistent. Fully
 * self-contained — drop it around existing markup without altering
 * that markup's own styling or logic.
 */
export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 10,
  liftZ = 30,
  glare = true,
  style,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      const rotateY = (px - 0.5) * maxTilt * 2;
      const rotateX = (0.5 - py) * maxTilt * 2;

      setTransform(
        `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${liftZ}px)`
      );
      setGlarePos({ x: px * 100, y: py * 100, opacity: 0.18 });
    },
    [maxTilt, liftZ]
  );

  const handleMouseLeave = useCallback(() => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`preserve-3d transition-transform duration-200 ease-out will-change-transform relative ${className}`}
      style={{ transform, ...style }}
    >
      {children}
      {glare && (
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 55%)`,
            opacity: glarePos.opacity,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};