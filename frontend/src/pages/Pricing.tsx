import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { Check, Sparkles, ArrowRight, Zap, Building2, Rocket, type LucideIcon } from 'lucide-react';
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

type BillingCycle = 'monthly' | 'yearly';

interface Tier {
  name: string;
  icon: LucideIcon;
  accent: string;
  tagline: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  priceSuffix: string;
  credits: string;
  featured: boolean;
  cta: string;
  ctaLink: string;
  features: string[];
}

const tiers: Tier[] = [
  {
    name: 'Free',
    icon: Zap,
    accent: '#c4c0ff',
    tagline: 'Try every tool before you commit to anything.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceSuffix: 'forever',
    credits: '50 credits / month',
    featured: false,
    cta: 'Start Free',
    ctaLink: '/register',
    features: [
      'Text, shapes, brush, eraser & stickers',
      'Crop, filters & adjustments',
      'On-device background removal',
      '50 AI credits every month',
      'Standard export quality',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    icon: Rocket,
    accent: '#2fd9f4',
    tagline: 'For creators who edit regularly and need real AI power.',
    monthlyPrice: null,
    yearlyPrice: null,
    priceSuffix: 'contact us',
    credits: '2,000 credits / month',
    featured: true,
    cta: 'Upgrade to Pro',
    ctaLink: '/register',
    features: [
      'Everything in Free',
      'Gemini-powered Generative Fill',
      'AI Chat Assistant for editing by voice/text',
      'Photo-to-video generation',
      '2,000 AI credits every month',
      'Priority AI processing queue',
      'No watermark on exports',
      'Email support',
    ],
  },
  {
    name: 'Enterprise',
    icon: Building2,
    accent: '#c4c0ff',
    tagline: 'Custom limits, dedicated support, and team management.',
    monthlyPrice: null,
    yearlyPrice: null,
    priceSuffix: 'contact us',
    credits: 'Custom / unlimited',
    featured: false,
    cta: 'Contact Sales',
    ctaLink: '/contact',
    features: [
      'Everything in Pro',
      'Unlimited or custom AI credit pool',
      'Multiple team seats & shared projects',
      'Dedicated onboarding & support',
      'Custom integrations & API access',
      'SLA-backed uptime guarantee',
    ],
  },
];

export const Pricing: React.FC = () => {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  return (
    <div className="min-h-screen bg-[#080c18] text-[#c7c4d8] flex flex-col selection:bg-[#2fd9f4]/30 selection:text-[#2fd9f4] relative overflow-x-hidden">
      <ScrollProgressBar />
      <CursorGlow />
      <VignetteOverlay />

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
      <section className="relative z-10 pt-40 pb-12 px-6 max-w-5xl mx-auto w-full text-center flex flex-col items-center gap-6">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#c4c0ff]/15 rounded-full blur-3xl pointer-events-none animate-blob-drift"></div>
        <div className="absolute top-24 right-1/4 w-96 h-96 bg-[#2fd9f4]/15 rounded-full blur-3xl pointer-events-none animate-blob-drift-reverse"></div>

        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={revealVariants}
          className="glass-panel px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border border-[#2fd9f4]/40 text-[#dee1f9] shadow-aura-glow"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2fd9f4] animate-pulse" />
          Simple Pricing, No Surprises
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          custom={1}
          variants={revealVariants}
          className="text-4xl sm:text-6xl font-extrabold text-white leading-[1.1] tracking-tight text-3d-title"
        >
          Pick the Plan That <span className="text-3d-gradient">Fits Your Work</span>
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          custom={2}
          variants={revealVariants}
          className="text-lg text-white/90 font-medium max-w-2xl leading-relaxed text-high-contrast"
        >
          Start free with every core tool unlocked. Upgrade when you need Gemini-powered AI editing at scale.
        </motion.p>

        {/* Billing toggle */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={3}
          variants={revealVariants}
          className="glass-panel inline-flex items-center gap-1 p-1.5 rounded-full border border-white/10 mt-2"
        >
          {(['monthly', 'yearly'] as BillingCycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`relative px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                cycle === c
                  ? 'bg-gradient-to-r from-[#c4c0ff] to-[#2fd9f4] text-[#080c18]'
                  : 'text-[#c7c4d8] hover:text-[#dee1f9]'
              }`}
            >
              {c === 'monthly' ? 'Monthly' : 'Yearly'}
              {c === 'yearly' && (
                <span
                  className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    cycle === 'yearly' ? 'bg-[#080c18]/20 text-[#080c18]' : 'bg-[#2fd9f4]/15 text-[#2fd9f4]'
                  }`}
                >
                  Save 20%
                </span>
              )}
            </button>
          ))}
        </motion.div>
      </section>

      {/* PRICING CARDS */}
      <section className="relative z-10 px-6 max-w-6xl mx-auto w-full pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {tiers.map((tier, i) => {
            const price = cycle === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
            return (
              <motion.div
                key={tier.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                custom={i}
                variants={revealVariants}
                className={tier.featured ? 'md:-mt-4 md:mb-4' : ''}
              >
                <TiltCard
                  maxTilt={tier.featured ? 5 : 7}
                  liftZ={tier.featured ? 24 : 14}
                  className={`glass-card p-8 flex flex-col gap-6 h-full border transition-colors relative overflow-hidden ${
                    tier.featured
                      ? 'border-[#2fd9f4]/60 shadow-aura-glow'
                      : 'border-transparent hover:border-[#2fd9f4]/40'
                  }`}
                >
                  {tier.featured && (
                    <div className="absolute top-0 right-0">
                      <span className="bg-gradient-to-r from-[#c4c0ff] to-[#2fd9f4] text-[#080c18] text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${tier.accent}1a`, border: `1px solid ${tier.accent}4d` }}
                  >
                    <tier.icon className="w-6 h-6" style={{ color: tier.accent }} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-bold text-[#dee1f9]">{tier.name}</h3>
                    <p className="text-sm text-[#c7c4d8]">{tier.tagline}</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    {price === null ? (
                      <span className="text-3xl font-extrabold text-white">Contact Us</span>
                    ) : (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-extrabold text-white">₹{price}</span>
                        {price > 0 && <span className="text-sm text-[#c7c4d8]">/mo</span>}
                      </div>
                    )}
                    <span className="text-xs text-[#c7c4d8]/70">
                      {price === 0 ? tier.priceSuffix : price === null ? tier.priceSuffix : cycle === 'yearly' ? 'billed yearly' : tier.priceSuffix}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-[#2fd9f4] bg-[#2fd9f4]/10 border border-[#2fd9f4]/30 rounded-lg px-3 py-2 w-fit">
                    {tier.credits}
                  </div>

                  <Link
                    to={tier.ctaLink}
                    className={
                      tier.featured
                        ? 'gradient-btn shimmer-sweep px-6 py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-aura-glow hover:scale-[1.02] transition-transform'
                        : 'glass-panel px-6 py-3 rounded-full text-sm font-semibold text-[#dee1f9] flex items-center justify-center gap-2 hover:border-[#2fd9f4]/50 hover:scale-[1.02] transition-all'
                    }
                  >
                    {tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <div className="flex flex-col gap-2.5 pt-2 border-t border-white/10">
                    {tier.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5 text-sm text-[#c7c4d8]">
                        <Check className="w-4 h-4 text-[#2fd9f4] flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FAQ-ish reassurance strip */}
      <section className="relative z-10 px-6 max-w-4xl mx-auto w-full pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealVariants}
          className="glass-card p-6 flex flex-col sm:flex-row items-center justify-around gap-6 text-center border border-white/10"
        >
          {[
            { label: 'Cancel anytime', sub: 'No lock-in contracts' },
            { label: 'Credits roll over', sub: 'Unused credits carry into next month on Pro' },
            { label: 'Secure billing', sub: 'Payments processed securely' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <span className="text-sm font-bold text-[#dee1f9]">{item.label}</span>
              <span className="text-xs text-[#c7c4d8]/70">{item.sub}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 max-w-5xl mx-auto w-full relative z-10">
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
            Still Deciding? Start Free.
          </h2>
          <p className="text-base text-[#c7c4d8] max-w-xl">
            No credit card required. Upgrade the moment you need more AI credits.
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
    </div>
  );
};

export default Pricing;
