import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Play,
  CheckCircle,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { ParallaxShowcase3D } from '../components/ParallaxShowcase3D';
import { CursorGlow } from '../components/CursorGlow';
import { ScrollProgressBar } from '../components/ScrollProgressBar';
import { VignetteOverlay } from '../components/VignetteOverlay';
import { TiltCard } from '../components/TiltCard';

// Reusable scroll-reveal wrapper: fades + slides content up as it enters
// the viewport. Only affects presentation — never data/logic.
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export const LandingPage: React.FC = () => {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [scrollY, setScrollY] = useState<number>(0);
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  // Programmatically enforce muted property & trigger autoplay for cross-browser compliance
  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.muted = true;
      bgVideoRef.current.play().catch((err) => {
        console.warn('Background video autoplay warning:', err);
      });
    }
  }, []);

  // High-performance requestAnimationFrame scroll parallax tracking
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#080c18] text-[#c7c4d8] flex flex-col selection:bg-[#2fd9f4]/30 selection:text-[#2fd9f4] relative overflow-x-hidden">
      {/* Scroll progress indicator + ambient cursor spotlight (pure overlays) */}
      <ScrollProgressBar />
      <CursorGlow />
      <VignetteOverlay />

      {/* Static Full-Screen Auto-Playing Muted Looping Video Background */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-black">
        <video
          ref={bgVideoRef}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-100 filter contrast-115 brightness-135 saturate-135 scale-100"
        >
          <source
            src="/Initial_Scene_-_2026-08-21_202608220015.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Navigation Bar */}
      <div className="relative z-40">
        <Navbar />
      </div>

      {/* HERO SECTION WITH DYNAMIC SCROLL PARALLAX & 3D SHOWCASE */}
      <section className="relative z-10 pt-32 pb-10 px-6 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center overflow-hidden">
        {/* Background ambient lighting glows (Parallax Speed: 0.35x) */}
        <div
          className="absolute top-20 left-1/4 w-96 h-96 bg-[#c4c0ff]/15 rounded-full blur-3xl pointer-events-none will-change-transform"
          style={{ transform: `translate3d(0, ${scrollY * 0.35}px, 0)` }}
        ></div>
        <div
          className="absolute top-40 right-1/4 w-96 h-96 bg-[#2fd9f4]/15 rounded-full blur-3xl pointer-events-none will-change-transform"
          style={{ transform: `translate3d(0, ${scrollY * 0.28}px, 0)` }}
        ></div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* LEFT CONTENT - MIDGROUND LAYER WITH HIGH CONTRAST 3D TYPOGRAPHY (Parallax Offset: -0.06x) */}
          <motion.div
            initial="hidden"
            animate="visible"
            className="flex flex-col items-start gap-8 z-10 will-change-transform p-6 sm:p-8 rounded-3xl backdrop-blur-md bg-[#080c18]/50 border border-white/10 shadow-2xl"
            style={{ transform: `translate3d(0, ${scrollY * -0.06}px, 0)` }}
          >
            <motion.div
              custom={0}
              variants={revealVariants}
              className="glass-panel px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border border-[#2fd9f4]/40 text-[#dee1f9] shadow-aura-glow"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2fd9f4] animate-pulse" />
              Interactive 3D Workspace • Powered by Gemini AI & LangGraph
            </motion.div>

            {/* 5-Line Main Headline with Layered 3D Typography */}
            <motion.h1
              custom={1}
              variants={revealVariants}
              className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-white leading-[1.18] tracking-tight text-3d-title"
            >
              Create Stunning <br />
              <span className="text-3d-gradient">Images & Videos</span> <br />
              with AI That <br />
              Actually Gets the <br />
              Job Done.
            </motion.h1>

            {/* Subtitle with High-Contrast Shadows */}
            <motion.p
              custom={2}
              variants={revealVariants}
              className="text-lg text-white/95 font-medium max-w-lg leading-relaxed text-high-contrast"
            >
              AuraEdit AI combines natural language reasoning with real-time computer vision algorithms.
              Transform raw media into studio-grade masterpieces with simple conversational prompts.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div custom={3} variants={revealVariants} className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/register"
                className="gradient-btn shimmer-sweep px-8 py-4 text-base flex items-center gap-3 shadow-aura-glow hover:scale-105 transition-transform"
              >
                Start Creating Free
                <ArrowRight className="w-5 h-5" />
              </Link>

              <button
                onClick={() => setIsDemoOpen(true)}
                className="glass-panel px-6 py-4 rounded-full text-base font-semibold text-[#dee1f9] flex items-center gap-2 hover:border-[#2fd9f4]/50 hover:scale-105 transition-all shadow-aura-card"
              >
                <Play className="w-4 h-4 text-[#2fd9f4] fill-[#2fd9f4]" />
                Watch Demo
              </button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              custom={4}
              variants={revealVariants}
              className="flex items-center gap-6 pt-2 text-xs font-semibold text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#2fd9f4]" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#c4c0ff]" />
                Cancel anytime
              </span>
            </motion.div>
          </motion.div>

          {/* RIGHT CONTENT - FOREGROUND 3D PARALLAX SHOWCASE (Scale: ~0.8 for optimal layout balance) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.72, rotateY: -8 }}
            animate={{ opacity: 1, scale: 0.8, rotateY: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex items-center justify-center will-change-transform preserve-3d origin-center"
            style={{ transform: `translate3d(0, ${scrollY * -0.16}px, 0)` }}
          >
            <ParallaxShowcase3D onOpenDemo={() => setIsDemoOpen(true)} />
          </motion.div>
        </div>
      </section>

      {/* FEATURES SECTION (Staggered Scroll Parallax Cards + 3D Tilt + Reveal) */}
      <section id="features" className="pt-12 pb-24 px-6 max-w-7xl mx-auto w-full relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealVariants}
          className="text-center max-w-2xl mx-auto flex flex-col gap-4 mb-16"
        >
          <h2 className="text-4xl font-bold text-[#dee1f9]">
            Engineered for Next-Gen <span className="gradient-text">Creators</span>
          </h2>
          <p className="text-base text-[#c7c4d8]">
            Everything you need for seamless image enhancement, smart video editing, and agentic AI execution.
          </p>
        </motion.div>

        {/* 3 Feature Cards with Staggered Parallax Motion + Interactive 3D Tilt */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              emoji: '🖼️',
              title: 'Image Editing',
              desc: 'Professional-grade image enhancement, object removal, background replacement, and artistic filters powered by vision models.',
              accent: '#c4c0ff',
              parallax: -0.06,
            },
            {
              emoji: '🎬',
              title: 'Video Editing',
              desc: 'Intelligent video enhancement, automatic captioning, cinematic effects, seamless transitions, and frame color grading.',
              accent: '#2fd9f4',
              parallax: 0.06,
            },
            {
              emoji: '🤖',
              title: 'AI Assistant',
              desc: 'Natural language prompts, multi-step LangGraph workflows, batch processing, and intelligent composition suggestions.',
              accent: '#c4c0ff',
              parallax: -0.06,
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              custom={i}
              variants={revealVariants}
              style={{
                transform: `translate3d(0, ${Math.max(-40, Math.min(40, (scrollY - 500) * card.parallax))}px, 0)`,
              }}
              className="will-change-transform"
            >
              <TiltCard maxTilt={8} liftZ={20} className="glass-card p-8 flex flex-col gap-5 hover:border-[#2fd9f4]/40 border border-transparent transition-colors group h-full">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${card.accent}1a`, border: `1px solid ${card.accent}4d` }}
                >
                  {card.emoji}
                </div>
                <h3 className="text-xl font-bold text-[#dee1f9]">{card.title}</h3>
                <p className="text-sm text-[#c7c4d8] leading-relaxed">{card.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 px-6 max-w-5xl mx-auto w-full relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealVariants}
          className="glass-card p-12 text-center flex flex-col items-center gap-6 relative overflow-hidden border border-[#2fd9f4]/30 shadow-aura-glow"
        >
          <div
            className="absolute -top-24 -right-24 w-64 h-64 bg-[#2fd9f4]/20 rounded-full blur-3xl pointer-events-none will-change-transform"
            style={{ transform: `translate3d(0, ${(scrollY - 1000) * 0.1}px, 0)` }}
          ></div>
          <div
            className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#c4c0ff]/20 rounded-full blur-3xl pointer-events-none will-change-transform"
            style={{ transform: `translate3d(0, ${(scrollY - 1000) * -0.1}px, 0)` }}
          ></div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#dee1f9]">
            Ready to Transform Your Creative Process?
          </h2>
          <p className="text-base text-[#c7c4d8] max-w-xl">
            Join thousands of creators using AuraEdit AI to streamline production and craft visual masterpieces.
          </p>

          <Link
            to="/register"
            className="gradient-btn shimmer-sweep px-10 py-4 text-base flex items-center gap-3 shadow-aura-glow mt-2 hover:scale-105 transition-transform"
          >
            Start Creating for Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* FOOTER */}
      <motion.footer
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={revealVariants}
        className="border-t border-white/10 py-16 px-6 bg-[#080c18] mt-auto"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="flex flex-col gap-3 text-sm">
            <span className="font-bold text-[#dee1f9] uppercase tracking-wider text-xs mb-1">Product</span>
            <Link to="/image-editor" className="hover:text-[#2fd9f4] transition-colors">Image Editor</Link>
            <Link to="/video-editor" className="hover:text-[#2fd9f4] transition-colors">Video Editor</Link>
            <a href="#features" className="hover:text-[#2fd9f4] transition-colors">AI Agents</a>
            <a href="#pricing" className="hover:text-[#2fd9f4] transition-colors">Pricing Plans</a>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <span className="font-bold text-[#dee1f9] uppercase tracking-wider text-xs mb-1">Company</span>
            <a href="#about" className="hover:text-[#2fd9f4] transition-colors">About Us</a>
            <a href="#careers" className="hover:text-[#2fd9f4] transition-colors">Careers</a>
            <a href="#blog" className="hover:text-[#2fd9f4] transition-colors">Blog</a>
            <a href="#press" className="hover:text-[#2fd9f4] transition-colors">Press Kit</a>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <span className="font-bold text-[#dee1f9] uppercase tracking-wider text-xs mb-1">Legal</span>
            <a href="#privacy" className="hover:text-[#2fd9f4] transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-[#2fd9f4] transition-colors">Terms of Service</a>
            <a href="#security" className="hover:text-[#2fd9f4] transition-colors">Security</a>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <span className="font-bold text-[#dee1f9] uppercase tracking-wider text-xs mb-1">Connect</span>
            <a href="#twitter" className="hover:text-[#2fd9f4] transition-colors">Twitter / X</a>
            <a href="#discord" className="hover:text-[#2fd9f4] transition-colors">Discord Community</a>
            <a href="#github" className="hover:text-[#2fd9f4] transition-colors">GitHub Repository</a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#c7c4d8]/60 gap-4">
          <span>© 2026 AuraEdit AI. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <span>Powered by Gemini AI</span>
            <span>Status: Operational</span>
          </div>
        </div>
      </motion.footer>

      {/* Video Demo Modal with Newly Generated Local Desktop Demo Video */}
      <Modal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        title="AuraEdit AI Interactive Demo • 1080p Full HD"
        maxWidth="max-w-4xl"
      >
        <div className="flex flex-col gap-4">
          <div className="aspect-video bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-[#2fd9f4]/30 shadow-[0_0_30px_rgba(47,217,244,0.2)]">
            <video
              src="/demo_video.mp4"
              controls
              autoPlay
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            >
              <source src="/demo_video.mp4" type="video/mp4" />
              <source src="/Generating_video_from_storyboard…_1080p_20260918190214.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="flex items-center justify-between text-xs text-[#c7c4d8] leading-relaxed pt-1">
            <p>
              Experience AuraEdit AI's generative multi-modal engine synthesizing dynamic parametric scenes and studio color grading in real time.
            </p>
            <span className="px-2.5 py-1 rounded-full bg-[#2fd9f4]/15 border border-[#2fd9f4]/40 text-[#2fd9f4] font-mono text-[11px] font-semibold flex-shrink-0 ml-4">
              1080p Master Output
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};