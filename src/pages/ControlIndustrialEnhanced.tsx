import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3,
  Download,
  Droplets,
  History,
  Info,
  Power,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Thermometer,
  Wifi,
  WifiOff,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useToast } from '../components/ui/Toast';
import {
  DispositivoIoT,
  exportarHistorialDispositivo,
  historialVariable,
  ResumenControl,
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

const REFRESH_MS = 5_000;
const AMBIENT_VARIABLE = /^(temperature|temperatura|humidity|humedad)$/i;
const POWER_VARIABLE = /^(actpow|power)(?:_([0-9]+))?$/i;
const CURRENT_VARIABLE = /^current(?:_([0-9]+))?$/i;
const VOLTAGE_VARIABLE = /^voltage(?:_([0-9]+))?$/i;
const PROVIDERS_WITH_CONTROL = new Set(['sonoff_ewelink', 'tuya_cloud']);

function ago(value?: string | null) {
  if (!value) return 'sin datos';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return 'ahora';
  if (seconds < 60) return `hace ${seconds} s`;
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  return `hace ${Math.floor(seconds / 86400)} días`;
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

function ambientVariables(device: DispositivoIoT) {
  const temperature = device.variables.find((variable) => /^(temperature|temperatura)$/i.test(variable.clave));
  const humidity = device.variables.find((variable) => /^(humidity|humedad)$/i.test(variable.clave));
  return { temperature, humidity };
}

function isMotorMode(device: DispositivoIoT) {
  return device.variables.some((variable) => variable.clave === 'operation_mode' && variable.valorTexto === 'motor');
}

function suffixToChannel(suffix?: string) {
  if (!suffix) return 1;
  const numeric = Number(suffix);
  if (!Number.isFinite(numeric)) return 1;
  if (suffix === '0' || (suffix.length > 1 && suffix.startsWith('0'))) return numeric + 1;
  return numeric;
}

function metricForChannel(device: DispositivoIoT, matcher: RegExp, channel: number) {
  const matching = device.variables.filter((variable) => matcher.test(variable.clave));
  const exact = matching.find((variable) => suffixToChannel(variable.clave.match(matcher)?.[1]) === channel && Boolean(variable.clave.match(matcher)?.[1]));
  return exact ?? (channelVariables(device).length <= 1 ? matching.find((variable) => !variable.clave.match(matcher)?.[1]) : undefined);
}

function numericValue(variable?: VariableIoT | null, suffix?: string, decimals = 1) {
  if (!variable || variable.valorNumero == null) return '—';
  const unit = suffix ?? variable.unidad ?? '';
  const value = Number(variable.valorNumero).toLocaleString('es-AR', { maximumFractionDigits: decimals });
  return `${value}${unit ? ` ${unit}` : ''}`;
}

function rangeLabel(hours: RangeHours) {
  if (hours === 6) return '6 horas';
  if (hours === 24) return '24 horas';
  if (hours === 168) return '7 días';
  return '30 días';
}

function chartStats(history: HistoryReading[]) {
  const values = history.map((item) => item.valorNumero).filter((value): value is number => typeof value === 'number');
  if (!values.length) return { min: null as number | null, max: null as number | null };
  return { min: Math.min(...values), max: Math.max(...values) };
}

function TrendChart({ variable, history, kind }: { variable: VariableIoT; history: HistoryReading[]; kind: 'temperature' | 'humidity' }) {
  const points = useMemo(() => history
    .filter((reading) => reading.valorNumero != null)
    .map((reading) => ({
      hora: new Date(reading.medidaEn).toLocaleString('es-AR', { day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      valor: Number(reading.valorNumero),
    })), [history]);
  const stroke = kind === 'temperature' ? '#4f8cff' : '#42d4a4';
  const suffix = kind === 'temperature' ? '°C' : '%';

  if (!points.length) {
    return <div className="grid h-56 place-items-center rounded-xl border border-slate-800 bg-slate-950/40 px-4 text-center text-xs text-slate-500">Esperando lecturas para dibujar la tendencia.</div>;
  }

  return <div className="h-56 sm:h-64">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ left: -16, right: 8, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke="#334155" opacity={0.6} vertical={false} />
        <XAxis dataKey="hora" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={42} />
        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={42} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxShadow: '0 16px 40px rgba(0,0,0,.28)' }}
          formatter={(value: number) => [`${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 1 })} ${suffix}`, variable.nombre]}
        />
        <Line type="monotone" dataKey="valor" stroke={stroke} strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}

function SummaryCard({ icon: Icon, label, value, detail, tone }: { icon: React.ElementType; label: string; value: string; detail: string; tone: 'blue' | 'green' | 'violet' | 'amber' }) {
  const tones = {
    blue: 'border-blue-500/25 bg-blue-500/[.07] text-blue-400',
    green: 'border-emerald-500/25 bg-emerald-500/[.07] text-emerald-400',
    violet: 'border-violet-500/25 bg-violet-500/[.07] text-violet-400',
    amber: 'border-amber-500/25 bg-amber-500/[.07] text-amber-400',
  };
  return <div className={`min-w-0 rounded-2xl border p-4 ${tones[tone]}`}>
    <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-slate-300">{label}</span><Icon size={18} /></div>
    <strong className="mt-3 block break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">{value}</strong>
    <span className="mt-2 block text-[11px] text-slate-500">{detail}</span>
  </div>;
}

function findDeviceNameFromButton(button: HTMLElement) {
  let node: HTMLElement | null = button;
  while (node) {
    if (node.tagName === 'ARTICLE') {
      const heading = node.querySelector('h2');
      const text = heading?.textContent?.trim();
      if (text) return text;
    }
    node = node.parentElement;
  }
  return null;
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
  const rawModel = device.modelo || device.nombre;
  const displayModel = device.integracion?.proveedor === 'sonoff_ewelink' && !/^sonoff\b/i.test(rawModel) ? `SONOFF ${rawModel}` : rawModel;

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
          <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-xl font-semibold tracking-tight text-white sm:text-3xl">{displayModel}</h2><span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{online ? 'En línea' : 'Sin conexión'}</span></div>
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
      <div className="flex gap-3"><SlidersHorizontal size={20} className="mt-0.5 shrink-0 text-cyan-400" /><div><h3 className="font-semibold text-white">Configuración operativa</h3><p className="mt-1 text-sm leading-relaxed text-slate-400">El equipo está {device.habilitado ? 'habilitado para recibir telemetría' : 'pausado'} y el control remoto está {device.permiteControl ? 'permitido para este dispositivo' : 'deshabilitado'}. Los cambios de nombre, ubicación, función del relé y permisos siguen disponibles en “Configurar dispositivo”.</p></div></div>
    </section>}

    {activeTab === 'automatizaciones' && <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
      <div className="flex items-center gap-2"><Workflow size={18} className="text-violet-400" /><h3 className="font-semibold text-white">Reglas vinculadas</h3></div>
      {deviceRules.length ? <div className="mt-4 space-y-2">{deviceRules.map((rule) => <div key={rule.id} className="rounded-xl bg-slate-950/45 p-3"><div className="flex items-center justify-between gap-3"><strong className="text-sm font-medium text-slate-200">{rule.nombre}</strong><span className={`rounded-lg px-2 py-1 text-[9px] font-semibold ${rule.activa ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>{rule.activa ? 'ACTIVA' : 'PAUSADA'}</span></div><p className="mt-1 text-xs text-slate-500">{rule.variable.nombre} · {rule.severidad}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Todavía no hay reglas vinculadas a este dispositivo.</p>}
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

export const ControlIndustrialEnhanced: React.FC = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ResumenControl | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [historyByVariable, setHistoryByVariable] = useState<HistoryMap>({});
  const [historyHours, setHistoryHours] = useState<RangeHours>(6);
  const [activeTab, setActiveTab] = useState<DetailTab>('graficos');
  const [refreshing, setRefreshing] = useState(false);
  const [commandBusy, setCommandBusy] = useState<string | null>(null);

  const selectedDevice = useMemo(
    () => data?.dispositivos.find((device) => device.id === selectedDeviceId) ?? null,
    [data, selectedDeviceId],
  );

  const loadControl = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const control = await resumenControl();
      setData(control);
      setSelectedDeviceId((current) => current && control.dispositivos.some((device) => device.id === current)
        ? current
        : control.dispositivos.find((device) => device.variables.some((variable) => AMBIENT_VARIABLE.test(variable.clave)))?.id ?? control.dispositivos[0]?.id ?? null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo actualizar ActivaQR Control.', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  const openDevice = useCallback(async (deviceName?: string | null) => {
    setRefreshing(true);
    try {
      const control = await resumenControl();
      const preferred = deviceName
        ? control.dispositivos.find((device) => device.nombre.trim().toLowerCase() === deviceName.trim().toLowerCase())
        : undefined;
      const device = preferred
        ?? control.dispositivos.find((item) => item.variables.some((variable) => AMBIENT_VARIABLE.test(variable.clave)))
        ?? control.dispositivos[0];
      if (!device) {
        toast('Todavía no hay dispositivos para mostrar.', 'warning');
        return;
      }
      setData(control);
      setSelectedDeviceId(device.id);
      setHistoryHours(6);
      setActiveTab('graficos');
      setHistoryByVariable({});
      setOpen(true);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo abrir el detalle del dispositivo.', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    const captureDeviceDetail = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('button') as HTMLElement | null;
      if (!button) return;
      const text = (button.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
      const expand = button.getAttribute('aria-label') === 'Expandir tablero';
      const historyButton = /ver gráficos e historial|abrir historial completo/.test(text);
      const measurementButton = /temperatura|humedad/.test(text) && Boolean(findDeviceNameFromButton(button));
      if (!expand && !historyButton && !measurementButton) return;
      event.preventDefault();
      event.stopPropagation();
      const name = expand ? null : findDeviceNameFromButton(button);
      void openDevice(name);
    };
    document.addEventListener('click', captureDeviceDetail, true);
    return () => document.removeEventListener('click', captureDeviceDetail, true);
  }, [openDevice]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => void loadControl(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [open, loadControl]);

  useEffect(() => {
    if (!open || !selectedDevice) return;
    const ambient = ambientVariables(selectedDevice);
    const variables = [ambient.temperature, ambient.humidity].filter((variable): variable is VariableIoT => Boolean(variable));
    if (!variables.length) return;
    let cancelled = false;
    const loadHistory = async () => {
      try {
        const results = await Promise.all(variables.map(async (variable) => {
          const result = await historialVariable(variable.id, historyHours);
          return [variable.id, result.lecturas] as const;
        }));
        if (!cancelled) setHistoryByVariable(Object.fromEntries(results));
      } catch {
        // El valor actual sigue visible aunque el historial falle temporalmente.
      }
    };
    void loadHistory();
    const timer = window.setInterval(() => void loadHistory(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, selectedDevice?.id, historyHours]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const commandRelay = useCallback(async (device: DispositivoIoT, channel: VariableIoT, channelIndex: number) => {
    const parsed = Number(channel.clave.slice(7)) - 1;
    const canal = Number.isInteger(parsed) && parsed >= 0 ? parsed : channelIndex;
    const nextState = !channel.valorBooleano;
    const label = channelVariables(device).length === 1 ? 'relé interno' : channel.nombre || `canal ${canal + 1}`;
    if (!window.confirm(`¿${nextState ? 'Encender' : 'Apagar'} ${label} de ${device.nombre}?`)) return;
    const key = `${device.id}:${canal}`;
    setCommandBusy(key);
    try {
      await solicitarComando({
        dispositivoId: device.id,
        tipo: 'rele',
        payload: { canal, encendido: nextState },
        motivo: 'Operación confirmada desde el detalle ampliado de ActivaQR Control.',
      });
      toast(`${device.nombre}: ${label} ${nextState ? 'encendido' : 'apagado'} y verificado.`, 'success');
      await loadControl(true);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo confirmar la maniobra.', 'error');
    } finally {
      setCommandBusy(null);
    }
  }, [loadControl, toast]);

  const exportDevice = useCallback(async (device: DispositivoIoT) => {
    try {
      const result = await exportarHistorialDispositivo(device.id, historyHours);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast('Historial exportado correctamente.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo exportar el historial.', 'error');
    }
  }, [historyHours, toast]);

  return <>
    <ControlIndustrial />
    {open && data && selectedDevice && createPortal(
      <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#08111f]/98 text-slate-100">
        <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#08111f]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-400">ActivaQR Control</p><p className="truncate text-sm text-slate-400">Detalle del dispositivo</p></div>
            <div className="flex items-center gap-2">
              <select value={selectedDevice.id} onChange={(event) => { setSelectedDeviceId(event.target.value); setHistoryByVariable({}); setActiveTab('graficos'); }} className="max-w-[52vw] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none sm:max-w-xs">
                {data.dispositivos.map((device) => <option key={device.id} value={device.id}>{device.nombre}</option>)}
              </select>
              <button onClick={() => setOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300" aria-label="Cerrar detalle"><X size={19} /></button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
          <DeviceDetail
            device={selectedDevice}
            data={data}
            historyByVariable={historyByVariable}
            historyHours={historyHours}
            refreshing={refreshing}
            commandBusy={commandBusy}
            activeTab={activeTab}
            onTab={setActiveTab}
            onRange={setHistoryHours}
            onCommand={commandRelay}
            onExport={exportDevice}
          />
        </main>
      </div>,
      document.body,
    )}
  </>;
};

export default ControlIndustrialEnhanced;
