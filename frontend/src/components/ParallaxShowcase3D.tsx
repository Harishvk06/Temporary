import React, { useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  Film,
  Layers,
  Wand2,
  Sliders,
  CheckCircle2,
  Cpu,
  Zap,
  Volume2,
  Maximize2,
  RefreshCw,
  Eye,
  Scissors,
  UserCheck,
} from 'lucide-react';

interface ParallaxShowcase3DProps {
  onOpenDemo?: () => void;
}

export const ParallaxShowcase3D: React.FC<ParallaxShowcase3DProps> = ({ onOpenDemo }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax rotation & translation state
  const [rotateX, setRotateX] = useState<number>(0);
  const [rotateY, setRotateY] = useState<number>(0);
  const [glarePos, setGlarePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Interactive tab state inside the 3D mockup
  const [activeTab, setActiveTab] = useState<'video' | 'image' | 'facial'>('video');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [sliderPos, setSliderPos] = useState<number>(50); // Before/After slider position (%)
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  // Handle cursor tracking for 3D parallax effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate mouse position relative to container center normalized between -1 and 1
    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;

    // Max rotation angles (Pitch: ±18 deg, Yaw: ±22 deg)
    const targetRotateX = -mouseY * 36; // Invert pitch for natural perspective feel
    const targetRotateY = mouseX * 44;

    setRotateX(targetRotateX);
    setRotateY(targetRotateY);

    // Calculate specular glare position (%)
    const glareX = ((e.clientX - rect.left) / width) * 100;
    const glareY = ((e.clientY - rect.top) / height) * 100;
    setGlarePos({ x: glareX, y: glareY });
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setGlarePos({ x: 50, y: 50 });
    setIsDraggingSlider(false);
  };

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingSlider) return;
    const sliderContainer = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offsetX = clientX - sliderContainer.left;
    const percentage = Math.max(5, Math.min(95, (offsetX / sliderContainer.width) * 100));
    setSliderPos(percentage);
  };

  return (
    <div className="w-full relative flex flex-col items-center justify-center select-none py-2">

      {/* Main 3D Perspective Viewport Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative w-full max-w-4xl h-[540px] flex items-center justify-center perspective-1500 cursor-grab active:cursor-grabbing"
      >
        {/* LAYER -1: Ambient Deep Background Particles & 3D Grid Grid */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none transition-transform duration-500 ease-out flex items-center justify-center"
          style={{
            transform: `translate3d(${-rotateY * 0.8}px, ${rotateX * 0.8}px, -100px) rotateX(${rotateX * 0.2}deg) rotateY(${rotateY * 0.2}deg)`,
          }}
        >
          <div className="absolute w-[500px] h-[500px] bg-[#c4c0ff]/15 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute w-[450px] h-[450px] bg-[#2fd9f4]/15 rounded-full blur-[100px] pointer-events-none"></div>
          
          {/* Subtle 3D Depth Perspective Grid Lines */}
          <div className="w-full h-full opacity-20 bg-[radial-gradient(#2fd9f4_1px,transparent_1px)] [background-size:24px_24px] rounded-3xl"></div>
        </div>

        {/* MAIN 3D PARALLAX GROUP */}
        <div
          className="relative w-full h-full flex items-center justify-center preserve-3d transition-transform duration-200 ease-out"
          style={{
            transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
          }}
        >
          {/* LAYER 0: MAIN WORKSTATION 3D GLASSMOPHISM MOCKUP */}
          <div className="w-full max-w-3xl h-[440px] p-[2px] rounded-2xl bg-gradient-to-tr from-[#c4c0ff] via-[#2fd9f4]/60 to-[#c4c0ff] shadow-2xl preserve-3d relative group">
            <div className="w-full h-full bg-[#0e1323]/90 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-xl border border-white/10 preserve-3d relative overflow-hidden">
              
              {/* Dynamic Specular Glare Follow Effect */}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl opacity-40 transition-opacity duration-300 z-30"
                style={{
                  background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%)`,
                }}
              ></div>

              {/* Mockup Window Title Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0 z-10 preserve-3d">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-sm"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-sm"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-sm"></div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#dee1f9] tracking-wider">
                    AuraEdit AI Workspace v1.0 • 3D Canvas
                  </span>
                </div>

                {/* Workspace Switcher Tabs */}
                <div className="flex items-center gap-1 bg-[#080c18] p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setActiveTab('video')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      activeTab === 'video'
                        ? 'bg-[#2fd9f4]/20 text-[#2fd9f4] border border-[#2fd9f4]/40 shadow-aura-glow'
                        : 'text-[#c7c4d8]/70 hover:text-white'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    Video 4K
                  </button>
                  <button
                    onClick={() => setActiveTab('image')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      activeTab === 'image'
                        ? 'bg-[#c4c0ff]/20 text-[#c4c0ff] border border-[#c4c0ff]/40 shadow-aura-glow'
                        : 'text-[#c7c4d8]/70 hover:text-white'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    AI Outpaint
                  </button>
                  <button
                    onClick={() => setActiveTab('facial')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      activeTab === 'facial'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-aura-glow'
                        : 'text-[#c7c4d8]/70 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Face Lock
                  </button>
                </div>
              </div>

              {/* Central Canvas Media Display */}
              <div className="relative flex-1 rounded-xl bg-black/80 border border-white/10 overflow-hidden my-3 flex items-center justify-center preserve-3d">
                {activeTab === 'video' ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0a0e1a] to-[#141a30]">
                    <img
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80"
                      alt="Video Timeline Preview"
                      className="w-full h-full object-cover opacity-85 transition-filter duration-300"
                      style={{
                        filter: isPlaying
                          ? 'contrast(115%) saturate(125%) brightness(105%)'
                          : 'contrast(100%)',
                      }}
                    />
                    
                    {/* Live Motion Status Overlay */}
                    <div className="absolute top-3 right-3 glass-panel px-3 py-1 rounded-full text-[11px] font-mono text-[#2fd9f4] border border-[#2fd9f4]/40 flex items-center gap-2 shadow-aura-glow z-10">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>60 FPS Render Engine</span>
                    </div>

                    {/* Play/Pause Center Overlay */}
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-14 h-14 rounded-full gradient-btn flex items-center justify-center shadow-aura-glow hover:scale-110 active:scale-95 transition-transform z-20"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 text-[#080c18]" />
                      ) : (
                        <Play className="w-6 h-6 text-[#080c18] ml-1" />
                      )}
                    </button>
                  </div>
                ) : activeTab === 'image' ? (
                  /* Interactive Before vs After AI Split Slider */
                  <div
                    className="relative w-full h-full overflow-hidden cursor-ew-resize select-none"
                    onMouseDown={() => setIsDraggingSlider(true)}
                    onMouseUp={() => setIsDraggingSlider(false)}
                    onMouseMove={handleSliderMove}
                    onTouchStart={() => setIsDraggingSlider(true)}
                    onTouchEnd={() => setIsDraggingSlider(false)}
                    onTouchMove={handleSliderMove}
                  >
                    {/* After Image (Full width background) */}
                    <img
                      src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80"
                      alt="AI Enhanced"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    
                    {/* Before Image (Clipped by slider position) */}
                    <div
                      className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-[#2fd9f4] shadow-2xl z-10"
                      style={{ width: `${sliderPos}%` }}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80"
                        alt="Original Image"
                        className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-75 brightness-75 max-w-none"
                        style={{ width: containerRef.current?.clientWidth || '100%' }}
                      />
                    </div>

                    {/* Slider Divider Line Handle */}
                    <div
                      className="absolute inset-y-0 z-20 flex items-center justify-center pointer-events-none"
                      style={{ left: `${sliderPos}%` }}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#080c18] border-2 border-[#2fd9f4] shadow-aura-glow flex items-center justify-center text-[#2fd9f4] font-bold text-xs -translate-x-1/2">
                        ↔
                      </div>
                    </div>

                    {/* Labels */}
                    <span className="absolute bottom-3 left-3 glass-panel px-2.5 py-1 rounded text-[10px] font-mono text-white/80 z-20">
                      Original Raw
                    </span>
                    <span className="absolute bottom-3 right-3 glass-panel px-2.5 py-1 rounded text-[10px] font-mono text-[#2fd9f4] border border-[#2fd9f4]/40 z-20 shadow-aura-glow">
                      AI Enhanced + Outpainted
                    </span>
                  </div>
                ) : (
                  /* Facial Lock Demo */
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&auto=format&fit=crop&q=80"
                      alt="Facial Lock"
                      className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-400/40 rounded-xl flex flex-col items-center justify-center gap-2">
                      <div className="w-24 h-24 border-2 border-dashed border-emerald-400 rounded-full flex items-center justify-center animate-pulse">
                        <UserCheck className="w-8 h-8 text-emerald-400" />
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-400 text-emerald-300 text-xs font-mono font-bold shadow-lg">
                        Subject Identity Lock • 99.8% Match
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Glowing AI Prompt Bar & Controls */}
              <div className="flex items-center gap-3 flex-shrink-0 z-10 preserve-3d">
                <div className="flex-1 glass-panel px-4 py-2.5 rounded-xl border border-[#2fd9f4]/40 flex items-center gap-3 shadow-aura-glow">
                  <Sparkles className="w-4 h-4 text-[#2fd9f4] animate-spin" />
                  <span className="text-xs font-mono text-[#dee1f9] truncate">
                    {activeTab === 'video'
                      ? '"Apply teal & orange grade, trim initial 2s, 60fps motion speed 1.2x..."'
                      : activeTab === 'image'
                      ? '"Outpaint canvas +20%, generative fill neon cyberpunk lights..."'
                      : '"Lock facial identity, change background to sunset mountain landscape..."'}
                  </span>
                </div>
                <button
                  onClick={onOpenDemo}
                  className="gradient-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 flex-shrink-0 shadow-aura-glow"
                >
                  <Zap className="w-3.5 h-3.5 text-[#080c18]" />
                  Execute AI
                </button>
              </div>
            </div>
          </div>

          {/* LAYER 1: FRONT-LEFT FLOATING 3D CARD (Generative Fill & Outpaint) */}
          <div
            className="absolute -top-6 -left-8 glass-card p-4 shadow-2xl border border-[#c4c0ff]/40 preserve-3d transition-transform duration-300 ease-out hidden sm:flex flex-col gap-2.5 w-64 backdrop-blur-2xl"
            style={{
              transform: `translate3d(${-rotateY * 0.95}px, ${rotateX * 0.95}px, 60px) rotateZ(-4deg)`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#c4c0ff] to-[#2fd9f4] flex items-center justify-center text-[#080c18] font-bold text-sm shadow-md">
                  ✨
                </div>
                <span className="text-xs font-bold text-[#dee1f9]">Generative Outpaint</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                +25% Margin
              </span>
            </div>
            <p className="text-[11px] text-[#c7c4d8] leading-tight">
              AI extends picture boundaries seamlessly with context-aware diffusion.
            </p>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#c4c0ff] to-[#2fd9f4] w-4/5 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* LAYER 2: FRONT-RIGHT FLOATING 3D CARD (Multi-Track Timeline) */}
          <div
            className="absolute -bottom-6 -right-8 glass-card p-4 shadow-2xl border border-[#2fd9f4]/40 preserve-3d transition-transform duration-300 ease-out hidden sm:flex flex-col gap-2.5 w-64 backdrop-blur-2xl"
            style={{
              transform: `translate3d(${rotateY * 1.1}px, ${-rotateX * 1.1}px, 80px) rotateZ(3deg)`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2fd9f4] to-[#c4c0ff] flex items-center justify-center text-[#080c18] font-bold text-sm shadow-md">
                  🎬
                </div>
                <span className="text-xs font-bold text-[#dee1f9]">4K Multi-Track</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#2fd9f4]/20 text-[#2fd9f4] border border-[#2fd9f4]/40 font-semibold">
                60 FPS
              </span>
            </div>
            {/* Timeline Track Bars Preview */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="h-3 w-full bg-[#2fd9f4]/20 rounded border border-[#2fd9f4]/40 flex items-center px-1">
                <div className="h-1.5 w-2/3 bg-[#2fd9f4] rounded-full"></div>
              </div>
              <div className="h-3 w-full bg-purple-500/20 rounded border border-purple-500/40 flex items-center px-1">
                <div className="h-1.5 w-1/2 bg-purple-400 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* LAYER 3: TOP FLOATING 3D CHIP (Gemini 2.5 Flash Agent) */}
          <div
            className="absolute -top-10 right-12 glass-panel px-4 py-2 rounded-2xl border border-[#2fd9f4]/50 shadow-aura-glow preserve-3d transition-transform duration-300 ease-out hidden md:flex items-center gap-3 backdrop-blur-2xl"
            style={{
              transform: `translate3d(${rotateY * 1.25}px, ${-rotateX * 1.25}px, 100px)`,
            }}
          >
            <div className="w-7 h-7 rounded-lg bg-[#2fd9f4]/20 border border-[#2fd9f4]/60 flex items-center justify-center text-[#2fd9f4]">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#dee1f9]">Gemini 2.5 Flash Agent</span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Active (14ms Latency)
              </span>
            </div>
          </div>

          {/* LAYER 4: BOTTOM-LEFT FLOATING 3D BADGE (Real-Time Render Engine) */}
          <div
            className="absolute -bottom-8 left-16 glass-panel px-4 py-2.5 rounded-2xl border border-[#c4c0ff]/40 shadow-aura-card preserve-3d transition-transform duration-300 ease-out hidden md:flex items-center gap-3 backdrop-blur-2xl"
            style={{
              transform: `translate3d(${-rotateY * 0.9}px, ${rotateX * 0.9}px, 70px)`,
            }}
          >
            <div className="w-7 h-7 rounded-lg bg-[#c4c0ff]/20 border border-[#c4c0ff]/60 flex items-center justify-center text-[#c4c0ff]">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#dee1f9]">Render Engine</span>
              <span className="text-[10px] font-mono text-[#2fd9f4]">1080p 60fps • 99.4% Complete</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
