import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  Droplets,
  Gauge,
  Minimize2,
  Power,
  RefreshCw,
  ShieldAlert,
  Signal,
  Thermometer,
  WifiOff,
  Zap,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import {
  DispositivoIoT,
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

const AMBIENT_VARIABLE = /^(temperature|temperatura|humidity|humedad)$/i;
const POWER_VARIABLE = /^(actpow|power)(?:_([0-9]+))?$/i;
const PROVIDERS_WITH_CONTROL = new Set(['sonoff_ewelink', 'tuya_cloud']);
const HISTORY_HOURS = 6;
const REFRESH_MS = 5_000;

function ago(value?: string | null) {
  if (!value) return 'sin datos';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return 'ahora';
  if (seconds < 60) return `hace ${seconds} s`;
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  return `hace ${Math.floor(seconds / 3600)} h`;
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

function channelPower(device: DispositivoIoT, channel: number) {
  const powers = device.variables.filter((variable) => POWER_VARIABLE.test(variable.clave));
  const exact = powers.find((variable) => {
    const suffix = variable.clave.match(POWER_VARIABLE)?.[2];
    return suffix ? channelIndexFromSuffix(suffix) === channel : false;
  });
  if (exact) return exact;
  return channelVariables(device).length === 1 ? powers.find((variable) => !variable.clave.match(POWER_VARIABLE)?.[2]) : undefined;
}

function ambientVariables(device: DispositivoIoT) {
  const temperature = device.variables.find((variable) => /^(temperature|temperatura)$/i.test(variable.clave));
  const humidity = device.variables.find((variable) => /^(humidity|humedad)$/i.test(variable.clave));
  return { temperature, humidity };
}

function numericValue(variable?: VariableIoT | null, suffix?: string) {
  if (!variable || variable.valorNumero == null) return '—';
  const unit = suffix ?? variable.unidad ?? '';
  return `${Number(variable.valorNumero).toLocaleString('es-AR', { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`;
}

function mergeHistory(...groups: HistoryReading[][]) {
  const unique = new Map<string, HistoryReading>();
  for (const group of groups) {
    for (const reading of group) unique.set(reading.medidaEn, reading);
  }
  return [...unique.values()]
    .sort((a, b) => new Date(a.medidaEn).getTime() - new Date(b.medidaEn).getTime())
    .slice(-360);
}

function TrendChart({ variable, history, kind }: { variable: VariableIoT; history: HistoryReading[]; kind: 'temperature' | 'humidity' }) {
  const points = useMemo(() => history
    .filter((reading) => reading.valorNumero != null)
    .map((reading) => ({
      hora: new Date(reading.medidaEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      valor: Number(reading.valorNumero),
    })), [history]);
  const stroke = kind === 'temperature' ? '#d97706' : '#0891b2';
  const suffix = kind === 'temperature' ? '°C' : '%';

  return <div className="h-44 sm:h-52">
    {points.length ? <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ left: -18, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke="#cbd5e1" opacity={0.55} vertical={false} />
        <XAxis dataKey="hora" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={40} />
        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={42} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15,23,42,.08)' }}
          formatter={(value: number) => [`${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 1 })} ${suffix}`, variable.nombre]}
        />
        <Line type="monotone" dataKey="valor" stroke={stroke} strokeWidth={2.5} dot={points.length < 3} activeDot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer> : <div className="grid h-full place-items-center rounded-2xl bg-slate-50 text-center text-xs text-slate-400">Esperando lecturas para dibujar la tendencia.</div>}
  </div>;
}

function AmbientMetric({ variable, kind }: { variable?: VariableIoT; kind: 'temperature' | 'humidity' }) {
  const temperature = kind === 'temperature';
  return <div className={`rounded-2xl p-4 ${temperature ? 'bg-amber-50 text-amber-950' : 'bg-cyan-50 text-cyan-950'}`}>
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[.12em] opacity-60">{temperature ? 'Temperatura' : 'Humedad'}</span>
      {temperature ? <Thermometer size={18} className="text-amber-600" /> : <Droplets size={18} className="text-cyan-600" />}
    </div>
    <strong className="mt-2 block text-3xl font-semibold tracking-tight sm:text-4xl">{numericValue(variable, temperature ? '°C' : '%')}</strong>
    <span className="mt-2 block text-[11px] opacity-60">Último dato {ago(variable?.medidaEn)}</span>
  </div>;
}

function DeviceStatus({ online, state }: { online: boolean; state: string }) {
  return <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${online ? state === 'critico' ? 'bg-red-50 text-red-700' : state === 'advertencia' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
    <span className={`h-2 w-2 rounded-full ${online ? state === 'critico' ? 'bg-red-500' : state === 'advertencia' ? 'bg-amber-500' : 'bg-emerald-500' : 'bg-slate-400'}`} />
    {online ? state === 'normal' ? 'En línea' : state.replace('_', ' ') : 'Sin conexión'}
  </span>;
}

function DeviceCard({
  device,
  historyByVariable,
  disconnectMs,
  remoteEnabled,
  busy,
  onCommand,
}: {
  device: DispositivoIoT;
  historyByVariable: HistoryMap;
  disconnectMs: number;
  remoteEnabled: boolean;
  busy: string | null;
  onCommand: (device: DispositivoIoT, channel: VariableIoT, channelIndex: number) => void;
}) {
  const online = isOnline(device, disconnectMs);
  const channels = channelVariables(device);
  const ambient = ambientVariables(device);
  const isAmbient = Boolean(ambient.temperature || ambient.humidity);
  const canControl = remoteEnabled
    && device.permiteControl
    && !isMotorMode(device)
    && PROVIDERS_WITH_CONTROL.has(device.integracion?.proveedor ?? '');

  return <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
    <div className="flex min-w-0 items-start gap-3">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${isAmbient ? 'bg-cyan-50 text-cyan-700' : channels.length ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
        {!online ? <WifiOff size={20} /> : isAmbient ? <Thermometer size={20} /> : channels.length ? <Zap size={20} /> : <Gauge size={20} />}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="break-words text-lg font-semibold leading-tight text-slate-950 sm:text-xl">{device.nombre}</h2>
        <p className="mt-1 break-words text-xs text-slate-500">{device.ubicacion || device.modelo || device.identificadorExterno}</p>
      </div>
      <DeviceStatus online={online} state={device.estado} />
    </div>

    {isAmbient && <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <AmbientMetric variable={ambient.temperature} kind="temperature" />
        <AmbientMetric variable={ambient.humidity} kind="humidity" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {ambient.temperature && <div className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">Temperatura · últimas {HISTORY_HOURS} h</span><span className="text-[10px] text-slate-400">en vivo</span></div>
          <TrendChart variable={ambient.temperature} history={historyByVariable[ambient.temperature.id] ?? []} kind="temperature" />
        </div>}
        {ambient.humidity && <div className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">Humedad · últimas {HISTORY_HOURS} h</span><span className="text-[10px] text-slate-400">en vivo</span></div>
          <TrendChart variable={ambient.humidity} history={historyByVariable[ambient.humidity.id] ?? []} kind="humidity" />
        </div>}
      </div>
    </>}

    {channels.length > 0 && <div className={`mt-5 grid gap-3 ${channels.length > 1 ? 'sm:grid-cols-2' : ''}`}>
      {channels.map((channel, index) => {
        const channelNumber = Number(channel.clave.slice(7)) || index + 1;
        const power = channelPower(device, channelNumber);
        const key = `${device.id}:${index}`;
        const label = isAmbient && channels.length === 1 ? 'Relé interno' : channel.nombre || `Canal ${index + 1}`;
        return <div key={channel.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{label}</span>
              <strong className="mt-1 block text-base font-semibold text-slate-900">{channel.valorBooleano ? 'Encendido' : 'Apagado'}</strong>
              {channel.valorBooleano && power?.valorNumero != null && <span className="mt-1 block text-xs text-slate-500">Consumo {numericValue(power)}</span>}
            </div>
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${channel.valorBooleano ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400'}`}><Power size={18} /></div>
          </div>
          {canControl && <button
            disabled={busy !== null}
            onClick={() => onCommand(device, channel, index)}
            className={`mt-3 min-h-11 w-full rounded-xl px-4 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-50 ${channel.valorBooleano ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >{busy === key ? 'Confirmando…' : channel.valorBooleano ? 'Apagar' : 'Encender'}</button>}
        </div>;
      })}
    </div>}

    {!isAmbient && !channels.length && <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Equipo de monitoreo. Último contacto {ago(device.ultimoContactoEn)}.</div>}
    <p className="mt-4 text-[10px] text-slate-400">Actualizado {ago(device.ultimoContactoEn)}</p>
  </article>;
}

function PresentationOverlay({
  data,
  energy,
  historyByVariable,
  refreshing,
  lastRefreshAt,
  commandBusy,
  title,
  onClose,
  onCommand,
}: {
  data: ResumenControl;
  energy: ResumenEnergia | null;
  historyByVariable: HistoryMap;
  refreshing: boolean;
  lastRefreshAt: Date | null;
  commandBusy: string | null;
  title: string;
  onClose: () => void;
  onCommand: (device: DispositivoIoT, channel: VariableIoT, channelIndex: number) => void;
}) {
  const disconnectMs = (data.modulo.umbralSinConexionMinutos ?? 10) * 60_000;
  const online = data.dispositivos.filter((device) => isOnline(device, disconnectMs)).length;
  const critical = data.alarmas.filter((alarm) => alarm.severidad === 'critica' && alarm.estado !== 'resuelta').length;
  const devices = [...data.dispositivos].sort((a, b) => {
    const aAmbient = a.variables.some((variable) => AMBIENT_VARIABLE.test(variable.clave)) ? 0 : 1;
    const bAmbient = b.variables.some((variable) => AMBIENT_VARIABLE.test(variable.clave)) ? 0 : 1;
    return aAmbient - bAmbient || a.nombre.localeCompare(b.nombre);
  });

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-100 text-slate-950">
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-7 lg:px-10">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-700"><Activity size={14} /> ActivaQR Control</div>
          <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{data.modulo.tableroConfig?.subtitulo || data.modulo.nombreServicio} · actualización cada 5 segundos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-800"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase"><Signal size={14} /> En línea</div><strong className="mt-1 block text-lg">{online}/{data.dispositivos.length}</strong></div>
          <div className={`rounded-2xl px-3 py-2 ${critical ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-700'}`}><div className="flex items-center gap-2 text-[10px] font-semibold uppercase"><ShieldAlert size={14} /> Críticas</div><strong className="mt-1 block text-lg">{critical}</strong></div>
          {energy && <div className="rounded-2xl bg-amber-50 px-3 py-2 text-amber-900"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase"><Zap size={14} /> Potencia</div><strong className="mt-1 block text-lg">{energy.currentPowerW.toLocaleString('es-AR', { maximumFractionDigits: 0 })} W</strong></div>}
          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-slate-600"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Sincronización</div><span className="mt-1 block text-xs">{lastRefreshAt ? ago(lastRefreshAt.toISOString()) : 'cargando'}</span></div>
          <button onClick={onClose} className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50" aria-label="Cerrar vista ampliada" title="Cerrar vista ampliada"><Minimize2 size={20} /></button>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-[1800px] p-4 sm:p-6 lg:p-8">
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {devices.map((device) => <DeviceCard
          key={device.id}
          device={device}
          historyByVariable={historyByVariable}
          disconnectMs={disconnectMs}
          remoteEnabled={data.modulo.controlRemotoHabilitado}
          busy={commandBusy}
          onCommand={onCommand}
        />)}
      </div>
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [commandBusy, setCommandBusy] = useState<string | null>(null);
  const requestedHistory = useRef(new Set<string>());

  const loadPresentation = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      const [control, energySummary] = await Promise.all([
        resumenControl(),
        resumenEnergia().catch(() => null),
      ]);
      setData(control);
      setEnergy(energySummary);
      setLastRefreshAt(new Date());
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo actualizar la vista ampliada.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    const captureExpand = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('button[aria-label="Expandir tablero"]')) setOpen(true);
    };
    const fullscreenChanged = () => setOpen(Boolean(document.fullscreenElement));
    document.addEventListener('click', captureExpand, true);
    document.addEventListener('fullscreenchange', fullscreenChanged);
    return () => {
      document.removeEventListener('click', captureExpand, true);
      document.removeEventListener('fullscreenchange', fullscreenChanged);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    loadPresentation();
    const timer = window.setInterval(() => loadPresentation(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [open, loadPresentation]);

  useEffect(() => {
    if (!open || !data) return;
    const variables = data.dispositivos.flatMap((device) => device.variables.filter((variable) => AMBIENT_VARIABLE.test(variable.clave)));

    setHistoryByVariable((current) => {
      let changed = false;
      const next = { ...current };
      for (const variable of variables) {
        if (variable.valorNumero == null || !variable.medidaEn) continue;
        const existing = next[variable.id] ?? [];
        if (existing.some((reading) => reading.medidaEn === variable.medidaEn)) continue;
        next[variable.id] = mergeHistory(existing, [{ medidaEn: variable.medidaEn, valorNumero: variable.valorNumero }]);
        changed = true;
      }
      return changed ? next : current;
    });

    for (const variable of variables) {
      if (requestedHistory.current.has(variable.id)) continue;
      requestedHistory.current.add(variable.id);
      historialVariable(variable.id, HISTORY_HOURS).then((result) => {
        setHistoryByVariable((current) => ({
          ...current,
          [variable.id]: mergeHistory(result.lecturas, current[variable.id] ?? []),
        }));
      }).catch(() => {
        requestedHistory.current.delete(variable.id);
      });
    }
  }, [open, data]);

  useEffect(() => {
    if (open) return;
    requestedHistory.current.clear();
    setHistoryByVariable({});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const closePresentation = useCallback(() => {
    setOpen(false);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }
    window.setTimeout(() => {
      const originalClose = document.querySelector<HTMLButtonElement>('button[title="Salir de pantalla completa"]');
      originalClose?.click();
    }, 0);
  }, []);

  const commandRelay = useCallback(async (device: DispositivoIoT, channel: VariableIoT, channelIndex: number) => {
    const canal = Number(channel.clave.slice(7)) - 1;
    const resolvedChannel = Number.isInteger(canal) && canal >= 0 ? canal : channelIndex;
    const nextState = !Boolean(channel.valorBooleano);
    const label = device.tipo === 'sensor_ambiente' && channelVariables(device).length === 1 ? 'relé interno' : channel.nombre || `canal ${resolvedChannel + 1}`;
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

  const title = data?.modulo.tableroConfig?.titulo || usuario?.empresa?.nombre || data?.modulo.nombreServicio || 'ActivaQR Control';

  return <>
    <ControlIndustrial />
    {open && createPortal(
      data ? <PresentationOverlay
        data={data}
        energy={energy}
        historyByVariable={historyByVariable}
        refreshing={refreshing}
        lastRefreshAt={lastRefreshAt}
        commandBusy={commandBusy}
        title={title}
        onClose={closePresentation}
        onCommand={commandRelay}
      /> : <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-100 text-slate-700">
        <div className="text-center"><RefreshCw size={28} className={`mx-auto mb-3 text-cyan-700 ${loading ? 'animate-spin' : ''}`} /><p className="text-sm font-semibold">Preparando vista ampliada…</p></div>
      </div>,
      document.body,
    )}
  </>;
};

export default ControlIndustrialEnhanced;
