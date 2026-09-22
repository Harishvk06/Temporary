import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`glass-card w-full ${maxWidth} p-6 relative border border-[rgba(248,250,252,0.14)] shadow-2xl ${className}`}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <h3 className="text-lg font-bold text-[#dee1f9]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#c7c4d8] hover:text-[#2fd9f4] hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
