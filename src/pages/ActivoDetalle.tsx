// v1.1.0
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, Printer, ClipboardList, Pencil, Trash2 } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EstadoOperativoBadge, ESTADOS_OPERATIVOS } from '../components/ui/EstadoOperativoBadge';
import { ValueGauge } from '../components/ui/ValueGauge';
import { Button, Card, Select } from '../components/ui';
import { EstadoOperativo } from '../data/types';

export const ActivoDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    activos, mediciones, tareas,
    deleteActivo, deleteMedicion, updateActivo,
    getSectorNombre, getTipoNombre, getTecnicoNombre,
  } = useActivos();

  const activo = activos.find((a) => a.id === id);
  if (!activo) return <div className="p-8 text-danger font-bold">Activo no encontrado</div>;

  const activoMediciones = mediciones
    .filter((m) => m.activoId === id)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const last10 = activoMediciones.slice(-10);
  const activoTareas = tareas.filter((t) => t.activoId === id);
  const qrValue = `${window.location.origin}${import.meta.env.BASE_URL}#/ficha/${activo.id}`;

  const chartData = last10.map((m) => ({
    fecha: format(parseISO(m.fecha), 'dd/MM', { locale: es }),
    temperatura: m.temperatura,
    amperaje: m.amperaje,
  }));

  const handlePrint = () => {
    window.print();
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
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <Button
          type="button"
          onClick={() => navigate('/activos')}
          variant="secondary"
          iconLeft={<ArrowLeft size={16} />}
        >
          Volver
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-bold text-2xl sm:text-3xl text-content">{activo.codigo}</span>
            <StatusBadge estado={activo.estado} size="lg" />
            <EstadoOperativoBadge estado={activo.estadoOperativo ?? 'operativo'} size="lg" />
          </div>
          <h1 className="font-display text-lg font-bold text-muted mt-0.5">{activo.nombre}</h1>
          <div className="max-w-xs mt-3">
            <Select
              label="Estado operativo"
              value={activo.estadoOperativo ?? 'operativo'}
              onChange={(e) => updateActivo(activo.id, { estadoOperativo: e.target.value as EstadoOperativo })}
            >
              {ESTADOS_OPERATIVOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            type="button"
            onClick={() => navigate('/activos', { state: { editId: activo.id } })}
            variant="secondary"
            iconLeft={<Pencil size={15} />}
            className="flex-1 sm:flex-none"
          >
            Editar
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            variant="danger"
            iconLeft={<Trash2 size={15} />}
            className="flex-1 sm:flex-none"
          >
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ficha técnica */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="md">
            <h2 className="font-display text-base font-bold text-content mb-4">Ficha técnica</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {ficha.map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <span className="text-xs font-semibold text-faint min-w-28">{label}</span>
                  <span className="text-sm font-semibold text-content capitalize">{value}</span>
                </div>
              ))}
            </div>
            {activo.notas && (
              <div className="mt-4 p-3 bg-subtle border border-line rounded-md">
                <span className="text-xs font-semibold text-warn-strong dark:text-warn">Notas: </span>
                <span className="text-sm text-muted">{activo.notas}</span>
              </div>
            )}
          </Card>

          {/* Value Gauges */}
          <Card padding="md">
            <h2 className="font-display text-base font-bold text-content mb-4">Parámetros de operación</h2>
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
          </Card>
        </div>

        {/* Right: QR + Actions */}
        <div className="space-y-4">
          <Card padding="md" className="text-center">
            <h2 className="font-display text-base font-bold text-content mb-4">Código QR</h2>
            <div className="inline-block border border-line p-3 bg-white rounded-md mb-3">
              <QRCodeSVG value={qrValue} size={140} className="w-full max-w-[160px] h-auto" />
            </div>
            <div className="font-mono text-xs text-muted mb-4 break-all">{activo.codigo}</div>
            <Button
              type="button"
              onClick={handlePrint}
              variant="secondary"
              block
              iconLeft={<Printer size={16} />}
              className="mb-2"
            >
              Imprimir Etiqueta
            </Button>
            <Button
              type="button"
              onClick={() => navigate(`/medicion/${activo.id}`)}
              block
              iconLeft={<ClipboardList size={16} />}
            >
              Tomar Medición
            </Button>
          </Card>

          {/* Maintenance history */}
          <Card padding="md">
            <h2 className="font-display text-base font-bold text-content mb-4">Historial de mantenimiento</h2>
            {activoTareas.length === 0 ? (
              <p className="text-sm text-faint">Sin tareas registradas</p>
            ) : (
              <div className="space-y-2">
                {activoTareas.map((tarea) => (
                  <div key={tarea.id} className="border border-line rounded-md p-3">
                    <div className="text-xs font-bold text-content">{tarea.tipo}</div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted">{format(parseISO(tarea.fechaProgramada), 'dd/MM/yyyy', { locale: es })}</span>
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
          </Card>
        </div>
      </div>

      {/* Measurement history */}
      <Card padding="md">
        <h2 className="font-display text-base font-bold text-content mb-4">Historial de mediciones (últimas 10)</h2>
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="temperatura" stroke="#F97316" strokeWidth={2} dot={{ r: 4, stroke: '#1E293B', strokeWidth: 2 }} name="Temp. (°C)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-faint">
              {['Fecha', 'Temp.', 'Amperaje', 'Presión', 'Vibración', 'Estado', 'Técnico', 'Observaciones', ''].map((h, idx) => (
                <th key={h || idx} className="text-left px-3 py-2.5 text-xs font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...last10].reverse().map((m, i) => (
              <tr key={m.id} className="hover:bg-subtle transition-colors">
                <td className="px-3 py-2 font-mono text-xs text-muted whitespace-nowrap">{format(parseISO(m.fecha), 'dd/MM/yyyy', { locale: es })}</td>
                <td className="px-3 py-2 font-mono font-bold text-content whitespace-nowrap">{m.temperatura}°C</td>
                <td className="px-3 py-2 font-mono text-muted whitespace-nowrap">{m.amperaje > 0 ? `${m.amperaje}A` : '-'}</td>
                <td className="px-3 py-2 font-mono text-muted whitespace-nowrap">{m.presion > 0 ? `${m.presion} bar` : '-'}</td>
                <td className="px-3 py-2 capitalize text-xs text-muted">{m.vibracion}</td>
                <td className="px-3 py-2"><StatusBadge estado={m.estado} size="sm" /></td>
                <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">{getTecnicoNombre(m.tecnicoId)}</td>
                <td className="px-3 py-2 text-xs text-muted max-w-48 truncate">{m.observaciones || '-'}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => {
                      if (window.confirm('¿Eliminar esta medición?')) deleteMedicion(m.id);
                    }}
                    title="Eliminar medición"
                    className="press grid place-items-center w-8 h-8 rounded-md text-danger hover:bg-danger/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
