import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BellRing, Check, ChevronRight, CircleOff, CloudCog, Cpu, DoorOpen, Gauge, KeyRound, LineChart as LineChartIcon, Plus, RadioTower, RefreshCw, Settings2, ShieldAlert, Signal, Snowflake, Thermometer, WifiOff, Zap } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { DialogViewport } from '../components/ui/DialogViewport';
import { API_URL } from '../data/auth';
import {
  AlarmaIoT,
  actualizarDispositivo,
  autorizarSonoff,
  crearIntegracion,
  crearRegla,
  DispositivoIoT,
  generarTokenWebhook,
  historialVariable,
  IntegracionIoT,
  ProveedorIoT,
  reconocerAlarma,
  ResumenControl,
  resumenControl,
  solicitarComando,
  sincronizarSonoff,
  VariableIoT,
} from '../data/controlIndustrialApi';

type Tab = 'vivo' | 'alarmas' | 'conexiones' | 'comandos';

const providerLabel: Record<ProveedorIoT, string> = {
  sonoff_ewelink: 'SONOFF TH Elite / eWeLink',
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

function valueOf(variable: VariableIoT) {
  if (variable.tipo === 'numero') return variable.valorNumero == null ? '—' : `${Number(variable.valorNumero).toLocaleString('es-AR', { maximumFractionDigits: 2 })}${variable.unidad ? ` ${variable.unidad}` : ''}`;
  if (variable.tipo === 'booleano') return variable.valorBooleano ? 'Activo' : 'Normal';
  return variable.valorTexto || '—';
}

const stateTone: Record<string, string> = {
  normal: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
  advertencia: 'border-amber-500/40 bg-amber-500/10 text-amber-600',
  critico: 'border-red-500/50 bg-red-500/10 text-red-600',
  sin_datos: 'border-line bg-subtle text-faint',
  desconectado: 'border-line bg-subtle text-faint',
};

export const ControlIndustrial: React.FC = () => {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<ResumenControl | null>(null);
  const [tab, setTab] = useState<Tab>('vivo');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<{ device: DispositivoIoT; variable: VariableIoT } | null>(null);
  const [history, setHistory] = useState<Array<{ medidaEn: string; valorNumero?: number | null }>>([]);
  const [connectorOpen, setConnectorOpen] = useState(false);
  const [credentialsFor, setCredentialsFor] = useState<IntegracionIoT | null>(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [commandFor, setCommandFor] = useState<DispositivoIoT | null>(null);
  const [settingsFor, setSettingsFor] = useState<DispositivoIoT | null>(null);
  const [webhook, setWebhook] = useState<string | null>(null);

  const editable = usuario?.rol === 'admin' || usuario?.rol === 'jefatura';
  const owner = usuario?.rol === 'admin';

  const load = async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try { setData(await resumenControl()); }
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
    if (result === 'error') toast(params.get('message') || 'No se pudo conectar eWeLink.', 'error');
    if (result) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/control-industrial`);
  }, []);
  useEffect(() => {
    if (!data) return;
    const seconds = Math.min(300, Math.max(5, data.modulo.tableroConfig?.refreshSeconds ?? 15));
    const timer = window.setInterval(() => load(true), seconds * 1000);
    return () => window.clearInterval(timer);
  }, [data?.modulo.tableroConfig?.refreshSeconds]);

  useEffect(() => {
    if (!selectedVariable) return;
    historialVariable(selectedVariable.variable.id).then((result) => setHistory(result.lecturas)).catch((error) => toast(error.message, 'error'));
  }, [selectedVariable]);

  const critical = data?.alarmas.filter((item) => item.severidad === 'critica' && item.estado !== 'resuelta').length ?? 0;
  const online = data?.dispositivos.filter((item) => item.ultimoContactoEn && Date.now() - new Date(item.ultimoContactoEn).getTime() < 10 * 60_000).length ?? 0;
  const lastEvent = useMemo(() => data?.dispositivos.map((item) => item.ultimoContactoEn).filter(Boolean).sort().slice(-1)[0], [data]);

  const acknowledge = async (alarm: AlarmaIoT) => {
    try { await reconocerAlarma(alarm.id); toast('Alarma reconocida y registrada en auditoría.', 'success'); await load(true); }
    catch (error) { toast(error instanceof Error ? error.message : 'No se pudo reconocer.', 'error'); }
  };

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><div className="text-center"><Snowflake className="mx-auto mb-3 animate-pulse text-cyan-500" size={36} /><p className="text-sm font-bold text-muted">Conectando tablero industrial…</p></div></div>;
  if (!data) return null;

  return <div className="space-y-5 pb-16">
    <header className="relative overflow-hidden border border-slate-800 bg-slate-950 p-5 text-white sm:p-7">
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-cyan-500/10 to-transparent" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[.22em] text-cyan-300"><Activity size={15} /> Supervisión en vivo</div><h1 className="font-display text-3xl font-black">{data.modulo.nombreServicio}</h1><p className="mt-1 text-sm text-slate-400">{data.modulo.tableroConfig?.subtitulo || usuario?.empresa?.nombre} · actualización cada {data.modulo.tableroConfig?.refreshSeconds ?? 15} segundos</p></div>
        <div className="grid grid-cols-2 gap-px border border-slate-700 bg-slate-700 sm:grid-cols-4">
          {[
            { value: `${online}/${data.dispositivos.length}`, label: 'En línea', icon: Signal, tone: 'text-emerald-300' },
            { value: critical, label: 'Críticas', icon: ShieldAlert, tone: critical ? 'text-red-300' : 'text-slate-300' },
            { value: data.integraciones.length, label: 'Conectores', icon: RadioTower, tone: 'text-cyan-300' },
            { value: ago(lastEvent), label: 'Último dato', icon: RefreshCw, tone: 'text-slate-300' },
          ].map(({ value, label, icon: Icon, tone }) => <div key={label} className="bg-slate-900 px-4 py-3"><Icon size={15} className={`mb-1 ${tone}`} /><strong className="block text-lg font-black">{value}</strong><span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span></div>)}
        </div>
      </div>
    </header>

    <nav className="flex gap-1 overflow-x-auto border-b border-line">
      {([
        ['vivo', 'Vista en vivo', Gauge], ['alarmas', `Alarmas${data.alarmas.length ? ` (${data.alarmas.length})` : ''}`, BellRing], ['conexiones', 'Conexiones', CloudCog], ['comandos', 'Operación', Zap],
      ] as Array<[Tab, string, React.ElementType]>).map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-black uppercase tracking-wide ${tab === id ? 'border-cyan-600 text-cyan-700 dark:text-cyan-300' : 'border-transparent text-faint'}`}><Icon size={16} />{label}</button>)}
      <button onClick={() => load(true)} className="ml-auto px-3 text-faint" aria-label="Actualizar"><RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} /></button>
    </nav>

    {tab === 'vivo' && <section className="space-y-4">
      {!data.dispositivos.length ? <Empty icon={RadioTower} title="Esperando el primer dispositivo" text="Configurá un conector y enviá la primera lectura. El equipo aparecerá automáticamente en este tablero." action={owner ? () => setTab('conexiones') : undefined} actionLabel="Configurar conexión" /> : <div className="grid gap-4 xl:grid-cols-2">
        {data.dispositivos.map((device) => <article key={device.id} className={`border bg-surface shadow-soft ${device.estado === 'critico' ? 'border-red-500' : 'border-line'}`}>
          <div className="flex items-start justify-between gap-3 border-b border-line p-4">
            <div className="flex min-w-0 items-center gap-3"><div className={`grid h-11 w-11 shrink-0 place-items-center border ${stateTone[device.estado] ?? stateTone.sin_datos}`}>{device.estado === 'desconectado' ? <WifiOff size={20} /> : <Snowflake size={20} />}</div><div className="min-w-0"><h2 className="truncate font-display text-lg font-black text-content">{device.nombre}</h2><p className="truncate text-xs text-faint">{device.ubicacion || device.modelo || device.identificadorExterno}</p></div></div>
            <div className="text-right"><span className={`inline-block px-2 py-1 text-[10px] font-black uppercase tracking-wider ${stateTone[device.estado] ?? stateTone.sin_datos}`}>{device.estado.replace('_', ' ')}</span><p className="mt-1 text-[10px] text-faint">{ago(device.ultimoContactoEn)}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
            {device.variables.length ? device.variables.slice(0, 6).map((variable) => <button key={variable.id} onClick={() => setSelectedVariable({ device, variable })} className="group bg-surface p-4 text-left hover:bg-subtle"><div className="mb-2 flex items-center justify-between text-faint"><VariableIcon variable={variable} /><ChevronRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" /></div><strong className="block truncate text-xl font-black text-content">{valueOf(variable)}</strong><span className="block truncate text-[10px] uppercase tracking-wider text-faint">{variable.nombre}</span></button>) : <div className="col-span-full bg-surface p-6 text-center text-xs text-faint">El dispositivo todavía no envió variables decodificadas.</div>}
          </div>
          <div className="flex items-center gap-4 p-3 text-[10px] uppercase tracking-wider text-faint">{data.modulo.tableroConfig?.mostrarBateria !== false && <span>Batería {device.bateria == null ? '—' : `${device.bateria}%`}</span>}{data.modulo.tableroConfig?.mostrarSenal !== false && <span>Señal {device.rssi == null ? '—' : `${device.rssi} dBm`}</span>}{editable && <button onClick={() => setSettingsFor(device)} className="ml-auto flex items-center gap-1 font-black text-muted"><Settings2 size={13} /> Configurar</button>}{editable && device.permiteControl && <button onClick={() => setCommandFor(device)} className="font-black text-cyan-700">Operar</button>}</div>
        </article>)}
      </div>}
    </section>}

    {tab === 'alarmas' && <section className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-black text-content">Alarmas abiertas</h2><p className="text-xs text-muted">Reconocer confirma que una persona tomó conocimiento; no cierra la condición.</p></div>{editable && <button onClick={() => setRuleOpen(true)} className="flex h-10 items-center gap-2 bg-cyan-700 px-4 text-xs font-black uppercase text-white"><Plus size={16} /> Nueva regla</button>}</div>
      {!data.alarmas.length ? <Empty icon={Check} title="Todo dentro de rango" text="No hay alarmas activas ni reconocidas." /> : <div className="space-y-2">{data.alarmas.map((alarm) => <div key={alarm.id} className={`flex flex-col gap-4 border-l-4 bg-surface p-4 shadow-soft sm:flex-row sm:items-center ${alarm.severidad === 'critica' ? 'border-l-red-500' : 'border-l-amber-500'}`}><div className="flex-1"><div className="flex items-center gap-2"><AlertTriangle size={17} className={alarm.severidad === 'critica' ? 'text-red-500' : 'text-amber-500'} /><h3 className="font-black text-content">{alarm.titulo}</h3><span className="text-[10px] font-black uppercase text-faint">{alarm.estado}</span></div><p className="mt-1 text-sm text-muted">{alarm.dispositivo.nombre} · {alarm.detalle}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-faint">Iniciada {new Date(alarm.iniciadaEn).toLocaleString('es-AR')}</p></div>{alarm.estado === 'activa' && editable && <button onClick={() => acknowledge(alarm)} className="h-10 border border-line-strong px-4 text-xs font-black uppercase text-content hover:border-cyan-600">Reconocer</button>}</div>)}</div>}
    </section>}

    {tab === 'conexiones' && <section className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-black text-content">Gateways e integraciones</h2><p className="text-xs text-muted">{data.integraciones.length} de {data.modulo.limiteGateways} contratadas.</p></div>{owner && <button onClick={() => setConnectorOpen(true)} className="flex h-10 items-center gap-2 bg-cyan-700 px-4 text-xs font-black uppercase text-white"><Plus size={16} /> Conectar</button>}</div>
      <div className="grid gap-4 lg:grid-cols-2">{data.integraciones.map((item) => <article key={item.id} className="border border-line bg-surface p-5 shadow-soft"><div className="flex items-start justify-between"><div className="flex gap-3"><div className="grid h-10 w-10 place-items-center border border-cyan-500/40 bg-cyan-500/10 text-cyan-600"><RadioTower size={19} /></div><div><h3 className="font-black text-content">{item.nombre}</h3><p className="text-xs text-faint">{providerLabel[item.proveedor]}</p></div></div><span className={`px-2 py-1 text-[10px] font-black uppercase ${item.estado === 'conectada' ? 'bg-emerald-500/10 text-emerald-600' : item.estado === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-subtle text-muted'}`}>{item.estado}</span></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="border border-line p-3"><span className="block text-faint">Último evento</span><strong className="text-content">{ago(item.ultimoEventoEn)}</strong></div><div className="border border-line p-3"><span className="block text-faint">Credenciales</span><strong className="text-content">{item.configuracion?.oauthAutorizado ? 'Cuenta autorizada' : item.credencialesConfiguradas ? 'App registrada' : item.webhookTokenHint ? `Token ···${item.webhookTokenHint}` : 'Pendientes'}</strong></div></div>{item.ultimoError && <p className="mt-3 border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-600">{item.ultimoError}</p>}{owner && <div className="mt-4 flex flex-wrap gap-2">{item.proveedor === 'sonoff_ewelink' && <><button onClick={() => setCredentialsFor(item)} className="flex items-center gap-2 border border-line px-3 py-2 text-xs font-bold"><KeyRound size={14} /> {item.configuracion?.oauthAutorizado ? 'Reconectar' : 'Conectar cuenta'}</button>{Boolean(item.configuracion?.oauthAutorizado) && <button onClick={async () => { try { const result = await sincronizarSonoff(item.id); toast(`${result.dispositivosImportados} equipos SONOFF sincronizados.`, 'success'); await load(true); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo sincronizar.', 'error'); } }} className="flex items-center gap-2 border border-line px-3 py-2 text-xs font-bold"><RefreshCw size={14} /> Sincronizar ahora</button>}</>}{item.proveedor !== 'sonoff_ewelink' && <button onClick={async () => { try { const result = await generarTokenWebhook(item.id); const full = `${(API_URL ?? '').replace(/\/api\/?$/, '')}${result.endpoint}`; setWebhook(full); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo crear el token.', 'error'); } }} className="flex items-center gap-2 border border-line px-3 py-2 text-xs font-bold"><RefreshCw size={14} /> {item.webhookTokenHint ? 'Rotar token' : 'Generar endpoint'}</button>}</div>}</article>)}</div>
      {!data.integraciones.length && <Empty icon={CloudCog} title="Sin conectores configurados" text="Podés integrar SONOFF/eWeLink, Milesight UG65 o cualquier equipo que envíe JSON por HTTPS." action={owner ? () => setConnectorOpen(true) : undefined} actionLabel="Agregar primer conector" />}
    </section>}

    {tab === 'comandos' && <section className="space-y-4"><div className="border border-amber-500/40 bg-amber-500/10 p-4"><div className="flex gap-3"><ShieldAlert className="shrink-0 text-amber-600" size={21} /><div><h2 className="font-black text-content">Control remoto gobernado</h2><p className="mt-1 text-xs leading-relaxed text-muted">Sólo se habilita por contrato, por dispositivo y con un adaptador certificado. Las protecciones físicas, el PLC y los interbloqueos locales conservan siempre la autoridad.</p></div></div></div>{!data.comandos.length ? <Empty icon={CircleOff} title="Sin maniobras solicitadas" text="Las operaciones y sus resultados aparecerán acá con trazabilidad completa." /> : <div className="space-y-2">{data.comandos.map((item) => <div key={item.id} className="border border-line bg-surface p-4"><div className="flex items-center justify-between"><strong className="text-content">{item.dispositivo.nombre} · {item.tipo}</strong><span className="text-[10px] font-black uppercase text-faint">{item.estado}</span></div><p className="mt-1 text-sm text-muted">{item.motivo}</p>{item.resultado && <p className="mt-2 text-xs text-faint">{item.resultado}</p>}</div>)}</div>}</section>}

    {selectedVariable && <DialogViewport className="z-50 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4" onEscape={() => setSelectedVariable(null)}><div className="max-h-[calc(100dvh-1rem)] w-full max-w-3xl overflow-y-auto border border-line bg-surface p-5 shadow-2xl" role="dialog" aria-modal="true"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-cyan-600">{selectedVariable.device.nombre}</p><h2 className="font-display text-2xl font-black text-content">{selectedVariable.variable.nombre}</h2><p className="text-sm text-muted">Actual: {valueOf(selectedVariable.variable)}</p></div><button onClick={() => setSelectedVariable(null)} className="text-faint">Cerrar</button></div><div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={history.map((item) => ({ hora: new Date(item.medidaEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), valor: item.valorNumero }))}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="hora" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} /><Tooltip /><Line type="monotone" dataKey="valor" stroke="#0891b2" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></div></DialogViewport>}
    {connectorOpen && <ConnectorModal onClose={() => setConnectorOpen(false)} onDone={async () => { setConnectorOpen(false); await load(true); }} toast={toast} />}
    {credentialsFor && <CredentialsModal integration={credentialsFor} onClose={() => setCredentialsFor(null)} onDone={async () => { setCredentialsFor(null); await load(true); }} toast={toast} />}
    {ruleOpen && <RuleModal devices={data.dispositivos} onClose={() => setRuleOpen(false)} onDone={async () => { setRuleOpen(false); await load(true); }} toast={toast} />}
    {commandFor && <CommandModal device={commandFor} onClose={() => setCommandFor(null)} onDone={async () => { setCommandFor(null); await load(true); }} toast={toast} />}
    {settingsFor && <DeviceModal device={settingsFor} remoteContract={data.modulo.controlRemotoHabilitado} onClose={() => setSettingsFor(null)} onDone={async () => { setSettingsFor(null); await load(true); }} toast={toast} />}
    {webhook && <DialogViewport className="z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onEscape={() => setWebhook(null)}><div className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto border border-line bg-surface p-5 shadow-2xl" role="dialog" aria-modal="true"><h2 className="font-display text-xl font-black text-content">Endpoint de ingesta creado</h2><p className="mt-2 text-sm text-muted">Copialo ahora en el UG65. Al rotarlo, el anterior deja de funcionar.</p><code className="mt-4 block break-all border border-line bg-subtle p-3 text-xs text-content">{webhook}</code><div className="mt-4 flex gap-2"><button onClick={() => navigator.clipboard.writeText(webhook).then(() => toast('Endpoint copiado.', 'success'))} className="h-11 flex-1 bg-cyan-700 text-xs font-black uppercase text-white">Copiar</button><button onClick={() => setWebhook(null)} className="h-11 border border-line px-5 text-xs font-black uppercase">Listo</button></div></div></DialogViewport>}
  </div>;
};

const Empty = ({ icon: Icon, title, text, action, actionLabel }: { icon: React.ElementType; title: string; text: string; action?: () => void; actionLabel?: string }) => <div className="border border-dashed border-line-strong bg-subtle p-10 text-center"><Icon size={32} className="mx-auto mb-3 text-faint" /><h3 className="font-display text-lg font-black text-content">{title}</h3><p className="mx-auto mt-1 max-w-lg text-sm text-muted">{text}</p>{action && <button onClick={action} className="mt-4 bg-slate-900 px-4 py-2.5 text-xs font-black uppercase text-white">{actionLabel}</button>}</div>;
const VariableIcon = ({ variable }: { variable: VariableIoT }) => variable.clave.includes('temp') ? <Thermometer size={17} /> : variable.clave.includes('door') || variable.clave.includes('puerta') ? <DoorOpen size={17} /> : variable.clave.includes('pres') ? <Gauge size={17} /> : <LineChartIcon size={17} />;

const ModalShell = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => <DialogViewport className="z-50 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4" onEscape={onClose}><div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden border border-line bg-surface shadow-2xl sm:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true"><div className="flex shrink-0 items-center justify-between bg-slate-950 px-5 py-4 text-white"><h2 className="font-display text-lg font-black">{title}</h2><button onClick={onClose} className="text-xs uppercase text-slate-400">Cerrar</button></div><div className="overflow-y-auto p-5">{children}</div></div></DialogViewport>;
const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => <label className="block text-xs font-black uppercase tracking-wider text-muted">{label}{children}{hint && <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-faint">{hint}</span>}</label>;
const input = 'mt-1 h-11 w-full border border-line bg-surface px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-cyan-600';

function ConnectorModal({ onClose, onDone, toast }: { onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const [name, setName] = useState(''); const [provider, setProvider] = useState<ProveedorIoT>('milesight_ug65'); const [saving, setSaving] = useState(false);
  return <ModalShell title="Nueva conexión industrial" onClose={onClose}><form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { await crearIntegracion({ nombre: name, proveedor: provider }); toast('Conector creado. Completá ahora su autenticación.', 'success'); onDone(); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo crear.', 'error'); } finally { setSaving(false); } }}><Field label="Nombre"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Gateway cámaras planta norte" className={input} /></Field><Field label="Tecnología"><select value={provider} onChange={(e) => setProvider(e.target.value as ProveedorIoT)} className={input}>{Object.entries(providerLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><div className="border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs text-muted">{provider === 'sonoff_ewelink' ? 'Requiere un proyecto eWeLink Developer y autorización de la cuenta que posee los TH Elite.' : 'ActivaQR generará un endpoint HTTPS único. El gateway debe enviar JSON decodificado con devEUI y variables.'}</div><button disabled={saving} className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white disabled:opacity-50">{saving ? 'Creando…' : 'Crear conector'}</button></form></ModalShell>;
}

function CredentialsModal({ integration, onClose, onDone, toast }: { integration: IntegracionIoT; onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const [form, setForm] = useState({ appId: '', appSecret: '' }); const [pollingSeconds, setPollingSeconds] = useState(Number(integration.configuracion?.pollingSeconds) || 300); const [saving, setSaving] = useState(false);
  return <ModalShell title="Conectar SONOFF / eWeLink" onClose={onClose}><form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { const result = await autorizarSonoff(integration.id, { ...form, pollingSeconds }); window.location.assign(result.authUrl); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo iniciar la autorización.', 'error'); setSaving(false); } }}><p className="text-sm text-muted">ActivaQR guardará estas claves cifradas y te llevará a eWeLink para autorizar la cuenta. El Access Token y su renovación se gestionan automáticamente.</p><Field label="App ID"><input required value={form.appId} onChange={(e) => setForm({ ...form, appId: e.target.value })} className={input} autoComplete="off" /></Field><Field label="App Secret"><input required type="password" value={form.appSecret} onChange={(e) => setForm({ ...form, appSecret: e.target.value })} className={input} autoComplete="new-password" /></Field><Field label="Actualizar"><select value={pollingSeconds} onChange={(e) => setPollingSeconds(Number(e.target.value))} className={input}><option value={60}>Cada minuto</option><option value={300}>Cada 5 minutos</option><option value={900}>Cada 15 minutos</option><option value={3600}>Cada hora</option></select></Field><div className="border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs text-muted"><strong className="block text-content">URL para registrar en eWeLink</strong><code className="mt-1 block break-all">https://api.activaqr.net/api/iot/ewelink/oauth/callback</code></div><p className="border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-muted">Un minuto consume más cuota eWeLink. Para varios clientes conviene APPID empresarial; Milesight por HTTPS no usa esta cuota.</p><button disabled={saving} className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white disabled:opacity-50">{saving ? 'Abriendo eWeLink…' : 'Autorizar con eWeLink'}</button></form></ModalShell>;
}

function RuleModal({ devices, onClose, onDone, toast }: { devices: DispositivoIoT[]; onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const variables = devices.flatMap((device) => device.variables.map((variable) => ({ device, variable }))); const [form, setForm] = useState({ variableId: variables[0]?.variable.id ?? '', nombre: '', operador: 'gt', umbral: '', demoraSegundos: 300, severidad: 'advertencia', notificarPush: true });
  return <ModalShell title="Nueva regla de alarma" onClose={onClose}><form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); try { await crearRegla(form); toast('Regla activa desde la próxima lectura.', 'success'); onDone(); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo crear.', 'error'); } }}><Field label="Variable"><select required value={form.variableId} onChange={(e) => setForm({ ...form, variableId: e.target.value })} className={input}>{variables.map(({ device, variable }) => <option key={variable.id} value={variable.id}>{device.nombre} · {variable.nombre}</option>)}</select></Field><Field label="Nombre de la alarma"><input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Cámara supera −18 °C" className={input} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Condición"><select value={form.operador} onChange={(e) => setForm({ ...form, operador: e.target.value })} className={input}><option value="gt">Mayor que</option><option value="gte">Mayor o igual</option><option value="lt">Menor que</option><option value="lte">Menor o igual</option><option value="eq">Igual a</option><option value="neq">Distinto de</option></select></Field><Field label="Umbral"><input required value={form.umbral} onChange={(e) => setForm({ ...form, umbral: e.target.value })} className={input} /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Demora (segundos)" hint="Debe sostenerse todo este tiempo"><input type="number" min="0" value={form.demoraSegundos} onChange={(e) => setForm({ ...form, demoraSegundos: Number(e.target.value) })} className={input} /></Field><Field label="Severidad"><select value={form.severidad} onChange={(e) => setForm({ ...form, severidad: e.target.value })} className={input}><option value="informacion">Información</option><option value="advertencia">Advertencia</option><option value="critica">Crítica</option></select></Field></div><label className="flex gap-2 text-sm text-muted"><input type="checkbox" checked={form.notificarPush} onChange={(e) => setForm({ ...form, notificarPush: e.target.checked })} /> Notificar por push a responsables</label><button className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white">Activar regla</button></form></ModalShell>;
}

function CommandModal({ device, onClose, onDone, toast }: { device: DispositivoIoT; onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const [type, setType] = useState('setpoint'); const [value, setValue] = useState(''); const [reason, setReason] = useState('');
  return <ModalShell title={`Operar ${device.nombre}`} onClose={onClose}><form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); try { await solicitarComando({ dispositivoId: device.id, tipo: type, payload: { valor: type === 'setpoint' ? Number(value) : value }, motivo: reason }); toast('Solicitud registrada. Se ejecutará sólo mediante un adaptador certificado.', 'success'); onDone(); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo registrar.', 'error'); } }}><div className="border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-muted">Esta acción no puentea protecciones. ActivaQR registra la intención y el adaptador local debe validar límites e interbloqueos.</div><Field label="Acción"><select value={type} onChange={(e) => setType(e.target.value)} className={input}><option value="setpoint">Cambiar setpoint</option><option value="rele">Cambiar relé</option><option value="salida">Accionar salida autorizada</option></select></Field><Field label="Valor"><input required value={value} onChange={(e) => setValue(e.target.value)} className={input} /></Field><Field label="Motivo"><textarea required minLength={5} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={`${input} h-auto py-3`} /></Field><button className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white">Registrar solicitud</button></form></ModalShell>;
}

function DeviceModal({ device, remoteContract, onClose, onDone, toast }: { device: DispositivoIoT; remoteContract: boolean; onClose: () => void; onDone: () => void; toast: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const [form, setForm] = useState({ nombre: device.nombre, ubicacion: device.ubicacion ?? '', habilitado: device.habilitado, permiteControl: device.permiteControl });
  return <ModalShell title="Configurar dispositivo" onClose={onClose}><form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); try { await actualizarDispositivo(device.id, form); toast('Dispositivo actualizado.', 'success'); onDone(); } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo actualizar.', 'error'); } }}><Field label="Nombre visible"><input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={input} /></Field><Field label="Ubicación"><input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} className={input} placeholder="Ej: Cámara 2 · Planta norte" /></Field><label className="flex items-start gap-3 border border-line p-3 text-sm text-muted"><input type="checkbox" checked={form.habilitado} onChange={(e) => setForm({ ...form, habilitado: e.target.checked })} className="mt-1" /><span><strong className="block text-content">Recibir telemetría</strong>Si se pausa, ActivaQR rechaza nuevas lecturas de este equipo.</span></label><label className={`flex items-start gap-3 border p-3 text-sm ${remoteContract ? 'border-amber-500/40 bg-amber-500/5 text-muted' : 'border-line bg-subtle text-faint'}`}><input type="checkbox" disabled={!remoteContract} checked={form.permiteControl} onChange={(e) => setForm({ ...form, permiteControl: e.target.checked })} className="mt-1" /><span><strong className="block text-content">Permitir solicitudes de operación</strong>{remoteContract ? 'Habilita este equipo dentro del contrato de control remoto.' : 'El contrato del tenant está configurado sólo para monitoreo.'}</span></label><button className="h-12 w-full bg-cyan-700 text-xs font-black uppercase text-white">Guardar dispositivo</button></form></ModalShell>;
}
