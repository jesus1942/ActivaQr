import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DialogViewportProps {
  children: React.ReactNode;
  className?: string;
  onEscape?: () => void;
}

/**
 * Raíz común para overlays.
 *
 * Se monta directamente en body para que ningún transform, scroll o
 * backdrop-filter de una página pueda desplazar el modal fuera del viewport.
 * Al abrirlo lleva el foco al diálogo y bloquea el scroll que quedó detrás.
 */
export const DialogViewport: React.FC<DialogViewportProps> = ({
  children,
  className = '',
  onEscape,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const onEscapeRef = useRef(onEscape);

  // El callback suele declararse en linea desde el formulario y, por lo tanto,
  // cambia de identidad en cada pulsacion. Conservamos la version mas reciente
  // sin reiniciar el ciclo del dialogo: desmontar y montar este efecto durante
  // la escritura restauraba el foco anterior y expulsaba el cursor del campo.
  onEscapeRef.current = onEscape;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    // Esperar al montaje evita que el navegador conserve una posición de
    // scroll antigua al abrir una guía o un modal desde el final de la página.
    const frame = requestAnimationFrame(() => {
      rootRef.current?.focus({ preventScroll: true });
      rootRef.current?.scrollIntoView({ block: 'center', inline: 'center' });
    });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscapeRef.current?.();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      className={`fixed inset-0 overflow-y-auto overscroll-contain ${className}`}
    >
      {children}
    </div>,
    document.body
  );
};
