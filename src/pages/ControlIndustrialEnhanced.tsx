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
  ShieldCheck,
  SlidersHorizontal,
  Thermometer,
  Wifi,
  WifiOff,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { Area, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useToast } from '../components/ui/Toast';
import {
  DispositivoIoT,
  exportarHistorialDispositivo,
  historialVariable,
  ResumenControl,
  resumenControl,
  resumenEnergia,
  solicitarComando,
  actualizarDispositivo,
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
type RangeHours = 0.25 | 1 | 6 | 24 | 168 | 720;

// La pantalla consulta la copia normalizada de ActivaQR cada dos segundos.
// Esto no llama a eWeLink: el conector conserva su propia reconciliación
// limitada y los eventos WebSocket actualizan la base cuando llegan.
const REFRESH_MS = 2_000;
const HISTORY_REFRESH_MS = 10_000;
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
  if (hours === 0.25) return '15 min';
  if (hours === 1) return '1 hora';
  if (hours === 6) return '6 horas';
  return '24 horas';
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

/**
 * Vista de operación de pantalla completa.
 *
 * Combina temperatura y humedad en un único gráfico para que el operador
 * pueda relacionar ambas variables sin saltar entre tarjetas. El resto de los
 * equipos se mantiene en una tabla liviana: cada salida conserva su control
 * real, confirmación y auditoría existentes.
 */
function SereneDeviceDetail({
  device,
  data,
  historyByVariable,
  historyHours,
  refreshing,
  commandBusy,
  linking,
  onRange,
  onCommand,
  onLink,
}: {
  device: DispositivoIoT;
  data: ResumenControl;
  historyByVariable: HistoryMap;
  historyHours: RangeHours;
  refreshing: boolean;
  commandBusy: string | null;
  linking: boolean;
  onRange: (hours: RangeHours) => void;
  onCommand: (device: DispositivoIoT, channel: VariableIoT, channelIndex: number) => void;
  onLink: (activoId: string | null) => void;
}) {
  const disconnectMs = (data.modulo.umbralSinConexionMinutos ?? 10) * 60_000;
  const ambient = ambientVariables(device);
  const relay = channelVariables(device)[0];
  const temperatureHistory = ambient.temperature ? historyByVariable[ambient.temperature.id] ?? [] : [];
  const humidityHistory = ambient.humidity ? historyByVariable[ambient.humidity.id] ?? [] : [];
  const linkedAsset = data.activos.find((activo) => activo.id === device.activoId);
  const [assetChoice, setAssetChoice] = useState(device.activoId ?? '');

  useEffect(() => setAssetChoice(device.activoId ?? ''), [device.id, device.activoId]);

  const chartData = useMemo(() => {
    const points = new Map<number, { timestamp: number; hora: string; temperatura?: number; humedad?: number }>();
    const add = (readings: HistoryReading[], key: 'temperatura' | 'humedad') => {
      readings.forEach((reading) => {
        if (reading.valorNumero == null) return;
        const timestamp = new Date(reading.medidaEn).getTime();
        const point = points.get(timestamp) ?? {
          timestamp,
          hora: new Date(timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        };
        point[key] = Number(reading.valorNumero);
        points.set(timestamp, point);
      });
    };
    add(temperatureHistory, 'temperatura');
    add(humidityHistory, 'humedad');
    return [...points.values()].sort((a, b) => a.timestamp - b.timestamp);
  }, [temperatureHistory, humidityHistory]);

  const otherOutputs = data.dispositivos.flatMap((item) =>
    channelVariables(item).map((channel, channelIndex) => ({ device: item, channel, channelIndex })),
  ).filter((item) => item.device.id !== device.id || item.channel.id !== relay?.id);

  const canControlHero = Boolean(
    relay
    && data.modulo.controlRemotoHabilitado
    && device.permiteControl
    && !isMotorMode(device)
    && PROVIDERS_WITH_CONTROL.has(device.integracion?.proveedor ?? ''),
  );

  return <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-5 px-4 pb-5 sm:px-6 lg:px-8">
    <section className="pt-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-400">Activo principal</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{device.ubicacion || device.nombre}</h2>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold text-cyan-300">Sensor ambiental</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span>{device.integracion?.proveedor === 'sonoff_ewelink' ? 'SONOFF ' : ''}{device.modelo || device.nombre}</span>
            <span className="text-slate-700">·</span>
            <select
              aria-label="Activo vinculado"
              value={assetChoice}
              onChange={(event) => setAssetChoice(event.target.value)}
              className="min-h-9 max-w-[19rem] rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-300 outline-none focus:border-cyan-500"
            >
              <option value="">Sin vincular a un activo</option>
              {data.activos.map((activo) => <option key={activo.id} value={activo.id}>{activo.codigo} · {activo.nombre}</option>)}
            </select>
            <button
              disabled={linking || assetChoice === (device.activoId ?? '')}
              onClick={() => onLink(assetChoice || null)}
              className="min-h-9 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/70 hover:text-cyan-300 disabled:cursor-default disabled:opacity-40"
            >
              {linking ? 'Vinculando…' : linkedAsset ? 'Actualizar vínculo' : 'Vincular activo'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4 xl:min-w-[710px]">
          <Metric label="Temperatura actual" value={numericValue(ambient.temperature, '°C')} tone="cyan" />
          <Metric label="Humedad actual" value={numericValue(ambient.humidity, '%')} tone="violet" />
          <Metric label="Relé / Compresor" value={relay ? (relay.valorBooleano ? 'Encendido' : 'Apagado') : '—'} tone={relay?.valorBooleano ? 'green' : 'neutral'} />
          <Metric label="Último dato" value={ago(device.ultimoContactoEn)} tone="neutral" />
        </div>
      </div>
    </section>

    <div className="grid min-h-[360px] gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="min-w-0 rounded-xl border border-slate-800 bg-[#0b1626] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400">
            <span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-cyan-400" />Temperatura (°C)</span>
            <span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-violet-400" />Humedad (%)</span>
          </div>
          <div className="flex rounded-lg bg-slate-950/55 p-1">
            {([0.25, 1, 6, 24] as RangeHours[]).map((hours) => <button key={hours} onClick={() => onRange(hours)} className={`min-h-8 rounded-md px-3 text-[11px] font-semibold transition ${historyHours === hours ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}>{rangeLabel(hours)}</button>)}
          </div>
        </div>
        <div className="mt-3 h-[270px]">
          {chartData.length ? <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="2 7" vertical={false} />
              <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={45} />
              <YAxis yAxisId="temperature" tick={{ fontSize: 10, fill: '#22d3ee' }} axisLine={false} tickLine={false} width={48} />
              <YAxis yAxisId="humidity" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: '#a78bfa' }} axisLine={false} tickLine={false} width={38} />
              <Tooltip contentStyle={{ background: '#07111f', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0' }} labelStyle={{ color: '#94a3b8' }} />
              <Area yAxisId="temperature" type="monotone" dataKey="temperatura" stroke="none" fill="#22d3ee" fillOpacity={0.06} connectNulls isAnimationActive={false} />
              <Line yAxisId="temperature" type="monotone" dataKey="temperatura" name="Temperatura" stroke="#22d3ee" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
              <Line yAxisId="humidity" type="monotone" dataKey="humedad" name="Humedad" stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer> : <div className="grid h-full place-items-center text-center text-xs text-slate-500">Esperando suficientes lecturas para dibujar la tendencia.</div>}
        </div>
        <p className="mt-1 flex items-center gap-2 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Última lectura: {ago(device.ultimoContactoEn)}</p>
      </section>

      <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <section className="rounded-xl border border-slate-800 bg-[#0b1626] p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-white">Control del relé</h3><span className={`text-xs font-semibold ${relay?.valorBooleano ? 'text-emerald-400' : 'text-slate-500'}`}>{relay?.valorBooleano ? 'Encendido' : 'Apagado'}</span></div>
          {relay && canControlHero ? <button disabled={commandBusy !== null} onClick={() => onCommand(device, relay, 0)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"><Power size={17} />{commandBusy ? 'Confirmando…' : relay.valorBooleano ? 'Apagar compresor' : 'Encender compresor'}</button> : <p className="mt-5 rounded-lg bg-slate-950/50 p-3 text-xs leading-5 text-slate-500">El control remoto no está habilitado para este equipo.</p>}
          <p className="mt-3 text-xs leading-5 text-slate-500">Cada maniobra exige confirmación, se verifica con el proveedor y queda auditada.</p>
        </section>
        <section className="rounded-xl border border-slate-800 bg-[#0b1626] p-5">
          <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-cyan-400" /><h3 className="font-semibold text-white">Estado operativo</h3></div>
          <dl className="mt-4 space-y-3 text-xs">
            <StatusRow label="Conexión" value={isOnline(device, disconnectMs) ? 'En línea' : 'Sin conexión'} />
            <StatusRow label="Activo asociado" value={linkedAsset ? linkedAsset.codigo : 'Pendiente'} />
            <StatusRow label="Origen" value={device.integracion?.proveedor === 'sonoff_ewelink' ? 'eWeLink' : device.integracion?.proveedor || 'IoT'} />
          </dl>
        </section>
      </aside>
    </div>

    <section className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-white">Otros dispositivos controlables</h3><span className="text-[11px] text-slate-500">{otherOutputs.length} salidas</span></div>
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1626]">
        <div className="hidden grid-cols-[1.4fr_1fr_.8fr_.8fr_88px] gap-4 border-b border-slate-800 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600 md:grid">
          <span>Dispositivo</span><span>Tipo</span><span>Estado</span><span>Relé / Carga</span><span className="text-right">Acción</span>
        </div>
        {otherOutputs.map(({ device: item, channel, channelIndex }) => {
          const online = isOnline(item, disconnectMs);
          const canControl = data.modulo.controlRemotoHabilitado && item.permiteControl && !isMotorMode(item) && PROVIDERS_WITH_CONTROL.has(item.integracion?.proveedor ?? '');
          const busy = commandBusy === `${item.id}:${channelIndex}`;
          return <div key={channel.id} className="grid gap-2 border-b border-slate-800/80 px-4 py-3 last:border-0 md:grid-cols-[1.4fr_1fr_.8fr_.8fr_88px] md:items-center md:gap-4 md:py-2.5">
            <div className="min-w-0"><strong className="block truncate text-xs font-medium text-slate-200">{item.nombre} / {channel.nombre}</strong><span className="text-[10px] text-slate-600 md:hidden">{channel.uso}</span></div>
            <span className="hidden text-xs capitalize text-slate-500 md:block">{channel.uso.replaceAll('_', ' ')}</span>
            <span className={`flex items-center gap-2 text-xs ${online ? 'text-slate-400' : 'text-slate-600'}`}><i className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-slate-600'}`} />{online ? 'En línea' : 'Desconectado'}</span>
            <span className={`text-xs ${channel.valorBooleano ? 'text-emerald-400' : 'text-slate-500'}`}>{channel.valorBooleano ? 'Encendido' : 'Apagado'}</span>
            <button aria-label={`${channel.valorBooleano ? 'Apagar' : 'Encender'} ${channel.nombre}`} disabled={!canControl || busy} onClick={() => onCommand(item, channel, channelIndex)} className={`ml-auto flex h-7 w-12 items-center rounded-full p-1 transition disabled:opacity-40 ${channel.valorBooleano ? 'justify-end bg-cyan-500/70' : 'justify-start bg-slate-700'}`}><span className="h-5 w-5 rounded-full bg-white shadow" /></button>
          </div>;
        })}
      </div>
    </section>

    <footer className="flex flex-col gap-2 border-t border-slate-800/80 pt-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Interfaz actualizada cada 2 s desde ActivaQR. La conciliación con el proveedor mantiene protegida la cuota de la API.</span>
      <span className="flex items-center gap-2"><RefreshCw size={12} className={refreshing ? 'animate-spin text-cyan-400' : ''} />Datos normalizados y auditables</span>
    </footer>
  </div>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'cyan' | 'violet' | 'green' | 'neutral' }) {
  const color = { cyan: 'text-cyan-300', violet: 'text-violet-400', green: 'text-emerald-400', neutral: 'text-slate-200' }[tone];
  return <div className="min-w-0"><span className="block text-[11px] text-slate-500">{label}</span><strong className={`mt-1 block truncate text-xl font-semibold tracking-tight sm:text-2xl ${color}`}>{value}</strong></div>;
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="truncate font-medium text-slate-300">{value}</dd></div>;
}

function DeviceDetail({
  device,
  data,
  historyByVariable,
  historyHours,
  refreshing,
  commandBusy,
  linking,
  activeTab,
  onTab,
  onRange,
  onCommand,
  onExport,
  onLink,
}: {
  device: DispositivoIoT;
  data: ResumenControl;
  historyByVariable: HistoryMap;
  historyHours: RangeHours;
  refreshing: boolean;
  commandBusy: string | null;
  linking: boolean;
  activeTab: DetailTab;
  onTab: (tab: DetailTab) => void;
  onRange: (hours: RangeHours) => void;
  onCommand: (device: DispositivoIoT, channel: VariableIoT, channelIndex: number) => void;
  onExport: (device: DispositivoIoT) => void;
  onLink: (activoId: string | null) => void;
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

  return <SereneDeviceDetail
    device={device}
    data={data}
    historyByVariable={historyByVariable}
    historyHours={historyHours}
    refreshing={refreshing}
    commandBusy={commandBusy}
    linking={linking}
    onRange={onRange}
    onCommand={onCommand}
    onLink={onLink}
  />;

  // eslint-disable-next-line no-unreachable
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
          <div className="mb-4 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Thermometer size={17} className="text-blue-400" />Temperatura (°C)</div><strong className="mt-2 block text-3xl font-semibold text-blue-400">{numericValue(ambient.temperature, '°C')}</strong></div><div className="text-right text-[11px] leading-5 text-slate-500"><span className="block">Mín: {tempStats.min == null ? '—' : `${tempStats.min!.toLocaleString('es-AR', { maximumFractionDigits: 1 })} °C`}</span><span className="block">Máx: {tempStats.max == null ? '—' : `${tempStats.max!.toLocaleString('es-AR', { maximumFractionDigits: 1 })} °C`}</span></div></div>
          <TrendChart variable={ambient.temperature!} history={tempHistory} kind="temperature" />
        </article>}
        {ambient.humidity && <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Droplets size={17} className="text-emerald-400" />Humedad (%)</div><strong className="mt-2 block text-3xl font-semibold text-emerald-400">{numericValue(ambient.humidity, '%')}</strong></div><div className="text-right text-[11px] leading-5 text-slate-500"><span className="block">Mín: {humidityStats.min == null ? '—' : `${humidityStats.min!.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`}</span><span className="block">Máx: {humidityStats.max == null ? '—' : `${humidityStats.max!.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`}</span></div></div>
          <TrendChart variable={ambient.humidity!} history={humidityHistory} kind="humidity" />
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
  const [linking, setLinking] = useState(false);

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
    const timer = window.setInterval(() => void loadHistory(), HISTORY_REFRESH_MS);
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

  /** Vincula el equipo IoT con el activo físico sin perder telemetría. */
  const linkAsset = useCallback(async (activoId: string | null) => {
    if (!selectedDevice) return;
    setLinking(true);
    try {
      await actualizarDispositivo(selectedDevice.id, { activoId });
      toast(activoId ? 'Dispositivo vinculado al activo.' : 'Vínculo con el activo eliminado.', 'success');
      await loadControl(true);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo vincular el activo.', 'error');
    } finally {
      setLinking(false);
    }
  }, [loadControl, selectedDevice, toast]);

  return <>
    <ControlIndustrial />
    {open && data && selectedDevice && createPortal(
      <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#07111f] text-slate-100">
        <header className="sticky top-0 z-20 border-b border-slate-800/90 bg-[#07111f]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">{data.modulo.tableroConfig?.titulo || 'ActivaQR Control'}</p>
              <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{data.dispositivos.filter((item) => isOnline(item, (data.modulo.umbralSinConexionMinutos ?? 10) * 60_000)).length}/{data.dispositivos.length} en línea</span>
                <span>{data.alarmas.filter((alarm) => alarm.estado === 'activa').length} alarmas activas</span>
                <span className="hidden sm:inline">Actualizado {ago(selectedDevice.ultimoContactoEn)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={selectedDevice.id} onChange={(event) => { setSelectedDeviceId(event.target.value); setHistoryByVariable({}); setActiveTab('graficos'); }} className="max-w-[48vw] rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-200 outline-none sm:max-w-xs">
                {data.dispositivos.map((device) => <option key={device.id} value={device.id}>{device.nombre}</option>)}
              </select>
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500" aria-label="Cerrar detalle"><X size={18} /></button>
            </div>
          </div>
        </header>
        <main className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DeviceDetail
            device={selectedDevice}
            data={data}
            historyByVariable={historyByVariable}
            historyHours={historyHours}
            refreshing={refreshing}
            commandBusy={commandBusy}
            linking={linking}
            activeTab={activeTab}
            onTab={setActiveTab}
            onRange={setHistoryHours}
            onCommand={commandRelay}
            onExport={exportDevice}
            onLink={linkAsset}
          />
        </main>
      </div>,
      document.body,
    )}
  </>;
};

export default ControlIndustrialEnhanced;
