import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { getKpis, Kpis } from '../data/indicadoresApi';

const card = 'bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-5';

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }> = ({
  icon, label, value, sub, accent = 'text-slate-900',
}) => (
  <div className={card}>
    <div className="flex items-center gap-2 text-slate-500 mb-2">
      {icon}
      <span className="text-xs font-black uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-3xl font-black ${accent}`}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

export const Indicadores: React.FC = () => {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getKpis().then(setKpis).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600 font-bold">{error}</p>;
  if (!kpis) return <p className="text-slate-500">Cargando indicadores...</p>;

  const { resumen, equiposConMasFallas, alertasPorSector, tendenciaFallas, predictivo } = kpis;
  const maxFallas = Math.max(1, ...tendenciaFallas.map((t) => t.fallas));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sketch text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Indicadores</h1>
        <p className="text-slate-500 text-sm mt-1">Tablero ejecutivo de gestión de mantenimiento</p>
      </div>

      {/* Resumen ejecutivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={<Gauge size={16} />} label="Disponibilidad" value={`${resumen.disponibilidad}%`} sub={`${resumen.operativos} de ${resumen.totalActivos} operativos`} accent="text-emerald-600" />
        <Metric icon={<Activity size={16} />} label="Activos totales" value={String(resumen.totalActivos)} sub={`${resumen.porEstado.critico ?? 0} críticos · ${resumen.porEstado.alerta ?? 0} en alerta`} />
        <Metric icon={<CheckCircle2 size={16} />} label="Cumplimiento prev." value={`${resumen.cumplimiento}%`} sub="tareas a tiempo" accent="text-orange-500" />
        <Metric icon={<Wrench size={16} />} label="Tareas pendientes" value={String(resumen.tareasPendientes)} sub={`${resumen.tareasVencidas} vencidas`} accent={resumen.tareasVencidas > 0 ? 'text-red-600' : 'text-slate-900'} />
        <Metric icon={<Clock size={16} />} label="MTTR" value={resumen.mttrDias != null ? `${resumen.mttrDias} d` : '—'} sub="tiempo medio de reparación" />
        <Metric icon={<Clock size={16} />} label="MTBF" value={resumen.mtbfDias != null ? `${resumen.mtbfDias} d` : '—'} sub="tiempo medio entre fallas" />
        <Metric icon={<CheckCircle2 size={16} />} label="Completadas" value={String(resumen.tareasCompletadas)} sub="órdenes cerradas" />
        <Metric icon={<AlertTriangle size={16} />} label="Estado crítico" value={String(resumen.porEstado.critico ?? 0)} accent="text-red-600" />
      </div>

      {/* Mantenimiento predictivo */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-orange-500" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Mantenimiento predictivo</h2>
        </div>
        {predictivo.length === 0 ? (
          <p className="text-sm text-slate-500">No se detectan tendencias ascendentes en los parámetros monitoreados. Todo dentro de lo esperado.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 mb-2">Parámetros con tendencia creciente en las últimas mediciones — revisar antes de que escalen a falla.</p>
            {predictivo.map((p, i) => (
              <button
                key={i}
                onClick={() => navigate(`/activos/${p.activoId}`)}
                className="w-full flex items-center justify-between gap-3 border-2 border-amber-300 bg-amber-50 px-4 py-2 text-left hover:border-amber-500 transition-colors"
              >
                <span className="text-sm font-bold text-slate-800">{p.codigo} — {p.nombre}</span>
                <span className="text-xs font-black uppercase text-amber-700 flex items-center gap-1">
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
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">Equipos con más fallas</h2>
          {equiposConMasFallas.length === 0 ? (
            <p className="text-sm text-slate-500">Sin fallas registradas.</p>
          ) : (
            <div className="space-y-2">
              {equiposConMasFallas.map((e) => (
                <button
                  key={e.activoId}
                  onClick={() => navigate(`/activos/${e.activoId}`)}
                  className="w-full flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-left hover:bg-slate-50"
                >
                  <span className="text-sm font-semibold text-slate-800">{e.codigo} — {e.nombre}</span>
                  <span className="text-xs font-black bg-red-100 text-red-700 px-2 py-1 border-2 border-red-300">{e.fallas}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alertas por sector */}
        <div className={card}>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">Alertas por sector</h2>
          {alertasPorSector.length === 0 ? (
            <p className="text-sm text-slate-500">Sin sectores definidos.</p>
          ) : (
            <div className="space-y-2">
              {alertasPorSector.map((s) => (
                <div key={s.sector} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2">
                  <span className="text-sm font-semibold text-slate-800">{s.sector}</span>
                  <span className="text-xs text-slate-500">
                    {s.total} activos · <span className={`font-black ${s.criticos > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{s.criticos} en alerta</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tendencia de fallas */}
      <div className={card}>
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4">Tendencia de fallas (6 meses)</h2>
        <div className="flex items-end justify-between gap-2 h-40">
          {tendenciaFallas.map((t) => (
            <div key={t.mes} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                <div
                  className="w-full bg-orange-500 border-2 border-slate-900"
                  style={{ height: `${(t.fallas / maxFallas) * 100}%`, minHeight: t.fallas > 0 ? '4px' : '0' }}
                  title={`${t.fallas} fallas`}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500">{t.mes.slice(5)}</span>
              <span className="text-xs font-black text-slate-800">{t.fallas}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
