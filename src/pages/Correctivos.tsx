import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  AlertOctagon, CalendarClock, Camera, Check, CheckCircle2, ClipboardCheck,
  FileSignature, Loader2, Play, RefreshCw, ShieldCheck, Square, Wrench, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listarEmpresas, type EmpresaAdmin } from '../data/adminApi';
import {
  actualizarEstadoOrden, crearPropuestaCorrectiva, listarCorrectivosAdmin,
  listarMisCorrectivos, registrarConformidad, registrarDecisionOperativa,
  resolverPermiso, type AlertaTecnica, type NivelAlerta,
} from '../data/correctivosApi';
import { useToast } from '../components/ui/Toast';
import { comprimirImagen } from '../utils/comprimirImagen';

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const NIVEL_STYLE: Record<NivelAlerta, string> = {
  desmejorado: 'border-warn bg-warn/10 text-warn-strong dark:text-warn',
  riesgo: 'border-danger bg-danger/10 text-danger-strong dark:text-danger',
  critico: 'border-danger bg-danger text-white',
};
const ESTADO_LABEL: Record<string, string> = {
  abierta: 'Alerta abierta', propuesta_emitida: 'Propuesta emitida', autorizada: 'Autorizada',
  rechazada: 'Rechazada', riesgo_aceptado: 'Riesgo aceptado', cerrada: 'Cerrada',
  no_requerido: 'No requerido', pendiente: 'Pendiente', aprobado: 'Aprobado',
  vencido: 'Vencido', programada: 'Programada', en_progreso: 'En progreso',
  completada: 'Completada', cancelada: 'Cancelada', conforme: 'Conforme', observada: 'Observada',
};

const input = 'w-full min-h-11 border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600';
const label = 'block text-[11px] font-black uppercase tracking-wider text-muted mb-1';

type FormPropuesta = {
  nivel: NivelAlerta; hallazgo: string; riesgo: string; recomendacion: string;
  recomiendaDetencion: boolean; alcance: string; materialesPrevistos: string;
  condicionesSeguridad: string; manoObra: string; repuestos: string; traslado: string;
  otros: string; descuento: string; vigenciaDias: string; plazoEstimadoDias: string;
  requierePermiso: boolean;
};

function formularioDesde(alerta: AlertaTecnica): FormPropuesta {
  return {
    nivel: alerta.nivel, hallazgo: alerta.hallazgo, riesgo: alerta.riesgo,
    recomendacion: alerta.recomendacion, recomiendaDetencion: alerta.recomiendaDetencion,
    alcance: '', materialesPrevistos: '', condicionesSeguridad: '', manoObra: '', repuestos: '',
    traslado: '', otros: '', descuento: '0', vigenciaDias: '15', plazoEstimadoDias: '1',
    requierePermiso: true,
  };
}

function Fecha({ valor }: { valor?: string | null }) {
  if (!valor) return <>—</>;
  return <>{new Date(valor).toLocaleString('es-AR')}</>;
}

export const Correctivos: React.FC = () => {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const esSuperadmin = usuario?.rol === 'superadmin';
  const empresaInicial = params.get('empresaId') ?? '';
  const alertaInicial = params.get('alerta');
  const [alertas, setAlertas] = useState<AlertaTecnica[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [empresaId, setEmpresaId] = useState(empresaInicial);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState('');
  const [propuestaId, setPropuestaId] = useState<string | null>(null);
  const [propuesta, setPropuesta] = useState<FormPropuesta | null>(null);
  const [detalleDecision, setDetalleDecision] = useState<Record<string, string>>({});
  const [permisos, setPermisos] = useState<Record<string, { condiciones: string; desde: string; hasta: string }>>({});
  const [programaciones, setProgramaciones] = useState<Record<string, { fecha: string; responsable: string }>>({});
  const [cierres, setCierres] = useState<Record<string, { trabajo: string; repuestos: string; horas: string; evidencias: string[] }>>({});
  const [conformidades, setConformidades] = useState<Record<string, string>>({});
  const fotoRef = useRef<HTMLInputElement>(null);
  const [ordenFoto, setOrdenFoto] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      if (esSuperadmin) {
        const [listaAlertas, listaEmpresas] = await Promise.all([
          listarCorrectivosAdmin(), listarEmpresas(),
        ]);
        setAlertas(listaAlertas); setEmpresas(listaEmpresas);
      } else {
        setAlertas(await listarMisCorrectivos());
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo cargar el circuito correctivo.', 'error');
    } finally { setCargando(false); }
  }, [esSuperadmin, toast]);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => alertas.filter((a) => !empresaId || a.empresaId === empresaId), [alertas, empresaId]);
  const criticas = visibles.filter((a) => a.nivel === 'critico' && a.estado !== 'cerrada').length;
  const permisosPendientes = visibles.filter((a) => a.orden?.estadoPermiso === 'pendiente').length;

  const abrirPropuesta = (alerta: AlertaTecnica) => {
    setPropuestaId(alerta.id); setPropuesta(formularioDesde(alerta));
  };
  const setP = <K extends keyof FormPropuesta>(clave: K, valor: FormPropuesta[K]) =>
    setPropuesta((actual) => actual ? { ...actual, [clave]: valor } : actual);

  const guardarPropuesta = async (alerta: AlertaTecnica) => {
    if (!propuesta) return;
    setProcesando(`propuesta:${alerta.id}`);
    try {
      const resultado = await crearPropuestaCorrectiva(alerta.id, {
        ...propuesta,
        manoObra: Number(propuesta.manoObra), repuestos: Number(propuesta.repuestos),
        traslado: Number(propuesta.traslado), otros: Number(propuesta.otros),
        descuento: Number(propuesta.descuento), vigenciaDias: Number(propuesta.vigenciaDias),
        plazoEstimadoDias: Number(propuesta.plazoEstimadoDias),
      });
      toast(`Cotización ${resultado.numero} creada como borrador.`, 'success');
      setPropuestaId(null); setPropuesta(null); await cargar();
    } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo crear la propuesta.', 'error'); }
    finally { setProcesando(''); }
  };

  const decidir = async (alerta: AlertaTecnica, decision: 'detener_aislar' | 'continuar_operando') => {
    setProcesando(`decision:${alerta.id}`);
    try {
      await registrarDecisionOperativa(alerta.id, decision, detalleDecision[alerta.id] ?? '');
      toast('Decisión operativa registrada y notificada.', 'success'); await cargar();
    } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo registrar la decisión.', 'error'); }
    finally { setProcesando(''); }
  };

  const permiso = async (alerta: AlertaTecnica, decision: 'aprobar' | 'rechazar') => {
    if (!alerta.orden) return;
    const datos = permisos[alerta.orden.id] ?? { condiciones: '', desde: '', hasta: '' };
    setProcesando(`permiso:${alerta.orden.id}`);
    try {
      await resolverPermiso(alerta.orden.id, {
        decision, condiciones: datos.condiciones,
        validoDesde: datos.desde || undefined, validoHasta: datos.hasta || undefined,
      });
      toast(`Permiso ${decision === 'aprobar' ? 'aprobado' : 'rechazado'}.`, 'success'); await cargar();
    } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo resolver el permiso.', 'error'); }
    finally { setProcesando(''); }
  };

  const accionOrden = async (alerta: AlertaTecnica, accion: 'programar' | 'iniciar' | 'completar' | 'cancelar') => {
    if (!alerta.orden) return;
    const programacion = programaciones[alerta.orden.id] ?? { fecha: '', responsable: '' };
    const cierre = cierres[alerta.orden.id] ?? { trabajo: '', repuestos: '', horas: '', evidencias: [] };
    setProcesando(`${accion}:${alerta.orden.id}`);
    try {
      await actualizarEstadoOrden(alerta.orden.id, {
        accion,
        ...(accion === 'programar' ? { programadaPara: programacion.fecha, responsableNombre: programacion.responsable } : {}),
        ...(accion === 'completar' ? {
          cierreTrabajo: cierre.trabajo, repuestosUtilizados: cierre.repuestos,
          horasTrabajo: Number(cierre.horas), evidencias: cierre.evidencias,
        } : {}),
      });
      toast(`Orden ${ESTADO_LABEL[accion === 'programar' ? 'programada' : accion === 'iniciar' ? 'en_progreso' : accion === 'completar' ? 'completada' : 'cancelada'].toLowerCase()}.`, 'success');
      await cargar();
    } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo actualizar la orden.', 'error'); }
    finally { setProcesando(''); }
  };

  const agregarEvidencias = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const ordenId = ordenFoto;
    const archivos = Array.from(event.target.files ?? []).slice(0, 6);
    event.target.value = '';
    if (!ordenId) return;
    try {
      const nuevas = await Promise.all(archivos.map((archivo) => comprimirImagen(archivo)));
      setCierres((actual) => {
        const previo = actual[ordenId] ?? { trabajo: '', repuestos: '', horas: '', evidencias: [] };
        return { ...actual, [ordenId]: { ...previo, evidencias: [...previo.evidencias, ...nuevas].slice(0, 6) } };
      });
    } catch { toast('No se pudo procesar una evidencia.', 'error'); }
  };

  const conformidad = async (alerta: AlertaTecnica, decision: 'conforme' | 'observada') => {
    if (!alerta.orden) return;
    setProcesando(`conformidad:${alerta.orden.id}`);
    try {
      await registrarConformidad(alerta.orden.id, decision, conformidades[alerta.orden.id] ?? '');
      toast('Conformidad registrada.', 'success'); await cargar();
    } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo registrar la conformidad.', 'error'); }
    finally { setProcesando(''); }
  };

  return (
    <div className="space-y-5 pb-24">
      <input ref={fotoRef} type="file" accept="image/*" multiple className="hidden" onChange={agregarEvidencias} />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-content flex items-center gap-3"><Wrench size={30} /> Alertas y órdenes</h1>
          <p className="text-sm text-muted mt-1">Del hallazgo técnico a la autorización, ejecución y cierre documentado.</p>
        </div>
        <button onClick={cargar} disabled={cargando} className="min-h-11 flex items-center gap-2 border border-line px-3 text-sm font-bold disabled:opacity-40">
          <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="border border-line bg-surface p-3"><p className="text-[10px] font-black uppercase text-muted">Alertas</p><p className="text-2xl font-black">{visibles.length}</p></div>
        <div className="border border-danger bg-danger/10 p-3"><p className="text-[10px] font-black uppercase text-danger">Críticas</p><p className="text-2xl font-black">{criticas}</p></div>
        <div className="border border-warn bg-warn/10 p-3"><p className="text-[10px] font-black uppercase text-warn-strong dark:text-warn">Permisos</p><p className="text-2xl font-black">{permisosPendientes}</p></div>
      </div>

      {esSuperadmin && (
        <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className={`${input} max-w-md`}>
          <option value="">Todas las empresas</option>
          {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>)}
        </select>
      )}

      {!cargando && visibles.length === 0 && <div className="border border-line bg-subtle p-6 text-sm text-muted">Todavía no hay alertas técnicas.</div>}

      {visibles.map((alerta) => {
        const orden = alerta.orden;
        const permisoDatos = orden ? permisos[orden.id] ?? { condiciones: '', desde: '', hasta: '' } : null;
        const programacion = orden ? programaciones[orden.id] ?? { fecha: '', responsable: '' } : null;
        const cierre = orden ? cierres[orden.id] ?? { trabajo: '', repuestos: '', horas: '', evidencias: [] } : null;
        return (
          <details key={alerta.id} open={alerta.id === alertaInicial || undefined} className="border border-line bg-surface shadow-soft">
            <summary className="list-none cursor-pointer p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase text-brand-600">{alerta.numero} · {alerta.empresa.nombre}</p>
                  <h2 className="font-display font-black text-lg truncate">{alerta.activo.codigo} · {alerta.activo.nombre}</h2>
                  <p className="text-sm text-muted line-clamp-2">{alerta.hallazgo}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <span className={`block border px-2 py-1 text-[10px] font-black uppercase ${NIVEL_STYLE[alerta.nivel]}`}>{alerta.nivel}</span>
                  <span className="block text-[10px] font-black uppercase text-muted">{ESTADO_LABEL[alerta.estado]}</span>
                </div>
              </div>
            </summary>

            <div className="border-t border-line p-4 space-y-5">
              {alerta.recomiendaDetencion && (
                <div className="border border-danger bg-danger/10 p-3 flex gap-3 text-danger-strong dark:text-danger">
                  <AlertOctagon size={22} className="shrink-0" />
                  <div><p className="font-black uppercase text-sm">Detención o aislamiento recomendado</p><p className="text-xs mt-1">La recomendación queda registrada; la decisión operativa corresponde al cliente.</p></div>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="border border-line bg-subtle p-3"><p className={label}>Hallazgo</p><p className="whitespace-pre-wrap">{alerta.hallazgo}</p></div>
                <div className="border border-line bg-subtle p-3"><p className={label}>Riesgo</p><p className="whitespace-pre-wrap">{alerta.riesgo}</p></div>
                <div className="border border-line bg-subtle p-3"><p className={label}>Recomendación</p><p className="whitespace-pre-wrap">{alerta.recomendacion}</p></div>
              </div>

              {alerta.medicion && (
                <div className="border border-line p-3">
                  <p className={label}>Medición de origen · <Fecha valor={alerta.medicion.fecha} /></p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-mono">
                    {alerta.medicion.temperatura != null && <span>{alerta.medicion.temperatura} °C</span>}
                    {alerta.medicion.amperaje != null && <span>{alerta.medicion.amperaje} A</span>}
                    {alerta.medicion.presion != null && <span>{alerta.medicion.presion} bar</span>}
                    {alerta.medicion.voltaje != null && <span>{alerta.medicion.voltaje} V</span>}
                    <span className="font-black uppercase">{alerta.medicion.estado}</span>
                  </div>
                </div>
              )}

              {!esSuperadmin && alerta.estado !== 'cerrada' && (
                <div className="border border-line p-3 space-y-3">
                  <p className="font-black uppercase text-sm">Decisión operativa del administrador</p>
                  <textarea value={detalleDecision[alerta.id] ?? ''} onChange={(e) => setDetalleDecision((a) => ({ ...a, [alerta.id]: e.target.value }))} rows={2} className={input} placeholder="Motivo, controles temporales y condiciones de operación…" />
                  <div className="grid sm:grid-cols-2 gap-2">
                    <button onClick={() => decidir(alerta, 'detener_aislar')} disabled={!!procesando} className="min-h-11 flex items-center justify-center gap-2 border border-danger bg-danger text-white text-xs font-black uppercase"><Square size={15} /> Detener / aislar</button>
                    <button onClick={() => decidir(alerta, 'continuar_operando')} disabled={!!procesando} className="min-h-11 flex items-center justify-center gap-2 border border-warn bg-warn/10 text-warn-strong dark:text-warn text-xs font-black uppercase"><AlertOctagon size={15} /> Continuar bajo responsabilidad</button>
                  </div>
                </div>
              )}

              {alerta.decisionCliente && (
                <div className="border border-line bg-subtle p-3 text-sm">
                  <p className={label}>Decisión registrada por {alerta.decisionPorNombre} · <Fecha valor={alerta.decisionEn} /></p>
                  <p className="font-black uppercase">{alerta.decisionCliente === 'detener_aislar' ? 'Detener / aislar' : 'Continuar operando bajo responsabilidad del cliente'}</p>
                  {alerta.decisionDetalle && <p className="mt-1 whitespace-pre-wrap">{alerta.decisionDetalle}</p>}
                </div>
              )}

              {esSuperadmin && !alerta.cotizacion && propuestaId !== alerta.id && (
                <button onClick={() => abrirPropuesta(alerta)} className="min-h-11 w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-600 text-white px-4 text-sm font-black uppercase border border-line"><FileSignature size={16} /> Preparar propuesta correctiva</button>
              )}

              {esSuperadmin && propuestaId === alerta.id && propuesta && (
                <div className="border-2 border-brand-600 p-4 space-y-4">
                  <h3 className="font-display font-black text-xl flex items-center gap-2"><FileSignature size={20} /> Plantilla de propuesta y pedido de trabajo</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><label className={label}>Clasificación</label><select value={propuesta.nivel} onChange={(e) => setP('nivel', e.target.value as NivelAlerta)} className={input}><option value="desmejorado">Desmejorado</option><option value="riesgo">Riesgo</option><option value="critico">Crítico</option></select></div>
                    <label className="flex items-center gap-2 min-h-11 border border-line px-3 text-sm font-bold"><input type="checkbox" checked={propuesta.recomiendaDetencion} onChange={(e) => setP('recomiendaDetencion', e.target.checked)} /> Recomendar detención / aislamiento</label>
                  </div>
                  {(['hallazgo', 'riesgo', 'recomendacion', 'alcance', 'materialesPrevistos', 'condicionesSeguridad'] as const).map((campo) => (
                    <div key={campo}><label className={label}>{campo === 'materialesPrevistos' ? 'Materiales previstos' : campo === 'condicionesSeguridad' ? 'Condiciones de seguridad' : campo}</label><textarea rows={campo === 'alcance' ? 4 : 2} value={propuesta[campo]} onChange={(e) => setP(campo, e.target.value)} className={input} /></div>
                  ))}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['manoObra', 'repuestos', 'traslado', 'otros'] as const).map((campo) => <div key={campo}><label className={label}>{campo === 'manoObra' ? 'Mano de obra' : campo}</label><input type="number" min="0" value={propuesta[campo]} onChange={(e) => setP(campo, e.target.value)} className={input} /></div>)}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className={label}>Descuento %</label><input type="number" min="0" max="100" value={propuesta.descuento} onChange={(e) => setP('descuento', e.target.value)} className={input} /></div>
                    <div><label className={label}>Vigencia días</label><input type="number" min="1" value={propuesta.vigenciaDias} onChange={(e) => setP('vigenciaDias', e.target.value)} className={input} /></div>
                    <div><label className={label}>Plazo días</label><input type="number" min="1" value={propuesta.plazoEstimadoDias} onChange={(e) => setP('plazoEstimadoDias', e.target.value)} className={input} /></div>
                  </div>
                  <label className="flex items-center gap-2 border border-line p-3 text-sm font-bold"><input type="checkbox" checked={propuesta.requierePermiso} onChange={(e) => setP('requierePermiso', e.target.checked)} /> Exigir permiso de trabajo antes de programar o iniciar</label>
                  <div className="flex gap-2 justify-end"><button onClick={() => { setPropuestaId(null); setPropuesta(null); }} className="min-h-11 px-4 border border-line font-bold">Cancelar</button><button onClick={() => guardarPropuesta(alerta)} disabled={!!procesando} className="min-h-11 px-4 bg-brand-600 text-white font-black uppercase border border-line">Crear cotización</button></div>
                </div>
              )}

              {alerta.cotizacion && (
                <div className="border border-line p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div><p className={label}>Cotización vinculada</p><p className="font-black">{alerta.cotizacion.numero} · {ARS.format(alerta.cotizacion.total)} · {ESTADO_LABEL[alerta.cotizacion.estado] ?? alerta.cotizacion.estado}</p></div>
                  <Link to={`/cotizaciones?cotizacion=${alerta.cotizacion.id}`} className="min-h-10 flex items-center gap-2 border border-brand-600 px-3 text-sm font-black text-brand-600"><FileSignature size={15} /> Ver cotización</Link>
                </div>
              )}

              {orden && (
                <div className="border-2 border-line-strong p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap"><div><p className="text-[11px] font-black uppercase text-brand-600">Orden de trabajo</p><h3 className="font-display font-black text-xl">{orden.numero}</h3><p className="text-sm text-muted">Autorizada por {orden.autorizadaPorNombre} · <Fecha valor={orden.autorizadaEn} /></p></div><div className="text-right"><p className="font-black uppercase">{ESTADO_LABEL[orden.estado]}</p><p className="text-sm">{ARS.format(orden.costoAprobado)}</p></div></div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm"><div className="border border-line bg-subtle p-3"><p className={label}>Alcance autorizado</p><p className="whitespace-pre-wrap">{orden.alcance}</p></div><div className="border border-line bg-subtle p-3"><p className={label}>Permiso de trabajo</p><p className="font-black uppercase">{ESTADO_LABEL[orden.estadoPermiso]}</p>{orden.permisoCondiciones && <p className="mt-1 whitespace-pre-wrap">{orden.permisoCondiciones}</p>}</div></div>

                  {!esSuperadmin && orden.requierePermiso && !['completada', 'cancelada'].includes(orden.estado) && (
                    <div className="border border-warn bg-warn/10 p-3 space-y-3">
                      <h4 className="font-black uppercase text-sm flex items-center gap-2"><ShieldCheck size={17} /> Permiso de trabajo</h4>
                      <textarea rows={2} value={permisoDatos!.condiciones} onChange={(e) => setPermisos((a) => ({ ...a, [orden.id]: { ...permisoDatos!, condiciones: e.target.value } }))} className={input} placeholder="Condiciones de ingreso, EPP, bloqueo, consignación, acompañamiento…" />
                      <div className="grid grid-cols-2 gap-2"><div><label className={label}>Válido desde</label><input type="datetime-local" value={permisoDatos!.desde} onChange={(e) => setPermisos((a) => ({ ...a, [orden.id]: { ...permisoDatos!, desde: e.target.value } }))} className={input} /></div><div><label className={label}>Válido hasta</label><input type="datetime-local" value={permisoDatos!.hasta} onChange={(e) => setPermisos((a) => ({ ...a, [orden.id]: { ...permisoDatos!, hasta: e.target.value } }))} className={input} /></div></div>
                      <div className="grid grid-cols-2 gap-2"><button onClick={() => permiso(alerta, 'rechazar')} disabled={!!procesando} className="min-h-11 border border-danger text-danger font-black uppercase text-xs"><X size={15} className="inline mr-1" /> Rechazar</button><button onClick={() => permiso(alerta, 'aprobar')} disabled={!!procesando} className="min-h-11 border border-ok bg-ok/10 text-ok-strong dark:text-ok font-black uppercase text-xs"><Check size={15} className="inline mr-1" /> Aprobar permiso</button></div>
                    </div>
                  )}

                  {esSuperadmin && orden.estado === 'autorizada' && (
                    <div className="border border-line p-3 space-y-3"><h4 className="font-black uppercase text-sm flex items-center gap-2"><CalendarClock size={17} /> Programar trabajo</h4><div className="grid sm:grid-cols-2 gap-2"><input type="datetime-local" value={programacion!.fecha} onChange={(e) => setProgramaciones((a) => ({ ...a, [orden.id]: { ...programacion!, fecha: e.target.value } }))} className={input} /><input value={programacion!.responsable} onChange={(e) => setProgramaciones((a) => ({ ...a, [orden.id]: { ...programacion!, responsable: e.target.value } }))} className={input} placeholder="Responsable / cuadrilla" /></div><button onClick={() => accionOrden(alerta, 'programar')} disabled={!!procesando} className="min-h-11 w-full bg-brand-600 text-white font-black uppercase text-xs"><CalendarClock size={15} className="inline mr-1" /> Programar</button></div>
                  )}

                  {esSuperadmin && orden.estado === 'programada' && <button onClick={() => accionOrden(alerta, 'iniciar')} disabled={!!procesando} className="min-h-11 w-full bg-brand-600 text-white font-black uppercase text-xs"><Play size={15} className="inline mr-1" /> Iniciar trabajo</button>}

                  {esSuperadmin && orden.estado === 'en_progreso' && (
                    <div className="border border-line p-3 space-y-3"><h4 className="font-black uppercase text-sm flex items-center gap-2"><ClipboardCheck size={17} /> Cierre documentado</h4><textarea rows={3} value={cierre!.trabajo} onChange={(e) => setCierres((a) => ({ ...a, [orden.id]: { ...cierre!, trabajo: e.target.value } }))} className={input} placeholder="Trabajo realizado y resultado técnico…" /><textarea rows={2} value={cierre!.repuestos} onChange={(e) => setCierres((a) => ({ ...a, [orden.id]: { ...cierre!, repuestos: e.target.value } }))} className={input} placeholder="Repuestos y materiales utilizados…" /><input type="number" min="0" step="0.25" value={cierre!.horas} onChange={(e) => setCierres((a) => ({ ...a, [orden.id]: { ...cierre!, horas: e.target.value } }))} className={input} placeholder="Horas de trabajo" /><button onClick={() => { setOrdenFoto(orden.id); fotoRef.current?.click(); }} className="min-h-11 w-full border border-line font-bold text-sm"><Camera size={16} className="inline mr-1" /> Evidencias ({cierre!.evidencias.length}/6)</button><button onClick={() => accionOrden(alerta, 'completar')} disabled={!!procesando} className="min-h-11 w-full bg-ok text-white font-black uppercase text-xs"><CheckCircle2 size={15} className="inline mr-1" /> Completar y cerrar alerta</button></div>
                  )}

                  {esSuperadmin && ['autorizada', 'programada'].includes(orden.estado) && <button onClick={() => accionOrden(alerta, 'cancelar')} disabled={!!procesando} className="min-h-10 border border-danger text-danger px-3 text-xs font-black uppercase">Cancelar orden</button>}

                  {orden.estado === 'completada' && (
                    <div className="border border-ok bg-ok/10 p-3 space-y-2"><p className={label}>Trabajo cerrado · <Fecha valor={orden.finalizadaEn} /></p><p className="whitespace-pre-wrap text-sm">{orden.cierreTrabajo}</p>{orden.evidencias && orden.evidencias.length > 0 && <div className="grid grid-cols-3 gap-2">{orden.evidencias.map((foto, i) => <img key={i} src={foto} alt={`Evidencia ${i + 1}`} className="w-full aspect-square object-cover border border-line" />)}</div>}</div>
                  )}

                  {!esSuperadmin && orden.estado === 'completada' && orden.conformidadCliente === 'pendiente' && (
                    <div className="border border-line p-3 space-y-3"><textarea rows={2} value={conformidades[orden.id] ?? ''} onChange={(e) => setConformidades((a) => ({ ...a, [orden.id]: e.target.value }))} className={input} placeholder="Observaciones de recepción (obligatorias si no queda conforme)…" /><div className="grid grid-cols-2 gap-2"><button onClick={() => conformidad(alerta, 'observada')} className="min-h-11 border border-warn text-warn-strong dark:text-warn font-black uppercase text-xs">Observar cierre</button><button onClick={() => conformidad(alerta, 'conforme')} className="min-h-11 border border-ok bg-ok/10 text-ok-strong dark:text-ok font-black uppercase text-xs">Dar conformidad</button></div></div>
                  )}
                  {orden.conformidadCliente !== 'pendiente' && <p className="text-sm font-black uppercase flex items-center gap-2"><CheckCircle2 size={16} /> Cliente: {ESTADO_LABEL[orden.conformidadCliente]}</p>}
                </div>
              )}
            </div>
          </details>
        );
      })}
      {procesando && <div className="fixed bottom-24 right-4 bg-slate-900 text-white px-4 py-3 border border-line shadow-soft flex items-center gap-2 text-sm font-bold z-50"><Loader2 size={16} className="animate-spin" /> Guardando…</div>}
    </div>
  );
};
