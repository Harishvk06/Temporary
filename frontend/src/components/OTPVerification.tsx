import React, { useState, useRef, useEffect } from 'react';
import { Phone, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles, KeyRound } from 'lucide-react';
import { authApi } from '../api/auth';

interface OTPVerificationProps {
  onSuccess?: (phoneNumber: string) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  onSuccess,
  onCancel,
  title = "Phone Verification",
  subtitle = "Secure your account with 2-factor SMS OTP authentication"
}) => {
  // Step state: 'phone' | 'otp' | 'success'
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Timers
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [expiresIn, setExpiresIn] = useState<number>(0);

  // Input refs for 6-digit PIN fields
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown effect for resend cooldown and OTP expiry
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0 || expiresIn > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown, expiresIn]);

  // Focus first input field when stepping into OTP entry
  useEffect(() => {
    if (step === 'otp' && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  // Send OTP handler
  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = phoneNumber.trim();

    if (!cleaned || cleaned.length < 8) {
      setError('Please enter a valid phone number (e.g. +1234567890)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    setDevOtp(null);

    try {
      const response = await authApi.sendOtp({ phone_number: cleaned });
      setStep('otp');
      setResendCooldown(60); // 60s cooldown
      setExpiresIn(response.expires_in_seconds || 300);
      setInfoMessage(response.message);
      
      if (response.dev_otp) {
        setDevOtp(response.dev_otp);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to send OTP code. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Digits change handler
  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digits
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    // Handle single character or last entered digit
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setError(null);

    // Auto-advance to next input field if digit entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Keyboard navigation & Backspace handling
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Move back and clear previous field
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Paste handler for 6-digit code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
      setError(null);
    }
  };

  // Fill code automatically from dev badge helper
  const handleUseDevOtp = () => {
    if (devOtp && devOtp.length === 6) {
      setOtpDigits(devOtp.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  // Verify OTP handler
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpDigits.join('');

    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.verifyOtp({ phone_number: phoneNumber, otp_code: fullCode });
      setStep('success');
      setInfoMessage(response.message || 'OTP Verification successful!');

      setTimeout(() => {
        if (onSuccess) onSuccess(phoneNumber);
      }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Verification failed. Invalid or expired OTP code.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full max-w-md glass-card p-6 md:p-8 border border-[rgba(248,250,252,0.12)] shadow-aura-card relative z-10 flex flex-col gap-6 select-none">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#c4c0ff] to-[#2fd9f4] p-[1.5px] shadow-aura-glow flex items-center justify-center mb-1">
          <div className="w-full h-full bg-[#0e1323] rounded-[14px] flex items-center justify-center">
            {step === 'success' ? (
              <CheckCircle2 className="w-6 h-6 text-[#2fd9f4] animate-bounce" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-[#2fd9f4]" />
            )}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[#dee1f9]">{title}</h2>
        <p className="text-xs text-[#c7c4d8]/80">{subtitle}</p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-400 flex items-center gap-2 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && !error && step !== 'success' && (
        <div className="p-3 rounded-xl bg-[#2fd9f4]/10 border border-[#2fd9f4]/30 text-xs text-[#2fd9f4] flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Dev OTP Helper Banner (Local simulation mode) */}
      {step === 'otp' && devOtp && (
        <div className="p-3 rounded-xl bg-[#c4c0ff]/10 border border-[#c4c0ff]/30 text-xs text-[#dee1f9] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#c4c0ff]" />
            <span>Dev OTP: <strong className="text-[#2fd9f4] tracking-widest text-sm font-mono">{devOtp}</strong></span>
          </div>
          <button
            type="button"
            onClick={handleUseDevOtp}
            className="px-2.5 py-1 rounded-lg bg-[#c4c0ff]/20 hover:bg-[#c4c0ff]/30 text-[#dee1f9] text-[11px] font-semibold transition-colors"
          >
            Auto-fill
          </button>
        </div>
      )}

      {/* STEP 1: Phone Number Input */}
      {step === 'phone' && (
        <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#dee1f9]">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#c7c4d8]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 234 567 8900"
                required
                className="w-full bg-[#080c18] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50 transition-colors font-mono"
              />
            </div>
            <span className="text-[11px] text-[#c7c4d8]/60">Include country code prefix (e.g. +1, +44, +91)</span>
          </div>

          <button
            type="submit"
            disabled={isLoading || !phoneNumber.trim()}
            className="gradient-btn w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-aura-glow mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#080c18]" />
            ) : (
              <>
                Send Verification Code
                <ArrowRight className="w-4 h-4 text-[#080c18]" />
              </>
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-[#c7c4d8]/70 hover:text-white transition-colors text-center"
            >
              Cancel
            </button>
          )}
        </form>
      )}

      {/* STEP 2: 6-Digit OTP Entry */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-[#c7c4d8]">
              Sent a 6-digit code to <strong className="text-[#dee1f9] font-mono">{phoneNumber}</strong>
            </p>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setError(null);
              }}
              className="text-[11px] text-[#2fd9f4] hover:underline font-medium"
            >
              Change phone number
            </button>
          </div>

          {/* 6 Segmented PIN Boxes */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-11 h-13 text-center bg-[#080c18] border border-white/15 rounded-xl text-xl font-bold text-[#2fd9f4] outline-none focus:border-[#2fd9f4] focus:ring-2 focus:ring-[#2fd9f4]/20 transition-all font-mono shadow-inner"
              />
            ))}
          </div>

          {/* Expiration Timer & Resend Button */}
          <div className="flex items-center justify-between text-xs text-[#c7c4d8]/80 px-1 pt-1">
            <span>
              Expires in: <strong className="text-[#dee1f9] font-mono">{formatTime(expiresIn)}</strong>
            </span>

            <button
              type="button"
              disabled={resendCooldown > 0 || isLoading}
              onClick={() => handleSendOTP()}
              className="flex items-center gap-1.5 text-[#2fd9f4] hover:underline disabled:opacity-40 disabled:no-underline font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || otpDigits.join('').length !== 6}
            className="gradient-btn w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-aura-glow mt-1 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#080c18]" />
            ) : (
              <>
                Verify OTP Code
                <ShieldCheck className="w-4 h-4 text-[#080c18]" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 3: Verification Success */}
      {step === 'success' && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#2fd9f4]/20 border border-[#2fd9f4]/40 flex items-center justify-center text-[#2fd9f4] shadow-aura-glow">
            <CheckCircle2 className="w-10 h-10 animate-pulse" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-bold text-[#dee1f9]">Verification Successful!</h3>
            <p className="text-xs text-[#c7c4d8]">Phone number {phoneNumber} has been verified.</p>
          </div>
        </div>
      )}
    </div>
  );
};
