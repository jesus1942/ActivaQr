// v1.1.0
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { format, parseISO, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Package, AlertTriangle, Wrench, ClipboardList, ScanLine, FileText, ArrowUpRight,
} from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { AlertBanner } from '../components/ui/AlertBanner';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { useTheme } from '../context/ThemeContext';
import { OnboardingTour } from '../components/OnboardingTour';

export const Dashboard: React.FC = () => {
  const { activos, mediciones, tareas, getSectorNombre, getTecnicoNombre } = useActivos();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const today = new Date();

  // Alert messages
  const alertMessages: string[] = [];
  activos.filter((a) => a.estado === 'critico').forEach((a) =>
    alertMessages.push(`Crítico: ${a.codigo} — ${a.nombre}`)
  );
  tareas.filter((t) => t.estado === 'vencido').forEach((t) => {
    const activo = activos.find((a) => a.id === t.activoId);
    alertMessages.push(`Mantenimiento vencido: ${activo?.codigo} — ${t.tipo}`);
  });

  // Stats
  const totalActivos = activos.length;
  const alertasActivas = activos.filter((a) => a.estado === 'alerta' || a.estado === 'critico').length;
  const mantPendientes = tareas.filter((t) => t.estado === 'pendiente' || t.estado === 'vencido').length;
  const equiposCriticos = activos.filter((a) => a.estado === 'critico').length;
  const startMonth = startOfMonth(today);
  const endMonth = endOfMonth(today);
  const medicionesEsteMes = mediciones.filter((m) => {
    const d = parseISO(m.fecha);
    return isAfter(d, startMonth) && isBefore(d, endMonth);
  }).length;

  // Chart: mediciones por sector
  const medicionesPorSector = activos.reduce<Record<string, number>>((acc, activo) => {
    const count = mediciones.filter((m) => m.activoId === activo.id).length;
    const nombre = getSectorNombre(activo.sectorId);
    acc[nombre] = (acc[nombre] || 0) + count;
    return acc;
  }, {});
  const chartData = Object.entries(medicionesPorSector).map(([sector, count]) => ({
    sector,
    mediciones: count,
  }));

  const recentMediciones = [...mediciones]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 8);

  const upcomingTareas = tareas
    .filter((t) => t.estado === 'pendiente' || t.estado === 'vencido')
    .sort((a, b) => new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime())
    .slice(0, 5);

  const statCards = [
    { label: 'Total activos', value: totalActivos, icon: Package, tint: 'text-brand-600 bg-brand-50 dark:bg-brand-600/15', route: '/activos' },
    { label: 'Alertas activas', value: alertasActivas, icon: AlertTriangle, tint: 'text-warn-strong bg-warn/10 dark:text-warn', route: '/activos' },
    { label: 'Mant. pendientes', value: mantPendientes, icon: Wrench, tint: 'text-danger-strong bg-danger/10 dark:text-danger', route: '/mantenimiento' },
    { label: 'Equipos críticos', value: equiposCriticos, icon: ClipboardList, tint: 'text-ok-strong bg-ok/10 dark:text-ok', route: '/activos' },
  ];

  const quickActions = [
    { label: 'Escanear QR', icon: ScanLine, route: '/qr' },
    { label: 'Mediciones', icon: ClipboardList, route: '/medicion' },
    { label: 'Reportes', icon: FileText, route: '/reportes' },
    { label: 'Mantenimiento', icon: Wrench, route: '/mantenimiento' },
  ];

  const gridColor = theme === 'dark' ? '#262C3A' : '#E8EBF0';
  const axisColor = theme === 'dark' ? '#9CA7BA' : '#94A3B8';

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted text-sm mt-1">Vista general del sistema de activos</p>
      </div>

      <AlertBanner messages={alertMessages} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, tint, route }) => (
          <Card
            key={label}
            interactive
            padding="md"
            onClick={() => navigate(route)}
            className="group"
          >
            <div className="flex items-start justify-between">
              <span className={`grid place-items-center w-11 h-11 rounded-md ${tint}`}>
                <Icon size={20} />
              </span>
              <ArrowUpRight size={16} className="text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-4 font-display text-3xl font-bold text-content">{value}</div>
            <div className="text-sm text-muted mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display text-sm font-bold text-content mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map(({ label, icon: Icon, route }) => (
            <button
              key={label}
              onClick={() => navigate(route)}
              className="press flex items-center gap-3 p-4 rounded-md bg-surface border border-line hover:border-brand-600 hover:shadow-soft transition-all text-left group"
            >
              <span className="grid place-items-center w-10 h-10 rounded-md bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <Icon size={18} />
              </span>
              <span className="text-sm font-semibold text-content">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3" padding="md">
          <h2 className="font-display text-base font-bold text-content mb-5">Mediciones por sector</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="sector" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: gridColor, opacity: 0.4 }}
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${gridColor}`,
                  background: theme === 'dark' ? '#141822' : '#FFFFFF',
                  fontSize: 12,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                }}
              />
              <Bar dataKey="mediciones" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="#2563EB" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2" padding="md">
          <h2 className="font-display text-base font-bold text-content mb-4">Próximos mantenimientos</h2>
          <div className="space-y-2">
            {upcomingTareas.length === 0 && (
              <p className="text-faint text-sm py-4 text-center">Sin tareas pendientes</p>
            )}
            {upcomingTareas.map((tarea) => {
              const activo = activos.find((a) => a.id === tarea.activoId);
              return (
                <button
                  key={tarea.id}
                  onClick={() => navigate('/mantenimiento')}
                  className="press w-full flex items-center justify-between p-3 rounded-md border border-line hover:border-line-strong hover:bg-subtle transition-all text-left"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-mono font-semibold text-content">{activo?.codigo}</div>
                    <div className="text-xs text-muted truncate">{tarea.tipo}</div>
                  </div>
                  <div className="text-right shrink-0 ml-3 space-y-1">
                    <StatusBadge estado={tarea.estado === 'vencido' ? 'critico' : 'alerta'} size="sm" />
                    <div className="text-xs text-faint">
                      {format(parseISO(tarea.fechaProgramada), 'dd/MM/yy', { locale: es })}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="font-display text-base font-bold text-content">Actividad reciente</h2>
        </div>
        {/* Tabla desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-line text-faint">
                <th className="text-left px-6 py-2.5 text-xs font-semibold">Activo</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold">Fecha</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold">Temp.</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold">Estado</th>
                <th className="text-left px-6 py-2.5 text-xs font-semibold">Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recentMediciones.map((med) => {
                const activo = activos.find((a) => a.id === med.activoId);
                return (
                  <tr
                    key={med.id}
                    className="hover:bg-subtle cursor-pointer transition-colors"
                    onClick={() => navigate(`/activos/${med.activoId}`)}
                  >
                    <td className="px-6 py-3 font-mono font-semibold text-content">{activo?.codigo}</td>
                    <td className="px-3 py-3 text-muted">{format(parseISO(med.fecha), 'dd/MM/yyyy', { locale: es })}</td>
                    <td className="px-3 py-3 font-mono font-medium text-content">{med.temperatura}°C</td>
                    <td className="px-3 py-3"><StatusBadge estado={med.estado} size="sm" /></td>
                    <td className="px-6 py-3 text-muted text-xs">{getTecnicoNombre(med.tecnicoId)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Lista mobile */}
        <div className="sm:hidden divide-y divide-line border-t border-line">
          {recentMediciones.map((med) => {
            const activo = activos.find((a) => a.id === med.activoId);
            return (
              <button
                key={med.id}
                onClick={() => navigate(`/activos/${med.activoId}`)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-subtle transition-colors text-left"
              >
                <div>
                  <div className="font-mono font-semibold text-content text-sm">{activo?.codigo}</div>
                  <div className="text-xs text-muted">{format(parseISO(med.fecha), 'dd/MM/yy', { locale: es })} · {med.temperatura}°C</div>
                </div>
                <StatusBadge estado={med.estado} size="sm" />
              </button>
            );
          })}
        </div>
      </Card>

      <OnboardingTour />
    </div>
  );
};
