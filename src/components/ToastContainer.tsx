import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-3 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            t.type === 'success'
              ? 'bg-[#E0ECE4]/95 border-[#CCD8CF] text-[#1c372b]'
              : t.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-900'
              : t.type === 'warning'
              ? 'bg-amber-50/95 border-amber-200 text-amber-900'
              : t.type === 'loading'
              ? 'bg-[#F2F6F3]/95 border-[#CCD8CF] text-[#264939]'
              : 'bg-white/95 border-[#E6E1D7] text-[#1A2820]'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
            {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
            {t.type === 'loading' && (
              <div className="w-5 h-5 border-2 border-[#264939] border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold leading-snug">{t.title}</h4>
            <p className="text-xs mt-0.5 opacity-90 break-words leading-relaxed">{t.message}</p>
          </div>

          <button
            onClick={() => onClose(t.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
