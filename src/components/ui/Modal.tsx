// v1.1.0
// Modal centrado del Design System. Overlay con blur, panel con
// animación scale-in, cierre por backdrop o Escape.
//
// Se monta con portal en <body>: si queda dentro de un contenedor con
// backdrop-filter o transform (la app tiene varios), position:fixed pasa a
// medirse contra ese contenedor y el dialogo aparece fuera de la pantalla —
// se ve el fondo desenfocado pero hay que buscar el cuadro scrolleando.
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeMap[size]} bg-surface border border-line rounded-xl shadow-lift animate-scale-in max-h-[90vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h2 className="font-display text-lg font-bold text-content">{title}</h2>
            <button
              onClick={onClose}
              className="press grid place-items-center w-9 h-9 rounded-full text-faint hover:text-content hover:bg-subtle transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-line flex justify-end gap-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
};
