// v1.1.0
// Sheet (panel deslizante). Por defecto entra desde la derecha en
// desktop y desde abajo en mobile. Para menús, filtros y detalles.
//
// Igual que Modal, se monta con portal en <body>: dentro de un contenedor
// con backdrop-filter o transform, position:fixed deja de referirse a la
// pantalla y el panel termina fuera de vista.
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'right' | 'bottom';
}

export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  title,
  children,
  side = 'right',
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

  const panelPos =
    side === 'right'
      ? 'right-0 top-0 h-full w-full max-w-md rounded-l-xl animate-slide-in-right'
      : 'left-0 right-0 bottom-0 max-h-[88vh] rounded-t-xl animate-slide-up';

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`absolute ${panelPos} bg-surface border border-line shadow-lift flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {side === 'bottom' && (
          <div className="pt-3 flex justify-center">
            <span className="w-10 h-1.5 rounded-full bg-line-strong" />
          </div>
        )}
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
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
};
