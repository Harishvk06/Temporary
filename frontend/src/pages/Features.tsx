import React from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  Type,
  Square,
  Paintbrush,
  Eraser,
  Sticker as StickerIcon,
  MessageSquareText,
  Wand2,
  Scissors,
  Film,
  Undo2,
  Layers,
  Crop,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { CursorGlow } from '../components/CursorGlow';
import { ScrollProgressBar } from '../components/ScrollProgressBar';
import { VignetteOverlay } from '../components/VignetteOverlay';
import { TiltCard } from '../components/TiltCard';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  desc: string;
  accent: string;
}

interface FeatureGroup {
  label: string;
  tagline: string;
  items: FeatureItem[];
}

const groups: FeatureGroup[] = [
  {
    label: 'Core Editing Tools',
    tagline: 'Everything you need to compose a scene, built right into the canvas.',
    items: [
      {
        icon: Type,
        title: 'Text Layers',
        desc: 'Add fully styled text with font family, size, weight, alignment, and color controls. Drag to reposition directly on the canvas.',
        accent: '#2fd9f4',
      },
      {
        icon: Square,
        title: 'Shapes',
        desc: 'Rectangles, ellipses, and lines with adjustable fill, stroke color, stroke width, and opacity — dropped in and dragged wherever you need them.',
        accent: '#c4c0ff',
      },
      {
        icon: Paintbrush,
        title: 'Brush & Draw',
        desc: 'Freehand drawing with full color and size control. Undo the last stroke or clear everything in one click.',
        accent: '#2fd9f4',
      },
      {
        icon: Eraser,
        title: 'Eraser',
        desc: 'Paint away any part of an image with real pixel-level transparency — not a filter trick. Apply or cancel before committing.',
        accent: '#c4c0ff',
      },
      {
        icon: StickerIcon,
        title: 'Stickers & Clipart',
        desc: 'Drop in emoji stickers or upload your own image as resizable clipart — exactly like inserting a picture in a document.',
        accent: '#2fd9f4',
      },
    ],
  },
  {
    label: 'AI-Powered Editing',
    tagline: 'Describe what you want. AuraEdit AI figures out how to do it.',
    items: [
      {
        icon: MessageSquareText,
        title: 'AI Chat Assistant',
        desc: 'Tell the AI Orchestrator what to change in plain English — "make it brighter," "flip it," "add a vintage filter" — and watch it happen live on canvas.',
        accent: '#c4c0ff',
      },
      {
        icon: Wand2,
        title: 'Generative Fill',
        desc: 'Powered by Gemini image generation — describe an edit and the AI genuinely regenerates the affected part of your image, not just a filter.',
        accent: '#2fd9f4',
      },
      {
        icon: Scissors,
        title: 'Background Removal',
        desc: 'On-device ML segmentation isolates your subject and removes the background — no API key, no cost, works fully in your browser.',
        accent: '#c4c0ff',
      },
      {
        icon: Film,
        title: 'Photo to Video',
        desc: 'Turn a still image into a moving scene with AI-driven motion — pan, zoom, and depth effects generated automatically from a single photo.',
        accent: '#2fd9f4',
      },
    ],
  },
  {
    label: 'Workflow & Control',
    tagline: 'The unglamorous stuff that makes real editing possible.',
    items: [
      {
        icon: Undo2,
        title: 'Full Undo / Redo History',
        desc: 'Every meaningful action — adding a layer, applying a filter, erasing part of an image — is a real, individually undoable step.',
        accent: '#c4c0ff',
      },
      {
        icon: Layers,
        title: 'Layer Inspector',
        desc: 'See every text box, shape, sticker, and brush stroke as its own layer. Toggle visibility, lock, reorder, or delete individually.',
        accent: '#2fd9f4',
      },
      {
        icon: Crop,
        title: 'Crop & Resize',
        desc: 'Drag any corner or edge to resize the crop box, or drag from inside to reposition it. Freeform or locked aspect ratios (1:1, 16:9, 9:16, 4:3).',
        accent: '#c4c0ff',
      },
      {
        icon: SlidersHorizontal,
        title: 'Adjustments & Filters',
        desc: 'Brightness, contrast, saturation, and temperature sliders, plus one-click Vintage, Blur, and Sharpen presets.',
        accent: '#2fd9f4',
      },
    ],
  },
];

export const Features: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080c18] text-[#c7c4d8] flex flex-col selection:bg-[#2fd9f4]/30 selection:text-[#2fd9f4] relative overflow-x-hidden">
      <ScrollProgressBar />
      <CursorGlow />
      <VignetteOverlay />

      {/* Static background video, matching the landing page's visual identity */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-100 filter contrast-115 brightness-135 saturate-135 scale-100"
        >
          <source src="/Initial_Scene_-_2026-08-21_202608220015.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="relative z-40">
        <Navbar />
      </div>

      {/* HERO */}
      <section className="relative z-10 pt-40 pb-16 px-6 max-w-5xl mx-auto w-full text-center flex flex-col items-center gap-6">
        <div
          className="absolute top-10 left-1/4 w-96 h-96 bg-[#c4c0ff]/15 rounded-full blur-3xl pointer-events-none animate-blob-drift"
        ></div>
        <div
          className="absolute top-24 right-1/4 w-96 h-96 bg-[#2fd9f4]/15 rounded-full blur-3xl pointer-events-none animate-blob-drift-reverse"
        ></div>

        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={revealVariants}
          className="glass-panel px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border border-[#2fd9f4]/40 text-[#dee1f9] shadow-aura-glow"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2fd9f4] animate-pulse" />
          Everything Below Is Real — Not a Mockup
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          custom={1}
          variants={revealVariants}
          className="text-4xl sm:text-6xl font-extrabold text-white leading-[1.1] tracking-tight text-3d-title"
        >
          Built for Real <span className="text-3d-gradient">Creative Work</span>
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          custom={2}
          variants={revealVariants}
          className="text-lg text-white/90 font-medium max-w-2xl leading-relaxed text-high-contrast"
        >
          Every tool below runs live in the AuraEdit AI workspace — from hand-drawn brush strokes to
          Gemini-powered generative fill. No placeholders, no "coming soon."
        </motion.p>
      </section>

      {/* FEATURE GROUPS */}
      {groups.map((group, groupIdx) => (
        <section key={group.label} className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={revealVariants}
            className="flex flex-col gap-3 mb-12 max-w-2xl"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-[#2fd9f4]">
              {String(groupIdx + 1).padStart(2, '0')} — {group.label}
            </span>
            <p className="text-sm text-[#c7c4d8]">{group.tagline}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.items.map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                custom={i}
                variants={revealVariants}
              >
                <TiltCard maxTilt={7} liftZ={16} className="glass-card p-7 flex flex-col gap-4 border border-transparent hover:border-[#2fd9f4]/40 transition-colors h-full">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${item.accent}1a`, border: `1px solid ${item.accent}4d` }}
                  >
                    <item.icon className="w-6 h-6" style={{ color: item.accent }} />
                  </div>
                  <h3 className="text-lg font-bold text-[#dee1f9]">{item.title}</h3>
                  <p className="text-sm text-[#c7c4d8] leading-relaxed">{item.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-20 px-6 max-w-5xl mx-auto w-full relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealVariants}
          className="glass-card p-12 text-center flex flex-col items-center gap-6 relative overflow-hidden border border-[#2fd9f4]/30 shadow-aura-glow"
        >
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#2fd9f4]/20 rounded-full blur-3xl pointer-events-none animate-blob-drift"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#c4c0ff]/20 rounded-full blur-3xl pointer-events-none animate-blob-drift-reverse"></div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#dee1f9]">
            Try It Yourself — No Watching Required
          </h2>
          <p className="text-base text-[#c7c4d8] max-w-xl">
            Open the workspace and start editing. Every feature above is one click away.
          </p>

          <Link
            to="/workspace"
            className="gradient-btn shimmer-sweep px-10 py-4 text-base flex items-center gap-3 shadow-aura-glow mt-2 hover:scale-105 transition-transform"
          >
            Open the Workspace
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

export default Features;
