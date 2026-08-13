import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCopy,
  FileSignature,
  Mail,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  Send,
} from 'lucide-react';
import { listarEmpresas, type EmpresaAdmin } from '../data/adminApi';
import {
  enviarCotizacion,
  enviarMensajeCotizacionAdmin,
  listarCotizacionesAdmin,
  type CanalCotizacion,
  type Cotizacion,
  type EstadoCotizacion,
} from '../data/cotizacionesApi';
import { CotizadorPlanGestionado } from '../components/CotizadorPlanGestionado';
import { useToast } from '../components/ui/Toast';

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
});

const ESTADOS: Record<EstadoCotizacion, { label: string; clase: string }> = {
  borrador: { label: 'Borrador', clase: 'border-line text-muted bg-subtle' },
  enviada: { label: 'Enviada', clase: 'border-brand-600 text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-600/15' },
  vista: { label: 'Vista', clase: 'border-warn text-warn-strong dark:text-warn bg-warn/10' },
  aceptada: { label: 'Aceptada', clase: 'border-ok text-ok-strong dark:text-ok bg-ok/10' },
  rechazada: { label: 'Rechazada', clase: 'border-danger text-danger-strong dark:text-danger bg-danger/10' },
  vencida: { label: 'Vencida', clase: 'border-line text-faint bg-subtle' },
};

function fecha(valor: string) {
  return new Date(valor).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const BotonCanal: React.FC<{
  icono: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  activo?: boolean;
  title?: string;
}> = ({ icono, children, onClick, disabled, activo, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="min-h-10 flex items-center justify-center gap-1.5 border border-line bg-surface px-3 text-xs font-black uppercase hover:border-brand-600 hover:text-brand-600 disabled:opacity-40 disabled:pointer-events-none"
  >
    <span className={activo ? 'animate-pulse' : ''}>{icono}</span>{children}
  </button>
);

export const CotizacionesAdmin: React.FC = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const empresaInicialId = searchParams.get('empresaId') ?? undefined;
  const cotizacionInicialId = searchParams.get('cotizacion');
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEmpresa, setFiltroEmpresa] = useState(empresaInicialId ?? '');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [enviando, setEnviando] = useState('');
  const [mensajes, setMensajes] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [listaEmpresas, listaCotizaciones] = await Promise.all([
        listarEmpresas(),
        listarCotizacionesAdmin(),
      ]);
      setEmpresas(listaEmpresas);
      setCotizaciones(listaCotizaciones);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudieron cargar las cotizaciones.', 'error');
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => cotizaciones.filter((cotizacion) => (
    (!filtroEmpresa || cotizacion.empresaId === filtroEmpresa)
    && (!filtroEstado || cotizacion.estado === filtroEstado)
  )), [cotizaciones, filtroEmpresa, filtroEstado]);

  const gestionarEnvio = async (cotizacion: Cotizacion, canal: CanalCotizacion) => {
    const clave = `${cotizacion.id}:${canal}`;
    setEnviando(clave);
    const ventana = canal === 'whatsapp' ? window.open('about:blank', '_blank') : null;
    if (ventana) ventana.opener = null;
    try {
      const resultado = await enviarCotizacion(cotizacion.id, canal);
      if (canal === 'whatsapp' && resultado.url) {
        if (ventana) ventana.location.href = resultado.url;
        else window.location.href = resultado.url;
        toast('WhatsApp quedó abierto con la cotización lista. Confirmá el envío allí.', 'info');
      } else {
        const etiqueta = canal === 'plataforma' ? 'publicada en la plataforma' : `enviada por ${canal}`;
        toast(`Cotización ${etiqueta}.`, 'success');
      }
      await cargar();
    } catch (error) {
      ventana?.close();
      toast(error instanceof Error ? error.message : 'No se pudo preparar el envío.', 'error');
    } finally {
      setEnviando('');
    }
  };

  const copiar = async (cotizacion: Cotizacion) => {
    await navigator.clipboard.writeText(cotizacion.texto);
    toast('Cotización copiada.', 'success');
  };

  const responder = async (cotizacion: Cotizacion) => {
    const contenido = mensajes[cotizacion.id]?.trim();
    if (!contenido) return;
    try {
      await enviarMensajeCotizacionAdmin(cotizacion.id, contenido);
      setMensajes((actual) => ({ ...actual, [cotizacion.id]: '' }));
      toast('Respuesta guardada en la plataforma.', 'success');
      await cargar();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo enviar la respuesta.', 'error');
    }
  };

  const pendientes = cotizaciones.filter((cotizacion) => ['vista'].includes(cotizacion.estado)).length;
  const aceptadas = cotizaciones.filter((cotizacion) => cotizacion.estado === 'aceptada').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight flex items-center gap-3">
            <FileSignature size={32} /> Cotizaciones
          </h1>
          <p className="text-muted text-sm mt-1">Creación, envío multicanal y respuestas de tus empresas clientes.</p>
        </div>
        <button
          onClick={cargar}
          disabled={cargando}
          className="min-h-10 flex items-center gap-2 border border-line px-3 text-sm font-bold hover:border-content disabled:opacity-40"
        >
          <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-line bg-surface p-3"><p className="text-[11px] font-black uppercase text-muted">Total</p><p className="text-2xl font-black text-content">{cotizaciones.length}</p></div>
        <div className="border border-warn bg-warn/10 p-3"><p className="text-[11px] font-black uppercase text-warn-strong dark:text-warn">Vistas</p><p className="text-2xl font-black text-content">{pendientes}</p></div>
        <div className="border border-ok bg-ok/10 p-3"><p className="text-[11px] font-black uppercase text-ok-strong dark:text-ok">Aceptadas</p><p className="text-2xl font-black text-content">{aceptadas}</p></div>
        <div className="border border-line bg-surface p-3"><p className="text-[11px] font-black uppercase text-muted">Clientes</p><p className="text-2xl font-black text-content">{empresas.length}</p></div>
      </div>

      <CotizadorPlanGestionado
        empresas={empresas}
        empresaInicialId={empresaInicialId}
        onCreada={(cotizacion) => {
          setCotizaciones((actual) => [cotizacion, ...actual]);
          setFiltroEmpresa(cotizacion.empresaId);
        }}
      />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-display font-black text-xl text-content">Historial</h2>
            <p className="text-sm text-muted">Cada envío y respuesta queda asociado al cliente.</p>
          </div>
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            <select
              value={filtroEmpresa}
              onChange={(event) => setFiltroEmpresa(event.target.value)}
              className="h-10 flex-1 sm:flex-none border border-line bg-surface px-3 text-sm font-semibold"
            >
              <option value="">Todas las empresas</option>
              {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>)}
            </select>
            <select
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
              className="h-10 flex-1 sm:flex-none border border-line bg-surface px-3 text-sm font-semibold"
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS).map(([valor, config]) => <option key={valor} value={valor}>{config.label}</option>)}
            </select>
          </div>
        </div>

        {!cargando && visibles.length === 0 && (
          <div className="border border-line bg-subtle p-6 text-sm text-muted">Todavía no hay cotizaciones con estos filtros.</div>
        )}

        {visibles.map((cotizacion) => {
          const estado = ESTADOS[cotizacion.estado];
          return (
            <details
              key={cotizacion.id}
              open={cotizacion.id === cotizacionInicialId || undefined}
              className="border border-line bg-surface shadow-soft"
            >
              <summary className="list-none cursor-pointer p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-wider text-brand-600">{cotizacion.numero}</p>
                    <h3 className="font-display font-black text-lg text-content truncate">{cotizacion.clienteNombre}</h3>
                    <p className="text-sm text-muted truncate">{cotizacion.concepto}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-black text-lg text-content">{ARS.format(cotizacion.total)}</p>
                    {cotizacion.tipo === 'activa_control' && 'abonoMensual' in cotizacion.detalle && <p className="text-[10px] font-black uppercase text-cyan-700">+ {ARS.format(cotizacion.detalle.abonoMensual)}/mes</p>}
                    <span className={`inline-block border px-2 py-0.5 text-[11px] font-black uppercase ${estado.clase}`}>{estado.label}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted">
                  <span>Creada {fecha(cotizacion.creadaEn)}</span>
                  <span>Vence {fecha(cotizacion.vigenciaHasta)}</span>
                  <span>{cotizacion.contactoNombre || 'Sin contacto asignado'}</span>
                  {cotizacion.mensajes.length > 0 && <span className="font-bold text-brand-600">{cotizacion.mensajes.length} mensaje(s)</span>}
                </div>
              </summary>

              <div className="border-t border-line p-4 space-y-5">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <BotonCanal icono={<CheckCircle2 size={15} />} onClick={() => gestionarEnvio(cotizacion, 'plataforma')} activo={enviando === `${cotizacion.id}:plataforma`}>Plataforma</BotonCanal>
                  <BotonCanal icono={<Mail size={15} />} onClick={() => gestionarEnvio(cotizacion, 'email')} disabled={!cotizacion.contactoEmail || !!enviando} activo={enviando === `${cotizacion.id}:email`} title={!cotizacion.contactoEmail ? 'El cliente no tiene email cargado' : undefined}>Email</BotonCanal>
                  <BotonCanal icono={<MessageCircle size={15} />} onClick={() => gestionarEnvio(cotizacion, 'whatsapp')} disabled={!cotizacion.contactoTelefono || !!enviando} activo={enviando === `${cotizacion.id}:whatsapp`} title={!cotizacion.contactoTelefono ? 'El cliente no tiene WhatsApp cargado' : undefined}>WhatsApp</BotonCanal>
                  <BotonCanal icono={<Send size={15} />} onClick={() => gestionarEnvio(cotizacion, 'telegram')} disabled={!cotizacion.telegramDisponible || !!enviando} activo={enviando === `${cotizacion.id}:telegram`} title={!cotizacion.telegramDisponible ? 'El cliente debe vincular Telegram en Configuración' : undefined}>Telegram</BotonCanal>
                  <BotonCanal icono={<ClipboardCopy size={15} />} onClick={() => copiar(cotizacion)}>Copiar</BotonCanal>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="border border-line bg-subtle p-3 overflow-x-auto">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-content">{cotizacion.texto}</pre>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted mb-2">Historial de envío</h4>
                      {cotizacion.envios.length === 0 ? (
                        <p className="text-sm text-faint">Borrador todavía no enviado.</p>
                      ) : (
                        <div className="space-y-1">
                          {cotizacion.envios.map((envio) => (
                            <div key={envio.id} className="flex justify-between gap-3 border border-line bg-surface px-3 py-2 text-xs">
                              <span className="font-black uppercase">{envio.canal}</span>
                              <span className={envio.estado === 'error' ? 'text-danger' : 'text-muted'}>{envio.estado} · {new Date(envio.creadoEn).toLocaleString('es-AR')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted mb-2"><MessagesSquare size={14} /> Conversación en plataforma</h4>
                      <div className="max-h-48 overflow-y-auto space-y-2 mb-2">
                        {cotizacion.mensajes.length === 0 && <p className="text-sm text-faint">Todavía no hay respuestas.</p>}
                        {cotizacion.mensajes.map((mensaje) => (
                          <div key={mensaje.id} className={`border p-2 text-sm ${mensaje.autorRol === 'superadmin' ? 'border-brand-600 bg-brand-50 dark:bg-brand-600/15 ml-5' : 'border-line bg-subtle mr-5'}`}>
                            <p className="text-[10px] font-black uppercase text-muted">{mensaje.autorNombre} · {new Date(mensaje.creadoEn).toLocaleString('es-AR')}</p>
                            <p className="text-content mt-1 whitespace-pre-wrap">{mensaje.contenido}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          value={mensajes[cotizacion.id] ?? ''}
                          onChange={(event) => setMensajes((actual) => ({ ...actual, [cotizacion.id]: event.target.value }))}
                          rows={2}
                          placeholder="Responder dentro de ActivaQR…"
                          className="flex-1 border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600 resize-none"
                        />
                        <button
                          onClick={() => responder(cotizacion)}
                          disabled={!mensajes[cotizacion.id]?.trim()}
                          className="w-11 grid place-items-center bg-brand-600 text-white border border-line disabled:opacity-40"
                          title="Enviar respuesta"
                        ><Send size={17} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
};
