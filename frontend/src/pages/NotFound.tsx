import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080c18] text-[#c7c4d8] flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-24">
        <div className="glass-card p-12 max-w-md w-full flex flex-col items-center gap-6 border border-[#2fd9f4]/30 shadow-aura-glow">
          <div className="w-16 h-16 rounded-2xl bg-[#2fd9f4]/10 border border-[#2fd9f4]/40 flex items-center justify-center text-[#2fd9f4]">
            <Sparkles className="w-8 h-8" />
          </div>

          <h1 className="text-6xl font-extrabold text-[#dee1f9]">404</h1>
          <h2 className="text-xl font-bold text-[#dee1f9]">Page Not Found</h2>
          <p className="text-xs text-[#c7c4d8]">
            The requested editor view or media asset path does not exist.
          </p>

          <Link
            to="/dashboard"
            className="gradient-btn px-6 py-3 text-sm flex items-center gap-2 shadow-aura-glow mt-2"
          >
            <ArrowLeft className="w-4 h-4 text-[#080c18]" />
            Return to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
};
