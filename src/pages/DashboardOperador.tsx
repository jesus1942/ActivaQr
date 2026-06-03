// v1.2.0
import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../data/auth';
import { useAuth } from '../context/AuthContext';
import { QrScanner, extraerActivoId } from '../components/QrScanner';
import { ScanLine, ClipboardList, CheckCircle2, AlertTriangle, LogOut, ChevronRight, X } from 'lucide-react';

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
  normal:        'bg-emerald-100 border-emerald-400 text-emerald-700',
  alerta:        'bg-amber-100 border-amber-400 text-amber-700',
  critico:       'bg-red-100 border-red-500 text-red-700',
  mantenimiento: 'bg-blue-100 border-blue-400 text-blue-700',
};

const OP_BADGE: Record<string, string> = {
  operativo:       'bg-emerald-50 border-emerald-300 text-emerald-700',
  mantenimiento:   'bg-blue-50 border-blue-300 text-blue-700',
  pausa:           'bg-amber-50 border-amber-300 text-amber-700',
  montaje:         'bg-purple-50 border-purple-300 text-purple-700',
  fuera_servicio:  'bg-red-50 border-red-300 text-red-700',
};

const PRIORIDAD_BADGE: Record<string, string> = {
  baja:   'bg-slate-100 border-slate-300 text-slate-600',
  media:  'bg-amber-100 border-amber-400 text-amber-700',
  alta:   'bg-red-100 border-red-400 text-red-700',
  urgente:'bg-red-600 border-red-700 text-white',
};

const VIBRACION_OPTS: FormMedicion['vibracion'][] = ['ninguna', 'leve', 'moderada', 'alta'];
const inputCls = 'w-full border-2 border-slate-300 px-3 h-12 text-base outline-none focus:border-orange-500 bg-white';
const labelCls = 'block text-xs font-black uppercase tracking-wider text-slate-600 mb-1';

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
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [notasOT, setNotasOT] = useState('');

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
    setExito(false);
    setErrorForm(null);
    setVista('medicion');
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
    try {
      const body: Record<string, unknown> = {
        activoId: activoSeleccionado.id,
        vibracion: form.vibracion,
        observaciones: form.observaciones || undefined,
      };
      if (form.temperatura !== '') body.temperatura = parseFloat(form.temperatura);
      if (form.amperaje !== '') body.amperaje = parseFloat(form.amperaje);
      if (form.presion !== '') body.presion = parseFloat(form.presion);

      const res = await apiFetch('mediciones', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar');
      setExito(true);
      setActivos(prev => prev.map(a => a.id === activoSeleccionado.id
        ? { ...a, estado: data.estado ?? a.estado, mediciones: [{ fecha: data.fecha ?? new Date().toISOString() }] }
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
    try {
      const res = await apiFetch(`tareas/${tareaSeleccionada.id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: 'completado', observaciones: notasOT || undefined, fechaRealizada: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cerrar OT');
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
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-slate-900 text-white px-5 py-4 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-orange-400 mb-0.5">Registrar medición</p>
              <h1 className="font-black text-xl leading-tight">{activoSeleccionado.nombre}</h1>
              <p className="text-sm text-slate-300">{activoSeleccionado.codigo} · {activoSeleccionado.sector?.nombre}</p>
            </div>
            <button onClick={() => { setVista('activos'); setExito(false); }} className="border-2 border-slate-600 p-1.5 text-slate-300 hover:border-slate-300 transition-colors">
              <X size={16} />
            </button>
          </div>

          {exito ? (
            <div className="bg-white border-2 border-emerald-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] p-6 text-center space-y-4">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
              <p className="font-black text-2xl text-emerald-700 uppercase">Registrada</p>
              <p className="text-slate-600 text-sm">La medición fue guardada correctamente.</p>
              <button onClick={() => { setVista('activos'); setExito(false); }} className="w-full min-h-[52px] bg-slate-900 text-white font-black border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] text-base uppercase tracking-wide">
                Volver a la lista
              </button>
            </div>
          ) : (
            <form onSubmit={handleEnviarMedicion} className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] p-5 space-y-4">
              {errorForm && <div className="border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorForm}</div>}
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
                    <label key={v} className={`flex items-center gap-3 border-2 px-3 min-h-[52px] cursor-pointer font-bold text-base capitalize transition-colors ${form.vibracion === v ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-300 text-slate-700'}`}>
                      <input type="radio" name="vibracion" value={v} checked={form.vibracion === v} onChange={() => setForm(p => ({ ...p, vibracion: v }))} className="w-4 h-4" />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} className="w-full border-2 border-slate-300 px-3 py-2 text-base outline-none focus:border-orange-500 bg-white min-h-[80px] resize-none" placeholder="Novedades, ruidos, olores, anomalías..." />
              </div>
              <button type="submit" disabled={enviando} className="w-full min-h-[52px] bg-orange-500 text-white font-black border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] text-base uppercase tracking-wide disabled:opacity-50">
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
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-slate-900 text-white px-5 py-4 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-orange-400 mb-0.5">Cerrar orden de trabajo</p>
              <h1 className="font-black text-xl leading-tight">OT-{String(tareaSeleccionada.numero).padStart(5, '0')}</h1>
              <p className="text-sm text-slate-300">{tareaSeleccionada.activo.nombre} · {tareaSeleccionada.tipo}</p>
            </div>
            <button onClick={() => { setVista('tareas'); setExito(false); }} className="border-2 border-slate-600 p-1.5 text-slate-300 hover:border-slate-300 transition-colors">
              <X size={16} />
            </button>
          </div>

          {exito ? (
            <div className="bg-white border-2 border-emerald-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] p-6 text-center space-y-4">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
              <p className="font-black text-2xl text-emerald-700 uppercase">OT cerrada</p>
              <p className="text-slate-600 text-sm">La orden de trabajo fue marcada como completada.</p>
              <button onClick={() => { setVista('tareas'); setExito(false); }} className="w-full min-h-[52px] bg-slate-900 text-white font-black border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] text-base uppercase tracking-wide">
                Volver a tareas
              </button>
            </div>
          ) : (
            <form onSubmit={handleCerrarOT} className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] p-5 space-y-4">
              <div className="text-sm text-slate-700 space-y-1">
                <p><span className="font-bold">Descripción:</span> {tareaSeleccionada.descripcion}</p>
                <p><span className="font-bold">Programada:</span> {tareaSeleccionada.fechaProgramada.slice(0, 10)}</p>
              </div>
              {errorForm && <div className="border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorForm}</div>}
              <div>
                <label className={labelCls}>Notas del trabajo realizado <span className="font-normal lowercase text-slate-400">(opcional)</span></label>
                <textarea value={notasOT} onChange={e => setNotasOT(e.target.value)} className="w-full border-2 border-slate-300 px-3 py-2 text-base outline-none focus:border-orange-500 bg-white min-h-[100px] resize-none" placeholder="Describí lo que se hizo, materiales usados, observaciones..." />
              </div>
              <button type="submit" disabled={enviando} className="w-full min-h-[52px] bg-orange-500 text-white font-black border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] text-base uppercase tracking-wide disabled:opacity-50">
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
    <div className="min-h-screen bg-slate-100">
      {scannerAbierto && (
        <QrScanner onResult={onQrResult} onClose={() => setScannerAbierto(false)} />
      )}

      {/* Header */}
      <div className="bg-slate-900 text-white px-5 py-4 border-b-2 border-slate-900 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-orange-400">ActivaQR · Operador</p>
          <p className="font-black text-lg leading-tight">{usuario?.nombre}</p>
          <p className="text-xs text-slate-400">{usuario?.empresa?.nombre}</p>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 border-2 border-slate-600 text-slate-300 px-3 py-2 text-xs font-bold uppercase hover:border-slate-300 transition-colors">
          <LogOut size={13} /> Salir
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-slate-800 bg-white">
        {[
          { id: 'activos' as Vista, label: 'Activos', count: activos.length },
          { id: 'tareas' as Vista, label: 'Mis tareas', count: tareas.length, alerta: tareasVencidas > 0 },
        ].map(({ id, label, count, alerta }) => (
          <button
            key={id}
            onClick={() => setVista(id)}
            className={`flex-1 py-3 text-sm font-black uppercase tracking-wider border-r-2 border-slate-200 last:border-r-0 transition-colors relative ${vista === id ? 'bg-orange-500 text-white border-b-2 border-orange-500' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${vista === id ? 'bg-white/20' : alerta ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
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
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white min-h-[52px] font-black text-base uppercase border-2 border-slate-900 shadow-[4px_4px_0px_0px_#f97316] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#f97316] transition-all"
          >
            <ScanLine size={20} />
            Escanear QR del equipo
          </button>
        )}

        {error && (
          <div className="border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {cargando ? (
          <p className="text-slate-400 font-semibold text-center py-8">Cargando...</p>
        ) : vista === 'activos' ? (
          /* Lista de activos */
          activos.length === 0 ? (
            <p className="text-slate-400 text-sm italic text-center py-8">No hay activos registrados.</p>
          ) : (
            <div className="space-y-3">
              {activos.map(activo => {
                const ultima = activo.mediciones?.[0];
                return (
                  <div key={activo.id} className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wider text-orange-500">{activo.codigo}</p>
                        <h3 className="font-black text-lg text-slate-900 leading-tight">{activo.nombre}</h3>
                        <p className="text-xs text-slate-400">{activo.sector?.nombre}{activo.tipo ? ` · ${activo.tipo.nombre}` : ''}</p>
                      </div>
                      <span className={`text-xs font-black uppercase px-2 py-1 border-2 whitespace-nowrap flex-shrink-0 ${ESTADO_BADGE[activo.estado] ?? 'bg-slate-100 border-slate-300 text-slate-600'}`}>
                        {activo.estadoOperativo === 'mantenimiento' ? 'mantenimiento' : activo.estado}
                      </span>
                    </div>
                    {activo.estadoOperativo && activo.estadoOperativo !== 'operativo' && (
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 border mb-3 ${OP_BADGE[activo.estadoOperativo] ?? ''}`}>
                        {activo.estadoOperativo.replace('_', ' ')}
                      </span>
                    )}
                    {ultima && (
                      <p className="text-xs text-slate-400 mb-3">Última medición: {ultima.fecha.slice(0, 10)}</p>
                    )}
                    <button
                      onClick={() => abrirMedicion(activo)}
                      className="w-full min-h-[48px] bg-orange-500 text-white font-black border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] text-sm uppercase tracking-wide hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
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
              <p className="font-black text-slate-600 uppercase">Sin tareas pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tareas.map(tarea => (
                <div key={tarea.id} className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-400 uppercase">OT-{String(tarea.numero).padStart(5, '0')} · {tarea.tipo}</p>
                      <h3 className="font-bold text-slate-900 leading-snug">{tarea.descripcion}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{tarea.activo.codigo} — {tarea.activo.nombre}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {tarea.prioridad && (
                        <span className={`text-xs font-black uppercase px-2 py-0.5 border-2 ${PRIORIDAD_BADGE[tarea.prioridad] ?? ''}`}>
                          {tarea.prioridad}
                        </span>
                      )}
                      <span className={`text-xs font-bold px-2 py-0.5 border ${tarea.estado === 'vencido' ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-300 bg-slate-50 text-slate-600'}`}>
                        {tarea.estado === 'vencido' ? 'VENCIDA' : tarea.fechaProgramada.slice(0, 10)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => abrirCerrarOT(tarea)}
                    className="w-full flex items-center justify-center gap-2 min-h-[44px] bg-slate-900 text-white font-black border-2 border-slate-900 text-sm uppercase tracking-wide shadow-[3px_3px_0px_0px_#f97316]"
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
