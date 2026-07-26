/**
 * Normaliza VITE_API_URL para que el resto del código pueda asumir una URL
 * absoluta terminada en /api, sin importar cómo se haya cargado el secret:
 * con o sin https://, con o sin /api al final, con o sin barra final.
 *
 *   "api.activaqr.net"            → "https://api.activaqr.net/api"
 *   "https://api.activaqr.net/"   → "https://api.activaqr.net/api"
 *   "https://x.railway.app/api"   → "https://x.railway.app/api"
 */
export function normalizarApiUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let url = raw.trim().replace(/\/+$/, '');
  if (!url) return undefined;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/\/api$/i.test(url)) url = `${url}/api`;
  return url;
}

export const API_URL: string | undefined = normalizarApiUrl(import.meta.env.VITE_API_URL);
