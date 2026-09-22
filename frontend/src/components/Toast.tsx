import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-[#2fd9f4]" />,
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 glass-card px-4 py-3 flex items-center gap-3 border border-[#2fd9f4]/30 shadow-aura-glow animate-bounce-short">
      {icons[type]}
      <span className="text-sm font-medium text-[#dee1f9]">{message}</span>
      <button onClick={onClose} className="p-1 text-[#c7c4d8] hover:text-white ml-2">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
