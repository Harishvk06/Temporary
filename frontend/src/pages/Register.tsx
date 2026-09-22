import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Lock, Mail, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword } from '../utils/validators';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    const passVal = validatePassword(password);
    if (!passVal.isValid) {
      setError(passVal.message || 'Invalid password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await register(email, password, fullName);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c18] text-[#c7c4d8] flex items-center justify-center p-6 relative overflow-hidden select-none">
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-[#c4c0ff]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-[#2fd9f4]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-card p-8 border border-[rgba(248,250,252,0.12)] shadow-aura-card relative z-10 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link to="/" className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#c4c0ff] to-[#2fd9f4] p-[1.5px] shadow-aura-glow flex items-center justify-center mb-2">
            <div className="w-full h-full bg-[#0e1323] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#2fd9f4]" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-[#dee1f9]">Create Account</h1>
          <p className="text-xs text-[#c7c4d8]/80">Get 1000 free AI editing credits instantly</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#dee1f9]">Full Name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#c7c4d8]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Rivera"
                required
                className="w-full bg-[#080c18] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#dee1f9]">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#c7c4d8]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@auraedit.ai"
                required
                className="w-full bg-[#080c18] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#dee1f9]">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#c7c4d8]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#080c18] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="gradient-btn w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-aura-glow mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#080c18]" />
            ) : (
              <>
                Create Account
                <ArrowRight className="w-4 h-4 text-[#080c18]" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-[#c7c4d8] pt-2 border-t border-white/5">
          Already have an account?{' '}
          <Link to="/login" className="text-[#2fd9f4] font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
