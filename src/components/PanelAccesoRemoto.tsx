// v1.1
/**
 * Panel de acceso remoto que usa el superadmin para ver activos,
 * abrir su detalle, intervenir registrando mediciones, crear tareas
 * y chatear con un cliente que otorgó permiso.
 */
import React, { useEffect, useState } from 'react';
import { Plus, X, ArrowLeft, Activity, CheckCircle, Download, Users, ScrollText } from 'lucide-react';
import { format } from 'date-fns';
import {
  PermisoAcceso, MensajeRemoto, PersonalRemoto, ActividadRemoto,
  getActivosRemoto, getMedicionesRemoto, getMensajesAdmin, enviarMensajeAdmin,
  crearTareaRemota, crearMedicionRemota, getPersonalRemoto, getActividadRemoto,
} from '../data/accesoRemotoApi';
import { ChatRemoto } from './ChatRemoto';
import { exportarCsv } from '../utils/exportCsv';
import { exportarResumenActivosPdf } from '../utils/exportPdf';
import { DialogViewport } from './ui/DialogViewport';

const ESTADO_COLOR: Record<string, string> = {
  normal:        'bg-ok/10 border-ok text-ok-strong dark:text-ok',
  alerta:        'bg-warn/10 border-warn text-warn-strong dark:text-warn',
  critico:       'bg-danger/10 border-danger text-danger-strong dark:text-danger',
  mantenimiento: 'bg-brand-50 dark:bg-brand-600/15 border-brand-600 text-brand-700 dark:text-brand-300',
};

const MEDICION_COLOR: Record<string, string> = {
  normal:   'bg-ok/10 border-ok text-ok-strong dark:text-ok',
  revision: 'bg-warn/10 border-warn text-warn-strong dark:text-warn',
  urgente:  'bg-danger/10 border-danger text-danger-strong dark:text-danger',
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
  const [tab, setTab] = useState<'activos' | 'personal' | 'actividad' | 'chat'>('activos');
  const [activos, setActivos] = useState<any[]>([]);
  const [mensajes, setMensajes] = useState<MensajeRemoto[]>([]);
  const [personal, setPersonal] = useState<PersonalRemoto | null>(null);
  const [actividad, setActividad] = useState<ActividadRemoto[]>([]);
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

  useEffect(() => {
    if (tab !== 'personal' || personal) return;
    getPersonalRemoto(empresaId).then(setPersonal).catch(() => {});
  }, [tab, empresaId]);

  useEffect(() => {
    if (tab !== 'actividad' || actividad.length > 0) return;
    getActividadRemoto(empresaId).then(setActividad).catch(() => {});
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

  const inputCls = 'w-full border border-line px-3 h-10 text-sm outline-none focus:border-brand-600';
  const labelCls = 'block text-xs font-black uppercase tracking-wider text-muted mb-1';

  return (
    <DialogViewport className="z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-2 sm:p-6" onEscape={onClose}>
      <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft w-full max-w-3xl my-4">

        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-xs font-black text-brand-400 uppercase tracking-wider">Acceso remoto</p>
            <h2 className="font-black text-lg uppercase leading-tight">{empresaNombre}</h2>
          </div>
          <button onClick={onClose}><X size={22} /></button>
        </div>

        {/* Resumen */}
        <div className="px-5 py-3 border border-line flex gap-4 flex-wrap text-sm items-center">
          <span className="font-semibold text-muted">{activos.length} activos</span>
          {criticos > 0 && <span className="font-black text-danger">{criticos} críticos</span>}
          {alertas > 0  && <span className="font-black text-warn-strong dark:text-warn">! {alertas} en alerta</span>}
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
                className="flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs font-bold hover:border-content transition-colors"
                title="Exportar fichas tecnicas a CSV"
              >
                <Download size={13} /> Exportar fichas
              </button>
            )}
            <span className={`text-xs font-black uppercase px-2 py-1 border ${
              permiso.estado === 'activo' ? 'border-ok text-ok-strong dark:text-ok bg-ok/10' : 'border-line text-muted'
            }`}>
              {permiso.estado}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border border-line overflow-x-auto">
          {([
            { id: 'activos',   label: 'Activos' },
            { id: 'personal',  label: 'Personal' },
            { id: 'actividad', label: 'Actividad' },
            { id: 'chat',      label: 'Chat' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-black uppercase tracking-wide whitespace-nowrap transition-colors ${
                tab === t.id ? 'border-b border-line text-brand-600' : 'text-muted hover:text-content'
              }`}
            >
              {t.label}
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
                  className="border border-line p-3 flex items-start justify-between gap-3 hover:border-brand-600 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-muted">{a.codigo}</span>
                      <span className={`text-xs font-black uppercase px-1.5 py-0.5 border ${ESTADO_COLOR[a.estado] ?? ''}`}>
                        {a.estado}
                      </span>
                    </div>
                    <p className="font-bold text-content text-sm mt-0.5">{a.nombre}</p>
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
                    className="flex items-center gap-1 text-xs font-bold border border-line px-2 py-1.5 hover:border-brand-600 hover:text-brand-600 transition-colors whitespace-nowrap flex-shrink-0"
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
                  className="flex items-center gap-1 text-sm font-bold border border-line px-3 py-1.5 hover:border-brand-600 hover:text-brand-600 transition-colors"
                >
                  <ArrowLeft size={14} /> Volver
                </button>
                <button
                  onClick={() => setActivoTarea(activoSel.id)}
                  className="flex items-center gap-1 text-sm font-bold border border-line px-3 py-1.5 hover:border-brand-600 hover:text-brand-600 transition-colors"
                >
                  <Plus size={14} /> Crear tarea
                </button>
              </div>

              {/* Info del activo */}
              <div className="border border-line p-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono font-bold text-muted">{activoSel.codigo}</span>
                  <span className={`text-xs font-black uppercase px-1.5 py-0.5 border ${ESTADO_COLOR[activoSel.estado] ?? ''}`}>
                    {activoSel.estado}
                  </span>
                </div>
                <p className="font-black text-content text-base">{activoSel.nombre}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted mt-2">
                  <p><span className="font-bold">Sector:</span> {activoSel.sector?.nombre ?? '—'}</p>
                  <p><span className="font-bold">Tipo:</span> {activoSel.tipo?.nombre ?? '—'}</p>
                  <p><span className="font-bold">Marca:</span> {activoSel.marca ?? '—'}</p>
                  <p><span className="font-bold">Modelo:</span> {activoSel.modelo ?? '—'}</p>
                  <p><span className="font-bold">Ubicación:</span> {activoSel.ubicacion ?? '—'}</p>
                  <p><span className="font-bold">Responsable:</span> {activoSel.responsable?.nombre ?? '—'}</p>
                </div>
              </div>

              {/* Parámetros operativos */}
              {(activoSel.temperaturaMin != null || activoSel.temperaturaMax != null ||
                activoSel.amperajeNormal != null || activoSel.presionNormal != null ||
                activoSel.temperaturaAlerta != null || activoSel.temperaturaCritica != null) && (
                <div className="border border-line p-3">
                  <p className="text-xs font-black uppercase tracking-wider text-muted mb-2">Parámetros operativos</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
                    {activoSel.temperaturaMin != null && <p><span className="font-bold">Temp. mín:</span> {activoSel.temperaturaMin}°C</p>}
                    {activoSel.temperaturaMax != null && <p><span className="font-bold">Temp. máx:</span> {activoSel.temperaturaMax}°C</p>}
                    {activoSel.temperaturaAlerta != null && <p><span className="font-bold">Temp. alerta:</span> {activoSel.temperaturaAlerta}°C</p>}
                    {activoSel.temperaturaCritica != null && <p><span className="font-bold">Temp. crítica:</span> {activoSel.temperaturaCritica}°C</p>}
                    {activoSel.amperajeNormal != null && <p><span className="font-bold">Amperaje normal:</span> {activoSel.amperajeNormal}A</p>}
                    {activoSel.amperajeAlerta != null && <p><span className="font-bold">Amperaje alerta:</span> {activoSel.amperajeAlerta}A</p>}
                    {activoSel.presionNormal != null && <p><span className="font-bold">Presión normal:</span> {activoSel.presionNormal}</p>}
                    {activoSel.presionAlerta != null && <p><span className="font-bold">Presión alerta:</span> {activoSel.presionAlerta}</p>}
                  </div>
                </div>
              )}

              {/* Mediciones recientes */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted mb-2">Mediciones recientes</p>
                {cargandoMed && <p className="text-sm text-faint animate-pulse">Cargando mediciones...</p>}
                {!cargandoMed && mediciones.length === 0 && <p className="text-sm text-faint">Sin mediciones registradas.</p>}
                <div className="space-y-1.5">
                  {mediciones.slice(0, 10).map((m) => (
                    <div key={m.id} className="border border-line px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-muted">{format(new Date(m.fecha), 'dd/MM/yy HH:mm')}</span>
                        {m.temperatura != null && <span>{m.temperatura}°C</span>}
                        {m.amperaje != null && <span>{m.amperaje}A</span>}
                        {m.presion != null && <span>{m.presion}p</span>}
                      </div>
                      <span className={`font-black uppercase px-1.5 py-0.5 border ${MEDICION_COLOR[m.estado] ?? ''}`}>{m.estado}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form de intervención */}
              <form onSubmit={handleIntervenir} className="border border-line p-3 space-y-3 bg-brand-50/40">
                <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-content">
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
                  <textarea value={form.observaciones} onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} rows={2} className="w-full border border-line px-3 py-2 text-sm outline-none focus:border-brand-600" />
                </div>
                {errorMed && <p className="text-xs font-bold text-danger-strong dark:text-danger">{errorMed}</p>}
                {exito && <p className="flex items-center gap-1 text-xs font-bold text-ok-strong dark:text-ok"><CheckCircle size={14} /> {exito}</p>}
                <div className="flex justify-end">
                  <button type="submit" disabled={guardandoMed} className="px-4 py-2 bg-brand-600 text-white border border-line font-bold text-sm disabled:opacity-50 shadow-soft">
                    {guardandoMed ? 'Registrando...' : 'Registrar medición'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'personal' && (
            <div className="space-y-5">
              {!personal && <p className="text-sm text-faint animate-pulse py-4 text-center">Cargando personal...</p>}

              {personal && (() => {
                const lista = personal.personal ?? personal.usuarios ?? [];
                return (
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                      <Users size={13} /> Personal de la empresa ({lista.length})
                    </p>
                    <div className="space-y-1.5">
                      {lista.map((u) => (
                        <div key={u.id} className="border border-line px-3 py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-content text-sm">{u.nombre}</p>
                            {u.email && <p className="text-xs font-mono text-muted">{u.email}</p>}
                            {u.telefono && <p className="text-xs text-muted">{u.telefono}</p>}
                            {u.cargo && <p className="text-xs text-faint mt-0.5">{u.cargo}</p>}
                            {u.ultimoAcceso && (
                              <p className="text-xs text-faint mt-0.5">
                                Último acceso: {format(new Date(u.ultimoAcceso), 'dd/MM/yyyy HH:mm')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs font-black uppercase px-2 py-0.5 border border-line text-muted">
                              {u.rol}
                            </span>
                            {!u.activo && (
                              <span className="text-xs font-black text-danger">Inactivo</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {lista.length === 0 && (
                        <p className="text-sm text-faint">Sin personal registrado.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {tab === 'actividad' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <ScrollText size={13} /> Últimos 60 registros
                </p>
                {actividad.length > 0 && (
                  <button
                    onClick={() => {
                      exportarCsv(`actividad-${empresaNombre.replace(/\s+/g,'-').toLowerCase()}`, actividad.map((r) => ({
                        Fecha: format(new Date(r.creadoEn), 'dd/MM/yyyy HH:mm'),
                        Accion: r.accion,
                        Entidad: r.entidad,
                        Detalle: r.detalle ?? '',
                        Usuario: r.usuarioNombre ?? '',
                      })));
                    }}
                    className="flex items-center gap-1 text-xs font-bold border border-line px-2 py-1 hover:border-content transition-colors"
                  >
                    <Download size={11} /> CSV
                  </button>
                )}
              </div>

              {actividad.length === 0 && (
                <p className="text-sm text-faint py-4 text-center animate-pulse">Cargando actividad...</p>
              )}

              {actividad.map((r) => {
                const colorAccion: Record<string, string> = {
                  crear: 'text-ok-strong dark:text-ok bg-ok/10 border-ok',
                  editar: 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-600/15 border-brand-600',
                  eliminar: 'text-danger-strong dark:text-danger bg-danger/10 border-danger',
                  medicion: 'text-brand-700 bg-brand-50 border-brand-200',
                  cerrar: 'text-content bg-subtle border-line',
                  login: 'text-muted bg-subtle border-line',
                };
                const cls = colorAccion[r.accion] ?? 'text-muted bg-subtle border-line';
                return (
                  <div key={r.id} className="border border-line px-3 py-2 flex items-start gap-3">
                    <span className={`text-xs font-black uppercase px-1.5 py-0.5 border flex-shrink-0 ${cls}`}>
                      {r.accion}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-content font-semibold truncate">{r.detalle ?? r.entidad}</p>
                      <p className="text-xs text-faint mt-0.5">
                        {r.usuarioNombre ?? 'Sistema'} · {format(new Date(r.creadoEn), 'dd/MM/yy HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
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
          <DialogViewport className="z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onEscape={() => setActivoTarea(null)}>
            <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft w-full max-w-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
                <h3 className="font-black uppercase text-sm">Nueva tarea de mantenimiento</h3>
                <button onClick={() => setActivoTarea(null)}><X size={18} /></button>
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
                    className="w-full border border-line px-3 py-2 text-sm outline-none focus:border-brand-600"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setActivoTarea(null)} className="px-4 py-2 border border-line-strong font-bold text-sm text-muted">Cancelar</button>
                  <button type="submit" disabled={guardandoTarea} className="px-4 py-2 bg-brand-600 text-white border border-line font-bold text-sm disabled:opacity-50">
                    {guardandoTarea ? 'Guardando...' : 'Crear tarea'}
                  </button>
                </div>
              </form>
            </div>
          </DialogViewport>
        )}
      </div>
    </DialogViewport>
  );
};
