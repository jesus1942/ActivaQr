/**
 * Comprime una imagen en el cliente antes de subirla.
 *
 * Estas fotos son evidencia tecnica: quien revisa desde la oficina tiene que
 * poder leer la aguja de un manometro, ver una fisura o una perdida de aceite.
 * Por eso se privilegia el detalle sobre el peso — 1600 px al lado mayor con
 * calidad JPEG alta. Una foto de celular de 4 MB queda en ~250-400 KB.
 *
 * Comprimir igual es necesario: sin esto la foto cruda del celular viaja entera
 * (4-8 MB) por la red de la planta y se guarda asi en la base.
 *
 * IMPORTANTE: el canvas descarta los metadatos EXIF. Los datos forenses (GPS,
 * fecha real de captura, modelo del equipo) deben extraerse del archivo
 * ORIGINAL antes de llamar a esta funcion — ver data/evidenciaForense.
 */

/** Fotos de equipos: se revisan buscando detalle. */
const MAX_DIM = 1600;
const JPEG_QUALITY = 0.85;

/** Miniaturas y adjuntos donde no hace falta detalle fino. */
const MAX_DIM_LIVIANA = 1024;
const JPEG_QUALITY_LIVIANA = 0.8;

export interface OpcionesCompresion {
  /** true para adjuntos livianos (chat, avatares). Por defecto, calidad de inspeccion. */
  liviana?: boolean;
}

export function comprimirImagen(file: File | Blob, opciones: OpcionesCompresion = {}): Promise<string> {
  const maxDim = opciones.liviana ? MAX_DIM_LIVIANA : MAX_DIM;
  const calidad = opciones.liviana ? JPEG_QUALITY_LIVIANA : JPEG_QUALITY;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Nunca agrandar: una foto chica se sube tal cual.
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen.'));
        return;
      }
      // Suavizado de calidad alta: al reducir una foto de 12 MP a 1600 px,
      // el remuestreo por defecto pierde bordes finos (fisuras, escalas).
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', calidad));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}
