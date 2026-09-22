import React from 'react';

/**
 * VignetteOverlay
 * Sits directly above the fixed video background (z-[1], below all page
 * content at z-10+) and permanently blends it into the dark theme: darker
 * at the top/bottom edges and the corners, with a soft film-grain texture
 * for depth. This stops any stretch of the page that has no glass card on
 * top of it from showing the raw, un-color-graded video — which is what
 * was reading as a "glitch" in the gap where the stats section used to be.
 *
 * Pure decorative overlay: fixed, pointer-events-none, zero impact on
 * layout, scroll, or existing components.
 */
export const VignetteOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-[1] overflow-hidden" aria-hidden="true">
      {/* Top-to-bottom scrim so every section reads consistently dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#080c18]/85 via-[#080c18]/55 to-[#080c18]/90" />

      {/* Radial vignette to pull focus toward center content */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(8,12,24,0) 0%, rgba(8,12,24,0.35) 60%, rgba(8,12,24,0.75) 100%)',
        }}
      />

      {/* Faint color wash tying the video into the brand palette */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{
          background:
            'linear-gradient(135deg, rgba(196,192,255,0.12) 0%, transparent 40%, transparent 60%, rgba(47,217,244,0.12) 100%)',
        }}
      />

      {/* Subtle grain for tactile depth */}
      <div className="absolute inset-0 grain-overlay opacity-[0.06]" />
    </div>
  );
};