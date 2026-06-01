// v1.1.0
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, parseISO, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, AlertTriangle, Wrench, ClipboardList } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { AlertBanner } from '../components/ui/AlertBanner';
import { StatusBadge } from '../components/ui/StatusBadge';

export const Dashboard: React.FC = () => {
  const { activos, mediciones, tareas, getSectorNombre, getTecnicoNombre } = useActivos();
  const navigate = useNavigate();
  const today = new Date();

  // Alert messages
  const alertMessages: string[] = [];
  activos.filter((a) => a.estado === 'critico').forEach((a) =>
    alertMessages.push(`CRÍTICO: ${a.codigo} — ${a.nombre}`)
  );
  tareas.filter((t) => t.estado === 'vencido').forEach((t) => {
    const activo = activos.find((a) => a.id === t.activoId);
    alertMessages.push(`MANTENIMIENTO VENCIDO: ${activo?.codigo} — ${t.tipo}`);
  });

  // Stats
  const totalActivos = activos.length;
  const alertasActivas = activos.filter((a) => a.estado === 'alerta' || a.estado === 'critico').length;
  const mantPendientes = tareas.filter((t) => t.estado === 'pendiente' || t.estado === 'vencido').length;
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

  // Recent mediciones
  const recentMediciones = [...mediciones]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 10);

  // Upcoming maintenance
  const upcomingTareas = tareas
    .filter((t) => t.estado === 'pendiente' || t.estado === 'vencido')
    .sort((a, b) => new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime())
    .slice(0, 5);

  const statCards = [
    { label: 'Total Activos', value: totalActivos, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', route: '/activos' },
    { label: 'Alertas Activas', value: alertasActivas, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50', route: '/activos' },
    { label: 'Mant. Pendientes', value: mantPendientes, icon: Wrench, color: 'text-red-600', bg: 'bg-red-50', route: '/mantenimiento' },
    { label: 'Mediciones este mes', value: medicionesEsteMes, icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50', route: '/activos' },
  ];

  return (
    <div>
      <h1 className="font-sketch text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-2 uppercase tracking-tight">Dashboard</h1>
      <p className="text-slate-500 text-sm mb-6 font-medium">Vista general del sistema de activos</p>

      <AlertBanner messages={alertMessages} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg, route }) => (
          <button
            key={label}
            onClick={() => navigate(route)}
            className="bg-[#FFFEF7] border-2 border-slate-700 shadow-[3px_3px_0px_0px_#1e293b] p-4 text-left w-full hover:shadow-[1px_1px_0px_0px_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
                <div className={`font-sketch text-4xl sm:text-5xl md:text-6xl font-black ${color}`}>{value}</div>
              </div>
              <div className={`${bg} p-3 border-2 border-slate-200`}>
                <Icon size={22} className={color} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart */}
        <div className="bg-[#FFFEF7] border-2 border-slate-700 shadow-[3px_3px_0px_0px_#1e293b] p-4">
          <h2 className="font-sketch text-2xl font-black uppercase tracking-wider text-slate-700 mb-4">Mediciones por Sector</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="sector" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="mediciones" fill="#F97316" stroke="#1E293B" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Maintenance */}
        <div className="bg-[#FFFEF7] border-2 border-slate-700 shadow-[3px_3px_0px_0px_#1e293b] p-4">
          <h2 className="font-sketch text-2xl font-black uppercase tracking-wider text-slate-700 mb-4">Próximos Mantenimientos</h2>
          <div className="space-y-2">
            {upcomingTareas.length === 0 && (
              <p className="text-slate-400 text-sm">Sin tareas pendientes</p>
            )}
            {upcomingTareas.map((tarea) => {
              const activo = activos.find((a) => a.id === tarea.activoId);
              return (
                <div
                  key={tarea.id}
                  className="flex items-center justify-between p-2 border-2 border-slate-200 cursor-pointer hover:border-orange-400 transition-colors"
                  onClick={() => navigate('/mantenimiento')}
                >
                  <div>
                    <div className="text-xs font-mono font-bold text-slate-800">{activo?.codigo}</div>
                    <div className="text-xs text-slate-600">{tarea.tipo}</div>
                  </div>
                  <div className="text-right">
                    <StatusBadge estado={tarea.estado === 'vencido' ? 'critico' : 'alerta'} size="sm" />
                    <div className="text-xs text-slate-500 mt-0.5">
                      {format(parseISO(tarea.fechaProgramada), 'dd/MM/yy', { locale: es })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent mediciones */}
      <div className="bg-[#FFFEF7] border-2 border-slate-700 shadow-[3px_3px_0px_0px_#1e293b] p-4">
        <h2 className="font-sketch text-2xl font-black uppercase tracking-wider text-slate-700 mb-4">Actividad Reciente</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-800">
                <th className="text-left px-3 py-2 text-xs font-black uppercase tracking-wider">Activo</th>
                <th className="text-left px-3 py-2 text-xs font-black uppercase tracking-wider">Fecha</th>
                <th className="text-left px-3 py-2 text-xs font-black uppercase tracking-wider">Temp.</th>
                <th className="text-left px-3 py-2 text-xs font-black uppercase tracking-wider">Estado</th>
                <th className="text-left px-3 py-2 text-xs font-black uppercase tracking-wider">Técnico</th>
              </tr>
            </thead>
            <tbody>
              {recentMediciones.map((med, i) => {
                const activo = activos.find((a) => a.id === med.activoId);
                return (
                  <tr
                    key={med.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    onClick={() => navigate(`/activos/${med.activoId}`)}
                  >
                    <td className="px-3 py-2 font-mono font-bold text-slate-800">{activo?.codigo}</td>
                    <td className="px-3 py-2 text-slate-600">{format(parseISO(med.fecha), 'dd/MM/yyyy', { locale: es })}</td>
                    <td className="px-3 py-2 font-mono font-bold">{med.temperatura}°C</td>
                    <td className="px-3 py-2"><StatusBadge estado={med.estado} size="sm" /></td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{getTecnicoNombre(med.tecnicoId)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
