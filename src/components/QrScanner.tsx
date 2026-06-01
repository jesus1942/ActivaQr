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
 * Los QR de ActivaQR codifican una URL tipo `.../#/medicion/<id>`
 * (o `.../#/activos/<id>`). Devuelve el id o null.
 */
export function extraerActivoId(texto: string): string | null {
  const match = texto.match(/(?:medicion|activos)\/([^/?#\s]+)/);
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
        className="absolute top-4 right-4 bg-white text-slate-900 p-2 border-2 border-slate-900"
      >
        <X size={22} />
      </button>

      <div className="text-white font-sketch text-xl mb-4 flex items-center gap-2">
        <Camera size={22} /> Escanear QR del activo
      </div>

      {error ? (
        <div className="bg-white border-2 border-slate-900 p-6 max-w-sm text-center shadow-[4px_4px_0px_0px_#f97316]">
          <p className="text-slate-800 font-body">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 bg-orange-500 text-white px-4 py-2 font-sketch font-semibold border-2 border-slate-900"
          >
            Entendido
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full max-w-sm aspect-square object-cover border-4 border-orange-500"
            playsInline
            muted
          />
          <p className="text-slate-300 text-sm mt-3 font-body">
            Apuntá la cámara al código QR del equipo
          </p>
        </>
      )}
    </div>
  );
};
