import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-12 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          info: <Info className="text-blue-500 shrink-0" size={18} />,
          success: <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />,
          warning: <AlertCircle className="text-amber-500 shrink-0" size={18} />,
          error: <XCircle className="text-rose-500 shrink-0" size={18} />,
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 bg-card/95 backdrop-blur border border-border rounded-xl shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-200"
          >
            {icons[toast.type]}
            <div className="flex-1 text-xs">
              <p className="font-semibold text-foreground">{toast.title}</p>
              {toast.message && (
                <p className="text-muted-foreground mt-0.5 leading-relaxed">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
