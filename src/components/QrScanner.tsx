// v1.1.0
import React, { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

/**
 * Escáner de QR usando la cámara del dispositivo.
 * Usa la API nativa BarcodeDetector (Android/Chrome). Si no está
 * disponible (ej: iOS Safari), avisa al usuario para que use la
 * cámara nativa del teléfono.
 */
/**
 * Extrae el id del activo desde el texto de un QR.
 * Los QR de ActivaQR codifican una URL tipo `.../#/ficha/<id>`
 * (o `.../#/medicion/<id>` o `.../#/activos/<id>`). Devuelve el id o null.
 */
export function extraerActivoId(texto: string): string | null {
  const match = texto.match(/(?:ficha|medicion|activos)\/([^/?#\s]+)/);
  return match ? match[1] : null;
}

export const QrScanner: React.FC<{
  onResult: (texto: string) => void;
  onClose: () => void;
}> = ({ onResult, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    const BarcodeDetectorCtor = (window as any).BarcodeDetector;

    async function iniciar() {
      if (!BarcodeDetectorCtor) {
        setError(
          'Tu navegador no permite escanear desde la app. Usá la cámara de tu celular para leer el QR.'
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
        const tick = async () => {
          if (cancelado || !videoRef.current) return;
          try {
            const codigos = await detector.detect(videoRef.current);
            if (codigos && codigos.length > 0) {
              onResult(codigos[0].rawValue as string);
              return;
            }
          } catch {
            // seguir intentando
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setError('No pudimos acceder a la cámara. Revisá los permisos del navegador.');
      }
    }

    iniciar();

    return () => {
      cancelado = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <button
        onClick={onClose}
        className="press absolute top-4 right-4 grid place-items-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X size={22} />
      </button>

      <div className="text-white font-display text-xl mb-4 flex items-center gap-2">
        <Camera size={22} /> Escanear QR del activo
      </div>

      {error ? (
        <div className="bg-surface border border-line rounded-lg p-6 max-w-sm text-center shadow-soft">
          <p className="text-content font-body">{error}</p>
          <button
            onClick={onClose}
            className="press mt-4 bg-brand-600 text-white px-4 py-2 rounded-md font-display font-semibold hover:bg-brand-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full max-w-sm aspect-square object-cover rounded-lg border border-brand-600"
            playsInline
            muted
          />
          <p className="text-white/70 text-sm mt-3 font-body">
            Apuntá la cámara al código QR del equipo
          </p>
        </>
      )}
    </div>
  );
};
