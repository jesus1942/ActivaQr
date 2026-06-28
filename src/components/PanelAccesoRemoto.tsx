// v1.1
/**
 * Panel de acceso remoto que usa el superadmin para ver activos,
 * abrir su detalle, intervenir registrando mediciones, crear tareas
 * y chatear con un cliente que otorgó permiso.
 */
import React, { useEffect, useState } from 'react';
import { Plus, X, ArrowLeft, Activity, CheckCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import {
  PermisoAcceso, MensajeRemoto,
  getActivosRemoto, getMedicionesRemoto, getMensajesAdmin, enviarMensajeAdmin,
  crearTareaRemota, crearMedicionRemota,
} from '../data/accesoRemotoApi';
import { ChatRemoto } from './ChatRemoto';
import { exportarCsv } from '../utils/exportCsv';

const ESTADO_COLOR: Record<string, string> = {
  normal:        'text-ok-strong dark:text-ok',
  alerta:        'text-warn-strong dark:text-warn',
  critico:       'text-danger-strong dark:text-danger',
  mantenimiento: 'text-brand-700 dark:text-brand-300',
};

const MEDICION_COLOR: Record<string, string> = {
  normal:   'text-ok-strong dark:text-ok',
  revision: 'text-warn-strong dark:text-warn',
  urgente:  'text-danger-strong dark:text-danger',
};

interface Props {
  empresaId: string;
  empresaNombre: string;
  permiso: PermisoAcceso;
  onClose: () => void;
}

const FORM_INICIAL = {
  temperatura: '', amperaje: '', presion: '', voltaje: '',
  porcentajeBateria: '', nivelToner: '', vibracion: 'ninguna', observaciones: '',
};

export const PanelAccesoRemoto: React.FC<Props> = ({ empresaId, empresaNombre, permiso, onClose }) => {
  const [tab, setTab] = useState<'activos' | 'chat'>('activos');
  const [activos, setActivos] = useState<any[]>([]);
  const [mensajes, setMensajes] = useState<MensajeRemoto[]>([]);
  const [cargando, setCargando] = useState(true);

  // Detalle / intervención
  const [activoSel, setActivoSel] = useState<any | null>(null);
  const [mediciones, setMediciones] = useState<any[]>([]);
  const [cargandoMed, setCargandoMed] = useState(false);
  const [form, setForm] = useState({ ...FORM_INICIAL });
  const [guardandoMed, setGuardandoMed] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [errorMed, setErrorMed] = useState<string | null>(null);

  // Tarea
  const [activoTarea, setActivoTarea] = useState<string | null>(null);
  const [formTarea, setFormTarea] = useState({ tipo: '', fechaProgramada: format(new Date(), 'yyyy-MM-dd'), observaciones: '' });
  const [guardandoTarea, setGuardandoTarea] = useState(false);

  const cargarActivos = () => getActivosRemoto(empresaId).then(setActivos);

  useEffect(() => {
    setCargando(true);
    cargarActivos().finally(() => setCargando(false));
  }, [empresaId]);

  useEffect(() => {
    if (tab !== 'chat') return;
    getMensajesAdmin(empresaId).then(setMensajes).catch(() => {});
    const iv = setInterval(() => getMensajesAdmin(empresaId).then(setMensajes).catch(() => {}), 8000);
    return () => clearInterval(iv);
  }, [tab, empresaId]);

  const cargarMediciones = (activoId: string) => {
    setCargandoMed(true);
    getMedicionesRemoto(empresaId, activoId).then(setMediciones).catch(() => setMediciones([])).finally(() => setCargandoMed(false));
  };

  const abrirActivo = (a: any) => {
    setActivoSel(a);
    setForm({ ...FORM_INICIAL });
    setExito(null);
    setErrorMed(null);
    cargarMediciones(a.id);
  };

  const volver = () => {
    setActivoSel(null);
    setMediciones([]);
  };

  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

  const handleIntervenir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activoSel || guardandoMed) return;
    setGuardandoMed(true);
    setExito(null);
    setErrorMed(null);
    try {
      await crearMedicionRemota(empresaId, {
        activoId: activoSel.id,
        temperatura: num(form.temperatura),
        amperaje: num(form.amperaje),
        presion: num(form.presion),
        voltaje: num(form.voltaje),
        porcentajeBateria: num(form.porcentajeBateria),
        nivelToner: num(form.nivelToner),
        vibracion: form.vibracion,
        observaciones: form.observaciones.trim() || undefined,
      });
      setForm({ ...FORM_INICIAL });
      setExito('Medición registrada correctamente.');
      cargarMediciones(activoSel.id);
      const nuevos = await getActivosRemoto(empresaId);
      setActivos(nuevos);
      const actualizado = nuevos.find((x) => x.id === activoSel.id);
      if (actualizado) setActivoSel(actualizado);
    } catch (err: any) {
      setErrorMed(err?.message || 'No se pudo registrar la medición.');
    } finally {
      setGuardandoMed(false);
    }
  };

  const handleCrearTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activoTarea || !formTarea.tipo) return;
    setGuardandoTarea(true);
    try {
      await crearTareaRemota(empresaId, { activoId: activoTarea, ...formTarea });
      setActivoTarea(null);
      setFormTarea({ tipo: '', fechaProgramada: format(new Date(), 'yyyy-MM-dd'), observaciones: '' });
    } finally {
      setGuardandoTarea(false);
    }
  };

  const criticos = activos.filter((a) => a.estado === 'critico').length;
  const alertas  = activos.filter((a) => a.estado === 'alerta').length;

  const inputCls = 'w-full border border-line rounded-md bg-surface text-content px-3 h-10 text-sm outline-none focus:border-brand-600';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-muted mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-2 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-surface border border-line rounded-lg shadow-lift w-full max-w-3xl my-4">

        {/* Header */}
        <div className="bg-surface rounded-t-lg border-b border-line px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider">Acceso remoto</p>
            <h2 className="font-display font-bold text-lg leading-tight text-content">{empresaNombre}</h2>
          </div>
          <button onClick={onClose} className="press grid place-items-center w-9 h-9 rounded-full text-faint hover:text-content hover:bg-subtle transition-colors"><X size={20} /></button>
        </div>

        {/* Resumen */}
        <div className="px-5 py-3 border-b border-line flex gap-4 flex-wrap text-sm items-center">
          <span className="font-semibold text-muted">{activos.length} activos</span>
          {criticos > 0 && <span className="font-semibold text-danger-strong dark:text-danger">{criticos} críticos</span>}
          {alertas > 0  && <span className="font-semibold text-warn-strong dark:text-warn">! {alertas} en alerta</span>}
          <div className="ml-auto flex items-center gap-2">
            {activos.length > 0 && (
              <button
                onClick={() => exportarCsv(`fichas-${empresaNombre.replace(/\s+/g, '-').toLowerCase()}`, activos.map((a) => ({
                  Codigo: a.codigo,
                  Nombre: a.nombre,
                  Sector: a.sector?.nombre ?? '',
                  Tipo: a.tipo?.nombre ?? '',
                  Marca: a.marca ?? '',
                  Modelo: a.modelo ?? '',
                  Ubicacion: a.ubicacion ?? '',
                  Responsable: a.responsable?.nombre ?? '',
                  Estado: a.estado,
                  'Estado Operativo': a.estadoOperativo ?? '',
                  'Fecha Ingreso': a.fechaIngreso ?? '',
                  'Horas Actuales': a.horasActuales ?? '',
                  'Temp Min °C': a.temperaturaMin ?? '',
                  'Temp Max °C': a.temperaturaMax ?? '',
                  'Temp Alerta °C': a.temperaturaAlerta ?? '',
                  'Temp Critica °C': a.temperaturaCritica ?? '',
                  'Amperaje Normal A': a.amperajeNormal ?? '',
                  'Amperaje Alerta A': a.amperajeAlerta ?? '',
                  'Amperaje Critico A': a.amperajeCritico ?? '',
                  'Presion Normal': a.presionNormal ?? '',
                  'Presion Alerta': a.presionAlerta ?? '',
                  'Voltaje Min V': a.voltajeMin ?? '',
                  'Voltaje Max V': a.voltajeMax ?? '',
                  'Bateria Alerta %': a.bateriaAlerta ?? '',
                  'Intervalo Medicion h': a.intervaloMedicionHoras ?? '',
                  'Proximo Mantenimiento': a.proximoMantenimiento ?? '',
                  Notas: a.notas ?? '',
                  'Ultima Temp': a.mediciones?.[0]?.temperatura ?? '',
                  'Ultima Medicion': a.mediciones?.[0] ? format(new Date(a.mediciones[0].fecha), 'dd/MM/yyyy HH:mm') : '',
                })))}
                className="press flex items-center gap-1.5 border border-line-strong rounded-md px-3 py-1.5 text-xs font-semibold text-content hover:border-content transition-colors"
                title="Exportar fichas tecnicas a CSV"
              >
                <Download size={13} /> Exportar fichas
              </button>
            )}
            <span className={`text-xs font-semibold ${
              permiso.estado === 'activo' ? 'text-ok-strong dark:text-ok' : 'text-muted'
            }`}>
              {permiso.estado}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-line">
          {(['activos', 'chat'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); }}
              className={`px-5 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
                tab === t ? 'border-b-2 border-brand-600 text-brand-600' : 'text-muted hover:text-content'
              }`}
            >
              {t === 'activos' ? 'Activos' : 'Chat'}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'activos' && !activoSel && (
            <div className="space-y-2">
              {cargando && <p className="text-sm text-faint animate-pulse py-4 text-center">Cargando activos...</p>}
              {!cargando && activos.length === 0 && <p className="text-sm text-faint text-center py-4">Sin activos registrados.</p>}
              {activos.map((a) => (
                <div
                  key={a.id}
                  onClick={() => abrirActivo(a)}
                  className="border border-line rounded-md p-3 flex items-start justify-between gap-3 hover:border-brand-600 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-muted">{a.codigo}</span>
                      <span className={`text-xs font-semibold uppercase ${ESTADO_COLOR[a.estado] ?? 'text-muted'}`}>
                        {a.estado}
                      </span>
                    </div>
                    <p className="font-semibold text-content text-sm mt-0.5">{a.nombre}</p>
                    <p className="text-xs text-muted">{a.sector?.nombre} · {a.tipo?.nombre}</p>
                    {a.mediciones?.[0] && (
                      <p className="text-xs text-muted mt-1">
                        Última medición: {a.mediciones[0].temperatura != null ? `${a.mediciones[0].temperatura}°C` : ''}
                        {a.mediciones[0].amperaje != null ? ` · ${a.mediciones[0].amperaje}A` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActivoTarea(a.id); }}
                    title="Crear tarea de mantenimiento"
                    className="press flex items-center gap-1 text-xs font-semibold border border-line rounded-md px-2 py-1.5 text-muted hover:border-brand-600 hover:text-brand-600 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <Plus size={12} /> Tarea
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Detalle del activo */}
          {tab === 'activos' && activoSel && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={volver}
                  className="press flex items-center gap-1 text-sm font-semibold border border-line rounded-md px-3 py-1.5 text-muted hover:border-brand-600 hover:text-brand-600 transition-colors"
                >
                  <ArrowLeft size={14} /> Volver
                </button>
                <button
                  onClick={() => setActivoTarea(activoSel.id)}
                  className="press flex items-center gap-1 text-sm font-semibold border border-line rounded-md px-3 py-1.5 text-muted hover:border-brand-600 hover:text-brand-600 transition-colors"
                >
                  <Plus size={14} /> Crear tarea
                </button>
              </div>

              {/* Info del activo */}
              <div className="border border-line rounded-md p-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono font-semibold text-muted">{activoSel.codigo}</span>
                  <span className={`text-xs font-semibold uppercase ${ESTADO_COLOR[activoSel.estado] ?? 'text-muted'}`}>
                    {activoSel.estado}
                  </span>
                </div>
                <p className="font-semibold text-content text-base">{activoSel.nombre}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted mt-2">
                  <p><span className="font-semibold text-content">Sector:</span> {activoSel.sector?.nombre ?? '—'}</p>
                  <p><span className="font-semibold text-content">Tipo:</span> {activoSel.tipo?.nombre ?? '—'}</p>
                  <p><span className="font-semibold text-content">Marca:</span> {activoSel.marca ?? '—'}</p>
                  <p><span className="font-semibold text-content">Modelo:</span> {activoSel.modelo ?? '—'}</p>
                  <p><span className="font-semibold text-content">Ubicación:</span> {activoSel.ubicacion ?? '—'}</p>
                  <p><span className="font-semibold text-content">Responsable:</span> {activoSel.responsable?.nombre ?? '—'}</p>
                </div>
              </div>

              {/* Parámetros operativos */}
              {(activoSel.temperaturaMin != null || activoSel.temperaturaMax != null ||
                activoSel.amperajeNormal != null || activoSel.presionNormal != null ||
                activoSel.temperaturaAlerta != null || activoSel.temperaturaCritica != null) && (
                <div className="border border-line rounded-md p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Parámetros operativos</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
                    {activoSel.temperaturaMin != null && <p><span className="font-semibold text-content">Temp. mín:</span> {activoSel.temperaturaMin}°C</p>}
                    {activoSel.temperaturaMax != null && <p><span className="font-semibold text-content">Temp. máx:</span> {activoSel.temperaturaMax}°C</p>}
                    {activoSel.temperaturaAlerta != null && <p><span className="font-semibold text-content">Temp. alerta:</span> {activoSel.temperaturaAlerta}°C</p>}
                    {activoSel.temperaturaCritica != null && <p><span className="font-semibold text-content">Temp. crítica:</span> {activoSel.temperaturaCritica}°C</p>}
                    {activoSel.amperajeNormal != null && <p><span className="font-semibold text-content">Amperaje normal:</span> {activoSel.amperajeNormal}A</p>}
                    {activoSel.amperajeAlerta != null && <p><span className="font-semibold text-content">Amperaje alerta:</span> {activoSel.amperajeAlerta}A</p>}
                    {activoSel.presionNormal != null && <p><span className="font-semibold text-content">Presión normal:</span> {activoSel.presionNormal}</p>}
                    {activoSel.presionAlerta != null && <p><span className="font-semibold text-content">Presión alerta:</span> {activoSel.presionAlerta}</p>}
                  </div>
                </div>
              )}

              {/* Mediciones recientes */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Mediciones recientes</p>
                {cargandoMed && <p className="text-sm text-faint animate-pulse">Cargando mediciones...</p>}
                {!cargandoMed && mediciones.length === 0 && <p className="text-sm text-faint">Sin mediciones registradas.</p>}
                <div className="space-y-1.5">
                  {mediciones.slice(0, 10).map((m) => (
                    <div key={m.id} className="border border-line rounded-md px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap text-muted">
                        <span className="font-mono text-muted">{format(new Date(m.fecha), 'dd/MM/yy HH:mm')}</span>
                        {m.temperatura != null && <span>{m.temperatura}°C</span>}
                        {m.amperaje != null && <span>{m.amperaje}A</span>}
                        {m.presion != null && <span>{m.presion}p</span>}
                      </div>
                      <span className={`font-semibold uppercase ${MEDICION_COLOR[m.estado] ?? 'text-muted'}`}>{m.estado}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form de intervención */}
              <form onSubmit={handleIntervenir} className="border border-line rounded-md p-3 space-y-3 bg-subtle">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-content">
                  <Activity size={16} className="text-brand-600" /> Intervenir / Registrar medición
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><label className={labelCls}>Temperatura °C</label><input type="number" step="any" value={form.temperatura} onChange={(e) => setForm((p) => ({ ...p, temperatura: e.target.value }))} className={inputCls} /></div>
                  <div><label className={labelCls}>Amperaje A</label><input type="number" step="any" value={form.amperaje} onChange={(e) => setForm((p) => ({ ...p, amperaje: e.target.value }))} className={inputCls} /></div>
                  <div><label className={labelCls}>Presión</label><input type="number" step="any" value={form.presion} onChange={(e) => setForm((p) => ({ ...p, presion: e.target.value }))} className={inputCls} /></div>
                  <div><label className={labelCls}>Voltaje V</label><input type="number" step="any" value={form.voltaje} onChange={(e) => setForm((p) => ({ ...p, voltaje: e.target.value }))} className={inputCls} /></div>
                  <div><label className={labelCls}>% Batería</label><input type="number" step="any" value={form.porcentajeBateria} onChange={(e) => setForm((p) => ({ ...p, porcentajeBateria: e.target.value }))} className={inputCls} /></div>
                  <div><label className={labelCls}>Nivel tóner</label><input type="number" step="any" value={form.nivelToner} onChange={(e) => setForm((p) => ({ ...p, nivelToner: e.target.value }))} className={inputCls} /></div>
                </div>
                <div>
                  <label className={labelCls}>Vibración</label>
                  <select value={form.vibracion} onChange={(e) => setForm((p) => ({ ...p, vibracion: e.target.value }))} className={inputCls}>
                    <option value="ninguna">Ninguna</option>
                    <option value="leve">Leve</option>
                    <option value="moderada">Moderada</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Observaciones</label>
                  <textarea value={form.observaciones} onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} rows={2} className="w-full border border-line rounded-md bg-surface text-content px-3 py-2 text-sm outline-none focus:border-brand-600" />
                </div>
                {errorMed && <p className="text-xs font-semibold text-danger-strong dark:text-danger">{errorMed}</p>}
                {exito && <p className="flex items-center gap-1 text-xs font-semibold text-ok-strong dark:text-ok"><CheckCircle size={14} /> {exito}</p>}
                <div className="flex justify-end">
                  <button type="submit" disabled={guardandoMed} className="press px-4 py-2 bg-brand-600 text-white rounded-md font-semibold text-sm disabled:opacity-50 shadow-soft hover:bg-brand-700 transition-colors">
                    {guardandoMed ? 'Registrando...' : 'Registrar medición'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'chat' && (
            <ChatRemoto
              mensajes={mensajes}
              miRol="superadmin"
              onEnviar={async (payload) => {
                const m = await enviarMensajeAdmin(empresaId, payload);
                setMensajes((prev) => [...prev, m]);
              }}
            />
          )}
        </div>

        {/* Modal crear tarea */}
        {activoTarea && (
          <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-surface border border-line rounded-lg shadow-lift w-full max-w-sm animate-scale-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <h3 className="font-display font-bold text-sm text-content">Nueva tarea de mantenimiento</h3>
                <button onClick={() => setActivoTarea(null)} className="press grid place-items-center w-8 h-8 rounded-full text-faint hover:text-content hover:bg-subtle transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleCrearTarea} className="p-4 space-y-3">
                <div>
                  <label className={labelCls}>Tipo de tarea</label>
                  <input
                    required
                    value={formTarea.tipo}
                    onChange={(e) => setFormTarea((p) => ({ ...p, tipo: e.target.value }))}
                    placeholder="Ej: Lubricación, Revisión eléctrica..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Fecha programada</label>
                  <input
                    type="date"
                    required
                    value={formTarea.fechaProgramada}
                    onChange={(e) => setFormTarea((p) => ({ ...p, fechaProgramada: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Observaciones</label>
                  <textarea
                    value={formTarea.observaciones}
                    onChange={(e) => setFormTarea((p) => ({ ...p, observaciones: e.target.value }))}
                    rows={2}
                    className="w-full border border-line rounded-md bg-surface text-content px-3 py-2 text-sm outline-none focus:border-brand-600"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setActivoTarea(null)} className="press px-4 py-2 border border-line-strong rounded-md font-semibold text-sm text-muted hover:border-content hover:text-content transition-colors">Cancelar</button>
                  <button type="submit" disabled={guardandoTarea} className="press px-4 py-2 bg-brand-600 text-white rounded-md font-semibold text-sm disabled:opacity-50 hover:bg-brand-700 transition-colors">
                    {guardandoTarea ? 'Guardando...' : 'Crear tarea'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
