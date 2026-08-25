import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Archive, BellRing, Check, ChevronDown, ChevronRight, ChevronUp, CircleOff, CloudCog, Cpu, DoorOpen, Download, Droplets, EyeOff, Gauge, KeyRound, Layers3, LineChart as LineChartIcon, Maximize2, Minimize2, Play, Plus, RadioTower, RefreshCw, RotateCcw, Settings2, ShieldAlert, Signal, Snowflake, Thermometer, Trash2, WifiOff, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { DialogViewport } from '../components/ui/DialogViewport';
import { API_URL } from '../data/auth';
import {
  AlarmaIoT,
  actualizarDispositivo,
  actualizarRegla,
  actualizarTableroControl,
  actualizarVariable,
  autorizarSonoff,
  configurarTuya,
  crearEscena,
  crearIntegracion,
  crearRegla,
  eliminarRegla,
  eliminarEscena,
  DisparadorEscenaIoT,
  DispositivoIoT,
  exportarHistorialDispositivo,
  exportarHistorialVariable,
  ejecutarEscena,
  eliminarDispositivoDefinitivamente,
  generarTokenWebhook,
  historialVariable,
  IntegracionIoT,
  listarDispositivosRetirados,
  ProveedorIoT,
  probarNotificacionControl,
  reconocerAlarma,
  restaurarDispositivo,
  ResumenControl,
  resumenControl,
  resumenEnergia,
  ResumenEnergia,
  solicitarComando,
  retirarDispositivo,
  sincronizarSonoff,
  sincronizarTuya,
  VariableIoT,
} from '../data/controlIndustrialApi';
import { activarNotificaciones, estadoNotificaciones } from '../data/push';

type Tab = 'vivo' | 'alarmas' | 'escenas' | 'conexiones' | 'comandos';
type HistoryReading = { medidaEn: string; valorNumero?: number | null; valorBooleano?: boolean | null; valorTexto?: string | null };

const providerLabel: Record<ProveedorIoT, string> = {
  sonoff_ewelink: 'SONOFF TH Elite / eWeLink',
  tuya_cloud: 'Tuya / Smart Life Cloud',
  milesight_ug65: 'Milesight TS30x + UG65',
  webhook_generico: 'HTTPS / dispositivo genérico',
};

function ago(value?: string | null) {
  if (!value) return 'Sin datos';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `hace ${seconds} s`;
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  return `hace ${Math.floor(seconds / 86400)} días`;
}

function isDualR3(device?: DispositivoIoT) {
  return /dual\s*r3|dualr3|e32-2sw/i.test(device?.modelo ?? '');
}

function valueOf(variable: VariableIoT, _device?: DispositivoIoT) {
  if (variable.tipo === 'numero') {
    if (variable.valorNumero == null) return '—';
    const value = isNonNegativeElectrical(variable.clave) ? Math.abs(Number(variable.valorNumero)) : Number(variable.valorNumero);
    return `${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}${variable.unidad ? ` ${variable.unidad}` : ''}`;
  }
  if (/^switch_[1-4]$/.test(variable.clave) || variable.clave === 'relay') return variable.valorBooleano ? 'Encendida' : 'Apagada';
  if (variable.clave === 'online') return variable.valorBooleano ? 'En línea' : 'Sin conexión';
  if (variable.clave === 'operation_mode') return variable.valorTexto === 'motor' ? 'Motor / persiana' : 'Dos cargas independientes';
  if (/^pulse_enabled/.test(variable.clave)) return variable.valorBooleano ? 'Activado' : 'Desactivado';
  if (/^(door|puerta|window|contact|open)/.test(variable.clave)) return variable.valorBooleano ? 'Abierto' : 'Cerrado';
  if (/^(water|leak|flood|waterleak)/.test(variable.clave)) return variable.valorBooleano ? 'Agua detectada' : 'Seco';
  if (/^(motion|pir|movement)/.test(variable.clave)) return variable.valorBooleano ? 'Movimiento' : 'Sin movimiento';
  if (/^(smoke|gas)/.test(variable.clave)) return variable.valorBooleano ? 'Detectado' : 'Normal';
  if (variable.tipo === 'booleano') return variable.valorBooleano ? 'Sí' : 'No';
  return variable.valorTexto || '—';
}

const ELECTRICAL_VARIABLE = /^(current|voltage|actpow|power|apparentpow|reactpow|reactivepow|factor|daykwh|monthkwh|energy)(?:_([0-9]+))?$/i;
const NON_NEGATIVE_ELECTRICAL = /^(current|voltage|actpow|power|apparentpow|daykwh|monthkwh|energy)(?:_[0-9]+)?$/i;
const SENSOR_VARIABLE = /^(temperature|temperatura|humidity|humedad|pressure|presion|vibration|vibracion|door|puerta|window|contact|open|water|leak|flood|waterleak|motion|pir|movement|smoke|gas|co2)(?:_[0-9]+)?$/i;
const AMBIENT_VARIABLE = /^(temperature|temperatura|humidity|humedad)$/i;
const LIVE_STATUS_VARIABLE = /^(online|operation_mode|motor_position|motor_state|active_timers)$/i;

function isNonNegativeElectrical(key: string) {
  return NON_NEGATIVE_ELECTRICAL.test(key);
}

function hasUsefulHistory(variable: VariableIoT) {
  return ELECTRICAL_VARIABLE.test(variable.clave)
    || SENSOR_VARIABLE.test(variable.clave)
    || /^switch_[1-4]$/.test(variable.clave)
    || variable.clave === 'relay';
}

function visibleVariables(device: DispositivoIoT) {
  return device.variables.filter((variable) => {
    const electrical = variable.clave.match(ELECTRICAL_VARIABLE);
    return (ELECTRICAL_VARIABLE.test(variable.clave) || SENSOR_VARIABLE.test(variable.clave) || LIVE_STATUS_VARIABLE.test(variable.clave))
      && !/^switch_[1-4]$/.test(variable.clave)
      && variable.clave !== 'relay'
      && !(electrical?.[2] && channelVariables(device).length);
  });
}

function channelVariables(device: DispositivoIoT) {
  const channels = device.variables
    .filter((variable) => /^switch_[1-4]$/.test(variable.clave))
    .sort((a, b) => a.clave.localeCompare(b.clave));
  if (channels.length) return channels;
  const relay = device.variables.find((variable) => variable.clave === 'relay');
  return relay ? [{ ...relay, clave: 'switch_1', nombre: relay.nombre || 'Canal 1' }] : [];
}

function channelDisplayName(device: DispositivoIoT, channel: VariableIoT, index: number) {
  if (device.tipo === 'sensor_ambiente' && channelVariables(device).length === 1) return 'Relé interno';
  return channel.nombre || `Canal ${index + 1}`;
}

function isMotorMode(device: DispositivoIoT) {
  return device.variables.some((variable) => variable.clave === 'operation_mode' && variable.valorTexto === 'motor');
}

const loadLabels: Record<VariableIoT['uso'], string> = {
  carga: 'Carga eléctrica', lampara: 'Lámpara', motor: 'Motor eléctrico', ventilador: 'Ventilador',
  bomba: 'Bomba', calefaccion: 'Calefacción', toma: 'Tomacorriente', otro: 'Otra carga',
};

function channelIndexFromSuffix(suffix: string) {
  const value = Number(suffix);
  if (suffix === '0' || (suffix.length > 1 && suffix.startsWith('0'))) return value + 1;
  return value;
}

function channelMetrics(device: DispositivoIoT, channel: number) {
  const priority: Record<string, number> = { voltage: 0, current: 1, actpow: 2, power: 2, apparentpow: 3, factor: 4, reactpow: 5, reactivepow: 5 };
  return device.variables.filter((variable) => {
    const match = variable.clave.match(ELECTRICAL_VARIABLE);
    return Boolean(match?.[2] && channelIndexFromSuffix(match[2]) === channel);
  }).sort((a, b) => {
    const aKey = a.clave.match(ELECTRICAL_VARIABLE)?.[1]?.toLowerCase() ?? '';
    const bKey = b.clave.match(ELECTRICAL_VARIABLE)?.[1]?.toLowerCase() ?? '';
    return (priority[aKey] ?? 99) - (priority[bKey] ?? 99);
  });
}

function deviceKind(device: DispositivoIoT) {
  if (device.tipo === 'puente_rf') return 'Puente RF · acceso para controles remotos';
  if (device.tipo === 'interruptor_multicanal') return 'Interruptor multicanal';
  if (device.tipo === 'interruptor') return 'Interruptor';
  if (device.tipo === 'sensor_ambiente') return channelVariables(device).length ? 'Termostato de ambiente · temperatura y humedad' : 'Sensor de temperatura y humedad';
  if (device.tipo === 'sensor_inundacion') return 'Sensor de inundación o fuga';
  if (device.tipo === 'sensor_magnetico') return 'Sensor magnético de apertura';
  if (device.tipo === 'sensor_movimiento') return 'Sensor de movimiento';
  if (device.tipo === 'sensor_alarma') return 'Sensor de seguridad ambiental';
  return device.modelo || device.identificadorExterno;
}

function DeviceIcon({ device, operable }: { device: DispositivoIoT; operable: boolean }) {
  if (device.estado === 'desconectado') return <WifiOff size={20} />;
  if (device.tipo === 'puente_rf') return <RadioTower size={20} />;
  if (device.tipo === 'sensor_inundacion') return <Droplets size={20} />;
  if (device.tipo === 'sensor_magnetico') return <DoorOpen size={20} />;
  if (device.tipo === 'sensor_ambiente') return <Thermometer size={20} />;
  return operable ? <Zap size={20} /> : <Gauge size={20} />;
}

function variableAlert(variable: VariableIoT) {
  return variable.tipo === 'booleano' && variable.valorBooleano === true && /^(door|puerta|window|contact|open|water|leak|flood|waterleak|motion|pir|movement|smoke|gas)/.test(variable.clave);
}

const stateTone: Record<string, string> = {
  normal: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
  advertencia: 'border-amber-500/40 bg-amber-500/10 text-amber-600',
  critico: 'border-red-500/50 bg-red-500/10 text-red-600',
  sin_datos: 'border-line bg-subtle text-faint',
  desconectado: 'border-line bg-subtle text-faint',
};

function ruleCondition(rule: ResumenControl['reglas'][number]) {
  const operators: Record<string, string> = { gt: 'mayor que', gte: 'mayor o igual a', lt: 'menor que', lte: 'menor o igual a', eq: 'igual a', neq: 'distinto de' };
  const threshold = rule.variable.tipo === 'booleano'
    ? (rule.umbralBooleano ? 'activo / detectado' : 'inactivo / normal')
    : rule.umbralNumero ?? rule.umbralTexto ?? '—';
  return `${operators[rule.operador] ?? rule.operador} ${threshold}${rule.variable.unidad ? ` ${rule.variable.unidad}` : ''}`;
}

function sceneTrigger(scene: ResumenControl['escenas'][number], devices: DispositivoIoT[]) {
  const trigger = scene.disparador ?? { tipo: 'manual' as const };
  if (trigger.tipo === 'manual') return 'Ejecución manual con confirmación';
  if (trigger.tipo === 'rango_horario') return `${trigger.inicio}–${trigger.fin} · ${trigger.dias.length === 7 ? 'todos los días' : `${trigger.dias.length} días por semana`}`;
  const variable = devices.flatMap((device) => device.variables.map((item) => ({ device, item }))).find(({ item }) => item.id === trigger.variableId);
  const operator = { gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=' }[trigger.operador];
  return `${variable ? `${variable.device.nombre} · ${variable.item.nombre}` : 'Sensor'} ${operator} ${String(trigger.umbral)}`;
}

export const ControlIndustrial: React.FC = () => {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<ResumenControl | null>(null);
  const [energy, setEnergy] = useState<ResumenEnergia | null>(null);
  const [tab, setTab] = useState<Tab>('vivo');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<{ device: DispositivoIoT; variable: VariableIoT } | null>(null);
  const [history, setHistory] = useState<Array<{ medidaEn: string; valorNumero?: number | null; valorBooleano?: boolean | null; valorTexto?: string | null }>>([]);
  const [historyHours, setHistoryHours] = useState(24);
  const [connectorOpen, setConnectorOpen] = useState(false);
  const [credentialsFor, setCredentialsFor] = useState<IntegracionIoT | null>(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);
  const [sceneWorking, setSceneWorking] = useState<string | null>(null);
  const [commandFor, setCommandFor] = useState<{ device: DispositivoIoT; initial?: { canal: number; encendido: boolean; nombre: string } } | null>(null);
  const [settingsFor, setSettingsFor] = useState<DispositivoIoT | null>(null);
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());
  const [webhook, setWebhook] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() => estadoNotificaciones());
  const [pushWorking, setPushWorking] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [dashboardSettingsOpen, setDashboardSettingsOpen] = useState(false);
  const [retiredDevices, setRetiredDevices] = useState<DispositivoIoT[]>([]);
  const [hideOffline, setHideOffline] = useState(false);

  const editable = usuario?.rol === 'admin' || usuario?.rol === 'jefatura';
  const owner = usuario?.rol === 'admin';

  const load = async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      const [control, energySummary, retired] = await Promise.all([
        resumenControl(),
        resumenEnergia(),
        owner ? listarDispositivosRetirados() : Promise.resolve([]),
      ]);
      setData(control);
      setEnergy(energySummary);
      setRetiredDevices(retired);
    }
    catch (error) { toast(error instanceof Error ? error.message : 'No se pudo cargar el tablero.', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const query = window.location.hash.split('?')[1];
    if (!query) return;
    const params = new URLSearchParams(query);
    const result = params.get('ewelink');
    if (result === 'connected') toast('Cuenta eWeLink conectada y primera sincronización completada.', 'success');
    if (result === 'pending') toast('Cuenta autorizada. eWeLink limitó la primera sincronización; ActivaQR reintentará automáticamente.', 'warning');
    if (result === 'error') toast(params.get('message') || 'No se pudo conectar eWeLink.', 'error');
    if (result) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/control-industrial`);
  }, []);
  useEffect(() => {
    if (!data) return;
    const timer = window.setInterval(() => load(true), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedVariable) return;
    historialVariable(selectedVariable.variable.id, historyHours).then((result) => setHistory(result.lecturas)).catch((error) => toast(error.message, 'error'));
  }, [selectedVariable, historyHours]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setPresentationMode(false);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const openPresentation = () => {
    setPresentationMode(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const closePresentation = () => {
    setPresentationMode(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  const downloadHistory = async (kind: 'device' | 'variable', id: string, hours = 24) => {
    try {
      const result = kind === 'device' ? await exportarHistorialDispositivo(id, hours) : await exportarHistorialVariable(id, hours);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast(result.truncated ? 'Historial exportado. El archivo contiene los 100.000 registros más recientes del período.' : 'Historial exportado correctamente.', result.truncated ? 'warning' : 'success');
    } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo exportar el historial.', 'error'); }
  };

  const critical = data?.alarmas.filter((item) => item.severidad === 'critica' && item.estado !== 'resuelta').length ?? 0;
  const disconnectMs = (data?.modulo.umbralSinConexionMinutos ?? 10) * 60_000;
  const online = data?.dispositivos.filter((item) => item.ultimoContactoEn && Date.now() - new Date(item.ultimoContactoEn).getTime() < disconnectMs).length ?? 0;
  const offlineCount = data?.dispositivos.length ? data.dispositivos.length - online : 0;
  const displayedDevices = data?.dispositivos.filter((item) => !hideOffline || Boolean(item.ultimoContactoEn && Date.now() - new Date(item.ultimoContactoEn).getTime() < disconnectMs)) ?? [];
  const lastEvent = useMemo(() => data?.dispositivos.map((item) => item.ultimoContactoEn).filter(Boolean).sort().slice(-1)[0], [data]);

  const acknowledge = async (alarm: AlarmaIoT) => {
    try { await reconocerAlarma(alarm.id); toast('Alarma reconocida y registrada en auditoría.', 'success'); await load(true); }
    catch (error) { toast(error instanceof Error ? error.message : 'No se pudo reconocer.', 'error'); }
  };

  const enablePush = async () => {
    setPushWorking(true);
    try {
      const ok = await activarNotificaciones();
      setPushPermission(estadoNotificaciones());
      toast(ok ? 'Notificaciones activadas en este dispositivo.' : 'No se pudieron activar las notificaciones.', ok ? 'success' : 'warning');
    } finally { setPushWorking(false); }
  };

  const testPush = async () => {
    setPushWorking(true);
    try { await probarNotificacionControl(); toast('Notificación de prueba enviada.', 'success'); }
    catch (error) { toast(error instanceof Error ? error.message : 'No se pudo enviar la prueba.', 'error'); }
    finally { setPushWorking(false); }
  };

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><div className="text-center"><Snowflake className="mx-auto mb-3 animate-pulse text-cyan-500" size={36} /><p className="text-sm font-bold text-muted">Conectando tablero industrial…</p></div></div>;
  if (!data) return null;

  return <div className="min-w-0 space-y-4 pb-20 sm:space-y-5 sm:pb-16">
    <header className="relative overflow-hidden border-y border-slate-800 bg-slate-950 px-4 py-5 text-white sm:border sm:p-7">
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-cyan-500/10 to-transparent" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-300 sm:text-[11px] sm:tracking-[.22em]"><Activity size={15} /> Supervisión en vivo</div><h1 className="break-words font-display text-2xl font-black leading-tight sm:text-3xl">{data.modulo.tableroConfig?.titulo || usuario?.empresa?.nombre || data.modulo.nombreServicio}</h1><p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">{data.modulo.tableroConfig?.subtitulo || data.modulo.nombreServicio}<span className="mt-1 block text-[11px] text-cyan-200/70 sm:ml-1 sm:mt-0 sm:inline">· Actualiza cada 5 segundos</span></p></div>
        <div className="grid w-full grid-cols-2 gap-px border border-slate-700 bg-slate-700 sm:grid-cols-4 xl:w-auto">
          {[
            { value: `${online}/${data.dispositivos.length}`, label: 'En línea', icon: Signal, tone: 'text-emerald-300' },
            { value: critical, label: 'Críticas', icon: ShieldAlert, tone: critical ? 'text-red-300' : 'text-slate-300' },
            { value: data.integraciones.length, label: 'Conectores', icon: RadioTower, tone: 'text-cyan-300', secondary: true },
            { value: ago(lastEvent), label: 'Último dato', icon: RefreshCw, tone: 'text-slate-300', secondary: true },
          ].map(({ value, label, icon: Icon, tone, secondary }) => <div key={label} className={`min-w-0 bg-slate-900 px-3 py-3 sm:px-4 ${secondary ? 'hidden sm:block' : ''}`}><Icon size={15} className={`mb-1 ${tone}`} /><strong className="block truncate text-base font-black sm:text-lg">{value}</strong><span className="block truncate text-[9px] uppercase tracking-wide text-slate-500 sm:text-[10px] sm:tracking-wider">{label}</span></div>)}
        </div>
      </div>
    </header>

    <nav className="-mx-1 flex min-w-0 border-b border-line px-1">
      <div className="flex min-w-0 flex-1 snap-x gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {([
          ['vivo', 'Vista en vivo', Gauge], ['alarmas', `Alarmas${data.alarmas.length ? ` (${data.alarmas.length})` : ''}`, BellRing], ['escenas', 'Escenas', Layers3], ['conexiones', 'Conexiones', CloudCog], ['comandos', 'Operación', Zap],
        ] as Array<[Tab, string, React.ElementType]>).map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex min-h-12 shrink-0 snap-start items-center gap-2 border-b-2 px-3 py-3 text-[10px] font-black uppercase tracking-wide sm:px-4 sm:text-xs ${tab === id ? 'border-cyan-600 text-cyan-700 dark:text-cyan-300' : 'border-transparent text-faint'}`}><Icon size={16} />{label}</button>)}
      </div>
      <div className="flex shrink-0 border-l border-line bg-canvas">
        <button onClick={openPresentation} className="grid min-h-12 w-11 place-items-center text-content" aria-label="Expandir tablero" title="Expandir tablero"><Maximize2 size={17} /></button>
        <button onClick={() => load(true)} className="grid min-h-12 w-11 place-items-center border-l border-line text-faint" aria-label="Actualizar"><RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} /></button>
      </div>
    </nav>

    {tab === 'vivo' && <section className="flex flex-col gap-4">
      {energy && energy.channelsMeasured > 0 && <div className="order-2 lg:order-1"><EnergySummary energy={energy} /></div>}
      {!data.dispositivos.length ? <div className="order-1 lg:order-2"><Empty icon={RadioTower} title="Esperando el primer dispositivo" text="Configurá un conector y enviá la primera lectura. El equipo aparecerá automáticamente en este tablero." action={owner ? () => setTab('conexiones') : undefined} actionLabel="Configurar conexión" /></div> : <div className="order-1 space-y-3 lg:order-2">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">{displayedDevices.length} de {data.dispositivos.length} dispositivos visibles</p><div className="flex min-w-0 flex-1 justify-end gap-2">{offlineCount > 0 && <button onClick={() => setHideOffline((current) => !current)} className="flex min-h-10 items-center gap-2 border border-line px-3 text-[10px] font-black uppercase text-content"><EyeOff size={14} />{hideOffline ? 'Mostrar todos' : `Ocultar sin conexión (${offlineCount})`}</button>}{owner && retiredDevices.length > 0 && <button onClick={() => setTab('conexiones')} className="flex min-h-10 items-center gap-2 border border-line px-3 text-[10px] font-black uppercase text-content"><Archive size={14} />Retirados ({retiredDevices.length})</button>}</div></div>
        {displayedDevices.length ? <div className="grid items-start gap-4 xl:grid-cols-2">{displayedDevices.map((device) => <CompactDeviceCard key={device.id} device={device} expanded={expandedDevices.has(device.id)} remoteEnabled={data.modulo.controlRemotoHabilitado} editable={editable} showBattery={data.modulo.tableroConfig?.mostrarBateria !== false} showSignal={data.modulo.tableroConfig?.mostrarSenal !== false} onToggle={() => setExpandedDevices((current) => { const next = new Set(current); next.has(device.id) ? next.delete(device.id) : next.add(device.id); return next; })} onHistory={(variable) => { setHistoryHours(24); setSelectedVariable({ device, variable }); }} onCommand={(initial) => setCommandFor({ device, initial })} onSettings={() => setSettingsFor(device)} onExport={() => downloadHistory('device', device.id)} />)}</div> : <Empty icon={WifiOff} title="Dispositivos sin conexión ocultos" text="No hay equipos en línea para mostrar. Podés volver a mostrar todos sin modificar su configuración." action={() => setHideOffline(false)} actionLabel="Mostrar todos" />}
      </div>}
    </section>}

    {tab === 'alarmas' && <section className="space-y-5">
      <div className="border border-cyan-500/30 bg-cyan-500/5 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><BellRing size={18} className="text-cyan-600" /><h2 className="font-black text-content">Avisos en este celular</h2></div><p className="mt-1 text-xs leading-relaxed text-muted">{pushPermission === 'granted' ? 'Este dispositivo está autorizado para recibir alarmas aunque la PWA esté cerrada.' : pushPermission === 'denied' ? 'El navegador bloqueó los avisos. Debés habilitarlos desde los ajustes del sitio.' : pushPermission === 'unsupported' ? 'Este navegador no admite Web Push.' : 'Activá los avisos para recibir alarmas críticas, aperturas, inundación y desconexiones.'}</p></div><div className="grid gap-2 sm:flex">{pushPermission === 'default' && <button disabled={pushWorking} onClick={enablePush} className="h-11 bg-cyan-700 px-4 text-xs font-black uppercase text-white disabled:opacity-50">Activar avisos</button>}{pushPermission === 'granted' && <button disabled={pushWorking} onClick={testPush} className="h-11 border border-cyan-600 px-4 text-xs font-black uppercase text-cyan-700 disabled:opacity-50">Probar notificación</button>}</div></div></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-black text-content">Alarmas abiertas</h2><p className="mt-1 text-xs leading-relaxed text-muted">Reconocer confirma que una persona tomó conocimiento; no cierra la condición.</p></div>{editable && <button onClick={() => setRuleOpen(true)} className="flex h-11 w-full items-center justify-center gap-2 bg-cyan-700 px-4 text-xs font-black uppercase text-white sm:h-10 sm:w-auto"><Plus size={16} /> Nueva regla</button>}</div>
      {!data.alarmas.length ? <Empty icon={Check} title="Todo dentro de rango" text="No hay alarmas activas ni reconocidas." /> : <div className="space-y-2">{data.alarmas.map((alarm) => <div key={alarm.id} className={`flex flex-col gap-4 border-l-4 bg-surface p-4 shadow-soft sm:flex-row sm:items-center ${alarm.severidad === 'critica' ? 'border-l-red-500' : 'border-l-amber-500'}`}><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><AlertTriangle size={17} className={`mt-0.5 shrink-0 ${alarm.severidad === 'critica' ? 'text-red-500' : 'text-amber-500'}`} /><h3 className="min-w-0 flex-1 break-words font-black leading-tight text-content">{alarm.titulo}</h3><span className="shrink-0 text-[9px] font-black uppercase text-faint sm:text-[10px]">{alarm.estado}</span></div><p className="mt-2 break-words text-sm leading-relaxed text-muted">{alarm.dispositivo.nombre} · {alarm.detalle}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-faint">Iniciada {new Date(alarm.iniciadaEn).toLocaleString('es-AR')}</p></div>{alarm.estado === 'activa' && editable && <button onClick={() => acknowledge(alarm)} className="h-11 w-full border border-line-strong px-4 text-xs font-black uppercase text-content hover:border-cyan-600 sm:h-10 sm:w-auto">Reconocer</button>}</div>)}</div>}
      <div><h2 className="font-display text-xl font-black text-content">Reglas configuradas</h2><p className="mt-1 text-xs text-muted">Qué condición dispara una alarma y si debe avisar por push.</p></div>
      {!data.reglas.length ? <Empty icon={BellRing} title="Todavía no hay reglas" text="Creá una regla para temperatura, humedad, apertura, inundación, corriente, voltaje o cualquier variable recibida." /> : <div className="grid gap-2 lg:grid-cols-2">{data.reglas.map((rule) => <article key={rule.id} className={`border bg-surface p-4 ${rule.activa ? 'border-line' : 'border-dashed border-line-strong opacity-70'}`}><div className="flex items-start gap-3"><div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${rule.activa ? rule.severidad === 'critica' ? 'bg-red-500' : 'bg-amber-500' : 'bg-slate-400'}`} /><div className="min-w-0 flex-1"><h3 className="break-words font-black leading-tight text-content">{rule.nombre}</h3><p className="mt-1 text-xs text-muted">{rule.variable.dispositivo.nombre} · {rule.variable.nombre}</p><p className="mt-2 text-sm text-content">{ruleCondition(rule)}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-faint">{rule.demoraSegundos ? `Sostenida ${rule.demoraSegundos} s · ` : ''}{rule.notificarPush ? 'Con aviso push' : 'Sin aviso push'}</p></div></div>{editable && <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={async () => { try { await actualizarRegla(rule.id, { activa: !rule.activa }); await load(true); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo cambiar la regla.', 'error'); } }} className="min-h-11 border border-line px-3 text-xs font-black uppercase text-content">{rule.activa ? 'Pausar' : 'Activar'}</button><button onClick={async () => { if (!window.confirm(`¿Eliminar la regla “${rule.nombre}”?`)) return; try { await eliminarRegla(rule.id); await load(true); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo eliminar la regla.', 'error'); } }} className="min-h-11 border border-red-500/40 px-3 text-xs font-black uppercase text-red-600">Eliminar</button></div>}</article>)}</div>}
    </section>}

    {tab === 'escenas' && <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-black text-content">Escenas de control</h2><p className="mt-1 text-xs leading-relaxed text-muted">Agrupan varias salidas en una operación confirmada y auditable.</p></div>{editable && data.modulo.controlRemotoHabilitado && <button onClick={() => setSceneOpen(true)} className="flex h-11 w-full items-center justify-center gap-2 bg-cyan-700 px-4 text-xs font-black uppercase text-white sm:w-auto"><Plus size={16} /> Nueva escena</button>}</div>
      <div className="border border-cyan-500/30 bg-cyan-500/5 p-4 text-xs leading-relaxed text-muted"><strong className="block text-content">Automatizaciones seguras y auditables</strong>Podés ejecutarlas a mano, por horario o por el valor de un sensor. Las automáticas siempre restauran cada canal al terminar y sólo envían una orden cuando el estado realmente debe cambiar.</div>
      {!data.escenas.length ? <Empty icon={Layers3} title="Todavía no hay escenas" text="Creá, por ejemplo, “Cámara apagada de noche”, “Ventilar por temperatura” o “Cerrar aulas”, vinculando uno o varios equipos." action={editable && data.modulo.controlRemotoHabilitado ? () => setSceneOpen(true) : undefined} actionLabel="Crear primera automatización" /> : <div className="grid gap-3 lg:grid-cols-2">{data.escenas.map((scene) => <article key={scene.id} className={`border bg-surface p-4 shadow-soft ${scene.activa ? 'border-line' : 'border-dashed border-line-strong opacity-70'}`}><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center border border-cyan-500/30 bg-cyan-500/10 text-cyan-700"><Layers3 size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-black text-content">{scene.nombre}</h3><span className="bg-cyan-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-cyan-700">{scene.disparador?.tipo === 'rango_horario' ? 'Horario' : scene.disparador?.tipo === 'variable' ? 'Sensor' : 'Manual'}</span></div><p className="mt-1 text-xs leading-relaxed text-muted">{scene.descripcion || `${scene.acciones.length} acciones configuradas`}</p><p className="mt-2 text-xs font-bold text-content">{sceneTrigger(scene, data.dispositivos)}</p><p className="mt-2 text-[10px] uppercase tracking-wide text-faint">{scene.ultimaEjecucionEn ? `Última: ${ago(scene.ultimaEjecucionEn)} · ${scene.ultimaEjecucionEstado || 'ejecutada'}` : 'Esperando su primera ejecución'}</p></div></div>{editable && <div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><button disabled={!scene.activa || sceneWorking !== null} onClick={async () => { if (!window.confirm(`¿Ejecutar ahora “${scene.nombre}” sobre ${scene.acciones.length} salidas reales?`)) return; setSceneWorking(scene.id); try { const result = await ejecutarEscena(scene.id); toast(`Escena ejecutada: ${result.accionesEjecutadas} maniobras confirmadas.`, 'success'); await load(true); } catch (error) { toast(error instanceof Error ? error.message : 'La escena no pudo completarse.', 'error'); } finally { setSceneWorking(null); } }} className="flex min-h-12 items-center justify-center gap-2 bg-cyan-700 px-4 text-xs font-black uppercase text-white disabled:opacity-40"><Play size={15} /> {sceneWorking === scene.id ? 'Ejecutando…' : 'Ejecutar ahora'}</button><button disabled={sceneWorking !== null} onClick={async () => { if (!window.confirm(`¿Eliminar la escena “${scene.nombre}”?`)) return; try { await eliminarEscena(scene.id); await load(true); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo eliminar.', 'error'); } }} className="grid min-h-12 w-12 place-items-center border border-red-500/40 text-red-600" aria-label={`Eliminar ${scene.nombre}`}><Trash2 size={16} /></button></div>}</article>)}</div>}
    </section>}

    {tab === 'conexiones' && <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-black text-content">Gateways e integraciones</h2><p className="mt-1 text-xs text-muted">{data.integraciones.length} de {data.modulo.limiteGateways} contratadas.</p></div>{owner && <button onClick={() => setConnectorOpen(true)} className="flex h-11 w-full items-center justify-center gap-2 bg-cyan-700 px-4 text-xs font-black uppercase text-white sm:h-10 sm:w-auto"><Plus size={16} /> Conectar</button>}</div>
      <div className="grid gap-4 lg:grid-cols-2">{data.integraciones.map((item) => <article key={item.id} className="min-w-0 border border-line bg-surface p-4 shadow-soft sm:p-5"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center border border-cyan-500/40 bg-cyan-500/10 text-cyan-600"><RadioTower size={19} /></div><div className="min-w-0 flex-1"><h3 className="break-words font-black leading-tight text-content">{item.nombre}</h3><p className="mt-1 break-words text-xs leading-snug text-faint">{providerLabel[item.proveedor]}</p></div><span className={`shrink-0 px-2 py-1 text-[9px] font-black uppercase sm:text-[10px] ${item.estado === 'conectada' ? 'bg-emerald-500/10 text-emerald-600' : item.estado === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-subtle text-muted'}`}>{item.estado}</span></div><div className="mt-3 flex flex-wrap gap-1">{item.capacidades && Object.entries(item.capacidades).filter(([, enabled]) => enabled).map(([capability]) => <span key={capability} className="bg-cyan-500/10 px-2 py-1 text-[9px] font-black uppercase text-cyan-700">{capability}</span>)}</div><div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2"><div className="border border-line p-3"><span className="block text-faint">Último evento</span><strong className="text-content">{ago(item.ultimoEventoEn)}</strong></div><div className="min-w-0 border border-line p-3"><span className="block text-faint">Credenciales</span><strong className="block break-words text-content">{item.configuracion?.oauthAutorizado || item.configuracion?.cloudAutorizada ? 'Cuenta autorizada' : item.credencialesConfiguradas ? 'App registrada' : item.webhookTokenHint ? `Token ···${item.webhookTokenHint}` : 'Pendientes'}</strong></div></div>{item.ultimoError && <p className="mt-3 break-words border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-600">{item.ultimoError}</p>}{owner && <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">{(item.proveedor === 'sonoff_ewelink' || item.proveedor === 'tuya_cloud') && <><button onClick={() => setCredentialsFor(item)} className="flex min-h-11 w-full items-center justify-center gap-2 border border-line px-3 py-2 text-xs font-bold sm:w-auto"><KeyRound size={14} /> {item.credencialesConfiguradas ? 'Reconfigurar' : 'Conectar cuenta'}</button>{item.credencialesConfiguradas && <button onClick={async () => { try { const result = item.proveedor === 'sonoff_ewelink' ? await sincronizarSonoff(item.id) : await sincronizarTuya(item.id); toast(`${result.dispositivosImportados} dispositivos sincronizados.`, 'success'); await load(true); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo sincronizar.', 'error'); } }} className="flex min-h-11 w-full items-center justify-center gap-2 border border-line px-3 py-2 text-xs font-bold sm:w-auto"><RefreshCw size={14} /> Sincronizar ahora</button>}</>}{(item.proveedor === 'milesight_ug65' || item.proveedor === 'webhook_generico') && <button onClick={async () => { try { const result = await generarTokenWebhook(item.id); const full = `${(API_URL ?? '').replace(/\/api\/?$/, '')}${result.endpoint}`; setWebhook(full); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo crear el token.', 'error'); } }} className="flex min-h-11 w-full items-center justify-center gap-2 border border-line px-3 py-2 text-xs font-bold sm:w-auto"><RefreshCw size={14} /> {item.webhookTokenHint ? 'Rotar token' : 'Generar endpoint'}</button>}</div>}</article>)}</div>
      {!data.integraciones.length && <Empty icon={CloudCog} title="Sin conectores configurados" text="Podés integrar SONOFF/eWeLink, Tuya/Smart Life, Milesight UG65 o cualquier equipo que envíe JSON por HTTPS." action={owner ? () => setConnectorOpen(true) : undefined} actionLabel="Agregar primer conector" />}
      {owner && <RetiredDevicesPanel devices={retiredDevices} onRestore={async (device) => { try { await restaurarDispositivo(device.id); toast(`${device.nombre} volvió al tablero. El control remoto quedó deshabilitado por seguridad.`, 'success'); await load(true); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo restaurar el dispositivo.', 'error'); } }} onDelete={async (device) => { const confirmation = window.prompt(`Esto borrará definitivamente telemetría, alarmas y comandos de “${device.nombre}”. Escribí exactamente el nombre para continuar:`); if (confirmation === null) return; try { await eliminarDispositivoDefinitivamente(device.id, confirmation); toast(`${device.nombre} fue eliminado definitivamente.`, 'success'); await load(true); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo eliminar el dispositivo.', 'error'); } }} />}
    </section>}

    {tab === 'comandos' && <section className="space-y-4"><div className="border border-amber-500/40 bg-amber-500/10 p-4"><div className="flex gap-3"><ShieldAlert className="shrink-0 text-amber-600" size={21} /><div><h2 className="font-black text-content">Control remoto gobernado</h2><p className="mt-1 text-xs leading-relaxed text-muted">Sólo se habilita por contrato, por dispositivo y con un adaptador certificado. Las protecciones físicas, el PLC y los interbloqueos locales conservan siempre la autoridad.</p></div></div></div>{!data.comandos.length ? <Empty icon={CircleOff} title="Sin maniobras solicitadas" text="Las operaciones y sus resultados aparecerán acá con trazabilidad completa." /> : <div className="space-y-2">{data.comandos.map((item) => <div key={item.id} className="min-w-0 border border-line bg-surface p-4"><div className="flex items-start gap-3"><strong className="min-w-0 flex-1 break-words leading-tight text-content">{item.dispositivo.nombre} · {item.tipo}</strong><span className="shrink-0 text-[9px] font-black uppercase text-faint sm:text-[10px]">{item.estado}</span></div><p className="mt-2 break-words text-sm leading-relaxed text-muted">{item.motivo}</p>{item.resultado && <p className="mt-2 break-words text-xs leading-relaxed text-faint">{item.resultado}</p>}</div>)}</div>}</section>}

    {selectedVariable && <DialogViewport className="z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onEscape={() => setSelectedVariable(null)}><div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto border-x border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:border sm:p-5" role="dialog" aria-modal="true"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[10px] font-black uppercase tracking-wider text-cyan-600 sm:text-xs">{selectedVariable.device.nombre}</p><h2 className="break-words font-display text-xl font-black leading-tight text-content sm:text-2xl">{selectedVariable.variable.nombre}</h2><p className="mt-1 text-xs text-muted sm:text-sm">Actual: {valueOf(selectedVariable.variable, selectedVariable.device)} · {history.length.toLocaleString('es-AR')} registros</p></div><button onClick={() => setSelectedVariable(null)} className="min-h-11 shrink-0 px-2 text-xs font-black uppercase text-faint">Cerrar</button></div><div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap"><select value={historyHours} onChange={(event) => setHistoryHours(Number(event.target.value))} className="h-11 w-full border border-line bg-surface px-3 text-xs font-bold text-content sm:w-auto"><option value={24}>Últimas 24 horas</option><option value={168}>Últimos 7 días</option><option value={720}>Últimos 30 días</option></select><button onClick={() => downloadHistory('variable', selectedVariable.variable.id, historyHours)} className="flex h-11 w-full items-center justify-center gap-2 border border-line px-3 text-xs font-black uppercase text-content sm:w-auto"><Download size={15} /> Exportar canal</button></div><div className="mt-5 h-56 sm:h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={history.map((item) => { const raw = item.valorNumero ?? (item.valorBooleano == null ? null : item.valorBooleano ? 1 : 0); return { hora: new Date(item.medidaEn).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), valor: raw != null && isDualR3(selectedVariable.device) && isNonNegativeElectrical(selectedVariable.variable.clave) ? Math.abs(raw) : raw }; })} margin={{ left: -18, right: 4 }}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="hora" tick={{ fontSize: 9 }} minTickGap={42} /><YAxis tick={{ fontSize: 9 }} width={42} domain={['auto', 'auto']} /><Tooltip /><Line type="monotone" dataKey="valor" stroke="#0891b2" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></div></DialogViewport>}
    {connectorOpen && <ConnectorModal onClose={() => setConnectorOpen(false)} onDone={async () => { setConnectorOpen(false); await load(true); }} toast={toast} />}
    {credentialsFor?.proveedor === 'sonoff_ewelink' && <CredentialsModal integration={credentialsFor} onClose={() => setCredentialsFor(null)} onDone={async () => { setCredentialsFor(null); await load(true); }} toast={toast} />}
    {credentialsFor?.proveedor === 'tuya_cloud' && <TuyaCredentialsModal integration={credentialsFor} onClose={() => setCredentialsFor(null)} onDone={async () => { setCredentialsFor(null); await load(true); }} toast={toast} />}
    {ruleOpen && <RuleModal devices={data.dispositivos} onClose={() => setRuleOpen(false)} onDone={async () => { setRuleOpen(false); await load(true); }} toast={toast} />}
    {sceneOpen && <SceneModal devices={data.dispositivos} onClose={() => setSceneOpen(false)} onDone={async () => { setSceneOpen(false); await load(true); }} toast={toast} />}
    {commandFor && <CommandModal device={commandFor.device} initialAction={commandFor.initial} onClose={() => setCommandFor(null)} onDone={async () => { setCommandFor(null); await load(true); }} toast={toast} />}
    {settingsFor && <DeviceModal device={settingsFor} remoteContract={data.modulo.controlRemotoHabilitado} onClose={() => setSettingsFor(null)} onDone={async () => { setSettingsFor(null); await load(true); }} onRetire={owner ? async () => { if (!window.confirm(`¿Retirar “${settingsFor.nombre}” del tablero? Su historial se conservará y podrás restaurarlo.`)) return; try { await retirarDispositivo(settingsFor.id); setSettingsFor(null); toast(`${settingsFor.nombre} fue retirado del tablero.`, 'success'); await load(true); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo retirar el dispositivo.', 'error'); } } : undefined} toast={toast} />}
    {dashboardSettingsOpen && <DashboardSettingsModal module={data.modulo} fallbackTitle={usuario?.empresa?.nombre || 'Mi espacio'} onClose={() => setDashboardSettingsOpen(false)} onDone={(module) => { setData((current) => current ? { ...current, modulo: module } : current); setDashboardSettingsOpen(false); toast('La identidad del tablero quedó actualizada.', 'success'); }} toast={toast} />}
    {presentationMode && <PresentationDashboard data={data} energy={energy} editable={editable} customizable={owner} title={data.modulo.tableroConfig?.titulo || usuario?.empresa?.nombre || 'Mi espacio'} onExit={closePresentation} onSettings={() => setDashboardSettingsOpen(true)} onCommand={(device, initial) => setCommandFor({ device, initial })} />}
    {webhook && <DialogViewport className="z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onEscape={() => setWebhook(null)}><div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto border-x border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:border sm:p-5" role="dialog" aria-modal="true"><h2 className="font-display text-xl font-black text-content">Endpoint de ingesta creado</h2><p className="mt-2 text-sm text-muted">Copialo ahora en el UG65. Al rotarlo, el anterior deja de funcionar.</p><code className="mt-4 block break-all border border-line bg-subtle p-3 text-xs text-content">{webhook}</code><div className="mt-4 grid gap-2 sm:flex"><button onClick={() => navigator.clipboard.writeText(webhook).then(() => toast('Endpoint copiado.', 'success'))} className="h-11 bg-cyan-700 text-xs font-black uppercase text-white sm:flex-1">Copiar</button><button onClick={() => setWebhook(null)} className="h-11 border border-line px-5 text-xs font-black uppercase">Listo</button></div></div></DialogViewport>}
  </div>;
};

function PresentationDashboard({ data, energy, editable, customizable, title, onExit, onSettings, onCommand }: { data: ResumenControl; energy: ResumenEnergia | null; editable: boolean; customizable: boolean; title: string; onExit: () => void; onSettings: () => void; onCommand: (device: DispositivoIoT, initial: { canal: number; encendido: boolean; nombre: string }) => void }) {
  const disconnectMs = (data.modulo.umbralSinConexionMinutos ?? 10) * 60_000;
  const online = data.dispositivos.filter((device) => device.ultimoContactoEn && Date.now() - new Date(device.ultimoContactoEn).getTime() < disconnectMs).length;
  const critical = data.alarmas.filter((alarm) => alarm.severidad === 'critica' && alarm.estado !== 'resuelta').length;
  const operable = (device: DispositivoIoT) => editable && data.modulo.controlRemotoHabilitado && device.permiteControl && ['sonoff_ewelink', 'tuya_cloud'].includes(device.integracion?.proveedor ?? '');
  return <DialogViewport className="z-[40] flex min-h-dvh min-w-0 flex-col overflow-x-hidden overflow-y-auto bg-[#edf1ef] text-slate-950" onEscape={onExit}>
    <header className="bg-slate-950 px-4 py-4 text-white sm:px-8 sm:py-5 lg:px-12 lg:py-7">
      <div className="flex items-start justify-between gap-3 sm:gap-6">
        <div className="min-w-0 flex-1"><p className="mb-2 text-[9px] font-black uppercase tracking-[.2em] text-cyan-300 min-[400px]:text-[10px] min-[400px]:tracking-[.28em]">Control operativo en vivo</p><h1 className="line-clamp-2 break-words font-display text-2xl font-black leading-none tracking-tight min-[400px]:text-3xl sm:text-4xl lg:text-5xl">{title}</h1><p className="mt-2 line-clamp-2 break-words text-xs leading-relaxed text-slate-400 sm:text-sm">{data.modulo.tableroConfig?.subtitulo || data.modulo.nombreServicio}</p></div>
        <div className="flex shrink-0 gap-2">{customizable && <button onClick={onSettings} className="grid h-10 w-10 place-items-center bg-cyan-300 text-slate-950 min-[400px]:h-11 min-[400px]:w-11" aria-label="Personalizar tablero" title="Personalizar tablero"><Settings2 size={19} /></button>}<button onClick={onExit} className="grid h-10 w-10 place-items-center bg-white text-slate-950 min-[400px]:h-11 min-[400px]:w-11" aria-label="Salir de pantalla completa" title="Salir de pantalla completa"><Minimize2 size={19} /></button></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 text-xs sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-3 sm:text-sm"><span><strong className="block text-xl font-black text-cyan-300 sm:mr-2 sm:inline sm:text-2xl">{online}/{data.dispositivos.length}</strong>equipos en línea</span><span><strong className={`block text-xl font-black sm:mr-2 sm:inline sm:text-2xl ${critical ? 'text-red-400' : 'text-emerald-300'}`}>{critical}</strong>alarmas críticas</span>{energy && <span className="col-span-2 sm:col-span-1"><strong className="block text-xl font-black text-white sm:mr-2 sm:inline sm:text-2xl">{energy.currentPowerW.toLocaleString('es-AR', { maximumFractionDigits: 0 })} W</strong>consumo actual</span>}</div>
    </header>

    <main className="min-w-0 flex-1 px-4 py-5 sm:px-8 sm:py-7 lg:px-12 lg:py-10">
      <div className="grid min-w-0 items-start gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {data.dispositivos.map((device) => {
          const channels = channelVariables(device);
          const sensors = visibleVariables(device).filter((variable) => SENSOR_VARIABLE.test(variable.clave));
          const isOnline = Boolean(device.ultimoContactoEn && Date.now() - new Date(device.ultimoContactoEn).getTime() < disconnectMs);
          return <article key={device.id} className="flex min-w-0 flex-col bg-white p-4 shadow-[4px_4px_0_#0f172a] sm:min-h-56 sm:p-6 sm:shadow-[7px_7px_0_#0f172a]">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4"><div className="grid h-10 w-10 shrink-0 place-items-center bg-cyan-300 text-slate-950 sm:h-12 sm:w-12"><DeviceIcon device={device} operable={channels.length > 0} /></div><div className="min-w-0 flex-1"><h2 className="line-clamp-2 break-words font-display text-lg font-black leading-tight sm:text-2xl">{device.nombre}</h2><p className="mt-1 line-clamp-2 break-words text-[11px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs sm:tracking-wider">{device.ubicacion || deviceKind(device)}</p></div><span className={`mt-2 h-3 w-3 shrink-0 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} title={isOnline ? 'En línea' : 'Sin conexión'} /></div>
            {sensors.length > 0 && <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-7 sm:gap-5">{sensors.slice(0, 2).map((variable) => <div key={variable.id} className="min-w-0"><strong className={`block break-words text-3xl font-black leading-none tracking-tight sm:text-4xl ${variableAlert(variable) ? 'text-red-600' : 'text-slate-950'}`}>{valueOf(variable, device)}</strong><span className="mt-2 block break-words text-[9px] font-black uppercase tracking-[.12em] text-slate-500 sm:text-[10px] sm:tracking-[.16em]">{variable.nombre}</span></div>)}</div>}
            {channels.length > 0 && !isMotorMode(device) && <div className="mt-5 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">{channels.slice(0, 4).map((channel, index) => { const canal = Number(channel.clave.slice(7)) - 1; const name = channelDisplayName(device, channel, index); const power = channelMetrics(device, index + 1).find((item) => /^(actpow|power)/i.test(item.clave)); return <div key={channel.id} className="min-w-0 bg-[#edf1ef] p-3 sm:p-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0 flex-1"><strong className="block break-words text-base font-black leading-tight">{name}</strong><span className="mt-1 block break-words text-xs text-slate-500">{channel.valorBooleano ? `Encendida${power ? ` · ${valueOf(power)}` : ''}` : 'Apagada'}</span></div><span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${channel.valorBooleano ? 'bg-amber-400' : 'bg-slate-400'}`} /></div>{operable(device) && <button onClick={() => onCommand(device, { canal, encendido: !channel.valorBooleano, nombre: name })} className={`mt-3 min-h-12 w-full text-xs font-black uppercase sm:mt-4 sm:min-h-11 ${channel.valorBooleano ? 'bg-slate-950 text-white' : 'bg-cyan-300 text-slate-950'}`}>{device.tipo === 'sensor_ambiente' ? (channel.valorBooleano ? 'Apagar relé' : 'Encender relé') : (channel.valorBooleano ? 'Apagar' : 'Encender')}</button>}</div>; })}</div>}
            {!channels.length && !sensors.length && <div className="mt-auto pt-8"><strong className="text-2xl font-black">{isOnline ? 'Operativo' : 'Sin conexión'}</strong><p className="mt-1 text-sm text-slate-500">Último dato {ago(device.ultimoContactoEn)}</p></div>}
            <p className="mt-auto pt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Actualizado {ago(device.ultimoContactoEn)}</p>
          </article>;
        })}
      </div>
    </main>

    <footer className="mt-auto flex min-w-0 flex-col gap-4 bg-slate-950 px-4 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
      <div className="flex min-w-0 items-center gap-2 min-[400px]:gap-4"><img src={`${import.meta.env.BASE_URL}company-logo1.png`} alt="ActivaQR" className="h-6 w-auto shrink-0 object-contain min-[400px]:h-8" /><div className="h-6 w-px shrink-0 bg-slate-700 min-[400px]:h-7" /><strong className="min-w-0 break-words font-display text-sm font-black uppercase tracking-[.1em] text-cyan-300 min-[400px]:text-lg min-[400px]:tracking-[.18em]">ActivaControl</strong></div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500 min-[400px]:tracking-[.16em]">Supervisión · automatización · trazabilidad</p>
    </footer>
  </DialogViewport>;
}

function DashboardSettingsModal({ module, fallbackTitle, onClose, onDone, toast }: { module: ResumenControl['modulo']; fallbackTitle: string; onClose: () => void; onDone: (module: ResumenControl['modulo']) => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const [title, setTitle] = useState(module.tableroConfig?.titulo || fallbackTitle);
  const [subtitle, setSubtitle] = useState(module.tableroConfig?.subtitulo || module.nombreServicio);
  const [saving, setSaving] = useState(false);
  return <ModalShell title="Identidad de ActivaControl" onClose={onClose}><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); setSaving(true); try { const updated = await actualizarTableroControl({ ...module.tableroConfig, titulo: title, subtitulo: subtitle }); onDone(updated); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo personalizar el tablero.', 'error'); setSaving(false); } }}><p className="text-sm leading-relaxed text-muted">Este nombre aparece en la vista operativa y en pantalla completa. La marca ActivaControl se conserva en el pie.</p><Field label="Título principal"><input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} className={input} placeholder="Empresa, casa o edificio" /></Field><Field label="Subtítulo"><input maxLength={180} value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className={input} placeholder="Área, planta o propósito del tablero" /></Field><button disabled={saving} className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar identidad'}</button></form></ModalShell>;
}

function EnergySummary({ energy }: { energy: ResumenEnergia }) {
  const variation = energy.variationPercent;
  const improving = variation !== null && variation < 0;
  const chart = [{ periodo: '24 h anteriores', kwh: energy.previousEstimatedKwh24h }, { periodo: 'Últimas 24 h', kwh: energy.estimatedKwh24h }];
  const graph = <ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ left: -18, right: 8, top: 8 }}><CartesianGrid strokeDasharray="3 3" opacity={0.18} /><XAxis dataKey="periodo" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 9 }} width={42} unit=" kWh" /><Tooltip formatter={(value: number) => [`${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 })} kWh`, 'Consumo estimado']} /><Bar dataKey="kwh" fill="#0891b2" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>;
  return <article className="min-w-0 border border-line bg-surface shadow-soft"><div className="border-b border-line p-4 sm:p-5"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center bg-amber-500/10 text-amber-600"><Zap size={19} /></div><div className="min-w-0 flex-1"><h2 className="font-display text-lg font-black text-content">Consumo energético</h2><p className="mt-1 text-xs leading-relaxed text-muted">Lectura actual y comparación estimada con las 24 horas anteriores.</p></div>{variation !== null && <span className={`shrink-0 px-2 py-1 text-xs font-black ${improving ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-700'}`}>{variation > 0 ? '+' : ''}{variation.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%</span>}</div></div><div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4"><EnergyMetric value={`${energy.currentPowerW.toLocaleString('es-AR', { maximumFractionDigits: 1 })} W`} label="Potencia ahora" /><EnergyMetric value={`${energy.estimatedKwh24h.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kWh`} label="Estimado últimas 24 h" /><EnergyMetric value={`${energy.previousEstimatedKwh24h.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kWh`} label="24 h anteriores" /><EnergyMetric value={String(energy.channelsMeasured)} label="Canales medidos" /></div><details className="border-t border-line sm:border-t-0"><summary className="min-h-12 cursor-pointer px-4 py-4 text-xs font-black uppercase text-content sm:hidden">Ver comparación gráfica</summary><div className="h-44 px-3 pb-3 sm:block sm:h-52 sm:p-4">{graph}</div></details><p className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-faint">La comparación se vuelve más representativa a medida que ActivaQR acumula historial. Sirve como línea base para medir ahorro energético, no como factura eléctrica.</p></article>;
}

function EnergyMetric({ value, label }: { value: string; label: string }) { return <div className="min-w-0 bg-surface p-3 sm:p-4"><strong className="block break-words text-base font-black text-content sm:text-lg">{value}</strong><span className="mt-1 block text-[9px] font-black uppercase tracking-wide text-faint sm:text-[10px]">{label}</span></div>; }

function MeasurementTile({ device, variable, onHistory }: { device: DispositivoIoT; variable: VariableIoT; onHistory: (variable: VariableIoT) => void }) {
  const graphable = hasUsefulHistory(variable);
  const content = <><div className="mb-1 flex items-center justify-between text-faint"><VariableIcon variable={variable} />{graphable && <ChevronRight size={13} />}</div><strong className="block break-words text-base font-black">{valueOf(variable, device)}</strong><span className="block break-words text-[9px] uppercase tracking-wide text-faint">{variable.nombre}</span></>;
  return graphable
    ? <button onClick={() => onHistory(variable)} className={`group bg-surface p-3 text-left hover:bg-subtle ${variableAlert(variable) ? 'text-red-600' : 'text-content'}`}>{content}</button>
    : <div className={`bg-surface p-3 ${variableAlert(variable) ? 'text-red-600' : 'text-content'}`}>{content}</div>;
}

function ChannelTelemetry({ device, channel, index, onHistory }: { device: DispositivoIoT; channel: VariableIoT; index: number; onHistory: (variable: VariableIoT) => void }) {
  const enabled = Boolean(channel.valorBooleano);
  const metrics = channelMetrics(device, index + 1);
  const hasActivePower = metrics.some((variable) => /^actpow/i.test(variable.clave));
  const useful = metrics.filter((variable) => !hasActivePower || !/^power/i.test(variable.clave)).filter((variable) => enabled || /^voltage/i.test(variable.clave)).slice(0, 4);
  return <section className="border border-line bg-surface"><div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5"><div className="min-w-0"><strong className="block truncate text-sm text-content">{channel.nombre || `Canal ${index + 1}`}</strong><span className="text-[9px] font-black uppercase text-faint">{enabled ? 'Salida encendida' : 'Salida apagada'}</span></div><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${enabled ? 'bg-amber-500' : 'bg-slate-500'}`} /></div>{enabled ? useful.length ? <div className="grid grid-cols-2 gap-px bg-line">{useful.map((variable) => <MeasurementTile key={variable.id} device={device} variable={variable} onHistory={onHistory} />)}</div> : <p className="p-3 text-xs text-muted">Esperando la primera medición eléctrica de esta salida.</p> : <div className="p-3"><strong className="block text-sm text-content">Sin consumo atribuido</strong><p className="mt-1 text-[11px] leading-relaxed text-faint">La salida está apagada. Las potencias anteriores quedan disponibles en el historial, pero no se muestran como consumo actual.</p>{useful.map((variable) => <button key={variable.id} onClick={() => onHistory(variable)} className="mt-3 flex min-h-11 w-full items-center justify-between border-t border-line pt-3 text-left"><span className="text-[10px] font-black uppercase text-faint">Tensión de línea</span><strong className="text-sm text-content">{valueOf(variable, device)}</strong></button>)}</div>}</section>;
}

function EnvironmentHistoryCards({ device, onHistory }: { device: DispositivoIoT; onHistory: (variable: VariableIoT) => void }) {
  const temperature = device.variables.find((variable) => /^(temperature|temperatura)$/i.test(variable.clave));
  const humidity = device.variables.find((variable) => /^(humidity|humedad)$/i.test(variable.clave));
  const temperatureId = temperature?.id;
  const humidityId = humidity?.id;
  const [historyByVariable, setHistoryByVariable] = useState<Record<string, HistoryReading[]>>({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ids = [temperatureId, humidityId].filter((id): id is string => Boolean(id));
    if (!ids.length) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    Promise.all(ids.map(async (id) => {
      const result = await historialVariable(id, 24);
      return [id, result.lecturas] as const;
    })).then((entries) => {
      if (!cancelled) setHistoryByVariable(Object.fromEntries(entries));
    }).catch(() => {
      if (!cancelled) setFailed(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [temperatureId, humidityId]);

  const card = (variable: VariableIoT, label: string, suffix: string) => {
    const stored = historyByVariable[variable.id] ?? [];
    const points = stored.filter((item) => item.valorNumero != null).map((item) => ({
      hora: new Date(item.medidaEn).toLocaleString('es-AR', { day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      valor: Number(item.valorNumero),
    }));
    if (variable.valorNumero != null && variable.medidaEn) {
      const lastTimestamp = stored.at(-1)?.medidaEn;
      if (lastTimestamp !== variable.medidaEn) points.push({
        hora: new Date(variable.medidaEn).toLocaleString('es-AR', { day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        valor: Number(variable.valorNumero),
      });
    }
    return <article className="min-w-0 border border-line bg-surface p-4 shadow-soft"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="text-[10px] font-black uppercase tracking-wider text-faint">{label}</span><strong className="mt-1 block text-3xl font-black leading-none text-content">{variable.valorNumero == null ? '—' : `${Number(variable.valorNumero).toLocaleString('es-AR', { maximumFractionDigits: 1 })}${suffix}`}</strong><span className="mt-2 block text-[10px] text-faint">Actualizado {ago(variable.medidaEn)}</span></div><VariableIcon variable={variable} /></div><div className="mt-4 h-36">{loading && !points.length ? <div className="grid h-full place-items-center text-xs text-faint">Cargando historial…</div> : points.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ left: -22, right: 6, top: 6, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" opacity={0.15} /><XAxis dataKey="hora" tick={{ fontSize: 8 }} minTickGap={34} /><YAxis tick={{ fontSize: 8 }} width={40} domain={['auto', 'auto']} /><Tooltip formatter={(value: number) => [`${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 1 })}${suffix}`, label]} /><Line type="monotone" dataKey="valor" stroke="#0891b2" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-center text-xs text-faint">{failed ? 'No se pudo cargar el historial.' : 'Todavía no hay suficientes lecturas para graficar.'}</div>}</div><button onClick={() => onHistory(variable)} className="mt-3 min-h-10 w-full border border-line px-3 text-[10px] font-black uppercase text-content hover:border-cyan-600">Abrir historial completo</button></article>;
  };

  if (!temperature && !humidity) return null;
  return <section className="border-b border-line p-3 sm:p-4"><div className="mb-3"><h3 className="text-xs font-black uppercase tracking-wider text-content">Ambiente · últimas 24 horas</h3><p className="mt-1 text-[11px] text-faint">Temperatura y humedad separadas para leer la evolución de cada variable.</p></div><div className="grid gap-3 md:grid-cols-2">{temperature && card(temperature, 'Temperatura', ' °C')}{humidity && card(humidity, 'Humedad', ' %')}</div></section>;
}

function CompactDeviceCard({ device, expanded, remoteEnabled, editable, showBattery, showSignal, onToggle, onHistory, onCommand, onSettings, onExport }: { device: DispositivoIoT; expanded: boolean; remoteEnabled: boolean; editable: boolean; showBattery: boolean; showSignal: boolean; onToggle: () => void; onHistory: (variable: VariableIoT) => void; onCommand: (action?: { canal: number; encendido: boolean; nombre: string }) => void; onSettings: () => void; onExport: () => void }) {
  const channels = channelVariables(device);
  const shown = visibleVariables(device).filter((variable) => device.tipo !== 'sensor_ambiente' || !AMBIENT_VARIABLE.test(variable.clave));
  const operable = device.tipo !== 'puente_rf' && channels.length > 0 && (device.integracion?.proveedor === 'sonoff_ewelink' || device.integracion?.proveedor === 'tuya_cloud');
  const motorMode = isMotorMode(device);
  const canControl = editable && remoteEnabled && operable && device.permiteControl;
  return <article className={`min-w-0 overflow-hidden border bg-surface shadow-soft ${device.estado === 'critico' ? 'border-red-500' : 'border-line'}`}><div className="flex min-w-0 items-start gap-3 border-b border-line p-3 sm:p-4"><div className={`grid h-10 w-10 shrink-0 place-items-center border ${stateTone[device.estado] ?? stateTone.sin_datos}`}><DeviceIcon device={device} operable={operable} /></div><div className="min-w-0 flex-1"><h2 className="break-words font-display text-base font-black leading-tight text-content sm:text-lg">{device.nombre}</h2><p className="mt-1 break-words text-xs text-faint">{device.ubicacion || deviceKind(device)}</p></div><div className="shrink-0 text-right"><span className={`inline-block h-2.5 w-2.5 rounded-full sm:hidden ${device.estado === 'normal' ? 'bg-emerald-500' : device.estado === 'critico' ? 'bg-red-500' : device.estado === 'advertencia' ? 'bg-amber-500' : 'bg-slate-400'}`} title={device.estado.replace('_', ' ')} /><span className={`hidden px-2 py-1 text-[9px] font-black uppercase sm:inline-block ${stateTone[device.estado] ?? stateTone.sin_datos}`}>{device.estado.replace('_', ' ')}</span><p className="mt-1 text-[9px] text-faint">{ago(device.ultimoContactoEn)}</p></div></div>
    {motorMode ? <div className="bg-surface p-3 sm:p-4"><div className="flex flex-col items-stretch gap-3 min-[400px]:flex-row min-[400px]:items-center"><div className="min-w-0 flex-1"><strong className="block text-base text-content">Motor / persiana</strong><span className="mt-1 block text-[10px] font-bold uppercase text-faint">Modo motor confirmado por eWeLink</span></div>{canControl ? <button onClick={() => onCommand()} className="min-h-12 w-full bg-cyan-700 px-4 text-xs font-black uppercase text-white min-[400px]:w-auto">Operar motor</button> : editable && remoteEnabled && operable ? <button onClick={onSettings} className="min-h-12 w-full bg-amber-500/10 px-3 text-[10px] font-black uppercase text-amber-700 min-[400px]:w-auto">Habilitar</button> : null}</div></div> : channels.length > 0 ? <div className="grid gap-px bg-line sm:grid-cols-2">{channels.map((channel, index) => { const metrics = channelMetrics(device, index + 1); const power = metrics.find((item) => /^(actpow|power)/i.test(item.clave)); const canal = Number(channel.clave.slice(7)) - 1; const nombre = channelDisplayName(device, channel, index); const load = device.tipo === 'sensor_ambiente' ? 'Relé del termostato' : loadLabels[channel.uso || 'carga']; return <div key={channel.id} className="min-w-0 bg-surface p-3 sm:p-4"><div className="flex min-w-0 flex-col items-stretch gap-3 min-[400px]:flex-row min-[400px]:items-center"><div className="min-w-0 flex-1"><strong className="block break-words text-base leading-tight text-content">{nombre}</strong><span className="mt-0.5 block break-words text-[10px] font-bold uppercase text-faint">{load}</span><span className={`mt-1 inline-block break-words text-[10px] font-black uppercase ${channel.valorBooleano ? 'text-amber-600' : 'text-faint'}`}>{channel.valorBooleano ? 'Encendida' : 'Apagada'}{channel.valorBooleano && power ? ` · ${valueOf(power)}` : ''}</span></div>{canControl ? <button onClick={() => onCommand({ canal, encendido: !channel.valorBooleano, nombre })} className={`min-h-12 w-full px-4 text-xs font-black uppercase min-[400px]:w-auto min-[400px]:min-w-24 ${channel.valorBooleano ? 'border border-line text-content' : 'bg-cyan-700 text-white'}`}>{device.tipo === 'sensor_ambiente' ? (channel.valorBooleano ? 'Apagar relé' : 'Encender relé') : (channel.valorBooleano ? 'Apagar' : 'Encender')}</button> : editable && remoteEnabled && operable ? <button onClick={onSettings} className="min-h-12 w-full bg-amber-500/10 px-3 text-[10px] font-black uppercase text-amber-700 min-[400px]:w-auto">Habilitar</button> : null}</div></div>; })}</div> : <div className="p-4 text-sm text-muted">{device.tipo === 'puente_rf' ? 'Puente RF conectado; se conserva como acceso.' : 'Equipo de monitoreo sin salidas de mando.'}</div>}
    {expanded && <div className="border-t border-line">{device.tipo === 'sensor_ambiente' && <EnvironmentHistoryCards device={device} onHistory={onHistory} />}{channels.length > 0 && !motorMode && device.tipo !== 'sensor_ambiente' && <div className="border-b border-line p-3 sm:p-4"><div className="mb-3"><h3 className="text-xs font-black uppercase tracking-wider text-content">Medición eléctrica por salida</h3><p className="mt-1 text-[11px] text-faint">Sólo se atribuye consumo actual a las salidas encendidas.</p></div><div className="grid gap-3 sm:grid-cols-2">{channels.map((channel, index) => <ChannelTelemetry key={channel.id} device={device} channel={channel} index={index} onHistory={onHistory} />)}</div></div>}{shown.length > 0 && <div className="p-3 sm:p-4"><h3 className="mb-3 text-xs font-black uppercase tracking-wider text-content">Estado del equipo</h3><div className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">{shown.map((variable) => <MeasurementTile key={variable.id} device={device} variable={variable} onHistory={onHistory} />)}</div></div>}<div className="grid grid-cols-2 gap-px border-t border-line bg-line text-[10px] uppercase text-faint sm:flex sm:items-center sm:gap-4 sm:bg-surface sm:p-3">{showBattery && device.bateria != null && <span className="bg-surface p-3 sm:p-0">Batería {device.bateria}%</span>}{showSignal && device.rssi != null && <span className="bg-surface p-3 sm:p-0">Señal {device.rssi} dBm</span>}<button onClick={onExport} className="min-h-11 bg-surface px-3 font-black sm:ml-auto"><Download size={13} className="mr-1 inline" />Exportar</button>{editable && <button onClick={onSettings} className="min-h-11 bg-surface px-3 font-black"><Settings2 size={13} className="mr-1 inline" />Configurar</button>}</div></div>}
    <button onClick={onToggle} className="flex min-h-11 w-full items-center justify-center gap-2 border-t border-line px-3 text-[10px] font-black uppercase text-muted">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}{expanded ? 'Ocultar detalles' : device.tipo === 'sensor_ambiente' ? 'Ver gráficos e historial' : 'Ver mediciones e historial'}</button></article>;
}

const Empty = ({ icon: Icon, title, text, action, actionLabel }: { icon: React.ElementType; title: string; text: string; action?: () => void; actionLabel?: string }) => <div className="border border-dashed border-line-strong bg-subtle px-4 py-8 text-center sm:p-10"><Icon size={32} className="mx-auto mb-3 text-faint" /><h3 className="font-display text-lg font-black text-content">{title}</h3><p className="mx-auto mt-1 max-w-lg text-sm leading-relaxed text-muted">{text}</p>{action && <button onClick={action} className="mt-4 min-h-11 w-full bg-slate-900 px-4 py-2.5 text-xs font-black uppercase text-white sm:w-auto">{actionLabel}</button>}</div>;

function RetiredDevicesPanel({ devices, onRestore, onDelete }: { devices: DispositivoIoT[]; onRestore: (device: DispositivoIoT) => Promise<void>; onDelete: (device: DispositivoIoT) => Promise<void> }) {
  return <details className="border border-line bg-surface" open={devices.length > 0}><summary className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3"><Archive size={18} className="shrink-0 text-faint" /><span className="min-w-0 flex-1"><strong className="block text-sm text-content">Dispositivos retirados</strong><span className="block text-xs text-muted">Ocultos del tablero, sin mando ni consumo de licencia</span></span><span className="text-xs font-black text-faint">{devices.length}</span></summary>{devices.length ? <div className="space-y-2 border-t border-line p-3 sm:p-4"><p className="text-[11px] leading-relaxed text-muted">Para eliminar definitivamente, quitá primero el equipo de eWeLink o Tuya; si todavía existe allí, una sincronización futura podría descubrirlo otra vez.</p>{devices.map((device) => <article key={device.id} className="min-w-0 border border-line bg-subtle p-3 sm:flex sm:items-center sm:gap-4"><div className="min-w-0 flex-1"><strong className="block break-words text-sm text-content">{device.nombre}</strong><p className="mt-1 break-words text-xs text-muted">{device.modelo || deviceKind(device)}{device.archivadoEn ? ` · retirado ${ago(device.archivadoEn)}` : ''}</p></div><div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:mt-0 sm:flex"><button onClick={() => onRestore(device)} className="flex min-h-11 items-center justify-center gap-2 border border-line bg-surface px-3 text-[10px] font-black uppercase text-content"><RotateCcw size={14} />Restaurar</button><button onClick={() => onDelete(device)} className="flex min-h-11 items-center justify-center gap-2 border border-red-500/40 bg-surface px-3 text-[10px] font-black uppercase text-red-600"><Trash2 size={14} />Eliminar historial</button></div></article>)}</div> : <p className="border-t border-line p-4 text-sm text-muted">No hay dispositivos retirados.</p>}</details>;
}

const VariableIcon = ({ variable }: { variable: VariableIoT }) => variable.clave.includes('temp') || variable.clave.includes('humidity') || variable.clave.includes('humedad') ? <Thermometer size={17} /> : /door|puerta|window|contact|open/.test(variable.clave) ? <DoorOpen size={17} /> : /water|leak|flood/.test(variable.clave) ? <Droplets size={17} /> : /current|voltage|pow|energy|kwh/.test(variable.clave) ? <Zap size={17} /> : variable.clave.includes('pres') ? <Gauge size={17} /> : <LineChartIcon size={17} />;

const ModalShell = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => <DialogViewport className="z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onEscape={onClose}><div className="flex max-h-[96dvh] w-full max-w-xl flex-col overflow-hidden border-x border-t border-line bg-surface shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:border" role="dialog" aria-modal="true"><div className="flex min-h-14 shrink-0 items-center justify-between gap-3 bg-slate-950 px-4 py-3 text-white sm:px-5 sm:py-4"><h2 className="min-w-0 break-words font-display text-base font-black leading-tight sm:text-lg">{title}</h2><button onClick={onClose} className="min-h-11 shrink-0 px-2 text-xs font-black uppercase text-slate-400">Cerrar</button></div><div className="overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">{children}</div></div></DialogViewport>;
const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => <label className="block text-xs font-black uppercase tracking-wider text-muted">{label}{children}{hint && <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-faint">{hint}</span>}</label>;
const input = 'mt-1 h-11 w-full border border-line bg-surface px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-cyan-600';

function ConnectorModal({ onClose, onDone, toast }: { onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const [name, setName] = useState(''); const [provider, setProvider] = useState<ProveedorIoT>('milesight_ug65'); const [saving, setSaving] = useState(false);
  const description = provider === 'sonoff_ewelink'
    ? 'Requiere un proyecto eWeLink Developer y autorización de la cuenta que posee los dispositivos SONOFF.'
    : provider === 'tuya_cloud'
      ? 'Requiere un proyecto Tuya IoT Cloud vinculado a la cuenta Smart Life del tenant. Importa sensores, medidores e interruptores compatibles.'
      : 'ActivaQR generará un endpoint HTTPS único. El gateway debe enviar JSON decodificado con devEUI y variables.';
  return <ModalShell title="Nueva conexión industrial" onClose={onClose}><form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { await crearIntegracion({ nombre: name, proveedor: provider }); toast('Conector creado. Completá ahora su autenticación.', 'success'); onDone(); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo crear.', 'error'); } finally { setSaving(false); } }}><Field label="Nombre"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Gateway cámaras planta norte" className={input} /></Field><Field label="Tecnología"><select value={provider} onChange={(e) => setProvider(e.target.value as ProveedorIoT)} className={input}>{Object.entries(providerLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><div className="border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs text-muted">{description}</div><button disabled={saving} className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white disabled:opacity-50">{saving ? 'Creando…' : 'Crear conector'}</button></form></ModalShell>;
}

function CredentialsModal({ integration, onClose, onDone, toast }: { integration: IntegracionIoT; onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const [form, setForm] = useState({ appId: '', appSecret: '' }); const [pollingSeconds, setPollingSeconds] = useState(Math.max(300, Number(integration.configuracion?.pollingSeconds) || 300)); const [saving, setSaving] = useState(false);
  return <ModalShell title="Conectar SONOFF / eWeLink" onClose={onClose}><form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { const result = await autorizarSonoff(integration.id, { ...form, pollingSeconds }); window.location.assign(result.authUrl); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo iniciar la autorización.', 'error'); setSaving(false); } }}><p className="text-sm text-muted">ActivaQR guardará estas claves cifradas y te llevará a eWeLink para autorizar la cuenta. El Access Token y su renovación se gestionan automáticamente.</p><Field label="App ID"><input required value={form.appId} onChange={(e) => setForm({ ...form, appId: e.target.value })} className={input} autoComplete="off" /></Field><Field label="App Secret"><input required type="password" value={form.appSecret} onChange={(e) => setForm({ ...form, appSecret: e.target.value })} className={input} autoComplete="new-password" /></Field><Field label="Reconciliar estados con eWeLink"><select value={pollingSeconds} onChange={(e) => setPollingSeconds(Number(e.target.value))} className={input}><option value={300}>Cada 5 minutos</option><option value={900}>Cada 15 minutos</option><option value={1800}>Cada 30 minutos</option><option value={3600}>Cada hora</option></select></Field><div className="border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs text-muted"><strong className="block text-content">URL para registrar en eWeLink</strong><code className="mt-1 block break-all">https://api.activaqr.net/api/iot/ewelink/oauth/callback</code></div><p className="border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-muted">Los cambios en vivo llegan por conexión WebSocket. Esta frecuencia es sólo un respaldo y se limita para proteger la cuota del APPID.</p><button disabled={saving} className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white disabled:opacity-50">{saving ? 'Abriendo eWeLink…' : 'Autorizar con eWeLink'}</button></form></ModalShell>;
}

function TuyaCredentialsModal({ integration, onClose, onDone, toast }: { integration: IntegracionIoT; onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const [form, setForm] = useState({ clientId: '', clientSecret: '', userId: '', region: 'us', pollingSeconds: Number(integration.configuracion?.pollingSeconds) || 30 });
  const [saving, setSaving] = useState(false);
  return <ModalShell title="Conectar Tuya / Smart Life" onClose={onClose}><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); setSaving(true); try { const result = await configurarTuya(integration.id, form); toast(`${result.dispositivosImportados} dispositivos Tuya importados.`, 'success'); onDone(); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo conectar Tuya Cloud.', 'error'); setSaving(false); } }}><p className="text-sm leading-relaxed text-muted">Usá las credenciales del proyecto Tuya IoT Cloud vinculado a la cuenta Smart Life de esta empresa. ActivaQR las cifra y nunca las muestra nuevamente.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Access ID / Client ID"><input required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className={input} autoComplete="off" /></Field><Field label="Access Secret"><input required type="password" value={form.clientSecret} onChange={(event) => setForm({ ...form, clientSecret: event.target.value })} className={input} autoComplete="new-password" /></Field></div><Field label="UID de la cuenta vinculada" hint="Es el UID mostrado en Tuya IoT Platform, no el correo de Smart Life."><input required value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} className={input} autoComplete="off" /></Field><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Región del proyecto"><select value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} className={input}><option value="us">América</option><option value="eu">Europa</option><option value="cn">China</option><option value="in">India</option></select></Field><Field label="Actualizar estados"><select value={form.pollingSeconds} onChange={(event) => setForm({ ...form, pollingSeconds: Number(event.target.value) })} className={input}><option value={10}>Cada 10 segundos</option><option value={30}>Cada 30 segundos</option><option value={60}>Cada minuto</option><option value={300}>Cada 5 minutos</option><option value={900}>Cada 15 minutos</option></select></Field></div><div className="border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted">Cada tenant debe usar su propio proyecto o su propia cuenta vinculada. Los dispositivos importados quedan asociados únicamente a la empresa autenticada.</div><button disabled={saving} className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white disabled:opacity-50">{saving ? 'Validando e importando…' : 'Conectar e importar dispositivos'}</button></form></ModalShell>;
}

function RuleModal({ devices, onClose, onDone, toast }: { devices: DispositivoIoT[]; onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const variables = devices.flatMap((device) => device.variables.filter((variable) => variable.clave !== 'online' && hasUsefulHistory(variable)).map((variable) => ({ device, variable })));
  const [form, setForm] = useState({ variableId: variables[0]?.variable.id ?? '', nombre: '', operador: variables[0]?.variable.tipo === 'booleano' ? 'eq' : 'gt', umbral: variables[0]?.variable.tipo === 'booleano' ? 'true' : '', demoraSegundos: 0, severidad: 'advertencia', notificarPush: true });
  const selected = variables.find((item) => item.variable.id === form.variableId)?.variable;
  return <ModalShell title="Nueva regla de alarma" onClose={onClose}><form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); try { await crearRegla(form); toast('Regla activa desde la próxima lectura.', 'success'); onDone(); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo crear.', 'error'); } }}><Field label="Variable"><select required value={form.variableId} onChange={(e) => { const variable = variables.find((item) => item.variable.id === e.target.value)?.variable; setForm({ ...form, variableId: e.target.value, operador: variable?.tipo === 'booleano' ? 'eq' : 'gt', umbral: variable?.tipo === 'booleano' ? 'true' : '' }); }} className={input}>{variables.map(({ device, variable }) => <option key={variable.id} value={variable.id}>{device.nombre} · {variable.nombre} · {valueOf(variable)}</option>)}</select></Field><Field label="Nombre de la alarma"><input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder={selected?.tipo === 'booleano' ? 'Ej: Se abrió la puerta principal' : 'Ej: Cámara supera −18 °C'} className={input} /></Field><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Condición"><select value={form.operador} onChange={(e) => setForm({ ...form, operador: e.target.value })} className={input}>{selected?.tipo === 'booleano' ? <><option value="eq">Cuando sea</option><option value="neq">Cuando deje de ser</option></> : <><option value="gt">Mayor que</option><option value="gte">Mayor o igual</option><option value="lt">Menor que</option><option value="lte">Menor o igual</option><option value="eq">Igual a</option><option value="neq">Distinto de</option></>}</select></Field><Field label={selected?.tipo === 'booleano' ? 'Estado disparador' : `Umbral${selected?.unidad ? ` (${selected.unidad})` : ''}`}>{selected?.tipo === 'booleano' ? <select value={String(form.umbral)} onChange={(e) => setForm({ ...form, umbral: e.target.value })} className={input}><option value="true">Activo / detectado / abierto</option><option value="false">Inactivo / normal / cerrado</option></select> : <input required type={selected?.tipo === 'numero' ? 'number' : 'text'} step="any" value={form.umbral} onChange={(e) => setForm({ ...form, umbral: e.target.value })} className={input} />}</Field></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Demora (segundos)" hint="0 avisa inmediatamente"><input type="number" min="0" value={form.demoraSegundos} onChange={(e) => setForm({ ...form, demoraSegundos: Number(e.target.value) })} className={input} /></Field><Field label="Severidad"><select value={form.severidad} onChange={(e) => setForm({ ...form, severidad: e.target.value })} className={input}><option value="informacion">Información</option><option value="advertencia">Advertencia</option><option value="critica">Crítica</option></select></Field></div><label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed text-muted"><input type="checkbox" checked={form.notificarPush} onChange={(e) => setForm({ ...form, notificarPush: e.target.checked })} className="mt-1 shrink-0" /> Notificar por push a responsables</label><button disabled={!variables.length} className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white disabled:opacity-50">Activar regla</button></form></ModalShell>;
}

function SmartSceneModal({ devices, onClose, onDone, toast }: { devices: DispositivoIoT[]; onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const options = devices
    .filter((device) => device.permiteControl && device.tipo !== 'puente_rf' && !isMotorMode(device) && ['sonoff_ewelink', 'tuya_cloud'].includes(device.integracion?.proveedor ?? ''))
    .flatMap((device) => channelVariables(device).map((channel, index) => ({ device, channel, canal: Number(channel.clave.slice(7)) - 1 || index })));
  const sensors = devices.flatMap((device) => device.variables
    .filter((variable) => hasUsefulHistory(variable) && !/^switch_[1-4]$/.test(variable.clave) && variable.clave !== 'relay' && variable.clave !== 'online')
    .map((variable) => ({ device, variable })));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'manual' | 'rango_horario' | 'variable'>('manual');
  const [states, setStates] = useState<Record<string, boolean | null>>({});
  const [reverseStates, setReverseStates] = useState<Record<string, boolean>>({});
  const [days, setDays] = useState([1, 2, 3, 4, 5, 6, 0]);
  const [start, setStart] = useState('22:00');
  const [end, setEnd] = useState('06:00');
  const [variableId, setVariableId] = useState(sensors[0]?.variable.id ?? '');
  const [operator, setOperator] = useState<'gt' | 'gte' | 'lt' | 'lte' | 'eq'>('gt');
  const [threshold, setThreshold] = useState('');
  const [saving, setSaving] = useState(false);
  const selected = Object.entries(states).filter(([, value]) => value !== null && value !== undefined);
  const selectedSensor = sensors.find(({ variable }) => variable.id === variableId)?.variable;
  const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const setOutput = (key: string, value: boolean | null) => {
    setStates((current) => ({ ...current, [key]: value }));
    if (value !== null) setReverseStates((current) => ({ ...current, [key]: !value }));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected.length) return toast('Elegí al menos una salida para la maniobra.', 'warning');
    if (mode === 'rango_horario' && !days.length) return toast('Elegí al menos un día.', 'warning');
    if (mode === 'variable' && (!variableId || threshold === '')) return toast('Elegí el sensor y el valor que disparan la maniobra.', 'warning');
    const acciones = options.filter(({ device, canal }) => selected.some(([key]) => key === `${device.id}:${canal}`)).map(({ device, canal }) => ({ dispositivoId: device.id, canal, encendido: Boolean(states[`${device.id}:${canal}`]) }));
    const accionesReversion = mode === 'manual' ? [] : acciones.map((action) => ({ ...action, encendido: reverseStates[`${action.dispositivoId}:${action.canal}`] }));
    const disparador: DisparadorEscenaIoT = mode === 'manual'
      ? { tipo: 'manual' }
      : mode === 'rango_horario'
        ? { tipo: 'rango_horario', dias: days, inicio: start, fin: end, zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires' }
        : { tipo: 'variable', variableId, operador: operator, umbral: selectedSensor?.tipo === 'numero' ? Number(threshold) : selectedSensor?.tipo === 'booleano' ? threshold === 'true' : threshold };
    setSaving(true);
    try {
      await crearEscena({ nombre: name, descripcion: description, acciones, accionesReversion, disparador });
      toast(mode === 'manual' ? 'Escena creada y lista para ejecutar.' : 'Automatización activa y protegida con recuperación.', 'success');
      onDone();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo crear la automatización.', 'error');
      setSaving(false);
    }
  };
  return <ModalShell title="Nueva automatización" onClose={onClose}>
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid grid-cols-3 gap-1 border border-line bg-subtle p-1">
        {([['manual', 'Manual'], ['rango_horario', 'Horario'], ['variable', 'Sensor']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setMode(value)} className={`min-h-11 px-2 text-[10px] font-black uppercase ${mode === value ? 'bg-cyan-700 text-white shadow-soft' : 'text-muted'}`}>{label}</button>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Nombre"><input required value={name} onChange={(event) => setName(event.target.value)} className={input} placeholder={mode === 'rango_horario' ? 'Cámara apagada de noche' : mode === 'variable' ? 'Ventilar por temperatura' : 'Cerrar todas las aulas'} /></Field><Field label="Descripción"><input value={description} onChange={(event) => setDescription(event.target.value)} className={input} placeholder="Qué protege o automatiza" /></Field></div>
      {mode === 'rango_horario' && <section className="border border-cyan-500/30 bg-cyan-500/5 p-4"><strong className="text-sm text-content">Rango activo</strong><div className="mt-3 grid grid-cols-7 gap-1">{dayLabels.map((label, day) => <button key={day} type="button" onClick={() => setDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day])} className={`min-h-10 text-xs font-black ${days.includes(day) ? 'bg-cyan-700 text-white' : 'border border-line text-muted'}`}>{label}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-3"><Field label="Comienza"><input type="time" required value={start} onChange={(event) => setStart(event.target.value)} className={input} /></Field><Field label="Finaliza"><input type="time" required value={end} onChange={(event) => setEnd(event.target.value)} className={input} /></Field></div><p className="mt-2 text-[11px] leading-relaxed text-muted">Puede cruzar medianoche. Al finalizar, ActivaQR aplica la recuperación definida debajo.</p></section>}
      {mode === 'variable' && <section className="border border-cyan-500/30 bg-cyan-500/5 p-4"><strong className="text-sm text-content">Cuando el sensor indique</strong><div className="mt-3 space-y-3"><Field label="Dato desencadenante"><select required value={variableId} onChange={(event) => { const variable = sensors.find((item) => item.variable.id === event.target.value)?.variable; setVariableId(event.target.value); setOperator(variable?.tipo === 'booleano' ? 'eq' : 'gt'); setThreshold(variable?.tipo === 'booleano' ? 'true' : ''); }} className={input}>{sensors.map(({ device, variable }) => <option key={variable.id} value={variable.id}>{device.nombre} · {variable.nombre} · {valueOf(variable)}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Condición"><select value={operator} onChange={(event) => setOperator(event.target.value as typeof operator)} className={input}>{selectedSensor?.tipo === 'booleano' ? <option value="eq">Cuando sea</option> : <><option value="gt">Mayor que</option><option value="gte">Mayor o igual</option><option value="lt">Menor que</option><option value="lte">Menor o igual</option><option value="eq">Igual a</option></>}</select></Field><Field label={selectedSensor?.unidad ? `Valor (${selectedSensor.unidad})` : 'Valor'}>{selectedSensor?.tipo === 'booleano' ? <select value={threshold} onChange={(event) => setThreshold(event.target.value)} className={input}><option value="true">Activo / abierto</option><option value="false">Inactivo / cerrado</option></select> : <input required type={selectedSensor?.tipo === 'numero' ? 'number' : 'text'} step="any" value={threshold} onChange={(event) => setThreshold(event.target.value)} className={input} />}</Field></div></div></section>}
      <fieldset className="space-y-2"><legend className="mb-2 text-xs font-black uppercase tracking-wider text-muted">Qué salidas participan</legend>{options.map(({ device, channel, canal }) => { const key = `${device.id}:${canal}`; const value = states[key]; return <div key={key} className={`border p-3 ${value === null || value === undefined ? 'border-line' : 'border-cyan-500/40 bg-cyan-500/5'}`}><div><strong className="block text-sm text-content">{channelDisplayName(device, channel, canal)}</strong><span className="text-xs text-faint">{device.nombre}{device.ubicacion ? ` · ${device.ubicacion}` : ''}</span></div><div className="mt-3 grid grid-cols-3 gap-1">{([[null, 'Sin cambio'], [true, 'Encender'], [false, 'Apagar']] as const).map(([state, label]) => <button key={label} type="button" onClick={() => setOutput(key, state)} className={`min-h-10 px-2 text-[10px] font-black uppercase ${value === state || (state === null && value === undefined) ? state === true ? 'bg-amber-500 text-slate-950' : state === false ? 'bg-cyan-700 text-white' : 'bg-slate-900 text-white' : 'border border-line text-muted'}`}>{label}</button>)}</div>{mode !== 'manual' && value !== null && value !== undefined && <div className="mt-3 flex items-center justify-between border-t border-line pt-3"><span className="text-[10px] font-black uppercase text-muted">Al terminar</span><button type="button" onClick={() => setReverseStates((current) => ({ ...current, [key]: !current[key] }))} className="min-h-9 border border-emerald-500/30 bg-emerald-500/10 px-3 text-[10px] font-black uppercase text-emerald-700">{reverseStates[key] ? 'Encender' : 'Apagar'}</button></div>}</div>; })}{!options.length && <div className="border border-dashed border-line p-5 text-center text-sm text-muted">No hay salidas habilitadas. Activá “Permitir control remoto” en el dispositivo.</div>}</fieldset>
      {mode !== 'manual' && <div className="flex gap-3 border border-emerald-500/30 bg-emerald-500/5 p-4"><ShieldAlert size={18} className="mt-0.5 shrink-0 text-emerald-600" /><p className="text-xs leading-relaxed text-muted"><strong className="block text-content">Recuperación obligatoria</strong>Cada canal vuelve al estado indicado cuando termina el horario o deja de cumplirse la condición. Esto protege termostatos y equipos críticos.</p></div>}
      <button disabled={saving || !options.length || !selected.length} className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white disabled:opacity-40">{saving ? 'Activando…' : mode === 'manual' ? `Crear escena · ${selected.length} salidas` : `Activar automatización · ${selected.length} salidas`}</button>
    </form>
  </ModalShell>;
}

function SceneModal({ devices, onClose, onDone, toast }: { devices: DispositivoIoT[]; onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  return <SmartSceneModal devices={devices} onClose={onClose} onDone={onDone} toast={toast} />;
  /* La implementación clásica queda debajo temporalmente para conservar compatibilidad visual durante la migración. */
  // eslint-disable-next-line no-unreachable
  const options = devices.filter((device) => device.permiteControl && device.tipo !== 'puente_rf' && !isMotorMode(device) && (device.integracion?.proveedor === 'sonoff_ewelink' || device.integracion?.proveedor === 'tuya_cloud')).flatMap((device) => channelVariables(device).map((channel, index) => ({ device, channel, canal: Number(channel.clave.slice(7)) - 1 || index })));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [states, setStates] = useState<Record<string, boolean | null>>({});
  const [saving, setSaving] = useState(false);
  const selectedCount = Object.values(states).filter((value) => value !== null && value !== undefined).length;
  return <ModalShell title="Crear escena" onClose={onClose}><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const acciones = options.filter((item) => states[`${item.device.id}:${item.canal}`] !== null && states[`${item.device.id}:${item.canal}`] !== undefined).map((item) => ({ dispositivoId: item.device.id, canal: item.canal, encendido: Boolean(states[`${item.device.id}:${item.canal}`]) })); if (!acciones.length) { toast('Elegí al menos una salida para la escena.', 'warning'); return; } setSaving(true); try { await crearEscena({ nombre: name, descripcion: description, acciones }); toast('Escena creada y lista para usar.', 'success'); onDone(); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo crear la escena.', 'error'); setSaving(false); } }}><Field label="Nombre"><input required value={name} onChange={(event) => setName(event.target.value)} className={input} placeholder="Ej: Cerrar todas las aulas" /></Field><Field label="Descripción"><input value={description} onChange={(event) => setDescription(event.target.value)} className={input} placeholder="Qué hace y cuándo conviene usarla" /></Field><fieldset className="space-y-2"><legend className="mb-2 text-xs font-black uppercase tracking-wider text-muted">Salidas de la escena</legend>{options.map(({ device, channel, canal }) => { const key = `${device.id}:${canal}`; const value = states[key]; return <div key={key} className="border border-line p-3"><div className="min-w-0"><strong className="block break-words text-sm text-content">{channelDisplayName(device, channel, canal)}</strong><span className="block text-xs text-faint">{device.nombre}{device.ubicacion ? ` · ${device.ubicacion}` : ''}</span></div><div className="mt-3 grid grid-cols-3 gap-1"><button type="button" onClick={() => setStates({ ...states, [key]: null })} className={`min-h-11 px-2 text-[10px] font-black uppercase ${value === null || value === undefined ? 'bg-slate-900 text-white' : 'border border-line text-muted'}`}>Sin cambio</button><button type="button" onClick={() => setStates({ ...states, [key]: true })} className={`min-h-11 px-2 text-[10px] font-black uppercase ${value === true ? 'bg-amber-500 text-slate-950' : 'border border-line text-muted'}`}>Encender</button><button type="button" onClick={() => setStates({ ...states, [key]: false })} className={`min-h-11 px-2 text-[10px] font-black uppercase ${value === false ? 'bg-cyan-700 text-white' : 'border border-line text-muted'}`}>Apagar</button></div></div>; })}{!options.length && <div className="border border-dashed border-line p-5 text-center text-sm text-muted">No hay salidas habilitadas para control. Primero habilitá cada dispositivo desde Configurar.</div>}</fieldset><div className="border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted">La escena no se ejecuta al guardarla. Primero se crea y luego exige una confirmación separada cada vez que se usa.</div><button disabled={saving || !options.length || !selectedCount} className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white disabled:opacity-40">{saving ? 'Creando…' : `Crear escena · ${selectedCount} salidas`}</button></form></ModalShell>;
}

function CommandModal({ device, initialAction, onClose, onDone, toast }: { device: DispositivoIoT; initialAction?: { canal: number; encendido: boolean; nombre: string }; onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const channels = channelVariables(device);
  const motorMode = isMotorMode(device);
  const [action, setAction] = useState<{ canal: number; encendido: boolean; nombre: string } | null>(initialAction ?? null);
  const [motorAction, setMotorAction] = useState<'abrir' | 'detener' | 'cerrar' | null>(null);
  const [saving, setSaving] = useState(false);
  const execute = async () => {
    if (!action && !motorAction) return;
    setSaving(true);
    try {
      if (motorMode && motorAction) {
        await solicitarComando({ dispositivoId: device.id, tipo: 'motor', payload: { accion: motorAction }, motivo: 'Maniobra de motor confirmada desde ActivaQR.' });
        toast(`Maniobra “${motorAction}” enviada correctamente.`, 'success');
      } else if (action) {
        await solicitarComando({ dispositivoId: device.id, tipo: 'rele', payload: { canal: action.canal, encendido: action.encendido }, motivo: 'Operación manual confirmada desde ActivaQR.' });
        toast(`${action.nombre} ${action.encendido ? 'encendido' : 'apagado'} correctamente.`, 'success');
      }
      onDone();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo operar el dispositivo.', 'error');
      setSaving(false);
    }
  };
  return <ModalShell title={`Operar ${device.nombre}`} onClose={onClose}><div className="space-y-4"><p className="text-sm leading-relaxed text-muted">{motorMode ? 'El Dual R3 confirmó modo motor. Los relés independientes están bloqueados y sólo se permiten maniobras guiadas.' : device.tipo === 'sensor_ambiente' ? 'Control manual del relé interno. ActivaQR enviará el estado correcto del termostato a eWeLink y registrará la maniobra.' : 'Seleccioná una salida. ActivaQR enviará el cambio mediante el adaptador certificado del fabricante y dejará registrada la maniobra.'}</p>{motorMode ? <div className="grid grid-cols-3 gap-2">{(['abrir', 'detener', 'cerrar'] as const).map((item) => <button key={item} disabled={saving} onClick={() => setMotorAction(item)} className={`min-h-14 px-2 text-xs font-black uppercase ${motorAction === item ? 'bg-cyan-700 text-white' : 'border border-line text-content'}`}>{item}</button>)}</div> : <div className="space-y-2">{channels.map((variable, index) => { const encendida = Boolean(variable.valorBooleano); const canal = Number(variable.clave.slice(7)) - 1; const nombre = channelDisplayName(device, variable, index); return <button key={variable.id} disabled={saving} onClick={() => setAction({ canal, encendido: !encendida, nombre })} className="flex min-h-16 w-full items-center gap-3 border border-line p-3 text-left hover:border-cyan-600 disabled:opacity-50 sm:p-4"><span className="min-w-0 flex-1"><strong className="block break-words leading-tight text-content">{nombre}</strong><span className="mt-1 block text-xs text-faint">{encendida ? 'Encendido' : 'Apagado'}</span></span><span className={`shrink-0 px-3 py-2 text-xs font-black uppercase ${encendida ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>{encendida ? 'Apagar' : 'Encender'}</span></button>; })}</div>}{(action || motorAction) && <div className="border border-amber-500/40 bg-amber-500/10 p-4"><strong className="block text-content">Confirmá la operación</strong><p className="mt-1 break-words text-sm leading-relaxed text-muted">{motorMode ? `Vas a ordenar “${motorAction}” al motor real.` : action ? `Vas a ${action.encendido ? 'encender' : 'apagar'} ${action.nombre}. La salida real cambiará de estado.` : ''}</p><div className="mt-4 grid gap-2 sm:flex"><button disabled={saving} onClick={execute} className="h-12 bg-cyan-700 px-4 text-xs font-black uppercase text-white disabled:opacity-50 sm:h-11 sm:flex-1">{saving ? 'Enviando…' : 'Confirmar'}</button><button disabled={saving} onClick={() => { setAction(null); setMotorAction(null); }} className="h-11 border border-line px-4 text-xs font-black uppercase text-content">Cancelar</button></div></div>}</div></ModalShell>;
}

function DeviceModal({ device, remoteContract, onClose, onDone, onRetire, toast }: { device: DispositivoIoT; remoteContract: boolean; onClose: () => void; onDone: () => void; onRetire?: () => Promise<void>; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const [form, setForm] = useState({ nombre: device.nombre, ubicacion: device.ubicacion ?? '', habilitado: device.habilitado, permiteControl: device.permiteControl });
  const channels = channelVariables(device);
  const [channelNames, setChannelNames] = useState<Record<string, string>>(Object.fromEntries(channels.map((channel) => [channel.id, channel.nombre])));
  const [channelUses, setChannelUses] = useState<Record<string, VariableIoT['uso']>>(Object.fromEntries(channels.map((channel) => [channel.id, channel.uso || 'carga'])));
  const [saving, setSaving] = useState(false);
  const providerOperable = device.integracion?.proveedor === 'sonoff_ewelink' || device.integracion?.proveedor === 'tuya_cloud';
  return <ModalShell title="Configurar dispositivo" onClose={onClose}><form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { await actualizarDispositivo(device.id, form); await Promise.all(channels.filter((channel) => channelNames[channel.id]?.trim() && (channelNames[channel.id].trim() !== channel.nombre || channelUses[channel.id] !== channel.uso)).map((channel) => actualizarVariable(channel.id, { nombre: channelNames[channel.id].trim(), uso: channelUses[channel.id] }))); toast('Dispositivo y canales actualizados.', 'success'); onDone(); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo actualizar.', 'error'); setSaving(false); } }}><Field label="Nombre visible del dispositivo"><input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={input} /></Field>{isMotorMode(device) && <div className="border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-muted"><strong className="block text-content">Modo motor confirmado por eWeLink</strong>ActivaQR muestra Abrir, Detener y Cerrar. Las etiquetas de abajo describen la instalación, pero no cambian el modo eléctrico del Dual R3.</div>}{channels.length > 0 && <fieldset className="space-y-3 border border-line p-3"><legend className="px-1 text-xs font-black uppercase tracking-wider text-muted">Función de cada salida</legend>{channels.map((channel, index) => <div key={channel.id} className="grid grid-cols-1 gap-2 border-b border-line pb-3 last:border-0 last:pb-0 sm:grid-cols-2"><Field label={`Nombre · canal ${index + 1}`} hint={`Identificador técnico: ${channel.clave}`}><input required value={channelNames[channel.id] ?? ''} onChange={(e) => setChannelNames({ ...channelNames, [channel.id]: e.target.value })} className={input} placeholder={device.tipo === 'sensor_ambiente' ? 'Relé interno' : `Ej: Luz aula ${index + 1}`} /></Field><Field label="Qué opera"><select value={channelUses[channel.id] || 'carga'} onChange={(e) => setChannelUses({ ...channelUses, [channel.id]: e.target.value as VariableIoT['uso'] })} className={input}>{Object.entries(loadLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>)}</fieldset>}<Field label="Ubicación"><input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} className={input} placeholder="Ej: Aula 1 · Planta baja" /></Field><label className="flex items-start gap-3 border border-line p-3 text-sm text-muted"><input type="checkbox" checked={form.habilitado} onChange={(e) => setForm({ ...form, habilitado: e.target.checked })} className="mt-1" /><span><strong className="block text-content">Recibir telemetría</strong>Si se pausa, ActivaQR rechaza nuevas lecturas de este equipo.</span></label><label className={`flex items-start gap-3 border p-3 text-sm ${remoteContract && providerOperable && device.tipo !== 'puente_rf' ? 'border-amber-500/40 bg-amber-500/5 text-muted' : 'border-line bg-subtle text-faint'}`}><input type="checkbox" disabled={!remoteContract || !providerOperable || device.tipo === 'puente_rf'} checked={form.permiteControl} onChange={(e) => setForm({ ...form, permiteControl: e.target.checked })} className="mt-1" /><span><strong className="block text-content">Permitir control remoto</strong>{device.tipo === 'puente_rf' ? 'El RF Bridge se conserva como puente de acceso; no es una salida de luz.' : !providerOperable ? 'Este conector recibe telemetría, pero todavía no posee un adaptador certificado de control.' : remoteContract ? 'Permite operar sus canales desde ActivaQR con confirmación y auditoría.' : 'El contrato del tenant está configurado sólo para monitoreo.'}</span></label><button disabled={saving} className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar dispositivo y canales'}</button>{onRetire && <div className="border-t border-line pt-4"><button type="button" disabled={saving} onClick={onRetire} className="flex min-h-12 w-full items-center justify-center gap-2 border border-red-500/40 px-4 text-xs font-black uppercase text-red-600 disabled:opacity-50"><Archive size={15} />Retirar del tablero</button><p className="mt-2 text-[11px] leading-relaxed text-faint">Oculta el equipo, resuelve sus alarmas y conserva todo el historial. Podrás restaurarlo desde Conexiones.</p></div>}</form></ModalShell>;
}
