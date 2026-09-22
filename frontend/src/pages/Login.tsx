import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Lock, Mail, Loader2, ShieldCheck, KeyRound, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../utils/validators';

export const Login: React.FC = () => {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Step 1: Submit Credentials & Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await requestOtp(email, password);
      setStep(2);
      setInfoMessage(res.message || `A 6-digit OTP verification code has been sent to ${email}`);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid email or password credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP & Complete Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      setError('Please enter a valid 6-digit OTP verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await verifyOtp(email, otpCode);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid or expired OTP verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const res = await requestOtp(email, password);
      setInfoMessage(`New verification code sent to ${email}`);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
      }
    } catch (err: any) {
      setError('Failed to resend verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c18] text-[#c7c4d8] flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#c4c0ff]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-[#2fd9f4]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-card p-8 border border-[rgba(248,250,252,0.12)] shadow-aura-card relative z-10 flex flex-col gap-6">
        {/* Logo & Heading */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Link to="/" className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#c4c0ff] to-[#2fd9f4] p-[1.5px] shadow-aura-glow flex items-center justify-center mb-2">
            <div className="w-full h-full bg-[#0e1323] rounded-[14px] flex items-center justify-center">
              {step === 1 ? (
                <Sparkles className="w-6 h-6 text-[#2fd9f4]" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-[#2fd9f4]" />
              )}
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-[#dee1f9]">
            {step === 1 ? 'Welcome Back' : 'Two-Step Verification'}
          </h1>
          <p className="text-xs text-[#c7c4d8]/80">
            {step === 1
              ? 'Log in to access your AuraEdit AI creative workspace'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Step 1 Form: Email & Password */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
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

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#c7c4d8]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-[#2fd9f4] rounded"
                />
                Remember me
              </label>
              <a href="#forgot" className="text-[#2fd9f4] hover:underline font-medium">Forgot password?</a>
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
                  Continue & Request OTP
                  <ArrowRight className="w-4 h-4 text-[#080c18]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2 Form: Minimalist OTP Verification (Input & Submit ONLY) */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit OTP"
              required
              autoFocus
              className="w-full bg-[#080c18] border border-white/20 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-[6px] text-center text-[#2fd9f4] outline-none focus:border-[#2fd9f4]"
            />

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 6}
              className="gradient-btn w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-aura-glow disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#080c18]" />
              ) : (
                'Submit'
              )}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-[#c7c4d8] pt-2 border-t border-white/5">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#2fd9f4] font-semibold hover:underline">
            Start Free
          </Link>
        </div>
      </div>
    </div>
  );
};

