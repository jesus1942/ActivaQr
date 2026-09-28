import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listarPendientes, type OperacionPendiente } from '../data/offlineQueue';

/** Observa la cola de esta identidad sin iniciar un segundo proceso de envío. */
export function useColaOffline() {
  const { usuario } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [operaciones, setOperaciones] = useState<OperacionPendiente[]>([]);
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    let activo = true;
    const refrescar = async () => {
      setOnline(navigator.onLine);
      try {
        const filas = usuario?.empresaId
          ? await listarPendientes({ empresaId: usuario.empresaId, usuarioId: usuario.id })
          : [];
        if (activo) {
          setOperaciones(filas.sort((a, b) => a.creadoEn - b.creadoEn));
          setError(false);
        }
      } catch {
        if (activo) setError(true);
      } finally {
        if (activo) setCargando(false);
      }
    };
    setOperaciones([]);
    setCargando(true);
    void refrescar();
    const eventos = ['online', 'offline', 'activaqr:cola-cambiada'];
    eventos.forEach((evento) => window.addEventListener(evento, refrescar));
    const timer = window.setInterval(refrescar, 10000);
    return () => {
      activo = false;
      window.clearInterval(timer);
      eventos.forEach((evento) => window.removeEventListener(evento, refrescar));
    };
  }, [usuario?.empresaId, usuario?.id]);
  return { online, operaciones, error, cargando };
}
