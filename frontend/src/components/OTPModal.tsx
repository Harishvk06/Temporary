import React from 'react';
import { X } from 'lucide-react';
import { OTPVerification } from './OTPVerification';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (phoneNumber: string) => void;
}

export const OTPModal: React.FC<OTPModalProps> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080c18]/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full bg-[#0e1323] border border-white/20 text-[#c7c4d8] hover:text-white flex items-center justify-center transition-colors shadow-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <OTPVerification
          onSuccess={(phone) => {
            if (onSuccess) onSuccess(phone);
            setTimeout(() => {
              onClose();
            }, 1200);
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
};
