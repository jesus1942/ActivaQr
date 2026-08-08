import React, { useCallback, useEffect, useState } from 'react';
import { Check, FileSignature, MessageSquare, RefreshCw, Send, X } from 'lucide-react';
import {
  listarMisCotizaciones,
  responderCotizacion,
  type Cotizacion,
  type EstadoCotizacion,
} from '../data/cotizacionesApi';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { esSoloLectura } from '../data/permisos';

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
});

const ESTADO_LABEL: Record<EstadoCotizacion, string> = {
  borrador: 'Borrador', enviada: 'Enviada', vista: 'Vista', aceptada: 'Aceptada',
  rechazada: 'Rechazada', vencida: 'Vencida',
};

export const CotizacionesCliente: React.FC = () => {
  const { toast } = useToast();
  const { usuario } = useAuth();
  const soloLectura = esSoloLectura(usuario?.rol);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [respondiendo, setRespondiendo] = useState('');
  const [consultas, setConsultas] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setCotizaciones(await listarMisCotizaciones());
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudieron cargar las cotizaciones.', 'error');
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => { cargar(); }, [cargar]);

  const responder = async (cotizacion: Cotizacion, accion: 'aceptar' | 'rechazar' | 'consultar') => {
    const mensaje = consultas[cotizacion.id]?.trim();
    if (accion === 'consultar' && !mensaje) {
      toast('Escribí tu consulta.', 'warning');
      return;
    }
    setRespondiendo(`${cotizacion.id}:${accion}`);
    try {
      await responderCotizacion(cotizacion.id, accion, mensaje);
      setConsultas((actual) => ({ ...actual, [cotizacion.id]: '' }));
      toast(
        accion === 'aceptar' ? 'Cotización aceptada.' : accion === 'rechazar' ? 'Respuesta enviada.' : 'Consulta enviada a ActivaQR.',
        'success',
      );
      await cargar();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo enviar la respuesta.', 'error');
    } finally {
      setRespondiendo('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight flex items-center gap-3">
            <FileSignature size={32} /> Cotizaciones
          </h1>
          <p className="text-muted text-sm mt-1">Propuestas comerciales enviadas por ActivaQR.</p>
        </div>
        <button onClick={cargar} disabled={cargando} className="min-h-10 flex items-center gap-2 border border-line px-3 text-sm font-bold disabled:opacity-40">
          <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /><span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {!cargando && cotizaciones.length === 0 && (
        <div className="border border-line bg-subtle p-6 max-w-lg">
          <p className="font-black uppercase text-sm text-muted">Sin cotizaciones pendientes</p>
          <p className="text-sm text-muted mt-1">Cuando ActivaQR te envíe una propuesta, aparecerá acá.</p>
        </div>
      )}

      {cotizaciones.map((cotizacion) => (
        <section key={cotizacion.id} className="border border-line bg-surface shadow-soft">
          <div className="p-4 border-b border-line flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-brand-600">{cotizacion.numero}</p>
              <h2 className="font-display font-black text-lg text-content">{cotizacion.concepto}</h2>
              <p className="text-xs text-muted mt-1">Válida hasta {new Date(cotizacion.vigenciaHasta).toLocaleDateString('es-AR')}</p>
            </div>
            <div className="text-right">
              <p className="font-display font-black text-xl text-content">{ARS.format(cotizacion.total)}</p>
              <span className="text-[11px] font-black uppercase text-muted">{ESTADO_LABEL[cotizacion.estado]}</span>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="border border-line bg-subtle p-3 overflow-x-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm text-content">{cotizacion.texto}</pre>
            </div>

            {!soloLectura && !['aceptada', 'rechazada', 'vencida'].includes(cotizacion.estado) && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => responder(cotizacion, 'aceptar')}
                  disabled={!!respondiendo}
                  className="min-h-11 flex items-center justify-center gap-2 border border-ok bg-ok/10 text-ok-strong dark:text-ok text-xs font-black uppercase disabled:opacity-40"
                ><Check size={16} /> Aceptar</button>
                <button
                  onClick={() => responder(cotizacion, 'rechazar')}
                  disabled={!!respondiendo}
                  className="min-h-11 flex items-center justify-center gap-2 border border-danger bg-danger/10 text-danger-strong dark:text-danger text-xs font-black uppercase disabled:opacity-40"
                ><X size={16} /> Rechazar</button>
              </div>
            )}

            {!soloLectura && <div>
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted mb-2"><MessageSquare size={15} /> Conversación</h3>
              <div className="space-y-2 mb-3">
                {cotizacion.mensajes.length === 0 && <p className="text-sm text-faint">Todavía no hay mensajes.</p>}
                {cotizacion.mensajes.map((mensaje) => (
                  <div key={mensaje.id} className={`border p-2 text-sm ${mensaje.autorRol === 'cliente' ? 'border-brand-600 bg-brand-50 dark:bg-brand-600/15 ml-5' : 'border-line bg-subtle mr-5'}`}>
                    <p className="text-[10px] font-black uppercase text-muted">{mensaje.autorNombre} · {new Date(mensaje.creadoEn).toLocaleString('es-AR')}</p>
                    <p className="text-content mt-1 whitespace-pre-wrap">{mensaje.contenido}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={consultas[cotizacion.id] ?? ''}
                  onChange={(event) => setConsultas((actual) => ({ ...actual, [cotizacion.id]: event.target.value }))}
                  rows={2}
                  placeholder={cotizacion.estado === 'vencida' ? 'Pedí una actualización de esta cotización…' : 'Escribí una consulta…'}
                  className="flex-1 border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600 resize-none"
                />
                <button
                  onClick={() => responder(cotizacion, 'consultar')}
                  disabled={!!respondiendo || !consultas[cotizacion.id]?.trim()}
                  className="w-11 grid place-items-center bg-brand-600 text-white border border-line disabled:opacity-40"
                  title="Enviar consulta"
                ><Send size={17} /></button>
              </div>
            </div>}
            {soloLectura && (
              <p className="border border-line bg-subtle px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted">
                Vista de Dirección · las decisiones comerciales corresponden al administrador de la cuenta.
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
};
