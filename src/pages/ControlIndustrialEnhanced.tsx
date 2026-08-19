import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  BarChart3,
  Download,
  Droplets,
  Gauge,
  History,
  Info,
  Power,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Thermometer,
  Wifi,
  WifiOff,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import {
  DispositivoIoT,
  exportarHistorialDispositivo,
  historialVariable,
  ResumenControl,
  ResumenEnergia,
  resumenControl,
  resumenEnergia,
  solicitarComando,
  VariableIoT,
} from '../data/controlIndustrialApi';
import { ControlIndustrial } from './ControlIndustrial';

type HistoryReading = {
  medidaEn: string;
  valorNumero?: number | null;
  valorBooleano?: boolean | null;
  valorTexto?: string | null;
};

type HistoryMap = Record<string, HistoryReading[]>;
type DetailTab = 'graficos' | 'informacion' | 'configuracion' | 'automatizaciones';
type RangeHours = 6 | 24 | 168 | 720;

const AMBIENT_VARIABLE = /^(temperature|temperatura|humidity|humedad)$/i;
const POWER_VARIABLE = /^(actpow|power)(?:_([0-9]+))?$/i;
const CURRENT_VARIABLE = /^(current)(?:_([0-9]+))?$/i;
const VOLTAGE_VARIABLE = /^(voltage)(?:_([0-9]+))?$/i;
const PROVIDERS_WITH_CONTROL = new Set(['sonoff_ewelink', 'tuya_cloud']);
const REFRESH_MS = 5_000;

function ago(value?: string | null) {
  if (!value) return 'sin datos';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return 'ahora';
  if (seconds < 60) return `hace ${seconds} s`;
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  return `hace ${Math.floor(seconds / 86400)} d`;
}

function isOnline(device: DispositivoIoT, disconnectMs: number) {
  return Boolean(device.ultimoContactoEn && Date.now() - new Date(device.ultimoContactoEn).getTime() < disconnectMs);
}

function channelVariables(device: DispositivoIoT): VariableIoT[] {
  const channels = device.variables
    .filter((variable) => /^switch_[1-4]$/.test(variable.clave))
    .sort((a, b) => a.clave.localeCompare(b.clave));
  if (channels.length) return channels;
  const relay = device.variables.find((variable) => variable.clave === 'relay');
  return relay ? [{ ...relay, clave: 'switch_1', nombre: relay.nombre || 'Relé interno' }] : [];
}

function isMotorMode(device: DispositivoIoT) {
  return device.variables.some((variable) => variable.clave === 'operation_mode' && variable.valorTexto === 'motor');
}

function channelIndexFromSuffix(suffix: string) {
  const numeric = Number(suffix);
  if (!Number.isFinite(numeric)) return 1;
  if (suffix === '0' || (suffix.length > 1 && suffix.startsWith('0'))) return numeric + 1;
  return numeric;
}

function metricForChannel(device: DispositivoIoT, regex: RegExp, channel = 1) {
  const metrics = device.variables.filter((variable) => regex.test(variable.clave));
  const exact = metrics.find((variable) => {
    const suffix = variable.clave.match(regex)?.[2];
    return suffix ? channelIndexFromSuffix(suffix) === channel : false;
  });
  if (exact) return exact;
  return channelVariables(device).length <= 1 ? metrics.find((variable) => !variable.clave.match(regex)?.[2]) : undefined;
}

function ambientVariables(device: DispositivoIoT) {
  const temperature = device.variables.find((variable) => /^(temperature|temperatura)$/i.test(variable.clave));
  const humidity = device.variables.find((variable) => /^(humidity|humedad)$/i.test(variable.clave));
  return { temperature, humidity };
}

function numericValue(variable?: VariableIoT | null, suffix?: string, decimals = 1) {
  if (!variable || variable.valorNumero == null) return '—';
  const unit = suffix ?? variable.unidad ?? '';
  return `${Number(variable.valorNumero).toLocaleString('es-AR', { maximumFractionDigits: decimals })}${unit ? ` ${unit}` : ''}`;
}

function mergeHistory(...groups: HistoryReading[][]) {
  const unique = new Map<string, HistoryReading>();
  for (const group of groups) {
    for (const reading of group) unique.set(reading.medidaEn, reading);
  }
  return [...unique.values()]
    .sort((a, b) => new Date(a.medidaEn).getTime() - new Date(b.medidaEn).getTime())
    .slice(-4000);
}

function rangeLabel(hours: RangeHours) {
  if (hours === 6) return '6 horas';
  if (hours === 24) return '24 horas';
  if (hours === 168) return '7 días';
  return '30 días';
}

function chartStats(history: HistoryReading[]) {
  const values = history.filter((item) => item.valorNumero != null).map((item) => Number(item.valorNumero));
  if (!values.length) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
}

function TrendChart({ variable, history, kind }: { variable: VariableIoT; history: HistoryReading[]; kind: 'temperature' | 'humidity' }) {
  const points = useMemo(() => history
    .filter((reading) => reading.valorNumero != null)
    .map((reading) => ({
      hora: new Date(reading.medidaEn).toLocaleString('es-AR', { day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      valor: Number(reading.valorNumero),
    })), [history]);
  const stroke = kind === 'temperature' ? '#3b82f6' : '#34d399';
  const suffix = kind === 'temperature' ? '°C' : '%';

  return <div className="h-52 sm:h-64">
    {points.length ? <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ left: -18, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke="#334155" opacity={0.5} vertical={false} />
        <XAxis dataKey="hora" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={42} />
        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={42} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ borderRadius: 14, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxShadow: '0 16px 40px rgba(0,0,0,.35)' }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(value: number) => [`${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 1 })} ${suffix}`, variable.nombre]}
        />
        <Line type="monotone" dataKey="valor" stroke={stroke} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer> : <div className="grid h-full place-items-center rounded-2xl bg-slate-900/60 px-5 text-center text-xs text-slate-500">Esperando lecturas para dibujar la tendencia.</div>}
  </div>;
}

function SummaryCard({ icon: Icon, label, value, detail, tone }: { icon: React.ElementType; label: string; value: string; detail: string; tone: 'blue' | 'green' | 'violet' | 'amber' }) {
  const tones = {
    blue: 'border-blue-500/25 bg-blue-500/10 text-blue-300',
    green: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    violet: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
    amber: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  } as const;
  return <div className={`min-w-0 rounded-2xl border p-4 ${tones[tone]}`}>
    <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-slate-300">{label}</span><Icon size={18} /></div>
    <strong className="mt-3 block break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">{value}</strong>
    <span className="mt-2 block text-[11px] text-slate-500">{detail}</span>
  </div>;
}

function DeviceDetail({
  device,
  data,
  historyByVariable,
  historyHours,
  refreshing,
  commandBusy,
  activeTab,
  onTab,
  onRange,
  onCommand,
  onExport,
}: {
  device: DispositivoIoT;
  data: ResumenControl;
  historyByVariable: HistoryMap;
  historyHours: RangeHours;
  refreshing: boolean;
  commandBusy: string | null;
  activeTab: DetailTab;
  onTab: (tab: DetailTab) => void;
  onRange: (hours: RangeHours) => void;
  onCommand: (device: DispositivoIoT, channel: VariableIoT, channelIndex: number) => void;
  onExport: (device: DispositivoIoT) => void;
}) {
  const disconnectMs = (data.modulo.umbralSinConexionMinutos ?? 10) * 60_000;
  const online = isOnline(device, disconnectMs);
  const ambient = ambientVariables(device);
  const channels = channelVariables(device);
  const relay = channels[0];
  const power = metricForChannel(device, POWER_VARIABLE, 1);
  const current = metricForChannel(device, CURRENT_VARIABLE, 1);
  const voltage = metricForChannel(device, VOLTAGE_VARIABLE, 1);
  const canControl = data.modulo.controlRemotoHabilitado
    && device.permiteControl
    && !isMotorMode(device)
    && PROVIDERS_WITH_CONTROL.has(device.integracion?.proveedor ?? '')
    && Boolean(relay);
  const tempHistory = ambient.temperature ? historyByVariable[ambient.temperature.id] ?? [] : [];
  const humidityHistory = ambient.humidity ? historyByVariable[ambient.humidity.id] ?? [] : [];
  const tempStats = chartStats(tempHistory);
  const humidityStats = chartStats(humidityHistory);
  const deviceRules = data.reglas.filter((rule) => device.variables.some((variable) => variable.id === rule.variable.id));

  const tabs: Array<{ id: DetailTab; label: string; icon: React.ElementType }> = [
    { id: 'graficos', label: 'Gráficos', icon: BarChart3 },
    { id: 'informacion', label: 'Información', icon: Info },
    { id: 'configuracion', label: 'Configuración', icon: Settings2 },
    { id: 'automatizaciones', label: 'Automatizaciones', icon: Workflow },
  ];

  return <div className="space-y-4">
    <section className="rounded-3xl border border-slate-700/70 bg-slate-900/75 p-4 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-cyan-300 shadow-inner sm:h-20 sm:w-20">
          {online ? <Thermometer size={30} /> : <WifiOff size={30} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-xl font-semibold tracking-tight text-white sm:text-3xl">{device.modelo || device.nombre}</h2>{online && <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">En línea</span>}</div>
          <p className="mt-1 break-words text-sm text-slate-400">{device.nombre}{device.ubicacion ? ` · ${device.ubicacion}` : ''}</p>
          <p className="mt-2 flex items-center gap-2 text-[11px] text-slate-500"><span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-slate-500'}`} />Última actualización: {ago(device.ultimoContactoEn)}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={Thermometer} label="Temperatura" value={numericValue(ambient.temperature, '°C')} detail="Actual" tone="blue" />
        <SummaryCard icon={Droplets} label="Humedad" value={numericValue(ambient.humidity, '%')} detail="Actual" tone="green" />
        <SummaryCard icon={Power} label="Relé" value={relay ? (relay.valorBooleano ? 'ENCENDIDO' : 'APAGADO') : '—'} detail="Estado actual" tone="violet" />
        <SummaryCard icon={Zap} label="Consumo" value={numericValue(power, 'W')} detail={[voltage?.valorNumero != null ? numericValue(voltage, 'V') : null, current?.valorNumero != null ? numericValue(current, 'A', 2) : null].filter(Boolean).join(' · ') || 'Sin medición eléctrica'} tone="amber" />
      </div>
    </section>

    <nav className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-1 sm:grid-cols-4">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onTab(id)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-[11px] font-semibold transition sm:text-xs ${activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><Icon size={16} />{label}</button>)}
    </nav>

    {activeTab === 'graficos' && <>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-950/60 p-1">
          {([6, 24, 168, 720] as RangeHours[]).map((hours) => <button key={hours} onClick={() => onRange(hours)} className={`min-h-10 rounded-lg px-2 text-[10px] font-semibold sm:px-4 sm:text-xs ${historyHours === hours ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>{rangeLabel(hours)}</button>)}
        </div>
        <div className="flex items-center justify-end gap-2 text-[11px] text-slate-500"><RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-400' : 'text-emerald-400'} />Actualización automática · 5 s</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ambient.temperature && <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Thermometer size={17} className="text-blue-400" />Temperatura (°C)</div><strong className="mt-2 block text-3xl font-semibold text-blue-400">{numericValue(ambient.temperature, '°C')}</strong></div><div className="text-right text-[11px] leading-5 text-slate-500"><span className="block">Mín: {tempStats.min == null ? '—' : `${tempStats.min.toLocaleString('es-AR', { maximumFractionDigits: 1 })} °C`}</span><span className="block">Máx: {tempStats.max == null ? '—' : `${tempStats.max.toLocaleString('es-AR', { maximumFractionDigits: 1 })} °C`}</span></div></div>
          <TrendChart variable={ambient.temperature} history={tempHistory} kind="temperature" />
        </article>}
        {ambient.humidity && <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Droplets size={17} className="text-emerald-400" />Humedad (%)</div><strong className="mt-2 block text-3xl font-semibold text-emerald-400">{numericValue(ambient.humidity, '%')}</strong></div><div className="text-right text-[11px] leading-5 text-slate-500"><span className="block">Mín: {humidityStats.min == null ? '—' : `${humidityStats.min.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`}</span><span className="block">Máx: {humidityStats.max == null ? '—' : `${humidityStats.max.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`}</span></div></div>
          <TrendChart variable={ambient.humidity} history={humidityHistory} kind="humidity" />
        </article>}
      </div>

      {relay && <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-base font-semibold text-white">Control del relé</h3><div className="mt-2 flex items-center gap-2 text-sm text-slate-400">Estado actual <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${relay.valorBooleano ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{relay.valorBooleano ? 'ENCENDIDO' : 'APAGADO'}</span></div></div>
          {canControl ? <button disabled={commandBusy !== null} onClick={() => onCommand(device, relay, 0)} className={`min-h-12 rounded-xl px-6 text-sm font-semibold transition disabled:opacity-50 ${relay.valorBooleano ? 'border border-slate-600 bg-slate-800 text-white hover:bg-slate-700' : 'border border-emerald-500/60 bg-emerald-600/20 text-emerald-200 hover:bg-emerald-600/30'}`}><Power size={17} className="mr-2 inline" />{commandBusy ? 'Confirmando…' : relay.valorBooleano ? 'Apagar relé' : 'Encender relé'}</button> : <span className="text-xs text-slate-500">Control remoto no habilitado</span>}
        </div>
      </section>}
    </>}

    {activeTab === 'informacion' && <section className="grid gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 sm:grid-cols-2 sm:p-5">
      {[
        ['Modelo', device.modelo || 'No informado'],
        ['ID del dispositivo', device.identificadorExterno],
        ['Proveedor', device.integracion?.proveedor === 'sonoff_ewelink' ? 'SONOFF / eWeLink' : device.integracion?.proveedor || 'No informado'],
        ['Tipo detectado', device.tipo.replaceAll('_', ' ')],
        ['Estado', online ? 'En línea' : 'Sin conexión'],
        ['Último contacto', ago(device.ultimoContactoEn)],
      ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-950/45 p-3"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span><strong className="mt-1 block break-all text-sm font-medium text-slate-200">{value}</strong></div>)}
    </section>}

    {activeTab === 'configuracion' && <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
      <div className="flex gap-3"><SlidersHorizontal size={20} className="mt-0.5 shrink-0 text-cyan-400" /><div><h3 className="font-semibold text-white">Configuración operativa</h3><p className="mt-1 text-sm leading-relaxed text-slate-400">El equipo está {device.habilitado ? 'habilitado para recibir telemetría' : 'pausado'} y el control remoto está {device.permiteControl ? 'permitido para este dispositivo' : 'deshabilitado'}. Los cambios de nombre, ubicación, función del relé y permisos se mantienen en la pantalla normal de Configurar dispositivo.</p></div></div>
    </section>}

    {activeTab === 'automatizaciones' && <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
      <div className="flex items-center gap-2"><Workflow size={18} className="text-violet-400" /><h3 className="font-semibold text-white">Reglas vinculadas</h3></div>
      {deviceRules.length ? <div className="mt-4 space-y-2">{deviceRules.map((rule) => <div key={rule.id} className="rounded-xl bg-slate-950/45 p-3"><div className="flex items-center justify-between gap-3"><strong className="text-sm font-medium text-slate-200">{rule.nombre}</strong><span className={`rounded-lg px-2 py-1 text-[9px] font-semibold ${rule.activa ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>{rule.activa ? 'ACTIVA' : 'PAUSADA'}</span></div><p className="mt-1 text-xs text-slate-500">{rule.variable.nombre} · {rule.severidad}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Todavía no hay reglas de alarma o automatización vinculadas a este dispositivo.</p>}
    </section>}

    <section className="grid gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 sm:grid-cols-3">
      <div className="rounded-xl bg-slate-950/45 p-3"><span className="text-[10px] uppercase tracking-wide text-slate-500">Modelo</span><strong className="mt-1 block text-sm text-slate-200">{device.modelo || '—'}</strong></div>
      <div className="rounded-xl bg-slate-950/45 p-3"><span className="text-[10px] uppercase tracking-wide text-slate-500">ID del dispositivo</span><strong className="mt-1 block truncate text-sm text-slate-200">{device.identificadorExterno}</strong></div>
      <div className="rounded-xl bg-slate-950/45 p-3"><span className="text-[10px] uppercase tracking-wide text-slate-500">Conexión</span><strong className="mt-1 flex items-center gap-2 text-sm text-slate-200">{online ? <Wifi size={15} className="text-emerald-400" /> : <WifiOff size={15} className="text-slate-500" />}{online ? 'En línea' : 'Sin conexión'}</strong></div>
      <button onClick={() => onExport(device)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/45 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-800 sm:col-span-1"><Download size={16} />Exportar datos</button>
      <button onClick={() => { onTab('graficos'); onRange(720); }} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/45 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-800 sm:col-span-2"><History size={16} />Ver historial completo</button>
    </section>
  </div>;
}

function PresentationOverlay({
  data,
  energy,
  historyByVariable,
  historyHours,
  refreshing,
  lastRefreshAt,
  commandBusy,
  title,
  selectedDeviceId,
  activeTab,
  onSelectDevice,
  onTab,
  onRange,
  onClose,
  onCommand,
  onExport,
}: {
  data: ResumenControl;
  energy: ResumenEnergia | null;
  historyByVariable: HistoryMap;
  historyHours: RangeHours;
  refreshing: boolean;
  lastRefreshAt: Date | null;
  commandBusy: string | null;
  title: string;
  selectedDeviceId: string | null;
  activeTab: DetailTab;
  onSelectDevice: (id: string) => void;
  onTab: (tab: DetailTab) => void;
  onRange: (hours: RangeHours) => void;
  onClose: () => void;
  onCommand: (device: DispositivoIoT, channel: VariableIoT, channelIndex: number) => void;
  onExport: (device: DispositivoIoT) => void;
}) {
  const devices = useMemo(() => [...data.dispositivos].sort((a, b) => {
    const aAmbient = a.variables.some((variable) => AMBIENT_VARIABLE.test(variable.clave)) ? 0 : 1;
    const bAmbient = b.variables.some((variable) => AMBIENT_VARIABLE.test(variable.clave)) ? 0 : 1;
    return aAmbient - bAmbient || a.nombre.localeCompare(b.nombre);
  }), [data.dispositivos]);
  const selected = devices.find((device) => device.id === selectedDeviceId) || devices[0];

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#070b14] text-slate-100">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,116,144,.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,.10),transparent_30%)]" />
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#070b14]/95 px-3 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300"><Activity size={19} /></div>
        <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-400">ActivaQR Control</p><h1 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h1></div>
        <div className="hidden items-center gap-2 text-[11px] text-slate-500 sm:flex"><RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-400' : ''} />{lastRefreshAt ? `Actualizado ${ago(lastRefreshAt.toISOString())}` : 'Sincronizando'}{energy && <span className="ml-2 text-amber-300">{energy.currentPowerW.toLocaleString('es-AR', { maximumFractionDigits: 0 })} W</span>}</div>
        <button onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-700" aria-label="Cerrar vista ampliada"><X size={20} /></button>
      </div>
    </header>

    <main className="relative mx-auto max-w-6xl px-3 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
      {devices.length > 1 && <div className="mb-4 flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{devices.map((device) => <button key={device.id} onClick={() => onSelectDevice(device.id)} className={`shrink-0 snap-start rounded-xl border px-3 py-2 text-left ${selected?.id === device.id ? 'border-cyan-500/50 bg-cyan-500/10 text-white' : 'border-slate-800 bg-slate-900/50 text-slate-500'}`}><strong className="block max-w-44 truncate text-xs font-semibold">{device.nombre}</strong><span className="mt-0.5 block max-w-44 truncate text-[10px]">{device.modelo || device.tipo}</span></button>)}</div>}
      {selected ? <DeviceDetail device={selected} data={data} historyByVariable={historyByVariable} historyHours={historyHours} refreshing={refreshing} commandBusy={commandBusy} activeTab={activeTab} onTab={onTab} onRange={onRange} onCommand={onCommand} onExport={onExport} /> : <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500">No hay dispositivos para mostrar.</div>}
      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-600"><ShieldCheck size={13} />Operaciones auditadas por ActivaQR</div>
    </main>
  </div>;
}

export const ControlIndustrialEnhanced: React.FC = () => {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ResumenControl | null>(null);
  const [energy, setEnergy] = useState<ResumenEnergia | null>(null);
  const [historyByVariable, setHistoryByVariable] = useState<HistoryMap>({});
  const [historyHours, setHistoryHours] = useState<RangeHours>(6);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [commandBusy, setCommandBusy] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('graficos');
  const historyRequestVersion = useRef(0);

  const loadPresentation = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      const [control, energySummary] = await Promise.all([
        resumenControl(),
        resumenEnergia().catch(() => null),
      ]);
      setData(control);
      setEnergy(energySummary);
      setSelectedDeviceId((current) => current && control.dispositivos.some((device) => device.id === current)
        ? current
        : control.dispositivos.find((device) => device.variables.some((variable) => AMBIENT_VARIABLE.test(variable.clave)))?.id || control.dispositivos[0]?.id || null);
      setLastRefreshAt(new Date());
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo actualizar la vista ampliada.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  const refreshSelectedHistory = useCallback(async (control: ResumenControl, selectedId: string | null, hours: RangeHours) => {
    if (!selectedId) return;
    const device = control.dispositivos.find((item) => item.id === selectedId);
    if (!device) return;
    const variables = device.variables.filter((variable) => AMBIENT_VARIABLE.test(variable.clave));
    const requestVersion = ++historyRequestVersion.current;
    try {
      const entries = await Promise.all(variables.map(async (variable) => {
        const result = await historialVariable(variable.id, hours);
        return [variable.id, result.lecturas] as const;
      }));
      if (requestVersion !== historyRequestVersion.current) return;
      setHistoryByVariable((current) => {
        const next = { ...current };
        for (const [id, readings] of entries) next[id] = mergeHistory(readings);
        return next;
      });
    } catch {
      // El tablero vivo sigue funcionando aunque un historial puntual falle.
    }
  }, []);

  useEffect(() => {
    const captureExpand = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('button[aria-label="Expandir tablero"]')) {
        setActiveTab('graficos');
        setHistoryHours(6);
        setOpen(true);
      }
    };
    document.addEventListener('click', captureExpand, true);
    return () => document.removeEventListener('click', captureExpand, true);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const cycle = async () => {
      await loadPresentation(true);
      if (cancelled) return;
    };
    loadPresentation();
    const timer = window.setInterval(cycle, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [open, loadPresentation]);

  useEffect(() => {
    if (!open || !data || !selectedDeviceId) return;
    refreshSelectedHistory(data, selectedDeviceId, historyHours);
    const timer = window.setInterval(() => refreshSelectedHistory(data, selectedDeviceId, historyHours), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [open, data, selectedDeviceId, historyHours, refreshSelectedHistory]);

  useEffect(() => {
    if (!open || !data || !selectedDeviceId) return;
    const device = data.dispositivos.find((item) => item.id === selectedDeviceId);
    if (!device) return;
    setHistoryByVariable((current) => {
      const next = { ...current };
      let changed = false;
      for (const variable of device.variables.filter((item) => AMBIENT_VARIABLE.test(item.clave))) {
        if (variable.valorNumero == null || !variable.medidaEn) continue;
        const existing = next[variable.id] ?? [];
        if (existing.some((reading) => reading.medidaEn === variable.medidaEn)) continue;
        next[variable.id] = mergeHistory(existing, [{ medidaEn: variable.medidaEn, valorNumero: variable.valorNumero }]);
        changed = true;
      }
      return changed ? next : current;
    });
  }, [open, data, selectedDeviceId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const closePresentation = useCallback(() => {
    setOpen(false);
    historyRequestVersion.current += 1;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);

  const commandRelay = useCallback(async (device: DispositivoIoT, channel: VariableIoT, channelIndex: number) => {
    const canal = Number(channel.clave.slice(7)) - 1;
    const resolvedChannel = Number.isInteger(canal) && canal >= 0 ? canal : channelIndex;
    const nextState = !Boolean(channel.valorBooleano);
    const label = ambientVariables(device).temperature || ambientVariables(device).humidity ? 'relé interno' : channel.nombre || `canal ${resolvedChannel + 1}`;
    if (!window.confirm(`¿${nextState ? 'Encender' : 'Apagar'} ${label} de ${device.nombre}?`)) return;
    const key = `${device.id}:${channelIndex}`;
    setCommandBusy(key);
    try {
      await solicitarComando({
        dispositivoId: device.id,
        tipo: 'rele',
        payload: { canal: resolvedChannel, encendido: nextState },
        motivo: 'Operación confirmada desde la vista ampliada de ActivaQR Control.',
      });
      toast(`${device.nombre}: ${label} ${nextState ? 'encendido' : 'apagado'} y verificado.`, 'success');
      await loadPresentation(true);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo confirmar la maniobra.', 'error');
    } finally {
      setCommandBusy(null);
    }
  }, [loadPresentation, toast]);

  const exportDevice = useCallback(async (device: DispositivoIoT) => {
    try {
      const result = await exportarHistorialDispositivo(device.id, historyHours);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast('Historial exportado.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo exportar el historial.', 'error');
    }
  }, [historyHours, toast]);

  const title = data?.modulo.tableroConfig?.titulo || usuario?.empresa?.nombre || data?.modulo.nombreServicio || 'ActivaQR Control';

  return <>
    <ControlIndustrial />
    {open && createPortal(
      data ? <PresentationOverlay
        data={data}
        energy={energy}
        historyByVariable={historyByVariable}
        historyHours={historyHours}
        refreshing={refreshing}
        lastRefreshAt={lastRefreshAt}
        commandBusy={commandBusy}
        title={title}
        selectedDeviceId={selectedDeviceId}
        activeTab={activeTab}
        onSelectDevice={(id) => { setSelectedDeviceId(id); setActiveTab('graficos'); }}
        onTab={setActiveTab}
        onRange={setHistoryHours}
        onClose={closePresentation}
        onCommand={commandRelay}
        onExport={exportDevice}
      /> : <div className="fixed inset-0 z-[100] grid place-items-center bg-[#070b14] text-slate-400">
        <div className="text-center"><RefreshCw size={28} className={`mx-auto mb-3 text-cyan-400 ${loading ? 'animate-spin' : ''}`} /><p className="text-sm font-semibold">Preparando vista ampliada…</p></div>
      </div>,
      document.body,
    )}
  </>;
};

export default ControlIndustrialEnhanced;
