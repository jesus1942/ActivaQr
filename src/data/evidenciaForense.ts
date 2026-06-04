/**
 * Extraccion de evidencia forense de fotos cargadas desde el celular.
 *
 * Las fotos sacadas con la camara del celular llevan metadatos EXIF: GPS
 * del momento de la captura, timestamp real, modelo del telefono. Esa info
 * sirve para probar despues 'donde y cuando se hizo realmente la medicion'.
 *
 * Casos de uso:
 *  - Auditoria: el cliente exige prueba de que el tecnico fue al equipo.
 *  - Robo o extravio: la ultima foto con GPS marca la ultima ubicacion conocida.
 *  - Daños por traslado: la foto del origen prueba que salio sano.
 *  - Siniestros: aseguradora cobra mas rapido con evidencia geolocalizada.
 *
 * Si la foto NO tiene EXIF GPS (porque es una captura de pantalla, una foto
 * editada o subida desde galeria sin metadata), intentamos navigator.geolocation
 * como fallback. El campo `fuenteUbicacion` indica cual de las dos fue.
 */
import exifr from 'exifr';

export interface EvidenciaForense {
  capturedLat?: number;
  capturedLng?: number;
  capturedAt?: string; // ISO timestamp
  deviceModel?: string;
  fuenteUbicacion: 'exif' | 'browser' | 'manual' | 'ninguna';
}

interface OpcionesExtraccion {
  /** Si true, no usa navigator.geolocation como fallback. Default false. */
  sinFallbackBrowser?: boolean;
  /** Timeout para navigator.geolocation. Default 3000 ms. */
  timeoutBrowserMs?: number;
}

async function obtenerUbicacionDelNavegador(timeoutMs: number): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: timeoutMs },
    );
  });
}

export async function extraerEvidencia(file: File | Blob, opciones: OpcionesExtraccion = {}): Promise<EvidenciaForense> {
  const resultado: EvidenciaForense = { fuenteUbicacion: 'ninguna' };

  try {
    const exif = await exifr.parse(file, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'GPSLatitude', 'GPSLongitude'],
    });

    if (exif?.GPSLatitude !== undefined && exif?.GPSLongitude !== undefined) {
      resultado.capturedLat = Number(exif.GPSLatitude);
      resultado.capturedLng = Number(exif.GPSLongitude);
      resultado.fuenteUbicacion = 'exif';
    }

    const fechaExif = exif?.DateTimeOriginal ?? exif?.CreateDate;
    if (fechaExif instanceof Date) {
      resultado.capturedAt = fechaExif.toISOString();
    } else if (typeof fechaExif === 'string' && fechaExif.length > 0) {
      const d = new Date(fechaExif);
      if (!Number.isNaN(d.getTime())) resultado.capturedAt = d.toISOString();
    }

    if (exif?.Make || exif?.Model) {
      const marca = (exif?.Make ?? '').toString().trim();
      const modelo = (exif?.Model ?? '').toString().trim();
      resultado.deviceModel = [marca, modelo].filter(Boolean).join(' ').trim() || undefined;
    }
  } catch {
    // Si exifr falla (formato no soportado, archivo dañado), seguimos sin EXIF.
  }

  // Fallback: si no hay GPS por EXIF y el navegador puede dar la ubicacion,
  // usamos la del navegador. Es menos confiable (marca el momento de subida,
  // no el de la foto), pero es mejor que nada.
  if (resultado.fuenteUbicacion === 'ninguna' && !opciones.sinFallbackBrowser) {
    const ubi = await obtenerUbicacionDelNavegador(opciones.timeoutBrowserMs ?? 3000);
    if (ubi) {
      resultado.capturedLat = ubi.lat;
      resultado.capturedLng = ubi.lng;
      resultado.fuenteUbicacion = 'browser';
    }
  }

  return resultado;
}
