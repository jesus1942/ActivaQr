import React, { useEffect, useState } from 'react';
import { LineChart, TrendingUp, TrendingDown, DollarSign, CreditCard, Building2 } from 'lucide-react';
import { Estadisticas, getEstadisticas, reiniciarEstadisticas, Facturacion, getFacturacion } from '../data/adminApi';
import { PanelEstadisticas } from './Admin';

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const ESTADO_BADGE: Record<string, string> = {
  approved: 'bg-ok/10 border-ok text-ok-strong dark:text-ok',
  pending:  'bg-warn/10 border-warn text-warn-strong dark:text-warn',
  rejected: 'bg-danger/10 border-danger text-danger-strong dark:text-danger',
  cancelled:'bg-subtle border-line text-muted',
};

const ESTADO_LABEL: Record<string, string> = {
  approved: 'Aprobado',
  pending:  'Pendiente',
  rejected: 'Rechazado',
  cancelled:'Cancelado',
};

function PanelFacturacion({ data }: { data: Facturacion }) {
  const variacion = data.mrrAnterior > 0
    ? Math.round(((data.mrr - data.mrrAnterior) / data.mrrAnterior) * 100)
    : null;

  const maxMes = Math.max(...data.porMes.map(m => m.total), 1);

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'MRR este mes', valor: ARS(data.mrr), sub: variacion !== null ? `${variacion >= 0 ? '+' : ''}${variacion}% vs mes anterior` : 'Sin datos anteriores', icon: DollarSign, color: 'text-ok-strong dark:text-ok', alerta: false },
          { label: 'Total acumulado', valor: ARS(data.totalAcumulado), sub: 'Desde el inicio', icon: TrendingUp, color: 'text-brand-600', alerta: false },
          { label: 'Pagos este mes', valor: String(data.pagosEsteMes), sub: 'Transacciones aprobadas', icon: CreditCard, color: 'text-content', alerta: false },
          { label: 'Clientes activos', valor: String(data.porEmpresa.length), sub: 'Con al menos 1 pago', icon: Building2, color: 'text-content', alerta: false },
        ].map(({ label, valor, sub, icon: Icon, color }) => (
          <div key={label} className="bg-surface border border-line shadow-soft p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={color} />
              <p className="text-xs font-black uppercase tracking-wider text-muted">{label}</p>
            </div>
            <p className="text-2xl font-black text-content">{valor}</p>
            <p className="text-xs text-faint mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Variación MRR */}
      {variacion !== null && (
        <div className={`flex items-center gap-2 px-4 py-3 border font-bold text-sm ${variacion >= 0 ? 'border-ok bg-ok/10 text-ok-strong dark:text-ok' : 'border-danger bg-danger/10 text-danger-strong dark:text-danger'}`}>
          {variacion >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {variacion >= 0 ? `+${variacion}%` : `${variacion}%`} vs mes anterior ({ARS(data.mrrAnterior)})
        </div>
      )}

      {/* Barras por mes */}
      <div className="bg-surface border border-line shadow-soft p-5">
        <h2 className="text-xs font-black uppercase tracking-wider text-muted mb-4">Ingresos por mes</h2>
        <div className="flex items-end gap-2 h-32">
          {data.porMes.map(m => {
            const altura = maxMes > 0 ? Math.round((m.total / maxMes) * 100) : 0;
            const esActual = m.mes === new Date().toISOString().slice(0, 7);
            return (
              <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-muted">{m.total > 0 ? ARS(m.total).replace('$', '$') : ''}</span>
                <div
                  className={`w-full border border-line transition-all ${esActual ? 'bg-brand-600' : 'bg-slate-200'}`}
                  style={{ height: `${Math.max(altura, m.total > 0 ? 8 : 2)}%` }}
                />
                <span className="text-[10px] text-faint font-mono">{m.mes.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Por empresa */}
      {data.porEmpresa.length > 0 && (
        <div className="bg-surface border border-line shadow-soft p-5">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted mb-3">Por empresa</h2>
          <div className="space-y-2">
            {data.porEmpresa.map(({ empresa, total, cantidad }) => (
              <div key={empresa.id} className="flex items-center justify-between gap-3 py-2 border-b border-line last:border-0">
                <div>
                  <p className="font-bold text-content text-sm">{empresa.nombre}</p>
                  <p className="text-xs text-faint uppercase">{empresa.plan} · {cantidad} {cantidad === 1 ? 'pago' : 'pagos'}</p>
                </div>
                <p className="font-black text-content">{ARS(total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimos pagos */}
      {data.ultimos.length > 0 && (
        <div className="bg-surface border border-line shadow-soft p-5">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted mb-3">Últimos movimientos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {['Fecha', 'Empresa', 'Concepto', 'Monto', 'Estado'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-black uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.ultimos.map((p, i) => (
                  <tr key={p.id} className={`border-b border-line ${i % 2 === 0 ? 'bg-surface' : 'bg-subtle'}`}>
                    <td className="px-3 py-2 font-mono">{p.fecha.slice(0, 10)}</td>
                    <td className="px-3 py-2 font-bold">{p.empresa.nombre}</td>
                    <td className="px-3 py-2 text-muted">{p.concepto ?? '—'}</td>
                    <td className="px-3 py-2 font-black">{ARS(p.monto)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 border font-bold uppercase ${ESTADO_BADGE[p.estado] ?? 'bg-subtle border-line text-muted'}`}>
                        {ESTADO_LABEL[p.estado] ?? p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.ultimos.length === 0 && (
        <div className="bg-subtle border border-line p-6 text-center text-muted text-sm">
          Todavía no hay pagos registrados. Cuando MP envíe el primer webhook de pago, aparecerá acá.
        </div>
      )}
    </div>
  );
}

export const Analitica: React.FC = () => {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [facturacion, setFacturacion] = useState<Facturacion | null>(null);
  const [tab, setTab] = useState<'visitas' | 'facturacion'>('facturacion');
  const [error, setError] = useState('');

  const cargar = () => {
    getEstadisticas().then(setEstadisticas).catch((e) => setError(e.message));
    getFacturacion().then(setFacturacion).catch(() => {});
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-content uppercase tracking-tight flex items-center gap-2">
          <LineChart size={32} className="text-brand-600" /> Analítica
        </h1>
        <p className="text-muted text-sm mt-1">Facturación, visitas y comportamiento de usuarios</p>
      </div>

      {/* Tabs */}
      <div className="flex border border-line overflow-hidden shadow-soft">
        {[
          { id: 'facturacion' as const, label: 'Facturacion' },
          { id: 'visitas' as const, label: 'Visitas y uso' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 text-sm font-black uppercase tracking-wider border-r-2 border-line last:border-r-0 transition-colors ${tab === id ? 'bg-brand-600 text-white' : 'bg-surface text-muted hover:bg-subtle'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-danger font-bold">{error}</p>}

      {tab === 'facturacion' && (
        facturacion ? <PanelFacturacion data={facturacion} /> : <p className="text-muted">Cargando facturación...</p>
      )}

      {tab === 'visitas' && (
        estadisticas
          ? <PanelEstadisticas estadisticas={estadisticas} onReiniciar={async () => {
              if (!confirm('Reiniciar el contador de visitas? Se borran todos los registros.')) return;
              await reiniciarEstadisticas();
              cargar();
            }} />
          : <p className="text-muted">Cargando analítica...</p>
      )}
    </div>
  );
};
