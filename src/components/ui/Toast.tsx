// v1.1.0
// Sistema de Toasts. Provider + hook useToast(). Notificaciones
// efímeras en la esquina, con animación y auto-dismiss.
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const config: Record<ToastVariant, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <CheckCircle2 size={18} className="text-ok" />, accent: 'border-l-ok' },
  error: { icon: <XCircle size={18} className="text-danger" />, accent: 'border-l-danger' },
  warning: { icon: <AlertTriangle size={18} className="text-warn" />, accent: 'border-l-warn' },
  info: { icon: <Info size={18} className="text-brand-600" />, accent: 'border-l-brand-600' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed z-[80] bottom-4 right-4 left-4 sm:left-auto flex flex-col items-end gap-2.5 pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full sm:w-80 flex items-start gap-3 bg-surface border border-line border-l-4 ${config[t.variant].accent} rounded-md shadow-lift px-4 py-3 animate-toast-in`}
          >
            <span className="mt-0.5 shrink-0">{config[t.variant].icon}</span>
            <p className="flex-1 text-sm font-medium text-content leading-snug">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="press text-faint hover:text-content transition-colors shrink-0"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
