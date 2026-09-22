import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, User as UserIcon, LogOut, LayoutDashboard, Sliders } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav px-6 py-4 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#c4c0ff] to-[#2fd9f4] p-[1.5px] shadow-aura-glow group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#0e1323] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#2fd9f4]" />
            </div>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-bold tracking-tight text-[#dee1f9]">
              AuraEdit <span className="gradient-text">AI</span>
            </span>
            <span className="text-[10px] font-medium text-[#c7c4d8]/60 tracking-wide">
              Powered by Acorus Softech Pvt Ltd
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#c7c4d8]">
          <Link to="/features" className="hover:text-[#2fd9f4] transition-colors">Features</Link>
          <Link to="/dashboard" className="hover:text-[#2fd9f4] transition-colors">Dashboard</Link>
          <Link to="/pricing" className="hover:text-[#2fd9f4] transition-colors">Pricing</Link>
          <a href="#contact" className="hover:text-[#2fd9f4] transition-colors">Contact</a>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full glass-panel hover:border-[#2fd9f4]/50 transition-all text-[#dee1f9]"
              >
                <LayoutDashboard className="w-4 h-4 text-[#2fd9f4]" />
                Dashboard
              </Link>
              <div className="flex items-center gap-3 glass-panel px-3 py-1.5 rounded-full border-rgba(248,250,252,0.08)">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#c4c0ff] to-[#2fd9f4] flex items-center justify-center text-[#080c18] font-bold text-xs">
                  {user?.full_name?.charAt(0) || 'A'}
                </div>
                <span className="text-xs font-semibold text-[#dee1f9] hidden sm:inline">
                  {user?.credits_remaining || 942} credits
                </span>
                <button
                  onClick={logout}
                  className="text-xs text-red-400 hover:text-red-300 p-1 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-[#c7c4d8] hover:text-[#dee1f9] px-4 py-2 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="gradient-btn px-5 py-2.5 text-sm flex items-center gap-2 shadow-aura-glow"
              >
                Start Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
