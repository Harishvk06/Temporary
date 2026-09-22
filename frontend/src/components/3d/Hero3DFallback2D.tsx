import React from 'react';
import { Cpu, CheckCircle, Camera, Film, Sparkles } from 'lucide-react';

interface Hero3DFallback2DProps {
  mousePos: { x: number; y: number };
}

export const Hero3DFallback2D: React.FC<Hero3DFallback2DProps> = ({ mousePos }) => {
  return (
    <div className="relative w-full h-[520px] sm:h-[600px] flex items-center justify-center select-none overflow-hidden p-4">
      {/* Floating Badge (Top Right) */}
      <div className="absolute top-4 right-4 z-30 glass-panel px-4 py-2 rounded-full border border-cyan-500/50 shadow-teal-glow flex items-center gap-2.5 text-xs font-semibold text-white animate-pulse">
        <Cpu className="w-4 h-4 text-cyan-400" />
        <span>🔷 Gemini 2.5 Flash Agent</span>
        <span className="text-emerald-400 font-mono text-[11px] font-bold flex items-center gap-1 border-l border-white/10 pl-2">
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          Active (14ms Latency)
        </span>
      </div>

      {/* 2D Vector Illustration Container (Exact 3D Scene layout, NO dashboard card mockup!) */}
      <div
        className="relative w-full max-w-xl h-full flex items-center justify-between pointer-events-none"
        style={{
          transform: `translate3d(${mousePos.x * 15}px, ${mousePos.y * -10}px, 0)`,
          transition: 'transform 0.2s ease-out',
        }}
      >
        {/* LEFT / CENTER: Tilted 3D Camera Model + Fanned Photo Stack + Film Reel */}
        <div className="relative flex flex-col items-center justify-center">
          
          {/* Fanned Stack of Photo Cards flaring out behind camera */}
          <div className="absolute -top-12 -left-8 w-44 h-28 rounded-xl bg-gradient-to-tr from-cyan-500/40 to-emerald-400/30 border border-cyan-400/50 shadow-2xl transform -rotate-12 blur-[0.5px]"></div>
          <div className="absolute -top-16 left-4 w-44 h-28 rounded-xl bg-gradient-to-tr from-purple-500/40 to-pink-400/30 border border-purple-400/50 shadow-2xl transform rotate-12 blur-[0.5px]"></div>
          <div className="absolute -top-8 left-12 w-44 h-28 rounded-xl bg-gradient-to-tr from-emerald-500/40 to-teal-400/30 border border-emerald-400/50 shadow-2xl transform -rotate-6"></div>

          {/* 3D Tilted Camera Graphic */}
          <div className="relative z-10 w-44 h-28 rounded-2xl bg-slate-900 border-2 border-cyan-400/70 shadow-teal-glow flex items-center justify-center p-3 transform rotate-6">
            <div className="w-16 h-16 rounded-full bg-slate-800 border-4 border-cyan-400 flex items-center justify-center shadow-inner">
              <Camera className="w-8 h-8 text-cyan-300 animate-pulse" />
            </div>
          </div>

          {/* Unspooling Glowing Film Reel with Frame Thumbnails */}
          <div className="relative mt-8 flex items-center gap-2 z-10">
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-purple-400 shadow-lg flex items-center justify-center animate-spin" style={{ animationDuration: '12s' }}>
              <Film className="w-8 h-8 text-purple-300" />
            </div>

            {/* Filmstrip Frame Thumbnails */}
            <div className="flex gap-2 border-y-2 border-purple-400/60 py-1 px-2 bg-slate-950/80 rounded">
              <div className="w-10 h-8 rounded bg-cyan-500/30 border border-cyan-400 flex items-center justify-center text-[10px] text-cyan-300 font-mono">
                Frame 1
              </div>
              <div className="w-10 h-8 rounded bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-[10px] text-emerald-300 font-mono">
                Frame 2
              </div>
              <div className="w-10 h-8 rounded bg-purple-500/30 border border-purple-400 flex items-center justify-center text-[10px] text-purple-300 font-mono">
                Frame 3
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: 3D Humanoid AI Robot Head (White/Chrome, glowing blue eyes, visible circuitry) facing right */}
        <div className="relative flex items-center">
          
          {/* Connector SVG Lines flowing to 3 Vertically Stacked Pill Labels */}
          <svg className="absolute -left-36 top-1/2 -translate-y-1/2 w-40 h-48 pointer-events-none z-10 overflow-visible">
            {/* Top Line to "Input" */}
            <path d="M 0,24 C 60,24 100,60 160,72" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="4 2" className="animate-pulse" />
            {/* Middle Line to "Output" */}
            <path d="M 0,96 C 60,96 100,96 160,96" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeDasharray="4 2" className="animate-pulse" />
            {/* Bottom Line to "Input" */}
            <path d="M 0,168 C 60,168 100,132 160,120" fill="none" stroke="#c084fc" strokeWidth="2.5" strokeDasharray="4 2" className="animate-pulse" />
          </svg>

          {/* 3 Small Pill-Shaped Labels STACKED VERTICALLY */}
          <div className="absolute -left-52 top-1/2 -translate-y-1/2 flex flex-col gap-8 z-20">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#0a0e2e]/90 text-cyan-300 border border-cyan-500/50 shadow-teal-glow whitespace-nowrap">
              Input
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#0a0e2e]/90 text-emerald-300 border border-emerald-500/50 shadow-lg whitespace-nowrap">
              Output
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#0a0e2e]/90 text-purple-300 border border-purple-500/50 shadow-lg whitespace-nowrap">
              Input
            </span>
          </div>

          {/* Robot Head Graphic */}
          <div
            className="w-32 h-40 rounded-3xl bg-gradient-to-b from-slate-100 to-slate-300 border-2 border-cyan-400 shadow-2xl flex flex-col items-center justify-center p-3 relative overflow-hidden"
            style={{
              transform: `rotateY(${mousePos.x * 15}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* Wireframe Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:12px_12px] opacity-40"></div>

            {/* Visor & Glowing Blue Eyes */}
            <div className="w-24 h-12 rounded-xl bg-slate-900 border border-cyan-400 flex items-center justify-around px-3 z-10 shadow-inner">
              <div className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-ping"></div>
              <div className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-ping"></div>
            </div>

            <Sparkles className="w-5 h-5 text-cyan-400 mt-4 z-10 animate-spin" />
          </div>
        </div>

      </div>
    </div>
  );
};
