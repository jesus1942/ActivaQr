import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  TrendingUp,
  Wrench,
  FileDown,
} from 'lucide-react';
import { getKpis, Kpis } from '../data/indicadoresApi';
import { hasFeature } from '../data/planes';
import { FeatureLock } from '../components/FeatureLock';
import { exportarInformeMensualPdf } from '../utils/exportPdf';
import { useAuth } from '../context/AuthContext';

const card = 'bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-5';

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }> = ({
  icon, label, value, sub, accent = 'text-content',
}) => (
  <div className={card}>
    <div className="flex items-center gap-2 text-muted mb-2">
      {icon}
      <span className="text-xs font-black uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-3xl font-black ${accent}`}>{value}</p>
    {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
  </div>
);

export const Indicadores: React.FC = () => {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { usuario } = useAuth();

  if (!hasFeature(usuario?.empresa?.plan, 'indicadores')) {
    return (
      <FeatureLock
        feature="indicadores"
        titulo="Indicadores"
        descripcion="Disponibilidad, cumplimiento de tareas, equipos con más fallas y tendencias. Una vista de control mensual para tomar decisiones sobre tu mantenimiento."
      />
    );
  }

  const generarInforme = () => {
    if (!kpis) return;
    exportarInformeMensualPdf({
      kpis,
      empresaNombre: usuario?.empresa?.nombre ?? 'Mi empresa',
      periodo: format(new Date(), 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase()),
      responsableInforme: usuario?.nombre,
    });
  };

  useEffect(() => {
    getKpis().then(setKpis).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-danger font-bold">{error}</p>;
  if (!kpis) return <p className="text-muted">Cargando indicadores...</p>;

  const { resumen, equiposConMasFallas, alertasPorSector, tendenciaFallas, predictivo } = kpis;
  const maxFallas = Math.max(1, ...tendenciaFallas.map((t) => t.fallas));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-content uppercase tracking-tight">Indicadores</h1>
          <p className="text-muted text-sm mt-1">Tablero ejecutivo de gestión de mantenimiento</p>
        </div>
        <button
          onClick={generarInforme}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 min-h-[44px] font-bold border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-sm"
          title="Descargar informe mensual en PDF para el cliente"
        >
          <FileDown size={16} />
          Informe mensual PDF
        </button>
      </div>

      {/* Resumen ejecutivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={<Gauge size={16} />} label="Disponibilidad" value={`${resumen.disponibilidad}%`} sub={`${resumen.operativos} de ${resumen.totalActivos} operativos`} accent="text-ok-strong dark:text-ok" />
        <Metric icon={<Activity size={16} />} label="Activos totales" value={String(resumen.totalActivos)} sub={`${resumen.porEstado.critico ?? 0} críticos · ${resumen.porEstado.alerta ?? 0} en alerta`} />
        <Metric icon={<CheckCircle2 size={16} />} label="Cumplimiento prev." value={`${resumen.cumplimiento}%`} sub="tareas a tiempo" accent="text-brand-600" />
        <Metric icon={<Wrench size={16} />} label="Tareas pendientes" value={String(resumen.tareasPendientes)} sub={`${resumen.tareasVencidas} vencidas`} accent={resumen.tareasVencidas > 0 ? 'text-danger' : 'text-content'} />
        <Metric icon={<Clock size={16} />} label="MTTR" value={resumen.mttrDias != null ? `${resumen.mttrDias} d` : '—'} sub="tiempo medio de reparación" />
        <Metric icon={<Clock size={16} />} label="MTBF" value={resumen.mtbfDias != null ? `${resumen.mtbfDias} d` : '—'} sub="tiempo medio entre fallas" />
        <Metric icon={<CheckCircle2 size={16} />} label="Completadas" value={String(resumen.tareasCompletadas)} sub="órdenes cerradas" />
        <Metric icon={<AlertTriangle size={16} />} label="Estado crítico" value={String(resumen.porEstado.critico ?? 0)} accent="text-danger" />
      </div>

      {/* Mantenimiento predictivo */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-brand-600" />
          <h2 className="text-sm font-black uppercase tracking-wider text-content">Mantenimiento predictivo</h2>
        </div>
        {predictivo.length === 0 ? (
          <p className="text-sm text-muted">No se detectan tendencias ascendentes en los parámetros monitoreados. Todo dentro de lo esperado.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted mb-2">Parámetros con tendencia creciente en las últimas mediciones — revisar antes de que escalen a falla.</p>
            {predictivo.map((p, i) => (
              <button
                key={i}
                onClick={() => navigate(`/activos/${p.activoId}`)}
                className="w-full flex items-center justify-between gap-3 border border-warn bg-warn/10 px-4 py-2 text-left hover:border-warn transition-colors"
              >
                <span className="text-sm font-bold text-content">{p.codigo} — {p.nombre}</span>
                <span className="text-xs font-black uppercase text-warn-strong dark:text-warn flex items-center gap-1">
                  <TrendingUp size={14} /> {p.parametro} subiendo
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Equipos con más fallas */}
        <div className={card}>
          <h2 className="text-sm font-black uppercase tracking-wider text-content mb-3">Equipos con más fallas</h2>
          {equiposConMasFallas.length === 0 ? (
            <p className="text-sm text-muted">Sin fallas registradas.</p>
          ) : (
            <div className="space-y-2">
              {equiposConMasFallas.map((e) => (
                <button
                  key={e.activoId}
                  onClick={() => navigate(`/activos/${e.activoId}`)}
                  className="w-full flex items-center justify-between gap-3 border-b border-line py-2 text-left hover:bg-subtle"
                >
                  <span className="text-sm font-semibold text-content">{e.codigo} — {e.nombre}</span>
                  <span className="text-xs font-black bg-danger/10 text-danger-strong dark:text-danger px-2 py-1 border border-danger">{e.fallas}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alertas por sector */}
        <div className={card}>
          <h2 className="text-sm font-black uppercase tracking-wider text-content mb-3">Alertas por sector</h2>
          {alertasPorSector.length === 0 ? (
            <p className="text-sm text-muted">Sin sectores definidos.</p>
          ) : (
            <div className="space-y-2">
              {alertasPorSector.map((s) => (
                <div key={s.sector} className="flex items-center justify-between gap-3 border-b border-line py-2">
                  <span className="text-sm font-semibold text-content">{s.sector}</span>
                  <span className="text-xs text-muted">
                    {s.total} activos · <span className={`font-black ${s.criticos > 0 ? 'text-danger' : 'text-ok-strong dark:text-ok'}`}>{s.criticos} en alerta</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tendencia de fallas */}
      <div className={card}>
        <h2 className="text-sm font-black uppercase tracking-wider text-content mb-4">Tendencia de fallas (6 meses)</h2>
        <div className="flex items-end justify-between gap-2 h-40">
          {tendenciaFallas.map((t) => (
            <div key={t.mes} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                <div
                  className="w-full bg-brand-600 border border-line"
                  style={{ height: `${(t.fallas / maxFallas) * 100}%`, minHeight: t.fallas > 0 ? '4px' : '0' }}
                  title={`${t.fallas} fallas`}
                />
              </div>
              <span className="text-[10px] font-bold text-muted">{t.mes.slice(5)}</span>
              <span className="text-xs font-black text-content">{t.fallas}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
