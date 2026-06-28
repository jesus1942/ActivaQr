// v1.2.0
import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, apiPostOffline, apiPutOffline } from '../data/auth';
import { useAuth } from '../context/AuthContext';
import { QrScanner, extraerActivoId } from '../components/QrScanner';
import { SyncBadge } from '../components/ui/SyncBadge';
import { extraerEvidencia, EvidenciaForense } from '../data/evidenciaForense';
import { DiagnosticoSugerido } from '../components/DiagnosticoSugerido';
import { ScanLine, ClipboardList, CheckCircle2, AlertTriangle, LogOut, ChevronRight, X, CloudOff, Camera, ShieldCheck } from 'lucide-react';

const MAX_DIM_FOTO = 1280;

async function comprimirFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > MAX_DIM_FOTO || height > MAX_DIM_FOTO) {
          const ratio = Math.min(MAX_DIM_FOTO / width, MAX_DIM_FOTO / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo crear canvas'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('Imagen invalida'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

interface Activo {
  id: string;
  codigo: string;
  nombre: string;
  estado: string;
  estadoOperativo: string;
  sector?: { nombre: string };
  tipo?: { nombre: string };
  mediciones: { fecha: string }[];
}

interface Tarea {
  id: string;
  numero: number;
  tipo: string;
  descripcion: string;
  estado: string;
  prioridad?: string;
  fechaProgramada: string;
  activo: { codigo: string; nombre: string };
}

interface FormMedicion {
  temperatura: string;
  amperaje: string;
  presion: string;
  vibracion: 'ninguna' | 'leve' | 'moderada' | 'alta';
  observaciones: string;
}

const ESTADO_BADGE: Record<string, string> = {
  normal:        'bg-ok/10 border-ok text-ok-strong dark:text-ok',
  alerta:        'bg-warn/10 border-warn text-warn-strong dark:text-warn',
  critico:       'bg-danger/10 border-danger text-danger-strong dark:text-danger',
  mantenimiento: 'bg-brand-50 dark:bg-brand-600/15 border-brand-600 text-brand-700 dark:text-brand-300',
};

const OP_BADGE: Record<string, string> = {
  operativo:       'bg-ok/10 border-ok text-ok-strong dark:text-ok',
  mantenimiento:   'bg-brand-50 dark:bg-brand-600/15 border-brand-600 text-brand-700 dark:text-brand-300',
  pausa:           'bg-warn/10 border-warn text-warn-strong dark:text-warn',
  montaje:         'bg-violet-500/10 border-violet-400 text-violet-600 dark:text-violet-300',
  fuera_servicio:  'bg-danger/10 border-danger text-danger-strong dark:text-danger',
};

const PRIORIDAD_BADGE: Record<string, string> = {
  baja:   'bg-subtle border-line text-muted',
  media:  'bg-warn/10 border-warn text-warn-strong dark:text-warn',
  alta:   'bg-danger/10 border-danger text-danger-strong dark:text-danger',
  urgente:'bg-danger border-danger text-white',
};

const VIBRACION_OPTS: FormMedicion['vibracion'][] = ['ninguna', 'leve', 'moderada', 'alta'];
const inputCls = 'w-full border border-line px-3 h-12 text-base outline-none focus:border-brand-600 bg-surface';
const labelCls = 'block text-xs font-black uppercase tracking-wider text-muted mb-1';

type Vista = 'activos' | 'tareas' | 'medicion' | 'cerrar_ot';

export const DashboardOperador: React.FC = () => {
  const { usuario, logout } = useAuth();
  const [vista, setVista] = useState<Vista>('activos');
  const [activos, setActivos] = useState<Activo[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scannerAbierto, setScannerAbierto] = useState(false);

  const [activoSeleccionado, setActivoSeleccionado] = useState<Activo | null>(null);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<Tarea | null>(null);
  const [form, setForm] = useState<FormMedicion>({ temperatura: '', amperaje: '', presion: '', vibracion: 'ninguna', observaciones: '' });
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [guardadoOffline, setGuardadoOffline] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [notasOT, setNotasOT] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [evidenciaFoto, setEvidenciaFoto] = useState<EvidenciaForense | null>(null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [rActivos, rTareas] = await Promise.all([
        apiFetch('activos').then(r => r.json()),
        apiFetch('tareas').then(r => r.json()),
      ]);
      if (Array.isArray(rActivos)) setActivos(rActivos);
      if (Array.isArray(rTareas)) setTareas(rTareas.filter((t: Tarea) => t.estado !== 'completado'));
    } catch (e) {
      setError('Error al cargar datos. Revisá tu conexión.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const abrirMedicion = (activo: Activo) => {
    setActivoSeleccionado(activo);
    setForm({ temperatura: '', amperaje: '', presion: '', vibracion: 'ninguna', observaciones: '' });
    setFoto(null);
    setEvidenciaFoto(null);
    setExito(false);
    setErrorForm(null);
    setVista('medicion');
  };

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProcesandoFoto(true);
    setErrorForm(null);
    try {
      // Extraer evidencia del archivo ORIGINAL antes de comprimir (la compresion
      // descarta EXIF). Si no hay GPS en la imagen, intenta navigator.geolocation.
      const evidencia = await extraerEvidencia(file).catch(() => null);
      const dataUrl = await comprimirFoto(file);
      setFoto(dataUrl);
      setEvidenciaFoto(evidencia);
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo procesar la foto.');
    } finally {
      setProcesandoFoto(false);
    }
  };

  const abrirCerrarOT = (tarea: Tarea) => {
    setTareaSeleccionada(tarea);
    setNotasOT('');
    setExito(false);
    setErrorForm(null);
    setVista('cerrar_ot');
  };

  const onQrResult = (texto: string) => {
    setScannerAbierto(false);
    const id = extraerActivoId(texto);
    if (!id) { setError('QR no reconocido.'); return; }
    const activo = activos.find(a => a.id === id);
    if (!activo) { setError('Activo no encontrado en esta empresa.'); return; }
    abrirMedicion(activo);
  };

  const handleEnviarMedicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activoSeleccionado) return;
    setEnviando(true);
    setErrorForm(null);
    setGuardadoOffline(false);
    try {
      const body: Record<string, unknown> = {
        activoId: activoSeleccionado.id,
        vibracion: form.vibracion,
        observaciones: form.observaciones || undefined,
      };
      if (form.temperatura !== '') body.temperatura = parseFloat(form.temperatura);
      if (form.amperaje !== '') body.amperaje = parseFloat(form.amperaje);
      if (form.presion !== '') body.presion = parseFloat(form.presion);
      if (foto) {
        body.fotos = [{
          url: foto,
          capturedLat: evidenciaFoto?.capturedLat,
          capturedLng: evidenciaFoto?.capturedLng,
          capturedAt: evidenciaFoto?.capturedAt,
          deviceModel: evidenciaFoto?.deviceModel,
          fuenteUbicacion: evidenciaFoto?.fuenteUbicacion,
        }];
      }

      const resultado = await apiPostOffline<{ estado?: string; fecha?: string }>('mediciones', body);
      if (resultado.encolada) {
        // Sin senal: la medicion quedo en el celular y se enviara cuando vuelva.
        setGuardadoOffline(true);
        setExito(true);
        return;
      }
      setExito(true);
      setActivos(prev => prev.map(a => a.id === activoSeleccionado.id
        ? { ...a, estado: resultado.data?.estado ?? a.estado, mediciones: [{ fecha: resultado.data?.fecha ?? new Date().toISOString() }] }
        : a
      ));
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setEnviando(false);
    }
  };

  const handleCerrarOT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareaSeleccionada) return;
    setEnviando(true);
    setErrorForm(null);
    setGuardadoOffline(false);
    try {
      const resultado = await apiPutOffline(`tareas/${tareaSeleccionada.id}`, {
        estado: 'completado',
        observaciones: notasOT || undefined,
        fechaRealizada: new Date().toISOString(),
      });
      if (resultado.encolada) {
        setGuardadoOffline(true);
      }
      setExito(true);
      setTareas(prev => prev.filter(t => t.id !== tareaSeleccionada.id));
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al cerrar OT');
    } finally {
      setEnviando(false);
    }
  };

  const tareasVencidas = tareas.filter(t => t.estado === 'vencido').length;

  // ── Vista: registrar medición ─────────────────────────────────
  if (vista === 'medicion' && activoSeleccionado) {
    return (
      <div className="min-h-screen bg-subtle">
        <SyncBadge />
        <div className="max-w-lg mx-auto space-y-4 px-4 py-6">
          <div className="bg-slate-900 text-white px-5 py-4 border border-line shadow-soft flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-brand-400 mb-0.5">Registrar medición</p>
              <h1 className="font-black text-xl leading-tight">{activoSeleccionado.nombre}</h1>
              <p className="text-sm text-slate-300">{activoSeleccionado.codigo} · {activoSeleccionado.sector?.nombre}</p>
            </div>
            <button onClick={() => { setVista('activos'); setExito(false); }} className="border border-slate-600 p-1.5 text-slate-300 hover:border-line transition-colors">
              <X size={16} />
            </button>
          </div>

          {exito ? (
            guardadoOffline ? (
              <div className="bg-surface border border-line shadow-soft p-6 text-center space-y-4">
                <CloudOff size={40} className="mx-auto text-muted" />
                <p className="font-black text-2xl text-content uppercase">Guardada offline</p>
                <p className="text-muted text-sm">
                  No habia conexion. La medición quedó en tu celular y se va a enviar sola cuando agarres senal.
                </p>
                <button onClick={() => { setVista('activos'); setExito(false); setGuardadoOffline(false); }} className="w-full min-h-[52px] bg-slate-900 text-white font-black border border-line shadow-soft text-base uppercase tracking-wide">
                  Seguir trabajando
                </button>
              </div>
            ) : (
              <div className="bg-surface border border-ok shadow-soft p-6 text-center space-y-4">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="font-black text-2xl text-ok-strong dark:text-ok uppercase">Registrada</p>
                <p className="text-muted text-sm">La medición fue guardada correctamente.</p>
                <button onClick={() => { setVista('activos'); setExito(false); }} className="w-full min-h-[52px] bg-slate-900 text-white font-black border border-line shadow-soft text-base uppercase tracking-wide">
                  Volver a la lista
                </button>
              </div>
            )
          ) : (
            <form onSubmit={handleEnviarMedicion} className="bg-surface border border-line shadow-soft p-5 space-y-4">
              {errorForm && <div className="border border-danger bg-danger/10 px-4 py-3 text-sm font-semibold text-danger-strong dark:text-danger">{errorForm}</div>}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'temperatura', label: 'Temperatura (°C)', placeholder: '25.0' },
                  { key: 'amperaje', label: 'Amperaje (A)', placeholder: '10.0' },
                  { key: 'presion', label: 'Presión (bar)', placeholder: '1.5' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input type="number" step="0.1" value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className={inputCls} placeholder={placeholder} />
                  </div>
                ))}
              </div>
              <div>
                <label className={labelCls}>Vibración</label>
                <div className="grid grid-cols-2 gap-2">
                  {VIBRACION_OPTS.map(v => (
                    <label key={v} className={`flex items-center gap-3 border px-3 min-h-[52px] cursor-pointer font-bold text-base capitalize transition-colors ${form.vibracion === v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line text-content'}`}>
                      <input type="radio" name="vibracion" value={v} checked={form.vibracion === v} onChange={() => setForm(p => ({ ...p, vibracion: v }))} className="w-4 h-4" />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} className="w-full border border-line px-3 py-2 text-base outline-none focus:border-brand-600 bg-surface min-h-[80px] resize-none" placeholder="Novedades, ruidos, olores, anomalías..." />
              </div>

              {/* Foto con captura forense */}
              <div>
                <label className={labelCls}>Foto del equipo <span className="font-normal lowercase text-faint">(opcional, con evidencia GPS)</span></label>
                {!foto ? (
                  <label className="w-full flex items-center justify-center gap-2 border border-dashed border-line px-3 py-4 min-h-[64px] cursor-pointer hover:border-brand-600 transition-colors">
                    <input type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
                    <Camera size={20} className="text-muted" />
                    <span className="text-sm font-bold text-muted uppercase tracking-wide">
                      {procesandoFoto ? 'Leyendo metadatos...' : 'Tomar foto'}
                    </span>
                  </label>
                ) : (
                  <div className="border border-line p-2 space-y-2">
                    <div className="relative">
                      <img src={foto} alt="Adjunto" className="max-w-full max-h-48 mx-auto border border-line" />
                      <button
                        type="button"
                        onClick={() => { setFoto(null); setEvidenciaFoto(null); }}
                        className="absolute top-1 right-1 bg-slate-900/80 text-white p-1 hover:bg-danger transition-colors"
                        title="Quitar foto"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {evidenciaFoto && evidenciaFoto.fuenteUbicacion !== 'ninguna' && (
                      <div className={`text-xs px-2 py-1.5 flex items-center gap-1.5 ${evidenciaFoto.fuenteUbicacion === 'exif' ? 'bg-ok/10 text-ok-strong dark:text-ok border border-ok' : 'bg-warn/10 text-warn-strong dark:text-warn border border-warn'}`}>
                        <ShieldCheck size={12} />
                        <span className="font-bold uppercase tracking-wider">
                          {evidenciaFoto.fuenteUbicacion === 'exif' ? 'EXIF verificado' : 'Ubicacion del navegador'}
                        </span>
                        {evidenciaFoto.capturedLat != null && evidenciaFoto.capturedLng != null && (
                          <span className="font-mono ml-auto">{evidenciaFoto.capturedLat.toFixed(4)}, {evidenciaFoto.capturedLng.toFixed(4)}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Diagnostico asistido: sugiere fallas tipicas segun lo que el operario ya cargo */}
              <DiagnosticoSugerido activoId={activoSeleccionado.id} sintomas={{
                temperatura: form.temperatura,
                amperaje: form.amperaje,
                presion: form.presion,
                vibracion: form.vibracion,
                observaciones: form.observaciones,
              }} />

              <button type="submit" disabled={enviando || procesandoFoto} className="w-full min-h-[52px] bg-brand-600 text-white font-black border border-line shadow-soft text-base uppercase tracking-wide disabled:opacity-50">
                {enviando ? 'Guardando...' : 'Registrar medición'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── Vista: cerrar OT ──────────────────────────────────────────
  if (vista === 'cerrar_ot' && tareaSeleccionada) {
    return (
      <div className="min-h-screen bg-subtle">
        <SyncBadge />
        <div className="max-w-lg mx-auto space-y-4 px-4 py-6">
          <div className="bg-slate-900 text-white px-5 py-4 border border-line shadow-soft flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-brand-400 mb-0.5">Cerrar orden de trabajo</p>
              <h1 className="font-black text-xl leading-tight">OT-{String(tareaSeleccionada.numero).padStart(5, '0')}</h1>
              <p className="text-sm text-slate-300">{tareaSeleccionada.activo.nombre} · {tareaSeleccionada.tipo}</p>
            </div>
            <button onClick={() => { setVista('tareas'); setExito(false); }} className="border border-slate-600 p-1.5 text-slate-300 hover:border-line transition-colors">
              <X size={16} />
            </button>
          </div>

          {exito ? (
            guardadoOffline ? (
              <div className="bg-surface border border-line shadow-soft p-6 text-center space-y-4">
                <CloudOff size={40} className="mx-auto text-muted" />
                <p className="font-black text-2xl text-content uppercase">Cierre offline</p>
                <p className="text-muted text-sm">No habia conexion. El cierre quedó en tu celular y se va a confirmar al servidor cuando agarres senal.</p>
                <button onClick={() => { setVista('tareas'); setExito(false); setGuardadoOffline(false); }} className="w-full min-h-[52px] bg-slate-900 text-white font-black border border-line shadow-soft text-base uppercase tracking-wide">
                  Volver a tareas
                </button>
              </div>
            ) : (
              <div className="bg-surface border border-ok shadow-soft p-6 text-center space-y-4">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="font-black text-2xl text-ok-strong dark:text-ok uppercase">OT cerrada</p>
                <p className="text-muted text-sm">La orden de trabajo fue marcada como completada.</p>
                <button onClick={() => { setVista('tareas'); setExito(false); }} className="w-full min-h-[52px] bg-slate-900 text-white font-black border border-line shadow-soft text-base uppercase tracking-wide">
                  Volver a tareas
                </button>
              </div>
            )
          ) : (
            <form onSubmit={handleCerrarOT} className="bg-surface border border-line shadow-soft p-5 space-y-4">
              <div className="text-sm text-content space-y-1">
                <p><span className="font-bold">Descripción:</span> {tareaSeleccionada.descripcion}</p>
                <p><span className="font-bold">Programada:</span> {tareaSeleccionada.fechaProgramada.slice(0, 10)}</p>
              </div>
              {errorForm && <div className="border border-danger bg-danger/10 px-4 py-3 text-sm font-semibold text-danger-strong dark:text-danger">{errorForm}</div>}
              <div>
                <label className={labelCls}>Notas del trabajo realizado <span className="font-normal lowercase text-faint">(opcional)</span></label>
                <textarea value={notasOT} onChange={e => setNotasOT(e.target.value)} className="w-full border border-line px-3 py-2 text-base outline-none focus:border-brand-600 bg-surface min-h-[100px] resize-none" placeholder="Describí lo que se hizo, materiales usados, observaciones..." />
              </div>
              <button type="submit" disabled={enviando} className="w-full min-h-[52px] bg-brand-600 text-white font-black border border-line shadow-soft text-base uppercase tracking-wide disabled:opacity-50">
                {enviando ? 'Cerrando...' : 'Confirmar trabajo realizado'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── Vista principal ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-subtle">
      {scannerAbierto && (
        <QrScanner onResult={onQrResult} onClose={() => setScannerAbierto(false)} />
      )}

      <SyncBadge />

      {/* Header */}
      <div className="bg-slate-900 text-white px-5 py-4 border border-line flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-brand-400">ActivaQR · Operador</p>
          <p className="font-black text-lg leading-tight">{usuario?.nombre}</p>
          <p className="text-xs text-faint">{usuario?.empresa?.nombre}</p>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 border border-slate-600 text-slate-300 px-3 py-2 text-xs font-bold uppercase hover:border-line transition-colors">
          <LogOut size={13} /> Salir
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border border-line bg-surface">
        {[
          { id: 'activos' as Vista, label: 'Activos', count: activos.length },
          { id: 'tareas' as Vista, label: 'Mis tareas', count: tareas.length, alerta: tareasVencidas > 0 },
        ].map(({ id, label, count, alerta }) => (
          <button
            key={id}
            onClick={() => setVista(id)}
            className={`flex-1 py-3 text-sm font-black uppercase tracking-wider border-r-2 border-line last:border-r-0 transition-colors relative ${vista === id ? 'bg-brand-600 text-white border-b border-line' : 'text-muted hover:bg-subtle'}`}
          >
            {label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${vista === id ? 'bg-surface/20' : alerta ? 'bg-danger text-white' : 'bg-slate-200 text-muted'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-4">

        {/* Botón QR scanner — solo en pestaña activos */}
        {vista === 'activos' && (
          <button
            onClick={() => setScannerAbierto(true)}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white min-h-[52px] font-black text-base uppercase border border-line shadow-soft hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-soft transition-all"
          >
            <ScanLine size={20} />
            Escanear QR del equipo
          </button>
        )}

        {error && (
          <div className="border border-danger bg-danger/10 px-4 py-3 text-sm font-semibold text-danger-strong dark:text-danger flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {cargando ? (
          <p className="text-faint font-semibold text-center py-8">Cargando...</p>
        ) : vista === 'activos' ? (
          /* Lista de activos */
          activos.length === 0 ? (
            <p className="text-faint text-sm italic text-center py-8">No hay activos registrados.</p>
          ) : (
            <div className="space-y-3">
              {activos.map(activo => {
                const ultima = activo.mediciones?.[0];
                return (
                  <div key={activo.id} className="bg-surface border border-line shadow-soft p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wider text-brand-600">{activo.codigo}</p>
                        <h3 className="font-black text-lg text-content leading-tight">{activo.nombre}</h3>
                        <p className="text-xs text-faint">{activo.sector?.nombre}{activo.tipo ? ` · ${activo.tipo.nombre}` : ''}</p>
                      </div>
                      <span className={`text-xs font-black uppercase px-2 py-1 border whitespace-nowrap flex-shrink-0 ${ESTADO_BADGE[activo.estado] ?? 'bg-subtle border-line text-muted'}`}>
                        {activo.estadoOperativo === 'mantenimiento' ? 'mantenimiento' : activo.estado}
                      </span>
                    </div>
                    {activo.estadoOperativo && activo.estadoOperativo !== 'operativo' && (
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 border mb-3 ${OP_BADGE[activo.estadoOperativo] ?? ''}`}>
                        {activo.estadoOperativo.replace('_', ' ')}
                      </span>
                    )}
                    {ultima && (
                      <p className="text-xs text-faint mb-3">Última medición: {ultima.fecha.slice(0, 10)}</p>
                    )}
                    <button
                      onClick={() => abrirMedicion(activo)}
                      className="w-full min-h-[48px] bg-brand-600 text-white font-black border border-line shadow-soft text-sm uppercase tracking-wide hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                    >
                      Registrar medición
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Lista de tareas/OTs */
          tareas.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
              <p className="font-black text-muted uppercase">Sin tareas pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tareas.map(tarea => (
                <div key={tarea.id} className="bg-surface border border-line shadow-soft p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-faint uppercase">OT-{String(tarea.numero).padStart(5, '0')} · {tarea.tipo}</p>
                      <h3 className="font-bold text-content leading-snug">{tarea.descripcion}</h3>
                      <p className="text-xs text-muted mt-0.5">{tarea.activo.codigo} — {tarea.activo.nombre}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {tarea.prioridad && (
                        <span className={`text-xs font-black uppercase px-2 py-0.5 border ${PRIORIDAD_BADGE[tarea.prioridad] ?? ''}`}>
                          {tarea.prioridad}
                        </span>
                      )}
                      <span className={`text-xs font-bold px-2 py-0.5 border ${tarea.estado === 'vencido' ? 'border-danger bg-danger/10 text-danger-strong dark:text-danger' : 'border-line bg-subtle text-muted'}`}>
                        {tarea.estado === 'vencido' ? 'VENCIDA' : tarea.fechaProgramada.slice(0, 10)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => abrirCerrarOT(tarea)}
                    className="w-full flex items-center justify-center gap-2 min-h-[44px] bg-slate-900 text-white font-black border border-line text-sm uppercase tracking-wide shadow-soft"
                  >
                    <ClipboardList size={15} />
                    Marcar como realizada
                    <ChevronRight size={15} />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
