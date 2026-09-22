import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface BootSplashScreenProps {
  onComplete?: () => void;
  /** Total duration in milliseconds before initiating exit transition. Defaults to 5500ms */
  duration?: number;
  /** Duration in milliseconds to simulate progress to 100%. Defaults to 3200ms */
  progressDuration?: number;
}

export const BootSplashScreen: React.FC<BootSplashScreenProps> = ({
  onComplete,
  duration = 5500,
  progressDuration = 3200,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Keyboard and click listener for instant skip option
  useEffect(() => {
    const handleKeyDown = () => {
      handleDismiss();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  // Smooth progress bar simulation and hold sequence
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Calculate progress percentage up to 100%
      const pct = Math.min(100, Math.round((elapsed / progressDuration) * 100));
      setProgress(pct);

      if (pct >= 100 && !isReady) {
        setIsReady(true);
      }

      // Transition after full duration (including hold delay)
      if (elapsed >= duration) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 25);

    return () => clearInterval(interval);
  }, [duration, progressDuration, isReady, handleDismiss]);

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (onComplete) onComplete();
      }}
    >
      {isVisible && (
        <motion.div
          key="boot-splash"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(16px)',
            transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
          }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[99999] bg-[#000000] flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer"
          style={{ willChange: 'opacity, transform, filter' }}
        >
          {/* Ambient Radial Backlight Glows with Extended Pulsing */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: [0, 0.35, 0.28, 0.38, 0.3],
                scale: [0.5, 1.15, 1, 1.1, 1],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }}
              className="w-[560px] h-[560px] rounded-full bg-gradient-to-tr from-[#2fd9f4]/22 via-[#c4c0ff]/18 to-transparent blur-[120px]"
            />
          </div>

          {/* Minimalist Tech Background Grid Overlay */}
          <div
            className="absolute inset-0 opacity-[0.035] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Central Branded Content Container */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 max-w-xl text-center">
            
            {/* Logo Emblem with Ambient Glow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.78, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative group mb-8"
            >
              {/* Outer Radiant Glow */}
              <div className="absolute -inset-2.5 bg-gradient-to-r from-[#c4c0ff] via-[#8580ff] to-[#2fd9f4] rounded-[30px] opacity-45 blur-xl animate-pulse" />

              {/* Emblem Shell */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-[26px] bg-gradient-to-tr from-[#c4c0ff] via-[#827df8] to-[#2fd9f4] p-[1.5px] shadow-[0_0_45px_rgba(47,217,244,0.4)]">
                <div className="w-full h-full bg-[#050811] rounded-[24.5px] flex items-center justify-center relative overflow-hidden">
                  {/* Subtle Inner Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#141c38]/40 to-transparent pointer-events-none" />

                  {/* Sparkling Icon Glyph */}
                  <motion.div
                    animate={{
                      rotate: [0, 8, -8, 0],
                      scale: [1, 1.06, 1],
                    }}
                    transition={{
                      duration: 4.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-[#2fd9f4] drop-shadow-[0_0_14px_rgba(47,217,244,0.85)]" />
                  </motion.div>

                  {/* Corner Glint Sparkle */}
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-white animate-boot-glint shadow-[0_0_12px_#ffffff]" />
                </div>
              </div>
            </motion.div>

            {/* Typography Container with Polished Specular Light Sheen Sweeps */}
            <div className="relative overflow-hidden px-6 py-2 rounded-2xl">
              {/* Headline: AuraEdit AI */}
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#dee1f9] drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]"
              >
                AuraEdit{' '}
                <span className="bg-gradient-to-r from-[#c4c0ff] via-[#a29bfe] to-[#2fd9f4] bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(47,217,244,0.5)]">
                  AI
                </span>
              </motion.h1>

              {/* Subtitle: Powered by Acorus softech pvt ltd. */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="text-xs sm:text-sm font-medium tracking-[0.18em] text-[#c7c4d8]/90 uppercase mt-4 flex items-center justify-center gap-2"
              >
                <span className="w-5 h-[1px] bg-gradient-to-r from-transparent to-[#2fd9f4]/60 inline-block" />
                <span>Powered by Acorus softech pvt ltd.</span>
                <span className="w-5 h-[1px] bg-gradient-to-l from-transparent to-[#2fd9f4]/60 inline-block" />
              </motion.p>

              {/* Primary Polished Specular Light Sheen Sweep Overlay */}
              <motion.div
                initial={{ x: '-150%', opacity: 0 }}
                animate={{
                  x: ['-150%', '220%'],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 2.2,
                  delay: 0.8,
                  ease: [0.25, 1, 0.5, 1],
                }}
                className="absolute inset-y-0 w-36 sm:w-52 pointer-events-none -skew-x-12"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.04) 20%, rgba(255, 255, 255, 0.7) 50%, rgba(47, 217, 244, 0.85) 60%, transparent 100%)',
                  mixBlendMode: 'screen',
                }}
              />

              {/* Secondary Subtle Re-Gleam Sweep during the Hold Phase */}
              <motion.div
                initial={{ x: '-150%', opacity: 0 }}
                animate={{
                  x: ['-150%', '220%'],
                  opacity: [0, 0.75, 0.75, 0],
                }}
                transition={{
                  duration: 2.0,
                  delay: 3.5,
                  ease: [0.25, 1, 0.5, 1],
                }}
                className="absolute inset-y-0 w-28 sm:w-40 pointer-events-none -skew-x-12"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.03) 20%, rgba(255, 255, 255, 0.5) 50%, rgba(196, 192, 255, 0.75) 60%, transparent 100%)',
                  mixBlendMode: 'screen',
                }}
              />
            </div>

            {/* Polished Laser Boot Progress Line & Dynamic Status */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0.7 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-11 flex flex-col items-center gap-2.5 w-60 sm:w-72"
            >
              <div className="w-full h-[2.5px] bg-white/10 rounded-full overflow-hidden relative backdrop-blur-sm">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#c4c0ff] via-[#8580ff] to-[#2fd9f4] rounded-full animate-boot-progress"
                  style={{
                    width: `${progress}%`,
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>

              <div className="flex items-center justify-between w-full text-[10px] tracking-widest uppercase font-mono font-medium transition-colors">
                {isReady ? (
                  <span className="text-[#2fd9f4] flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-[#2fd9f4]" />
                    INITIALIZATION COMPLETE • SYSTEM READY
                  </span>
                ) : (
                  <>
                    <span className="text-[#c7c4d8]/50">SYSTEM INITIALIZING</span>
                    <span className="text-[#dee1f9]/70">{progress}%</span>
                  </>
                )}
              </div>
            </motion.div>

            {/* Interactive Dismissal Prompt */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              transition={{ duration: 1, delay: 1.6 }}
              className="mt-9 text-[11px] text-[#c7c4d8]/40 tracking-wider font-medium hover:text-[#2fd9f4]/80 transition-colors"
            >
              Click anywhere or press any key to skip
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
