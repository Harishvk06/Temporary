import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * ScrollProgressBar
 * A slim gradient bar fixed to the top of the viewport that fills as the
 * user scrolls down the page. Uses framer-motion's scroll progress hook
 * (already a project dependency) with a spring for a fluid, physical feel.
 * Purely presentational — no effect on existing scroll listeners/state.
 */
export const ScrollProgressBar: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.2,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2.5px] origin-left z-[60] pointer-events-none"
      style={{
        scaleX,
        background: 'linear-gradient(90deg, #c4c0ff 0%, #2fd9f4 100%)',
        boxShadow: '0 0 12px rgba(47, 217, 244, 0.6)',
      }}
      aria-hidden="true"
    />
  );
};