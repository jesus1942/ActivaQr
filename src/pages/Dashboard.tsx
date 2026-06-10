// v1.2.0 — Dashboard accionable
//
// Tres franjas arriba con lo que hay que hacer HOY: vencido (rojo),
// esta semana (amarillo), al dia (verde). Cada item lleva directo
// al activo o a la pantalla relevante. Los graficos (barras por
// sector + tabla de actividad) bajan al fondo: siguen estando pero
// dejan de ser lo primero.

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Package, AlertTriangle, ChevronRight, CalendarClock, CheckCircle2, Wrench, ClipboardList,
} from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { StatusBadge } from '../components/ui/StatusBadge';
import { OnboardingTour } from '../components/OnboardingTour';

export const Dashboard: React.FC = () => {
  const { activos, mediciones, tareas, getSectorNombre, getTecnicoNombre } = useActivos();
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Clasificacion de tareas por urgencia ─────────────────────────────
  type ItemUrgente = { id: string; codigo: string; nombre: string; tipo: string; activoId: string; fecha: Date; dias: number };
  const buckets = useMemo(() => {
    const vencidas: ItemUrgente[] = [];
    const semana: ItemUrgente[] = [];
    let alDiaCount = 0;
    tareas.forEach((t) => {
      if (t.estado === 'completado') return;
      const fecha = parseISO(t.fechaProgramada);
      if (isNaN(fecha.getTime())) return;
      const dias = differenceInDays(fecha, today);
      const activo = activos.find((a) => a.id === t.activoId);
      if (!activo) return;
      const item: ItemUrgente = {
        id: t.id,
        codigo: activo.codigo,
        nombre: activo.nombre,
        tipo: t.tipo,
        activoId: t.activoId,
        fecha,
        dias,
      };
      if (dias < 0) vencidas.push(item);
      else if (dias <= 7) semana.push(item);
      else alDiaCount++;
    });
    // Activos en estado critico/alerta tambien suman a la urgencia
    const activosCriticos = activos.filter((a) => a.estado === 'critico');
    const activosAlerta = activos.filter((a) => a.estado === 'alerta');
    vencidas.sort((a, b) => a.dias - b.dias);
    semana.sort((a, b) => a.dias - b.dias);
    return { vencidas, semana, alDiaCount, activosCriticos, activosAlerta };
  }, [tareas, activos, today]);

  // ── KPIs chicos (debajo de las franjas) ──────────────────────────────
  const kpis = useMemo(() => {
    const totalActivos = activos.length;
    const operativos = activos.filter((a) => a.estadoOperativo === 'operativo').length;
    const fueraServicio = activos.filter((a) => a.estadoOperativo === 'fuera_servicio').length;
    const inspeccionesMes = mediciones.filter((m) => {
      const d = parseISO(m.fecha);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }).length;
    return { totalActivos, operativos, fueraServicio, inspeccionesMes };
  }, [activos, mediciones, today]);

  // ── Grafico: mediciones por sector (vista secundaria, abajo) ────────
  const chartData = useMemo(() => {
    const porSector = activos.reduce<Record<string, number>>((acc, activo) => {
      const count = mediciones.filter((m) => m.activoId === activo.id).length;
      const nombre = getSectorNombre(activo.sectorId);
      acc[nombre] = (acc[nombre] || 0) + count;
      return acc;
    }, {});
    return Object.entries(porSector).map(([sector, count]) => ({ sector, mediciones: count }));
  }, [activos, mediciones, getSectorNombre]);

  const recentMediciones = useMemo(
    () => [...mediciones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 8),
    [mediciones]
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="font-sketch text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Lo que hay que hacer hoy</p>
        </div>
        <div className="text-xs font-mono text-slate-500">
          {format(today, "EEEE d 'de' MMMM", { locale: es })}
        </div>
      </div>

      {/* ───────── Franjas accionables ───────── */}
      <div className="space-y-3 mb-8">
        <FranjaUrgencia
          tono="rojo"
          icono={<AlertTriangle size={18} />}
          titulo="Vencido"
          contador={buckets.vencidas.length + buckets.activosCriticos.length}
          subtitulo={
            buckets.activosCriticos.length > 0
              ? `${buckets.vencidas.length} tareas vencidas · ${buckets.activosCriticos.length} activos críticos`
              : `${buckets.vencidas.length} tareas vencidas`
          }
          delay={0}
        >
          {buckets.vencidas.slice(0, 4).map((item) => (
            <ItemLista
              key={item.id}
              codigo={item.codigo}
              nombre={`${item.tipo} · ${item.nombre}`}
              fecha={`hace ${Math.abs(item.dias)}d`}
              tono="rojo"
              onClick={() => navigate(`/activos/${item.activoId}`)}
            />
          ))}
          {buckets.activosCriticos.slice(0, 3).map((a) => (
            <ItemLista
              key={a.id}
              codigo={a.codigo}
              nombre={`Estado crítico · ${a.nombre}`}
              tono="rojo"
              onClick={() => navigate(`/activos/${a.id}`)}
            />
          ))}
          {buckets.vencidas.length === 0 && buckets.activosCriticos.length === 0 && (
            <VacioMsg texto="Sin tareas vencidas ni activos críticos. Bien." />
          )}
        </FranjaUrgencia>

        <FranjaUrgencia
          tono="amarillo"
          icono={<CalendarClock size={18} />}
          titulo="Esta semana"
          contador={buckets.semana.length + buckets.activosAlerta.length}
          subtitulo={
            buckets.activosAlerta.length > 0
              ? `${buckets.semana.length} tareas próximas · ${buckets.activosAlerta.length} activos en alerta`
              : `${buckets.semana.length} tareas próximas`
          }
          delay={1}
        >
          {buckets.semana.slice(0, 4).map((item) => (
            <ItemLista
              key={item.id}
              codigo={item.codigo}
              nombre={`${item.tipo} · ${item.nombre}`}
              fecha={item.dias === 0 ? 'hoy' : `en ${item.dias}d`}
              tono="amarillo"
              onClick={() => navigate(`/activos/${item.activoId}`)}
            />
          ))}
          {buckets.activosAlerta.slice(0, 3).map((a) => (
            <ItemLista
              key={a.id}
              codigo={a.codigo}
              nombre={`En alerta · ${a.nombre}`}
              tono="amarillo"
              onClick={() => navigate(`/activos/${a.id}`)}
            />
          ))}
          {buckets.semana.length === 0 && buckets.activosAlerta.length === 0 && (
            <VacioMsg texto="Sin pendientes esta semana." />
          )}
        </FranjaUrgencia>

        <FranjaUrgencia
          tono="verde"
          icono={<CheckCircle2 size={18} />}
          titulo="Al día"
          contador={buckets.alDiaCount}
          subtitulo="Tareas programadas más adelante"
          delay={2}
          colapsableInicial
        >
          <VacioMsg texto="Todo lo que viene más adelante está en orden." />
        </FranjaUrgencia>
      </div>

      {/* ───────── KPIs chicos ───────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Kpi label="Activos totales" value={kpis.totalActivos} icon={Package} color="text-blue-600" bg="bg-blue-50" onClick={() => navigate('/activos')} delay={3} />
        <Kpi label="Operativos" value={kpis.operativos} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" onClick={() => navigate('/activos')} delay={4} />
        <Kpi label="Fuera de servicio" value={kpis.fueraServicio} icon={Wrench} color="text-red-600" bg="bg-red-50" onClick={() => navigate('/activos')} delay={5} />
        <Kpi label="Inspecciones del mes" value={kpis.inspeccionesMes} icon={ClipboardList} color="text-orange-600" bg="bg-orange-50" onClick={() => navigate('/activos')} delay={6} />
      </div>

      {/* ───────── Vistas secundarias (graficos + actividad) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="anim-fadeup bg-[#FFFEF7] border-2 border-slate-700 shadow-[3px_3px_0px_0px_#1e293b] p-4" style={{ ['--i' as any]: 7 }}>
          <h2 className="font-sketch text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-700 mb-3">Mediciones por sector</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Sin mediciones cargadas todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="sector" tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 0, border: '2px solid #0f172a', fontSize: 12 }} />
                <Bar dataKey="mediciones" fill="#F97316" stroke="#1E293B" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="anim-fadeup bg-[#FFFEF7] border-2 border-slate-700 shadow-[3px_3px_0px_0px_#1e293b] p-4" style={{ ['--i' as any]: 8 }}>
          <h2 className="font-sketch text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-700 mb-3">Actividad reciente</h2>
          {recentMediciones.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Sin actividad reciente.</p>
          ) : (
            <div className="space-y-1.5">
              {recentMediciones.map((med) => {
                const activo = activos.find((a) => a.id === med.activoId);
                return (
                  <button
                    key={med.id}
                    onClick={() => navigate(`/activos/${med.activoId}`)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 border-2 border-transparent hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono font-bold text-slate-800 truncate">{activo?.codigo}</div>
                      <div className="text-[11px] text-slate-500 truncate">{getTecnicoNombre(med.tecnicoId)}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge estado={med.estado} size="sm" />
                      <span className="text-[11px] font-mono text-slate-500 w-14 text-right">
                        {format(parseISO(med.fecha), 'dd/MM/yy', { locale: es })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <OnboardingTour />
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────
// Subcomponentes
// ───────────────────────────────────────────────────────────────────────

const TONOS = {
  rojo:      { bg: 'bg-red-50',     border: 'border-red-400',     text: 'text-red-800',     count: 'bg-red-600',     ring: 'shadow-[3px_3px_0px_0px_#991b1b]' },
  amarillo:  { bg: 'bg-amber-50',   border: 'border-amber-400',   text: 'text-amber-800',   count: 'bg-amber-500',   ring: 'shadow-[3px_3px_0px_0px_#92400e]' },
  verde:     { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-800', count: 'bg-emerald-600', ring: 'shadow-[3px_3px_0px_0px_#065f46]' },
} as const;

interface FranjaUrgenciaProps {
  tono: keyof typeof TONOS;
  icono: React.ReactNode;
  titulo: string;
  contador: number;
  subtitulo: string;
  delay: number;
  colapsableInicial?: boolean;
  children: React.ReactNode;
}

const FranjaUrgencia: React.FC<FranjaUrgenciaProps> = ({
  tono, icono, titulo, contador, subtitulo, delay, colapsableInicial, children,
}) => {
  const t = TONOS[tono];
  const [abierto, setAbierto] = React.useState(!colapsableInicial);
  return (
    <div
      className={`anim-fadeup border-2 ${t.border} ${t.bg} ${t.ring}`}
      style={{ ['--i' as any]: delay }}
    >
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`w-9 h-9 ${t.count} text-white flex items-center justify-center border-2 border-slate-900 flex-shrink-0`}>
          {icono}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 className={`font-sketch text-lg sm:text-xl font-black uppercase ${t.text}`}>{titulo}</h2>
            <span className={`text-sm font-black ${t.text} opacity-70`}>{contador}</span>
          </div>
          <p className={`text-xs ${t.text} opacity-80 truncate`}>{subtitulo}</p>
        </div>
        <ChevronRight
          size={18}
          className={`${t.text} flex-shrink-0 transition-transform duration-300 ${abierto ? 'rotate-90' : ''}`}
        />
      </button>
      {abierto && (
        <div className="border-t-2 border-slate-200 bg-white/70 px-2 py-2 space-y-1 anim-fadein">
          {children}
        </div>
      )}
    </div>
  );
};

const ItemLista: React.FC<{
  codigo: string;
  nombre: string;
  fecha?: string;
  tono: keyof typeof TONOS;
  onClick: () => void;
}> = ({ codigo, nombre, fecha, tono, onClick }) => {
  const t = TONOS[tono];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2.5 py-2 border-2 border-transparent hover:border-slate-300 hover:bg-white active:bg-slate-50 transition-all duration-150 text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono font-black text-slate-800">{codigo}</div>
        <div className={`text-xs ${t.text} truncate`}>{nombre}</div>
      </div>
      {fecha && (
        <span className={`text-[10px] font-black uppercase ${t.text} flex-shrink-0`}>{fecha}</span>
      )}
      <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
    </button>
  );
};

const VacioMsg: React.FC<{ texto: string }> = ({ texto }) => (
  <p className="text-xs text-slate-500 italic px-2.5 py-2">{texto}</p>
);

const Kpi: React.FC<{
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  onClick: () => void;
  delay: number;
}> = ({ label, value, icon: Icon, color, bg, onClick, delay }) => (
  <button
    onClick={onClick}
    style={{ ['--i' as any]: delay }}
    className="anim-fadeup bg-[#FFFEF7] border-2 border-slate-700 shadow-[3px_3px_0px_0px_#1e293b] p-3 text-left w-full hover:shadow-[1px_1px_0px_0px_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-150"
  >
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 leading-tight">{label}</div>
        <div className={`font-sketch text-3xl sm:text-4xl font-black ${color}`}>{value}</div>
      </div>
      <div className={`${bg} p-2 border-2 border-slate-200 flex-shrink-0`}>
        <Icon size={18} className={color} />
      </div>
    </div>
  </button>
);