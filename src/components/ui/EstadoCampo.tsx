import { Cloud, CloudOff, AlertTriangle, Clock } from 'lucide-react';
import { useColaOffline } from '../../hooks/useColaOffline';
import { useRemote } from '../../data/store';
import { useErrorSync } from '../../hooks/useStorage';

/** Explica qué queda en este dispositivo y permite consultar cada envío pendiente. */
export function EstadoCampo() {
  const { online, operaciones, error, cargando } = useColaOffline();
  const errorGuardado = useErrorSync();
  const alerta = error || !!errorGuardado || operaciones.some((op) => op.ultimoError);
  const Icono = alerta ? AlertTriangle : online ? Cloud : CloudOff;
  const titulo = !useRemote ? 'Modo local: datos en este dispositivo'
    : error ? 'No se pudo comprobar la cola local'
    : cargando ? 'Comprobando cambios pendientes…'
    : operaciones.length ? `${operaciones.length} cambio${operaciones.length === 1 ? '' : 's'} pendiente${operaciones.length === 1 ? '' : 's'} de envío`
    : !online ? 'Sin señal · sin cambios en cola'
    : errorGuardado ? 'Hay datos pendientes de comprobar'
    : 'Sin cambios pendientes en la cola local';
  return (
    <section aria-label="Estado de envío" className="rounded-lg border border-line bg-surface p-4" id="estado-envio">
      <div className="flex items-start gap-3" role="status">
        <Icono size={20} className={`shrink-0 mt-0.5 ${alerta || !online ? 'text-warn-strong dark:text-warn' : 'text-brand-600 dark:text-brand-300'}`} />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-content">{titulo}</h2>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {!useRemote ? 'Esta sesión funciona sin servidor.'
              : alerta ? 'Revisá el aviso de sincronización. Los cambios en cola se conservan para revisión.'
              : !online ? 'Podés seguir midiendo los activos cargados. El envío se reintenta al recuperar conexión.'
              : 'Las lecturas conservan la fecha y hora con la que se registraron en campo.'}
          </p>
        </div>
      </div>
      {operaciones.length > 0 && (
        <details className="mt-3 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-semibold text-brand-600 dark:text-brand-300 min-h-[44px]">Ver cambios pendientes ({operaciones.length})</summary>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {operaciones.map((op) => (
              <li key={op.id} className="rounded-md bg-subtle p-3 text-xs">
                <p className="font-bold text-content capitalize">{op.path.split('/').pop()?.replace(/-/g, ' ') || 'Cambio'}</p>
                <p className="text-muted flex items-center gap-1 mt-1"><Clock size={12} /> {new Date(op.creadoEn).toLocaleString('es-AR')}</p>
                {op.ultimoError && <p className="mt-1 text-danger-strong dark:text-danger">{op.ultimoError} {op.intentos >= 5 ? 'Requiere revisión del responsable.' : `Intentos: ${op.intentos}.`}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
