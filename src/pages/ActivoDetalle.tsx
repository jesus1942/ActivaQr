// v1.1.0
import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Printer, ClipboardList, Pencil, Trash2, FileDown } from 'lucide-react';
import { exportarFichaActivoPdf } from '../utils/exportPdf';
import { imprimirEtiquetaQR } from '../utils/imprimirEtiqueta';
import { useActivos } from '../hooks/useActivos';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EstadoOperativoBadge, ESTADOS_OPERATIVOS } from '../components/ui/EstadoOperativoBadge';
import { ValueGauge } from '../components/ui/ValueGauge';
import { DocumentosActivo } from '../components/DocumentosActivo';
import { FallasActivo } from '../components/FallasActivo';
import { UbicacionesActivo } from '../components/UbicacionesActivo';
import { AnalisisActivo } from '../components/analitica/AnalisisActivo';
import { EstadoOperativo, TareaMantenimiento } from '../data/types';
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
  if (!activo) return <div className="p-8 text-red-600 font-bold">Activo no encontrado</div>;

  const activoMediciones = mediciones
    .filter((m) => m.activoId === id)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const last10 = activoMediciones.slice(-10);
  const activoTareas = tareas.filter((t) => t.activoId === id);
  const tipoActual = tipos.find((t) => t.id === activo.tipoId);
  const qrValue = `${window.location.origin}${import.meta.env.BASE_URL}#/ficha/${activo.id}`;

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

  const handlePrint = () => {
    const svg = qrRef.current;
    if (!svg) {
      alert('No se pudo generar el QR. Recarga la pagina y reintenta.');
      return;
    }
    const viewBox = svg.getAttribute('viewBox') ?? '0 0 29 29';
    const inner = svg.innerHTML;
    const empresaNombre = (usuario?.empresa as { nombre?: string } | null)?.nombre;
    imprimirEtiquetaQR({
      codigo: activo.codigo,
      nombre: activo.nombre,
      qrSvgString: inner,
      qrViewBox: viewBox,
      empresaNombre,
    });
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
    { label: 'Fecha Ingreso', value: format(parseISO(activo.fechaIngreso), 'dd/MM/yyyy', { locale: es }) },
    { label: 'Horas Actuales', value: `${activo.horasActuales} hs` },
    { label: 'Intervalo Medición', value: `${activo.intervaloMedicionHoras} hs` },
    { label: 'Intervalo Lubricación', value: activo.intervaloLubricacionHoras ? `${activo.intervaloLubricacionHoras} hs` : 'N/A' },
    { label: 'Prox. Mantenimiento', value: format(parseISO(activo.proximoMantenimiento), 'dd/MM/yyyy', { locale: es }) },
    { label: 'Tipo de desplazamiento', value: activo.esItinerante ? 'Itinerante' : 'Estatico' },
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
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold border-2 border-slate-300 px-3 min-h-[44px] hover:border-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-black text-2xl sm:text-3xl text-slate-900">{activo.codigo}</span>
            <StatusBadge estado={activo.estado} size="lg" />
            <EstadoOperativoBadge estado={activo.estadoOperativo ?? 'operativo'} size="lg" />
          </div>
          <h1 className="text-lg font-bold text-slate-700 mt-0.5">{activo.nombre}</h1>
          <div className="flex items-center gap-2 mt-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">Estado operativo:</label>
            <select
              value={activo.estadoOperativo ?? 'operativo'}
              onChange={(e) => updateActivo(activo.id, { estadoOperativo: e.target.value as EstadoOperativo })}
              className="border-2 border-slate-800 px-2 h-9 text-sm font-semibold outline-none focus:border-orange-500 bg-white"
            >
              {ESTADOS_OPERATIVOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate('/activos', { state: { editId: activo.id } })}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-2 border-slate-800 px-3 min-h-[44px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Pencil size={15} />
            Editar
          </button>
          {puedeEliminarActivos(usuario?.rol) && (
            <button
              onClick={handleDelete}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-2 border-red-600 text-red-600 px-3 min-h-[44px] font-bold hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
              Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left: Ficha técnica */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-3 border-b-2 border-slate-200 pb-2">Ficha Técnica</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {ficha.map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 min-w-28">{label}:</span>
                  <span className="text-sm font-semibold text-slate-800 capitalize">{value}</span>
                </div>
              ))}
            </div>
            {activo.notas && (
              <div className="mt-3 p-2 bg-amber-50 border-2 border-amber-200">
                <span className="text-xs font-black uppercase text-amber-700">Notas: </span>
                <span className="text-sm text-amber-800">{activo.notas}</span>
              </div>
            )}
          </div>

          {/* Value Gauges */}
          <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-3 border-b-2 border-slate-200 pb-2">Parámetros de Operación</h2>
            {activoMediciones.length > 0 && (
              <>
                <ValueGauge
                  label="Temperatura"
                  value={activoMediciones[activoMediciones.length - 1].temperatura}
                  min={activo.temperaturaMin}
                  max={activo.temperaturaMax}
                  alertThreshold={activo.temperaturaAlerta}
                  criticalThreshold={activo.temperaturaCritica}
                  unit="°C"
                />
                {activo.amperajeNormal > 0 && (
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
                {activo.presionNormal > 0 && (
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
            )}
          </div>
        </div>

        {/* Right: QR + Actions */}
        <div className="space-y-4">
          <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4 text-center">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-3">Código QR</h2>
            <div className="inline-block border-4 border-slate-800 p-3 bg-white mb-3">
              <QRCodeSVG ref={qrRef} value={qrValue} size={140} className="w-full max-w-[160px] h-auto" />
            </div>
            <div className="font-mono text-xs text-slate-500 mb-4 break-all">{activo.codigo}</div>
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] hover:bg-slate-700 transition-colors mb-2"
            >
              <Printer size={16} />
              Imprimir Etiqueta
            </button>
            <button
              onClick={() => exportarFichaActivoPdf({
                activo,
                mediciones: last10,
                tareas: activoTareas,
                sectorNombre: getSectorNombre(activo.sectorId),
                tipoNombre: getTipoNombre(activo.tipoId),
                responsableNombre: getTecnicoNombre(activo.responsableId ?? ''),
              })}
              className="w-full flex items-center justify-center gap-2 border-2 border-slate-800 bg-white px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] transition-colors mb-2"
            >
              <FileDown size={16} />
              Descargar Ficha PDF
            </button>
            <button
              onClick={() => navigate(`/medicion/${activo.id}`)}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2.5 font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] hover:bg-orange-400 transition-colors"
            >
              <ClipboardList size={16} />
              Tomar Medición
            </button>
          </div>

          {/* Documentación (solo en modo remoto/backend) */}
          {API_URL && <DocumentosActivo activoId={activo.id} />}

          {/* Catalogo de fallas tipicas para la categoria de este equipo */}
          {API_URL && <FallasActivo activoId={activo.id} publico />}

          {/* Cadena de custodia: ubicaciones registradas con GPS */}
          {API_URL && <UbicacionesActivo activoId={activo.id} />}

          {/* Maintenance history */}
          <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-3">Historial de Mantenimiento</h2>
            {activoTareas.length === 0 ? (
              <p className="text-sm text-slate-400">Sin tareas registradas</p>
            ) : (
              <div className="space-y-2">
                {activoTareas.map((tarea) => (
                  <div key={tarea.id} className="border-2 border-slate-200 p-2">
                    <div className="text-xs font-bold text-slate-700">{tarea.tipo}</div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-500">{format(parseISO(tarea.fechaProgramada), 'dd/MM/yyyy', { locale: es })}</span>
                      <StatusBadge
                        estado={tarea.estado === 'completado' ? 'normal' : tarea.estado === 'vencido' ? 'critico' : 'alerta'}
                        size="sm"
                      />
                    </div>
                    {tarea.observaciones && (
                      <div className="text-xs text-slate-500 mt-1">{tarea.observaciones}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analisis predictivo: graficos con tendencias, umbrales y proyeccion */}
      <AnalisisActivo
        activo={activo}
        tipo={tipoActual}
        mediciones={activoMediciones}
        tareas={activoTareas}
        onCrearTareaPredictiva={handleCrearTareaPredictiva}
      />

      <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] overflow-x-auto">
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
              <tr key={m.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{format(parseISO(m.fecha), 'dd/MM/yyyy', { locale: es })}</td>
                <td className="px-3 py-2 font-mono font-bold whitespace-nowrap">{m.temperatura}°C</td>
                <td className="px-3 py-2 font-mono whitespace-nowrap">{m.amperaje > 0 ? `${m.amperaje}A` : '-'}</td>
                <td className="px-3 py-2 font-mono whitespace-nowrap">{m.presion > 0 ? `${m.presion} bar` : '-'}</td>
                <td className="px-3 py-2 capitalize text-xs">{m.vibracion}</td>
                <td className="px-3 py-2"><StatusBadge estado={m.estado} size="sm" /></td>
                <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{getTecnicoNombre(m.tecnicoId)}</td>
                <td className="px-3 py-2 text-xs text-slate-500 max-w-48 truncate">{m.observaciones || '-'}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => {
                      if (window.confirm('¿Eliminar esta medición?')) deleteMedicion(m.id);
                    }}
                    title="Eliminar medición"
                    className="text-red-600 hover:bg-red-50 p-1.5 border-2 border-transparent hover:border-red-200"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
