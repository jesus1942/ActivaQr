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
  Package, AlertTriangle, ChevronRight, CalendarClock, CheckCircle2, Wrench, ClipboardList, Sparkles,
} from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { useTheme } from '../context/ThemeContext';
import { OnboardingTour } from '../components/OnboardingTour';

export const Dashboard: React.FC = () => {
  const { activos, mediciones, tareas, sectores, tipos, getSectorNombre, getTecnicoNombre } = useActivos();
  const navigate = useNavigate();
  const { theme } = useTheme();
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

  const gridColor = theme === 'dark' ? '#262C3A' : '#E8EBF0';
  const axisColor = theme === 'dark' ? '#9CA7BA' : '#94A3B8';

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight">Dashboard</h1>
          <p className="text-muted text-sm mt-1">Lo que hay que hacer hoy</p>
        </div>
        <div className="text-xs font-mono text-muted">
          {format(today, "EEEE d 'de' MMMM", { locale: es })}
        </div>
      </div>

      {activos.length === 0 && (
        <Card padding="md" className="mb-6 border-l-4 border-l-brand-600 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex gap-3 items-start flex-1 min-w-0">
            <Sparkles size={24} className="flex-shrink-0 mt-0.5 text-brand-600" />
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg leading-tight text-content">¡Bienvenido a ActivaQR!</h2>
              <p className="text-sm mt-1 leading-snug text-muted">
                Cargá tu primer activo. Te vamos a guiar paso a paso, no hace falta configurar nada de antes.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/activos')}
            className="press flex items-center justify-center gap-2 bg-brand-600 text-white px-5 min-h-[48px] font-semibold rounded-md shadow-soft hover:bg-brand-700 transition-all text-sm whitespace-nowrap"
          >
            Cargar mi primer activo
            <ChevronRight size={18} />
          </button>
        </Card>
      )}

      {activos.length > 0 && (sectores.length === 0 || tipos.length === 0) && (
        <div className="border-l-2 border-warn bg-warn/10 rounded-md p-3 mb-6 text-sm text-warn-strong dark:text-warn flex items-center gap-3">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span>Hay activos cargados pero sin sectores o tipos definidos. Editá un activo para crearlos.</span>
        </div>
      )}

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
          colapsableInicial
        >
          <VacioMsg texto="Todo lo que viene más adelante está en orden." />
        </FranjaUrgencia>
      </div>

      {/* ───────── KPIs chicos ───────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Kpi label="Activos totales" value={kpis.totalActivos} icon={Package} tint="text-brand-600 bg-brand-50 dark:bg-brand-600/15" onClick={() => navigate('/activos')} />
        <Kpi label="Operativos" value={kpis.operativos} icon={CheckCircle2} tint="text-ok-strong bg-ok/10 dark:text-ok" onClick={() => navigate('/activos')} />
        <Kpi label="Fuera de servicio" value={kpis.fueraServicio} icon={Wrench} tint="text-danger-strong bg-danger/10 dark:text-danger" onClick={() => navigate('/activos')} />
        <Kpi label="Inspecciones del mes" value={kpis.inspeccionesMes} icon={ClipboardList} tint="text-warn-strong bg-warn/10 dark:text-warn" onClick={() => navigate('/activos')} />
      </div>

      {/* ───────── Vistas secundarias (graficos + actividad) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card padding="md">
          <h2 className="font-display text-lg font-bold text-content mb-3">Mediciones por sector</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-faint italic">Sin mediciones cargadas todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="sector" tick={{ fontSize: 10, fontWeight: 600, fill: axisColor }} stroke={gridColor} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} stroke={gridColor} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid ' + gridColor, fontSize: 12, background: theme === 'dark' ? '#141822' : '#fff' }} />
                <Bar dataKey="mediciones" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card padding="md">
          <h2 className="font-display text-lg font-bold text-content mb-3">Actividad reciente</h2>
          {recentMediciones.length === 0 ? (
            <p className="text-sm text-faint italic">Sin actividad reciente.</p>
          ) : (
            <div className="space-y-1">
              {recentMediciones.map((med) => {
                const activo = activos.find((a) => a.id === med.activoId);
                return (
                  <button
                    key={med.id}
                    onClick={() => navigate(`/activos/${med.activoId}`)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-subtle transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono font-semibold text-content truncate">{activo?.codigo}</div>
                      <div className="text-[11px] text-muted truncate">{getTecnicoNombre(med.tecnicoId)}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge estado={med.estado} size="sm" />
                      <span className="text-[11px] font-mono text-faint w-14 text-right">
                        {format(parseISO(med.fecha), 'dd/MM/yy', { locale: es })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <OnboardingTour />
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────
// Subcomponentes
// ───────────────────────────────────────────────────────────────────────

const TONOS = {
  rojo:     { bg: 'bg-danger/5',  border: 'border-l-danger', text: 'text-danger-strong dark:text-danger', chip: 'bg-danger text-white' },
  amarillo: { bg: 'bg-warn/5',    border: 'border-l-warn',   text: 'text-warn-strong dark:text-warn',     chip: 'bg-warn text-white' },
  verde:    { bg: 'bg-ok/5',      border: 'border-l-ok',     text: 'text-ok-strong dark:text-ok',         chip: 'bg-ok text-white' },
} as const;

interface FranjaUrgenciaProps {
  tono: keyof typeof TONOS;
  icono: React.ReactNode;
  titulo: string;
  contador: number;
  subtitulo: string;
  colapsableInicial?: boolean;
  children: React.ReactNode;
}

const FranjaUrgencia: React.FC<FranjaUrgenciaProps> = ({
  tono, icono, titulo, contador, subtitulo, colapsableInicial, children,
}) => {
  const t = TONOS[tono];
  const [abierto, setAbierto] = React.useState(!colapsableInicial);
  return (
    <div className={`bg-surface border border-line border-l-4 ${t.border} rounded-md shadow-soft overflow-hidden`}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`w-9 h-9 ${t.chip} rounded-md flex items-center justify-center flex-shrink-0`}>
          {icono}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 className={`font-display text-base sm:text-lg font-bold ${t.text}`}>{titulo}</h2>
            <span className={`text-sm font-semibold ${t.text} opacity-70`}>{contador}</span>
          </div>
          <p className="text-xs text-muted truncate">{subtitulo}</p>
        </div>
        <ChevronRight
          size={18}
          className={`text-faint flex-shrink-0 transition-transform duration-300 ${abierto ? 'rotate-90' : ''}`}
        />
      </button>
      {abierto && (
        <div className="border-t border-line px-2 py-2 space-y-1 animate-fade-in">
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
      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md hover:bg-subtle transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono font-semibold text-content">{codigo}</div>
        <div className="text-xs text-muted truncate">{nombre}</div>
      </div>
      {fecha && (
        <span className={`text-[10px] font-semibold uppercase ${t.text} flex-shrink-0`}>{fecha}</span>
      )}
      <ChevronRight size={14} className="text-faint flex-shrink-0" />
    </button>
  );
};

const VacioMsg: React.FC<{ texto: string }> = ({ texto }) => (
  <p className="text-xs text-muted italic px-2.5 py-2">{texto}</p>
);

const Kpi: React.FC<{
  label: string;
  value: number;
  icon: React.ElementType;
  tint: string;
  onClick: () => void;
}> = ({ label, value, icon: Icon, tint, onClick }) => (
  <Card as="button" interactive padding="sm" onClick={onClick} className="text-left w-full">
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted mb-1 leading-tight">{label}</div>
        <div className="font-display text-3xl font-bold text-content">{value}</div>
      </div>
      <div className={`grid place-items-center w-9 h-9 rounded-md flex-shrink-0 ${tint}`}>
        <Icon size={18} />
      </div>
    </div>
  </Card>
);
