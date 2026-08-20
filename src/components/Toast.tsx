import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bgClass = 'bg-[#191c1e] text-white';
        let Icon = Info;
        let iconColor = 'text-[#57dffe]';

        if (toast.type === 'success') {
          bgClass = 'bg-[#064e3b] text-white border border-[#059669]/40';
          Icon = CheckCircle2;
          iconColor = 'text-[#34d399]';
        } else if (toast.type === 'error') {
          bgClass = 'bg-[#7f1d1d] text-white border border-[#dc2626]/40';
          Icon = AlertCircle;
          iconColor = 'text-[#f87171]';
        } else if (toast.type === 'warning') {
          bgClass = 'bg-[#78350f] text-white border border-[#d97706]/40';
          Icon = AlertTriangle;
          iconColor = 'text-[#fbbf24]';
        } else {
          bgClass = 'bg-[#1e293b] text-white border border-[#334155]';
          Icon = Info;
          iconColor = 'text-[#38bdf8]';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl p-3.5 shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-200 ${bgClass}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold leading-tight">{toast.title}</h4>
              <p className="text-xs text-gray-200 mt-0.5 leading-normal">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
