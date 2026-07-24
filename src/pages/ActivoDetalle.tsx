// v1.1.0
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// parseISO + format defensivo: si la fecha es null/undefined/invalida,
// devuelve "—" en vez de tirar excepcion y dejar la pagina en blanco.
// Razon: campos como proximoMantenimiento son opcionales en schema y
// algunos activos viejos quedaron sin fecha. Sin esta guarda, el cliente
// no podia ENTRAR a su activo (la ficha crasheaba al render).
function fmt(fecha: string | null | undefined, fmtStr = 'dd/MM/yyyy'): string {
  if (!fecha) return '—';
  try {
    const d = parseISO(String(fecha));
    if (isNaN(d.getTime())) return '—';
    return format(d, fmtStr, { locale: es });
  } catch {
    return '—';
  }
}
import { ArrowLeft, Printer, Download, ClipboardList, Pencil, Trash2, FileDown, FileText } from 'lucide-react';
import { exportarFichaActivoPdf } from '../utils/exportPdf';
import { descargarEtiquetaQR, imprimirEtiquetaQR } from '../utils/imprimirEtiqueta';
import { useActivos } from '../hooks/useActivos';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EstadoOperativoBadge, ESTADOS_OPERATIVOS } from '../components/ui/EstadoOperativoBadge';
import { ValueGauge } from '../components/ui/ValueGauge';
import { DocumentosActivo } from '../components/DocumentosActivo';
import { FotoActivo } from '../components/FotoActivo';
import { FallasActivo } from '../components/FallasActivo';
import { UbicacionesActivo } from '../components/UbicacionesActivo';
import { AnalisisActivo } from '../components/analitica/AnalisisActivo';
import { EstadoOperativo, TareaMantenimiento } from '../data/types';
import { CategoriaEquipo, getCategoria } from '../data/categoriasApi';
import { API_URL } from '../data/auth';
import { useAuth } from '../context/AuthContext';
import { puedeEliminarActivos } from '../data/permisos';

export const ActivoDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const {
    activos, mediciones, tareas, tipos,
    deleteActivo, deleteMedicion, updateActivo, addTarea,
    getSectorNombre, getTipoNombre, getTecnicoNombre,
  } = useActivos();
  const qrRef = useRef<SVGSVGElement | null>(null);

  const activo = activos.find((a) => a.id === id);
  const tipoActual = tipos.find((t) => t.id === activo?.tipoId);

  // Naturaleza del activo: operativo (tiene parametros fisicos que cambian
  // con el uso) vs patrimonial/documental (mueble, piscina, instalacion).
  // La decide el TipoActivo + su CategoriaEquipo. Si no mide nada fisico,
  // el activo se trata como patrimonial: nada de horas/intervalos/gauges/
  // predictivo, foco en legajo documental e historial de tareas por fecha.
  // OJO: estos hooks van ANTES del early return de "Activo no encontrado"
  // — un hook condicional revienta con react error #310.
  const [categoriaTipo, setCategoriaTipo] = useState<CategoriaEquipo | null>(null);
  useEffect(() => {
    const catId = tipoActual?.categoriaId;
    if (!catId) { setCategoriaTipo(null); return; }
    getCategoria(catId).then(setCategoriaTipo).catch(() => setCategoriaTipo(null));
  }, [tipoActual?.categoriaId]);

  if (!activo) return <div className="p-8 text-danger font-bold">Activo no encontrado</div>;

  const activoMediciones = mediciones
    .filter((m) => m.activoId === id)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const last10 = activoMediciones.slice(-10);
  const activoTareas = tareas.filter((t) => t.activoId === id);
  const qrValue = `${window.location.origin}${import.meta.env.BASE_URL}#/ficha/${activo.id}`;

  const mideAlgoFijo = !!(
    tipoActual?.mideTemperatura || tipoActual?.mideAmperaje || tipoActual?.midePresion ||
    tipoActual?.mideVibracion || tipoActual?.mideBateria || tipoActual?.mideToner ||
    tipoActual?.mideContador || tipoActual?.mideVoltaje
  );
  const mideAlgoCategoria = !!(categoriaTipo && categoriaTipo.parametros.length > 0);
  const esOperativo = mideAlgoFijo || mideAlgoCategoria;
  const mideHorasMarcha = tipoActual?.mideHoras !== false && !!(
    tipoActual?.mideAmperaje || tipoActual?.midePresion || tipoActual?.mideVibracion ||
    tipoActual?.mideContador
  );

  const handleCrearTareaPredictiva = (texto: string) => {
    const nueva: TareaMantenimiento = {
      id: `tar-${Date.now()}`,
      activoId: activo.id,
      tipo: 'predictivo',
      prioridad: 'alta',
      fechaProgramada: format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'),
      estado: 'pendiente',
      observaciones: texto,
      responsableId: activo.responsableId ?? '',
    };
    addTarea(nueva);
    window.alert('Tarea predictiva creada y agregada al historial de mantenimiento.');
  };

  const getEtiquetaOpts = () => {
    const svg = qrRef.current;
    if (!svg) {
      alert('No se pudo generar el QR. Recarga la pagina y reintenta.');
      return null;
    }
    const viewBox = svg.getAttribute('viewBox') ?? '0 0 29 29';
    const inner = svg.innerHTML;
    const empresaNombre = (usuario?.empresa as { nombre?: string } | null)?.nombre;
    return {
      codigo: activo.codigo,
      nombre: activo.nombre,
      qrSvgString: inner,
      qrViewBox: viewBox,
      empresaNombre,
    };
  };

  const handlePrint = () => {
    const opts = getEtiquetaOpts();
    if (opts) imprimirEtiquetaQR(opts);
  };

  const handleDownloadLabel = () => {
    const opts = getEtiquetaOpts();
    if (opts) descargarEtiquetaQR(opts);
  };

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar el activo "${activo!.codigo} — ${activo!.nombre}"? Esta acción no se puede deshacer.`)) {
      deleteActivo(activo!.id);
      navigate('/activos');
    }
  };

  const ficha = [
    { label: 'Código', value: activo.codigo },
    { label: 'Tipo', value: getTipoNombre(activo.tipoId) },
    { label: 'Sector', value: getSectorNombre(activo.sectorId) },
    { label: 'Marca', value: activo.marca },
    { label: 'Modelo', value: activo.modelo },
    { label: 'Ubicación', value: activo.ubicacion },
    { label: 'Responsable', value: getTecnicoNombre(activo.responsableId) },
    { label: 'Fecha Ingreso', value: fmt(activo.fechaIngreso) },
    { label: 'Naturaleza', value: esOperativo ? 'Operativo' : 'Patrimonial / documental' },
    ...(mideHorasMarcha ? [
      { label: 'Horas Actuales', value: `${activo.horasActuales} hs` },
      { label: 'Intervalo Medición', value: `${activo.intervaloMedicionHoras} hs` },
      { label: 'Intervalo Lubricación', value: activo.intervaloLubricacionHoras ? `${activo.intervaloLubricacionHoras} hs` : 'N/A' },
    ] : []),
    { label: 'Prox. Mantenimiento', value: fmt(activo.proximoMantenimiento) },
    { label: 'Desplazamiento', value: activo.esItinerante ? 'Itinerante' : 'Fijo' },
    ...(activo.esItinerante ? [
      { label: 'Locacion base', value: activo.locacionBase ?? undefined },
      { label: 'Locacion actual', value: activo.locacionActual ?? undefined },
      { label: 'Fecha salida', value: activo.fechaSalida ? activo.fechaSalida.slice(0, 10) : undefined },
      { label: 'Fecha retorno est.', value: activo.fechaRetorno ? activo.fechaRetorno.slice(0, 10) : undefined },
    ] : []),
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
        <button
          onClick={() => navigate('/activos')}
          className="flex items-center gap-1 text-muted hover:text-content font-semibold border border-line px-3 min-h-[44px] hover:border-content transition-colors"
        >
          <ArrowLeft size={16} />
          Volver
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-black text-2xl sm:text-3xl text-content">{activo.codigo}</span>
            <StatusBadge estado={activo.estado} size="lg" />
            <EstadoOperativoBadge estado={activo.estadoOperativo ?? 'operativo'} size="lg" />
          </div>
          <h1 className="text-lg font-bold text-content mt-0.5">{activo.nombre}</h1>
          <div className="flex items-center gap-2 mt-2">
            <label className="text-xs font-black uppercase tracking-wider text-muted">Estado operativo:</label>
            <select
              value={activo.estadoOperativo ?? 'operativo'}
              onChange={(e) => updateActivo(activo.id, { estadoOperativo: e.target.value as EstadoOperativo })}
              className="border border-line px-2 h-9 text-sm font-semibold outline-none focus:border-brand-600 bg-surface"
            >
              {ESTADOS_OPERATIVOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate('/activos', { state: { editId: activo.id } })}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border border-line px-3 min-h-[44px] font-bold text-content hover:bg-subtle transition-colors"
          >
            <Pencil size={15} />
            Editar
          </button>
          {puedeEliminarActivos(usuario?.rol) && (
            <button
              onClick={handleDelete}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border border-danger text-danger px-3 min-h-[44px] font-bold hover:bg-danger/10 transition-colors"
            >
              <Trash2 size={15} />
              Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left: Foto + Ficha técnica */}
        <div className="lg:col-span-2 space-y-4">
          {API_URL && (
            <FotoActivo
              activoId={activo.id}
              fotoUrl={activo.fotoUrl}
              nombre={activo.nombre}
              onChange={(fotoUrl) => updateActivo(activo.id, { fotoUrl })}
            />
          )}
          <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-content mb-3 border border-line pb-2">Ficha Técnica</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {ficha.map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted min-w-28">{label}:</span>
                  <span className="text-sm font-semibold text-content capitalize">{value}</span>
                </div>
              ))}
            </div>
            {activo.notas && (
              <div className="mt-3 p-2 bg-warn/10 border border-amber-200">
                <span className="text-xs font-black uppercase text-warn-strong dark:text-warn">Notas: </span>
                <span className="text-sm text-warn-strong dark:text-warn">{activo.notas}</span>
              </div>
            )}
          </div>

          {/* Value Gauges: solo para activos operativos (motores, herramientas,
              equipos electricos). Activos patrimoniales (mueble, piscina, etc.)
              no tienen "parametros de operacion" — su valor esta en el legajo
              documental, no en gauges. */}
          {esOperativo ? (
            <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-content mb-3 border border-line pb-2">Parámetros de Operación</h2>
              {activoMediciones.length > 0 ? (
                <>
                  {tipoActual?.mideTemperatura && (
                    <ValueGauge
                      label="Temperatura"
                      value={activoMediciones[activoMediciones.length - 1].temperatura}
                      min={activo.temperaturaMin}
                      max={activo.temperaturaMax}
                      alertThreshold={activo.temperaturaAlerta}
                      criticalThreshold={activo.temperaturaCritica}
                      unit="°C"
                    />
                  )}
                  {tipoActual?.mideAmperaje && activo.amperajeNormal > 0 && (
                    <ValueGauge
                      label="Amperaje"
                      value={activoMediciones[activoMediciones.length - 1].amperaje}
                      min={0}
                      max={activo.amperajeNormal * 1.5}
                      alertThreshold={activo.amperajeNormal * 1.1}
                      criticalThreshold={activo.amperajeNormal * 1.3}
                      unit="A"
                    />
                  )}
                  {tipoActual?.midePresion && activo.presionNormal > 0 && (
                    <ValueGauge
                      label="Presión"
                      value={activoMediciones[activoMediciones.length - 1].presion}
                      min={0}
                      max={activo.presionNormal * 1.5}
                      alertThreshold={activo.presionNormal * 1.1}
                      criticalThreshold={activo.presionNormal * 1.3}
                      unit=" bar"
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-faint">Sin mediciones cargadas todavía.</p>
              )}
            </div>
          ) : (
            <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-content mb-3 border border-line pb-2 flex items-center gap-2">
                <FileText size={14} /> Legajo del activo
              </h2>
              <p className="text-sm text-muted leading-snug">
                Este activo es patrimonial / documental: no tiene parametros operativos
                medibles. Su seguimiento se hace por <strong>fotos, documentos e
                historial de tareas por fecha</strong>. Las inspecciones se registran
                como observaciones, no como mediciones de motor.
              </p>
              {activoTareas.length > 0 && (
                <p className="text-xs text-muted mt-2">
                  Tareas registradas: {activoTareas.length} · Proxima:{' '}
                  {fmt(activo.proximoMantenimiento)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: QR + Actions */}
        <div className="space-y-4">
          <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 text-center">
            <h2 className="text-sm font-black uppercase tracking-wider text-content mb-3">Código QR</h2>
            <div className="inline-block border border-line p-3 bg-surface mb-3">
              <QRCodeSVG ref={qrRef} value={qrValue} size={140} className="w-full max-w-[160px] h-auto" />
            </div>
            <div className="font-mono text-xs text-muted mb-4 break-all">{activo.codigo}</div>
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 font-bold border border-line shadow-soft hover:bg-slate-800 transition-colors mb-2"
            >
              <Printer size={16} />
              Imprimir Etiqueta
            </button>
            <button
              onClick={handleDownloadLabel}
              className="w-full flex items-center justify-center gap-2 border border-line bg-surface px-4 py-2.5 font-bold text-content hover:bg-subtle shadow-soft transition-colors mb-2"
            >
              <Download size={16} />
              Descargar Etiqueta SVG
            </button>
            <button
              onClick={() => exportarFichaActivoPdf({
                activo,
                mediciones: last10,
                tareas: activoTareas,
                sectorNombre: getSectorNombre(activo.sectorId),
                tipoNombre: getTipoNombre(activo.tipoId),
                responsableNombre: getTecnicoNombre(activo.responsableId ?? ''),
                tipo: tipoActual ?? null,
              })}
              className="w-full flex items-center justify-center gap-2 border border-line bg-surface px-4 py-2.5 font-bold text-content hover:bg-subtle shadow-soft transition-colors mb-2"
            >
              <FileDown size={16} />
              Descargar Ficha PDF
            </button>
            <button
              onClick={() => navigate(`/medicion/${activo.id}`)}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white px-4 py-2.5 font-bold border border-line shadow-soft hover:bg-warn transition-colors"
            >
              <ClipboardList size={16} />
              {esOperativo ? 'Tomar Medición' : 'Registrar Inspección'}
            </button>
          </div>

          {/* Documentación (solo en modo remoto/backend) */}
          {API_URL && <DocumentosActivo activoId={activo.id} />}

          {/* Catalogo de fallas tipicas para la categoria de este equipo */}
          {API_URL && <FallasActivo activoId={activo.id} publico />}

          {/* Cadena de custodia: ubicaciones registradas con GPS */}
          {API_URL && <UbicacionesActivo activoId={activo.id} />}

          {/* Maintenance history */}
          <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-content mb-3">Historial de Mantenimiento</h2>
            {activoTareas.length === 0 ? (
              <p className="text-sm text-faint">Sin tareas registradas</p>
            ) : (
              <div className="space-y-2">
                {activoTareas.map((tarea) => (
                  <div key={tarea.id} className="border border-line p-2">
                    <div className="text-xs font-bold text-content">{tarea.tipo}</div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted">{fmt(tarea.fechaProgramada)}</span>
                      <StatusBadge
                        estado={tarea.estado === 'completado' ? 'normal' : tarea.estado === 'vencido' ? 'critico' : 'alerta'}
                        size="sm"
                      />
                    </div>
                    {tarea.observaciones && (
                      <div className="text-xs text-muted mt-1">{tarea.observaciones}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analisis predictivo: solo para activos operativos. Un mueble o una
          piscina no tienen tendencia de temperatura motor que proyectar. */}
      {esOperativo && (
        <AnalisisActivo
          activo={activo}
          tipo={tipoActual}
          mediciones={activoMediciones}
          tareas={activoTareas}
          onCrearTareaPredictiva={handleCrearTareaPredictiva}
        />
      )}

      {/* Tabla de mediciones: solo si es operativo. Para patrimoniales el
          historial relevante son las TAREAS por fecha (Historial de
          Mantenimiento, mas arriba en la columna derecha), no mediciones
          de motor. */}
      {esOperativo && last10.length > 0 && (
        <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                {['Fecha', 'Temp.', 'Amperaje', 'Presión', 'Vibración', 'Estado', 'Técnico', 'Observaciones', ''].map((h, idx) => (
                  <th key={h || idx} className="text-left px-3 py-2.5 text-xs font-black uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...last10].reverse().map((m, i) => (
                <tr key={m.id} className={`border-b border-line ${i % 2 === 0 ? 'bg-surface' : 'bg-subtle/50'}`}>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{fmt(m.fecha)}</td>
                  <td className="px-3 py-2 font-mono font-bold whitespace-nowrap">{m.temperatura}°C</td>
                  <td className="px-3 py-2 font-mono whitespace-nowrap">{m.amperaje > 0 ? `${m.amperaje}A` : '-'}</td>
                  <td className="px-3 py-2 font-mono whitespace-nowrap">{m.presion > 0 ? `${m.presion} bar` : '-'}</td>
                  <td className="px-3 py-2 capitalize text-xs">{m.vibracion}</td>
                  <td className="px-3 py-2"><StatusBadge estado={m.estado} size="sm" /></td>
                  <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">{getTecnicoNombre(m.tecnicoId)}</td>
                  <td className="px-3 py-2 text-xs text-muted max-w-48 truncate">{m.observaciones || '-'}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => {
                        if (window.confirm('¿Eliminar esta medición?')) deleteMedicion(m.id);
                      }}
                      title="Eliminar medición"
                      className="text-danger hover:bg-danger/10 p-1.5 border border-transparent hover:border-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Para patrimoniales: una lista simple de inspecciones (observaciones
          de cada visita), sin columnas de motor que no aplican. */}
      {!esOperativo && activoMediciones.length > 0 && (
        <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-content mb-3 border border-line pb-2">
            Inspecciones registradas
          </h2>
          <div className="space-y-2">
            {[...last10].reverse().map((m) => (
              <div key={m.id} className="border border-line p-2 flex items-start gap-3">
                <span className="text-xs font-mono font-bold text-content flex-shrink-0">
                  {fmt(m.fecha, 'dd/MM/yy')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-content leading-snug">{m.observaciones || 'Sin observaciones.'}</p>
                  <p className="text-[11px] text-muted mt-1">{getTecnicoNombre(m.tecnicoId)}</p>
                </div>
                <button
                  onClick={() => { if (window.confirm('¿Eliminar esta inspección?')) deleteMedicion(m.id); }}
                  title="Eliminar inspeccion"
                  className="text-danger hover:bg-danger/10 p-1 border border-transparent hover:border-danger flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
