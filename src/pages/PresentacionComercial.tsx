import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Cloud,
  Database,
  Expand,
  Factory,
  FileCheck2,
  Gauge,
  HardHat,
  HelpCircle,
  History,
  KeyRound,
  Layers3,
  LineChart,
  LockKeyhole,
  Minimize2,
  Monitor,
  Network,
  PackageCheck,
  PanelRightOpen,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Square,
  Target,
  Users,
  Volume2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { CONFIGURACION_NARRACION, NARRACIONES_PRESENTACION } from '../data/presentacionNarraciones';

type Slide = {
  section: string;
  title: string;
  eyebrow?: string;
  notes: string[];
  render: () => React.ReactNode;
};

type EstadoNarracion = 'idle' | 'preparing' | 'speaking' | 'paused' | 'between' | 'finished' | 'unsupported' | 'error';

type OpcionVoz = {
  voz?: SpeechSynthesisVoice;
  idioma?: string;
  etiqueta: string;
};

const surface = 'border border-line bg-surface/80 backdrop-blur-sm';
const subtle = 'border border-line bg-subtle/80';

function puntuarVoz(voz: SpeechSynthesisVoice) {
  const idioma = voz.lang.toLowerCase();
  const nombre = voz.name.toLowerCase();
  let puntaje = 0;
  if (idioma === 'es-ar') puntaje += 120;
  else if (idioma === 'es-uy') puntaje += 100;
  else if (idioma === 'es-419') puntaje += 70;
  else if (idioma.startsWith('es')) puntaje += 40;
  if (/argentin|rioplat|elena/.test(nombre)) puntaje += 40;
  if (voz.localService) puntaje += 80;
  if (voz.default) puntaje += 8;
  return puntaje;
}

function crearOpcionesVoz(voces: SpeechSynthesisVoice[]): OpcionVoz[] {
  const vocesEspanol = [...voces]
    .filter((voz) => voz.lang.toLowerCase().startsWith('es'))
    .sort((a, b) => puntuarVoz(b) - puntuarVoz(a));
  const opciones: OpcionVoz[] = [];
  const vocesAgregadas = new Set<string>();

  const agregarVoz = (voz: SpeechSynthesisVoice | undefined) => {
    if (!voz) return;
    const clave = `${voz.voiceURI}|${voz.name}|${voz.lang}`;
    if (vocesAgregadas.has(clave)) return;
    vocesAgregadas.add(clave);
    opciones.push({ voz, idioma: voz.lang, etiqueta: `Voz sintética ${voz.name} · ${voz.lang}` });
  };

  agregarVoz(vocesEspanol.find((voz) => voz.localService && /^(es-ar|es-uy)$/i.test(voz.lang)));
  agregarVoz(vocesEspanol.find((voz) => voz.localService));
  agregarVoz(vocesEspanol.find((voz) => /^(es-ar|es-uy)$/i.test(voz.lang)));
  vocesEspanol.slice(0, 4).forEach(agregarVoz);

  const idiomaDisponible = vocesEspanol[0]?.lang;
  if (idiomaDisponible) opciones.push({ idioma: idiomaDisponible, etiqueta: `Voz automática del navegador · ${idiomaDisponible}` });
  opciones.push({ idioma: 'es-ES', etiqueta: 'Voz automática del navegador · español' });
  opciones.push({ etiqueta: 'Voz predeterminada del dispositivo' });
  return opciones;
}

function claveOpcionVoz(opcion: OpcionVoz) {
  return opcion.voz
    ? `${opcion.voz.voiceURI}|${opcion.voz.name}|${opcion.voz.lang}`
    : `auto|${opcion.idioma ?? 'default'}`;
}

function dividirNarracion(texto: string) {
  return texto.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((parte) => parte.trim()).filter(Boolean) ?? [texto];
}

function explicarErrorVoz(error: string) {
  const mensajes: Record<string, string> = {
    'not-allowed': 'El navegador bloqueó el inicio del audio',
    'audio-busy': 'El dispositivo de audio está ocupado',
    'audio-hardware': 'El navegador no encontró una salida de audio',
    network: 'La voz elegida necesitaba conexión y no pudo descargar el audio',
    'synthesis-unavailable': 'El dispositivo no tiene un motor de voz disponible',
    'synthesis-failed': 'El motor de voz del dispositivo produjo un error',
    'language-unavailable': 'El idioma solicitado no está instalado en el dispositivo',
    'voice-unavailable': 'La voz seleccionada dejó de estar disponible',
    'text-too-long': 'El motor rechazó el largo del texto',
    'invalid-argument': 'El motor rechazó la configuración de voz',
  };
  return mensajes[error] ?? 'La voz del dispositivo no pudo completar esta lámina';
}

function LogoMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-md bg-brand-600 text-white shadow-glow">
        <QrCode size={25} />
      </div>
      <div className="font-display text-xl font-black tracking-tight text-content">
        ACTIVA <span className="text-brand-600">QR</span>
      </div>
    </div>
  );
}

function Metric({ value, label, detail, accent = 'text-content' }: { value: string; label: string; detail: string; accent?: string }) {
  return (
    <div className="min-w-0 border-l-2 border-brand-600 pl-4">
      <p className={`font-display text-3xl font-black sm:text-5xl ${accent}`}>{value}</p>
      <p className="mt-1 text-sm font-bold text-content">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>
    </div>
  );
}

function Flow({ items }: { items: Array<{ icon: React.ReactNode; title: string; text: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr]">
      {items.map((item, index) => (
        <React.Fragment key={item.title}>
          <div className={`${surface} relative p-4`}>
            <div className="mb-5 text-brand-600">{item.icon}</div>
            <p className="text-sm font-black text-content">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{item.text}</p>
          </div>
          {index < items.length - 1 && (
            <div className="hidden items-center justify-center text-brand-600 md:flex" aria-hidden="true">
              <ArrowRight size={20} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function HorizontalBars({ rows, max }: { rows: Array<{ label: string; value: number; detail?: string }>; max: number }) {
  return (
    <div className="space-y-5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-end justify-between gap-4">
            <span className="text-sm font-bold text-content">{row.label}</span>
            <span className="font-mono text-sm font-black text-content">{row.value}{row.detail ?? ''}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScreenFrame({ src, alt, fallback }: { src: string; alt: string; fallback: React.ReactNode }) {
  const [error, setError] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-line-strong bg-slate-950 shadow-lift">
      <div className="flex h-9 items-center gap-1.5 border-b border-slate-700 px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
        <span className="ml-3 truncate font-mono text-[10px] text-slate-400">activaqr.net/app/</span>
      </div>
      <div className="aspect-[16/9] overflow-hidden bg-canvas">
        {error ? fallback : <img src={src} alt={alt} className="h-full w-full object-cover object-top" onError={() => setError(true)} />}
      </div>
    </div>
  );
}

function ScreenFallback({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full bg-canvas text-left">
      <div className="hidden w-36 border-r border-line bg-surface p-4 sm:block">
        <div className="mb-8 h-5 w-20 rounded bg-brand-600/30" />
        {[1, 2, 3, 4, 5].map((n) => <div key={n} className="mb-3 h-3 rounded bg-line" style={{ width: `${82 - n * 4}%` }} />)}
      </div>
      <div className="flex-1 p-4 sm:p-6">
        <h3 className="text-lg font-black text-content sm:text-xl">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function AppScreenshot({ name, title, children }: { name: string; title: string; children: React.ReactNode }) {
  return (
    <ScreenFrame
      src={`${import.meta.env.BASE_URL}presentacion/${name}.jpg`}
      alt={`Captura real de ${title} en ActivaQR`}
      fallback={<ScreenFallback title={title}>{children}</ScreenFallback>}
    />
  );
}

function ProductFlowFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line-strong bg-slate-950 shadow-lift">
      <div className="flex h-9 items-center gap-1.5 border-b border-slate-700 px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
        <span className="ml-3 truncate font-mono text-[10px] text-slate-400">Flujo funcional de ActivaQR</span>
      </div>
      <div className="flex aspect-[16/9] items-center bg-canvas p-4 sm:p-8">
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

function ScreenshotCaption({ points }: { points: string[] }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {points.map((point) => (
        <div key={point} className="flex gap-2 text-xs leading-relaxed text-muted">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand-600" />
          <span>{point}</span>
        </div>
      ))}
    </div>
  );
}

function QuestionAnswer({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <p className="flex gap-2 text-sm font-black leading-snug text-content">
        <HelpCircle size={17} className="mt-0.5 shrink-0 text-brand-600" />
        {question}
      </p>
      <p className="mt-2 pl-6 text-sm leading-relaxed text-muted">{answer}</p>
    </div>
  );
}

function ComparisonTable() {
  const rows = [
    ['Función central', 'Transacciones del negocio', 'Control del proceso', 'Gestión del activo en campo'],
    ['Dato típico', 'Compras, stock, costos', 'Variables en tiempo real', 'Lecturas, fotos, tareas, evidencia'],
    ['Usuario principal', 'Administración', 'Operación / automatización', 'Técnicos, mantenimiento y dirección'],
    ['Actúa ante un desvío', 'Registra costo o solicitud', 'Genera señal o alarma', 'Asigna, autoriza, ejecuta y audita'],
    ['Conectividad', 'Generalmente centralizada', 'Red industrial', 'Online y cola offline'],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs sm:text-sm">
        <thead>
          <tr className="border-b-2 border-line-strong">
            <th className="py-3 pr-4 text-muted">Comparación</th>
            <th className="px-4 py-3 text-content">ERP</th>
            <th className="px-4 py-3 text-content">SCADA</th>
            <th className="px-4 py-3 text-brand-600">ActivaQR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-b border-line">
              <th className="py-3 pr-4 font-bold text-muted">{row[0]}</th>
              <td className="px-4 py-3 text-muted">{row[1]}</td>
              <td className="px-4 py-3 text-muted">{row[2]}</td>
              <td className="bg-brand-600/5 px-4 py-3 font-semibold text-content">{row[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoiSimulator() {
  const [assets, setAssets] = useState(120);
  const [hours, setHours] = useState(10);
  const [hourCost, setHourCost] = useState(450);
  const monthlyExposure = hours * hourCost;
  const recoverable = monthlyExposure * 0.25;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <label className="block text-sm font-bold text-content">
          Activos monitoreados: <span className="font-mono text-brand-600">{assets}</span>
          <input className="mt-2 w-full accent-brand-600" type="range" min="20" max="500" step="10" value={assets} onChange={(e) => setAssets(Number(e.target.value))} />
        </label>
        <label className="block text-sm font-bold text-content">
          Horas de parada evitables al mes: <span className="font-mono text-brand-600">{hours}</span>
          <input className="mt-2 w-full accent-brand-600" type="range" min="1" max="100" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
        </label>
        <label className="block text-sm font-bold text-content">
          Costo estimado por hora (USD): <span className="font-mono text-brand-600">{hourCost}</span>
          <input className="mt-2 w-full accent-brand-600" type="range" min="50" max="5000" step="50" value={hourCost} onChange={(e) => setHourCost(Number(e.target.value))} />
        </label>
      </div>
      <div className={`${surface} flex flex-col justify-center p-6`}>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Escenario ilustrativo</p>
        <p className="mt-3 font-display text-4xl font-black text-content sm:text-6xl">USD {monthlyExposure.toLocaleString('es-AR')}</p>
        <p className="mt-2 text-sm text-muted">exposición mensual por paradas evitables</p>
        <div className="my-5 h-px bg-line" />
        <p className="text-2xl font-black text-brand-600">USD {recoverable.toLocaleString('es-AR')}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">Valor potencial si la trazabilidad ayuda a evitar sólo el 25% del escenario. No constituye una promesa de ahorro.</p>
        <p className="mt-4 font-mono text-[11px] text-faint">Base de conversación: {assets} activos</p>
      </div>
    </div>
  );
}

const slideImageFallback = (
  <div className="grid grid-cols-2 gap-3">
    {[82, 63, 94, 71].map((n, i) => (
      <div key={i} className={`${subtle} p-3`}>
        <div className="h-2 w-16 rounded bg-line-strong" />
        <div className="mt-3 text-xl font-black text-content">{n}{i === 0 ? '%' : ''}</div>
      </div>
    ))}
  </div>
);

export const PresentacionComercial: React.FC = () => {
  const presentationRef = useRef<HTMLDivElement>(null);
  const narracionAutomaticaRef = useRef(false);
  const narracionTokenRef = useRef(0);
  const narracionTimerRef = useRef<number | null>(null);
  const indiceNarracionRef = useRef<number | null>(null);
  const opcionVozPreferidaRef = useRef<OpcionVoz | null>(null);
  const [current, setCurrent] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [narracionAutomatica, setNarracionAutomatica] = useState(false);
  const [estadoNarracion, setEstadoNarracion] = useState<EstadoNarracion>('idle');
  const [nombreVoz, setNombreVoz] = useState('Voz sintética del dispositivo · español rioplatense');
  const [errorNarracion, setErrorNarracion] = useState('');

  const slides = useMemo<Slide[]>(() => [
    {
      section: 'Apertura',
      title: 'Cada activo puede contar su historia antes de fallar',
      eyebrow: 'Presentación comercial',
      notes: [
        'Abrí con una pregunta: ¿cuánto tarda hoy la empresa en saber qué pasó realmente con un equipo?',
        'No presentes ActivaQR como reemplazo del ERP o del SCADA. Presentala como la capa que convierte el dato técnico en acción demostrable.',
      ],
      render: () => (
        <div className="grid min-h-[450px] items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <LogoMark />
            <h2 className="mt-10 max-w-4xl font-display text-4xl font-black leading-[1.04] text-content sm:text-6xl lg:text-7xl">
              Cada activo puede contar su historia <span className="text-brand-600">antes de fallar.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-xl">
              Trazabilidad operativa, alertas y evidencia desde un QR, sin reemplazar los sistemas que la empresa ya usa.
            </p>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-[12%] rounded-full border border-brand-600/30" />
            <div className="absolute inset-[26%] rounded-full border border-brand-600/50" />
            <div className="absolute inset-[39%] grid place-items-center rounded-xl bg-brand-600 text-white shadow-glow-lg">
              <QrCode size={74} />
            </div>
            {[
              ['top-3 left-1/2 -translate-x-1/2', <Activity size={22} />],
              ['right-2 top-1/2 -translate-y-1/2', <Wrench size={22} />],
              ['bottom-3 left-1/2 -translate-x-1/2', <FileCheck2 size={22} />],
              ['left-2 top-1/2 -translate-y-1/2', <LineChart size={22} />],
            ].map(([pos, icon], i) => <div key={i} className={`absolute ${pos} grid h-14 w-14 place-items-center rounded-full border border-line bg-surface text-brand-600 shadow-soft`}>{icon}</div>)}
          </div>
        </div>
      ),
    },
    {
      section: 'Problema',
      title: 'El problema no es la falta de datos: es que llegan separados',
      eyebrow: 'La brecha operativa',
      notes: [
        'Pedí que describan el último incidente: quién lo detectó, dónde quedó anotado y cómo comprobaron el cierre.',
        'Escuchá primero. Después conectá cada dolor con una parte concreta del flujo de ActivaQR.',
      ],
      render: () => (
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-lg leading-relaxed text-muted sm:text-2xl">En muchas plantas, la información existe, pero vive en lugares distintos.</p>
            <div className="mt-8 space-y-4">
              {[
                ['Planillas y cuadernos', 'Registran una parte, pero no conectan el historial completo.'],
                ['Mensajes y memoria', 'Aceleran la urgencia, pero diluyen responsables y evidencia.'],
                ['ERP y SCADA', 'Resuelven funciones críticas, aunque no siempre acompañan el trabajo de campo.'],
              ].map(([title, text]) => (
                <div key={title} className="border-l-2 border-line-strong pl-4">
                  <p className="font-black text-content">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="grid gap-3 sm:hidden">
              <div className="bg-brand-600 p-5 text-center text-white shadow-glow-lg">
                <Network className="mx-auto" size={28} />
                <p className="mt-2 text-sm font-black">Historia del activo</p>
              </div>
              {[
                ['SCADA', 'Señal'], ['ERP', 'Transacción'], ['Campo', 'Evidencia'], ['Mantenimiento', 'Acción'],
              ].map(([title, sub]) => <div key={title} className={`${surface} p-4`}><p className="font-black text-content">{title}</p><p className="text-sm text-muted">{sub}</p></div>)}
            </div>
            <div className="relative hidden min-h-[380px] sm:block">
              <div className="absolute left-1/2 top-1/2 z-10 grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-600 text-center text-white shadow-glow-lg">
                <div><Network className="mx-auto" size={28} /><p className="mt-2 text-sm font-black">Historia del activo</p></div>
              </div>
              {[
                ['left-0 top-4', 'SCADA', 'Señal'], ['right-0 top-4', 'ERP', 'Transacción'],
                ['left-0 bottom-4', 'Campo', 'Evidencia'], ['right-0 bottom-4', 'Mantenimiento', 'Acción'],
              ].map(([pos, title, sub]) => (
                <div key={title} className={`absolute ${pos} ${surface} w-[42%] p-5`}>
                  <p className="font-black text-content">{title}</p><p className="text-sm text-muted">{sub}</p>
                </div>
              ))}
              <svg className="absolute inset-0 h-full w-full text-brand-600/35" viewBox="0 0 600 380" preserveAspectRatio="none" aria-hidden="true">
                <path d="M130 70 C250 70 230 150 300 190" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M470 70 C350 70 370 150 300 190" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M130 310 C250 310 230 230 300 190" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M470 310 C350 310 370 230 300 190" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      ),
    },
    {
      section: 'Problema',
      title: 'Lo que no se documenta también cuesta',
      eyebrow: 'Escenario de referencia',
      notes: [
        'Aclaración obligatoria: estas cifras son un ejemplo para dimensionar el problema, no resultados prometidos.',
        'Reemplazá el valor de una hora parada por el dato del prospecto cuando sea posible.',
      ],
      render: () => (
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="grid gap-8 sm:grid-cols-2">
            <Metric value="10 h" label="Paradas evitables" detail="Supuesto mensual para iniciar la conversación." />
            <Metric value="USD 450" label="Costo por hora" detail="Valor editable según el proceso del prospecto." />
            <Metric value="4" label="Fuentes de información" detail="Planilla, chat, sistema central y memoria del equipo." />
            <Metric value="1" label="Historia verificable" detail="El objetivo: unir señales, decisiones y evidencia." accent="text-brand-600" />
          </div>
          <div className={`${surface} p-6 sm:p-8`}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Costo mensual ilustrativo</p>
            <p className="mt-4 font-display text-5xl font-black text-content sm:text-7xl">USD 4.500</p>
            <div className="my-6 h-px bg-line" />
            <p className="text-base leading-relaxed text-muted">La oportunidad no depende de evitar todas las fallas. Empieza con detectar antes, asignar rápido y demostrar qué se hizo.</p>
          </div>
        </div>
      ),
    },
    {
      section: 'Propuesta',
      title: 'ActivaQR complementa lo que la empresa ya tiene',
      eyebrow: 'Posicionamiento',
      notes: [
        'Esta es la respuesta corta cuando preguntan si reemplaza el ERP: no. Lo complementa con trazabilidad del activo en campo.',
        'Si hay SCADA, explicá que ActivaQR puede recibir el dato y conservar el contexto humano: inspección, foto, autorización y cierre.',
      ],
      render: () => (
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            { icon: <Database size={32} />, title: 'ERP', line: 'Ordena el negocio', text: 'Compras, costos, inventario, proveedores y transacciones.' },
            { icon: <Monitor size={32} />, title: 'SCADA / PLC', line: 'Observa el proceso', text: 'Variables, estados, alarmas y control industrial en tiempo real.' },
            { icon: <QrCode size={32} />, title: 'ActivaQR', line: 'Conecta el dato con la acción', text: 'Activo, técnico, evidencia, alerta, autorización, orden y auditoría.' },
          ].map((item, index) => (
            <div key={item.title} className={`${index === 2 ? 'border-brand-600 bg-brand-600/5' : 'border-line bg-surface/70'} border p-6 sm:p-8`}>
              <div className={index === 2 ? 'text-brand-600' : 'text-muted'}>{item.icon}</div>
              <h3 className="mt-8 text-2xl font-black text-content">{item.title}</h3>
              <p className="mt-2 text-sm font-bold text-content">{item.line}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      section: 'Propuesta',
      title: 'Un QR convierte una ronda en una decisión trazable',
      eyebrow: 'Flujo demostrable',
      notes: [
        'Mostrá el recorrido de izquierda a derecha y usá un caso concreto: temperatura fuera de rango en un compresor.',
        'El valor está en la continuidad: cada paso queda unido al mismo activo y al mismo historial.',
      ],
      render: () => (
        <Flow items={[
          { icon: <ScanLine size={28} />, title: '1. Identificar', text: 'El técnico escanea el QR del equipo correcto.' },
          { icon: <Gauge size={28} />, title: '2. Medir', text: 'Carga parámetros, observaciones, foto y ubicación.' },
          { icon: <AlertTriangle size={28} />, title: '3. Detectar', text: 'El desvío genera contexto y prioridad operativa.' },
          { icon: <ClipboardCheck size={28} />, title: '4. Autorizar', text: 'La empresa decide y habilita el trabajo correctivo.' },
          { icon: <FileCheck2 size={28} />, title: '5. Demostrar', text: 'El cierre conserva responsable, evidencia y fecha.' },
        ]} />
      ),
    },
    {
      section: 'Propuesta',
      title: 'Cada rol ve la misma realidad con el nivel de detalle que necesita',
      eyebrow: 'Valor por usuario',
      notes: [
        'No vendas una pantalla igual para todos. Vendé una fuente común de verdad con responsabilidades diferenciadas.',
        'Preguntá quién necesita actuar, quién autoriza y quién sólo necesita indicadores.',
      ],
      render: () => (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: <HardHat size={28} />, role: 'Técnico', need: 'Saber qué medir y registrar sin perder tiempo.', result: 'QR, formularios adaptados, fotos y cola offline.' },
            { icon: <Wrench size={28} />, role: 'Mantenimiento', need: 'Priorizar y dar seguimiento a tareas reales.', result: 'Alertas, preventivos, correctivos e historial.' },
            { icon: <Building2 size={28} />, role: 'Jefatura', need: 'Entender riesgo, cumplimiento y responsables.', result: 'Indicadores, auditoría y evidencia verificable.' },
            { icon: <CircleDollarSign size={28} />, role: 'Dirección', need: 'Decidir dónde invertir y qué riesgo aceptar.', result: 'Tendencias, costos y trazabilidad para decidir.' },
          ].map((item) => (
            <div key={item.role} className={`${surface} p-5`}>
              <div className="text-brand-600">{item.icon}</div>
              <h3 className="mt-5 text-xl font-black text-content">{item.role}</h3>
              <p className="mt-4 text-xs font-black uppercase tracking-wider text-muted">Necesita</p>
              <p className="mt-1 text-sm leading-relaxed text-content">{item.need}</p>
              <p className="mt-4 text-xs font-black uppercase tracking-wider text-muted">Recibe</p>
              <p className="mt-1 text-sm leading-relaxed text-content">{item.result}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      section: 'Demostración',
      title: 'El dashboard muestra dónde actuar primero',
      eyebrow: 'Pantalla real · cuenta demo',
      notes: [
        'No leas cada número. Señalá la jerarquía: críticos, pendientes y tendencia.',
        'Abrí luego un activo en riesgo para demostrar que el indicador lleva a evidencia, no a otra planilla.',
      ],
      render: () => (
        <div>
          <AppScreenshot name="dashboard" title="Dashboard operativo">{slideImageFallback}</AppScreenshot>
          <ScreenshotCaption points={['Resumen de situación en segundos.', 'Prioridades visibles por estado y vencimiento.', 'Entrada directa al activo que necesita atención.']} />
        </div>
      ),
    },
    {
      section: 'Demostración',
      title: 'Cada activo conserva contexto técnico, ubicación e historial',
      eyebrow: 'Pantalla real · ficha del activo',
      notes: [
        'Elegí un equipo reconocible por el prospecto: cámara, compresor, bomba o motor.',
        'La pregunta clave es: ¿podría alguien nuevo entender qué pasó sin llamar al técnico anterior?',
      ],
      render: () => (
        <div>
          <AppScreenshot name="activo" title="Ficha del activo">
            <div className="grid gap-3 sm:grid-cols-3"><Metric value="CMP-001" label="Compresor principal" detail="Sector frío" /><Metric value="98 °C" label="Última lectura" detail="Estado urgente" /><Metric value="12" label="Registros" detail="Historial unificado" /></div>
          </AppScreenshot>
          <ScreenshotCaption points={['Identificación inequívoca por código y QR.', 'Parámetros ajustados al tipo de equipo.', 'Documentos, fallas, ubicaciones y mantenimientos unidos.']} />
        </div>
      ),
    },
    {
      section: 'Demostración',
      title: 'Medir en campo deja de ser un trámite aislado',
      eyebrow: 'Pantalla real · nueva medición',
      notes: [
        'Mostrá que el formulario no obliga a cargar campos irrelevantes: depende del activo.',
        'Aclaración: la geolocalización y las fotos son evidencia contextual; la política de la empresa define cuándo usarlas.',
      ],
      render: () => (
        <div>
          <AppScreenshot name="medicion" title="Registro de medición">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{['Temperatura', 'Amperaje', 'Presión', 'Vibración'].map((x) => <div className={`${subtle} p-3 text-xs font-bold text-muted`} key={x}>{x}<div className="mt-3 h-8 border-b border-line-strong" /></div>)}</div>
          </AppScreenshot>
          <ScreenshotCaption points={['Campos técnicos según categoría.', 'Observaciones y evidencia fotográfica.', 'Registro disponible aun con conectividad intermitente.']} />
        </div>
      ),
    },
    {
      section: 'Demostración',
      title: 'El mantenimiento preventivo se convierte en trabajo visible',
      eyebrow: 'Pantalla real · mantenimiento',
      notes: [
        'Contrastá “tener un plan” con “poder probar su cumplimiento”.',
        'Mostrá vencidos, próximos y completados sin entrar todavía en detalles administrativos.',
      ],
      render: () => (
        <div>
          <AppScreenshot name="mantenimiento" title="Mantenimiento preventivo">
            <HorizontalBars max={12} rows={[{ label: 'Completadas', value: 10 }, { label: 'Próximas', value: 6 }, { label: 'Vencidas', value: 2 }]} />
          </AppScreenshot>
          <ScreenshotCaption points={['Frecuencias y responsables definidos.', 'Vencimientos visibles antes de la auditoría.', 'Cierre con observaciones y evidencia.']} />
        </div>
      ),
    },
    {
      section: 'Demostración',
      title: 'Una alerta no se convierte en gasto sin autorización',
      eyebrow: 'Flujo funcional · correctivos',
      notes: [
        'Este flujo diferencia ActivaQR de un simple sistema de tickets: alerta, cotización, aceptación, permiso y ejecución.',
        'Aclaración comercial: una orden correctiva sólo se habilita cuando el cliente acepta la propuesta correspondiente.',
      ],
      render: () => (
        <div>
          <ProductFlowFrame>
            <Flow items={[
              { icon: <AlertTriangle />, title: 'Alerta', text: 'Riesgo detectado' },
              { icon: <CircleDollarSign />, title: 'Propuesta', text: 'Alcance y costo' },
              { icon: <KeyRound />, title: 'Permiso', text: 'Cliente autoriza' },
              { icon: <Wrench />, title: 'Orden', text: 'Trabajo trazable' },
              { icon: <CheckCircle2 />, title: 'Cierre', text: 'Evidencia final' },
            ]} />
          </ProductFlowFrame>
          <ScreenshotCaption points={['Separación clara entre recomendar y ejecutar.', 'Permisos revocables y alcance explícito.', 'Conversación, trabajo y evidencia en el mismo caso.']} />
        </div>
      ),
    },
    {
      section: 'Demostración',
      title: 'La auditoría responde quién hizo qué y cuándo',
      eyebrow: 'Pantalla real · trazabilidad',
      notes: [
        'Usá una situación realista: cambio de estado, medición fuera de rango o cierre de una tarea.',
        'La auditoría no reemplaza procedimientos ni certificaciones; aporta evidencia operativa consistente.',
      ],
      render: () => (
        <div>
          <AppScreenshot name="auditoria" title="Auditoría operativa">
            <div className="space-y-3">{['Medición urgente registrada', 'Alerta revisada por mantenimiento', 'Orden autorizada por empresa', 'Trabajo cerrado con evidencia'].map((x, i) => <div key={x} className="flex items-center gap-3 border-b border-line pb-3"><History size={16} className="text-brand-600" /><span className="text-xs font-semibold text-content">{x}</span><span className="ml-auto font-mono text-[10px] text-faint">{10 + i}:2{i}</span></div>)}</div>
          </AppScreenshot>
          <ScreenshotCaption points={['Eventos ordenados por fecha y usuario.', 'Historial asociado a la empresa correcta.', 'Base clara para revisión interna y aprendizaje.']} />
        </div>
      ),
    },
    {
      section: 'Arquitectura',
      title: 'El activo es el centro del grafo operativo',
      eyebrow: 'Estructura de información',
      notes: [
        'Explicá el grafo como relaciones, no como base de datos: todo vuelve al activo.',
        'Esta estructura permite seguir una decisión desde la lectura original hasta el cierre.',
      ],
      render: () => (
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-3 sm:hidden">
            <div className="flex items-center justify-center gap-3 bg-brand-600 p-5 font-black text-white shadow-glow-lg"><Factory size={28} /> ACTIVO</div>
            {[
              [<Gauge />, 'Mediciones'], [<AlertTriangle />, 'Alertas'], [<Wrench />, 'Mantenimientos'],
              [<FileCheck2 />, 'Órdenes'], [<Users />, 'Responsables'], [<History />, 'Auditoría'],
            ].map(([icon, label]) => <div key={String(label)} className={`${surface} flex items-center gap-3 p-4 text-sm font-black text-content`}><span className="text-brand-600">{icon}</span>{label}</div>)}
          </div>
          <div className="relative hidden min-h-[480px] sm:block">
            <div className="absolute left-1/2 top-1/2 z-10 grid h-36 w-36 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-600 text-center text-white shadow-glow-lg">
              <div><Factory className="mx-auto" size={30} /><p className="mt-2 font-black">ACTIVO</p></div>
            </div>
            {[
              ['left-[4%] top-[8%]', <Gauge />, 'Mediciones'], ['right-[4%] top-[8%]', <AlertTriangle />, 'Alertas'],
              ['left-[2%] bottom-[10%]', <Wrench />, 'Mantenimientos'], ['right-[2%] bottom-[10%]', <FileCheck2 />, 'Órdenes'],
              ['left-1/2 top-0 -translate-x-1/2', <Users />, 'Responsables'], ['left-1/2 bottom-0 -translate-x-1/2', <History />, 'Auditoría'],
            ].map(([pos, icon, label]) => <div key={String(label)} className={`absolute ${pos} ${surface} z-10 flex w-40 items-center gap-3 p-4 text-sm font-black text-content`}><span className="text-brand-600">{icon}</span>{label}</div>)}
            <svg className="absolute inset-0 h-full w-full text-brand-600/30" viewBox="0 0 900 480" preserveAspectRatio="none" aria-hidden="true">
              {[[150,70],[750,70],[150,410],[750,410],[450,35],[450,445]].map(([x,y]) => <line key={`${x}-${y}`} x1="450" y1="240" x2={x} y2={y} stroke="currentColor" strokeWidth="2" />)}
            </svg>
          </div>
        </div>
      ),
    },
    {
      section: 'Arquitectura',
      title: 'La operación continúa cuando la señal no acompaña',
      eyebrow: 'Estrategia offline',
      notes: [
        'No prometas funcionamiento ilimitado sin internet. Explicá la cola local: registra y sincroniza cuando vuelve la conexión.',
        'Preguntá en qué sectores tienen puntos ciegos y qué dispositivos usan los técnicos.',
      ],
      render: () => (
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Flow items={[
            { icon: <Smartphone />, title: 'Campo', text: 'El técnico completa el registro.' },
            { icon: <PackageCheck />, title: 'Cola local', text: 'La app protege el envío pendiente.' },
            { icon: <RefreshCw />, title: 'Reconexión', text: 'Reintenta de forma controlada.' },
            { icon: <Cloud />, title: 'Servidor', text: 'Valida y persiste por tenant.' },
            { icon: <CheckCircle2 />, title: 'Confirmación', text: 'El estado sincronizado queda visible.' },
          ]} />
          <div className={`${surface} p-6`}>
            <p className="text-xs font-black uppercase tracking-wider text-muted">Qué resuelve</p>
            <ul className="mt-5 space-y-4 text-sm leading-relaxed text-content">
              {['Reduce registros perdidos por cortes breves.', 'Hace visible qué está pendiente y qué ya llegó.', 'Evita que un reintento duplique silenciosamente el trabajo.'].map((x) => <li key={x} className="flex gap-3"><CheckCircle2 size={18} className="shrink-0 text-brand-600" />{x}</li>)}
            </ul>
          </div>
        </div>
      ),
    },
    {
      section: 'Arquitectura',
      title: 'Cada empresa opera dentro de su propio límite de datos',
      eyebrow: 'Multi-tenant y permisos',
      notes: [
        'Respuesta de seguridad: el tenant se toma de la sesión autenticada, no de un identificador enviado libremente por la pantalla.',
        'Los roles y permisos reducen alcance; no sustituyen la gestión de identidades y políticas internas del cliente.',
      ],
      render: () => (
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="space-y-5">
            {[
              [<LockKeyhole />, 'Sesión autenticada', 'Define empresa y rol antes de consultar datos.'],
              [<Layers3 />, 'Aislamiento por tenant', 'Cada operación se filtra por la empresa de la sesión.'],
              [<KeyRound />, 'Permiso explícito', 'El acceso remoto y la ejecución pueden autorizarse y revocarse.'],
              [<History />, 'Huella auditable', 'Las acciones relevantes conservan autor, momento y contexto.'],
            ].map(([icon, title, text]) => <div key={String(title)} className="flex gap-4"><span className="mt-1 text-brand-600">{icon}</span><div><p className="font-black text-content">{title}</p><p className="mt-1 text-sm text-muted">{text}</p></div></div>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {['Empresa A', 'Empresa B', 'Empresa C'].map((company) => <div key={company} className={`${surface} p-5 text-center`}><Building2 className="mx-auto text-brand-600" size={34} /><p className="mt-4 font-black text-content">{company}</p><div className="mx-auto mt-5 h-20 w-20 rounded-full border-2 border-brand-600/30 p-3"><div className="grid h-full place-items-center rounded-full bg-brand-600/10"><ShieldCheck className="text-brand-600" /></div></div><p className="mt-4 text-xs text-muted">Activos · usuarios · historial</p></div>)}
          </div>
        </div>
      ),
    },
    {
      section: 'Integración',
      title: 'ERP, SCADA y ActivaQR resuelven capas distintas',
      eyebrow: 'Comparación ejecutiva',
      notes: [
        'Usá la tabla para desarmar la falsa elección entre sistemas.',
        'Si el prospecto ya tiene un CMMS/EAM, pedí comparar flujos concretos y APIs antes de afirmar complementariedad.',
      ],
      render: () => <ComparisonTable />,
    },
    {
      section: 'Objeciones',
      title: '“Ya tenemos ERP”: una buena señal, no un impedimento',
      eyebrow: 'Preguntas del empresario',
      notes: [
        'Nunca desacredites el ERP del cliente. Reconocé su inversión y ubicá ActivaQR en el vacío operativo comprobable.',
        'Proponé un piloto acotado para demostrar convivencia antes de hablar de integración profunda.',
      ],
      render: () => (
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div className={`${surface} p-6`}><Database size={40} className="text-brand-600" /><p className="mt-8 text-2xl font-black leading-tight text-content">“Si mi ERP ya tiene mantenimiento, ¿para qué necesito otra aplicación?”</p></div>
          <div>
            <QuestionAnswer question="¿Duplica órdenes y activos?" answer="No debería. El piloto define una fuente maestra y un alcance. ActivaQR puede comenzar en el trabajo de campo y exportar o integrarse según las capacidades del ERP." />
            <QuestionAnswer question="¿Qué agrega frente al módulo de mantenimiento?" answer="Acceso por QR, captura móvil contextual, evidencia, cola offline y una experiencia enfocada en el activo. La diferencia se valida comparando un flujo real, no una lista de funciones." />
            <QuestionAnswer question="¿Nos obliga a migrar?" answer="No. La propuesta inicial es convivir con el sistema actual y demostrar valor en un sector o familia de equipos." />
          </div>
        </div>
      ),
    },
    {
      section: 'Objeciones',
      title: '“Ya tenemos SCADA”: la señal todavía necesita contexto y acción',
      eyebrow: 'Preguntas de operaciones',
      notes: [
        'Diferenciá dato automático de evidencia humana. Ambos son valiosos y pueden coexistir.',
        'No prometas una integración universal. La factibilidad depende del protocolo, API, exportación y reglas de ciberseguridad de planta.',
      ],
      render: () => (
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div className={`${surface} p-6`}><Monitor size={40} className="text-brand-600" /><p className="mt-8 text-2xl font-black leading-tight text-content">“El SCADA ya registra variables y alarmas. ¿Qué falta?”</p></div>
          <div>
            <QuestionAnswer question="¿ActivaQR reemplaza una alarma del SCADA?" answer="No. Puede usar esa señal como disparador o contexto, y extenderla con inspección, responsable, autorización, fotos, trabajo y cierre." />
            <QuestionAnswer question="¿Puede leer datos automáticamente?" answer="Es una integración posible cuando el sistema expone una API, base autorizada, broker o archivos exportables. Se analiza caso por caso con IT/OT." />
            <QuestionAnswer question="¿Interfiere con el control industrial?" answer="El enfoque recomendado es lectura y gestión fuera del lazo de control. Cualquier integración respeta segmentación y políticas de ciberseguridad del cliente." />
          </div>
        </div>
      ),
    },
    {
      section: 'Objeciones',
      title: 'IT necesita límites claros antes de aprobar una prueba',
      eyebrow: 'Seguridad y gobierno',
      notes: [
        'Invitá a IT al diseño del piloto. La confianza crece cuando el alcance, los datos y la salida están definidos desde el inicio.',
        'Si solicitan certificaciones específicas, registralas como requisito; no las supongas disponibles.',
      ],
      render: () => (
        <div className="grid gap-5 md:grid-cols-2">
          {[
            ['¿Dónde viven los datos?', 'En la infraestructura de ActivaQR definida para el servicio. Para una evaluación formal se entrega el diagrama de despliegue y proveedores vigentes.'],
            ['¿Cómo se separan las empresas?', 'El backend deriva el tenant desde la sesión y aplica filtros de empresa en las operaciones protegidas.'],
            ['¿Podemos retirar nuestros datos?', 'La política de salida, formatos y plazos se acuerda contractualmente según el plan y la integración.'],
            ['¿Quién puede entrar?', 'Usuarios autenticados con roles; los accesos remotos adicionales requieren permisos explícitos y revocables.'],
          ].map(([q, a]) => <div key={q} className={`${surface} p-5`}><p className="font-black text-content">{q}</p><p className="mt-3 text-sm leading-relaxed text-muted">{a}</p></div>)}
        </div>
      ),
    },
    {
      section: 'Objeciones',
      title: 'Finanzas va a preguntar cuánto cuesta no cambiar',
      eyebrow: 'Caso económico',
      notes: [
        'Evitá vender sólo por precio mensual. Compará con exposición por parada, tiempo administrativo y reincidencia.',
        'Pedí tres datos: costo por hora, horas evitables y cantidad de activos del piloto.',
      ],
      render: () => (
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <HorizontalBars max={100} rows={[{ label: 'Costo de una parada', value: 100, detail: '%' }, { label: 'Costo de investigar sin historial', value: 38, detail: '%' }, { label: 'Costo de reincidencia', value: 54, detail: '%' }, { label: 'Costo del piloto', value: 14, detail: '%' }]} />
          <div className={`${surface} p-7`}>
            <p className="text-xs font-black uppercase tracking-wider text-muted">Cómo responder</p>
            <p className="mt-5 text-2xl font-black leading-tight text-content">“No le pido que crea en un ahorro. Le propongo medirlo en un sector, con una línea de base y un criterio de éxito acordado.”</p>
            <p className="mt-6 text-xs leading-relaxed text-muted">Gráfico conceptual. Los porcentajes deben reemplazarse con cifras del prospecto durante el diagnóstico.</p>
          </div>
        </div>
      ),
    },
    {
      section: 'Preguntas',
      title: 'Las preguntas prácticas definen si la adopción será real',
      eyebrow: 'Preguntas frecuentes',
      notes: [
        'Respondé sólo lo que la implementación pueda sostener. Si una necesidad requiere desarrollo, separala como hoja de ruta o alcance especial.',
        'Cerrá esta lámina preguntando qué podría impedir que los técnicos la usen todos los días.',
      ],
      render: () => (
        <div className="grid gap-x-8 lg:grid-cols-2">
          <div>
            <QuestionAnswer question="¿Cuánto tarda la implementación?" answer="Depende de activos, datos disponibles y alcance. Un piloto pequeño se diseña para empezar rápido, cargar una muestra y aprender antes de escalar." />
            <QuestionAnswer question="¿Hay que colocar equipos especiales?" answer="Para el flujo base basta con etiquetas QR y dispositivos móviles compatibles. Sensores e integraciones son alcances separados." />
            <QuestionAnswer question="¿Qué pasa sin señal?" answer="Los registros compatibles con la cola offline quedan pendientes y se sincronizan al recuperar conexión." />
          </div>
          <div>
            <QuestionAnswer question="¿Quién carga los activos?" answer="Se puede comenzar con carga manual o importación; en el piloto se acuerda responsable, campos mínimos y control de calidad." />
            <QuestionAnswer question="¿Cómo capacitamos al personal?" answer="Con un flujo por rol y equipos reales. La adopción se valida observando una ronda, no sólo con una reunión teórica." />
            <QuestionAnswer question="¿Podemos personalizar campos?" answer="Las categorías determinan parámetros relevantes. Personalizaciones adicionales se evalúan según el plan y el caso." />
          </div>
        </div>
      ),
    },
    {
      section: 'Valor',
      title: 'El retorno se conversa con datos del prospecto',
      eyebrow: 'Simulador editable',
      notes: [
        'Mové los controles con el cliente. El cálculo sirve para dimensionar; no es una garantía de resultado.',
        'El objetivo de la reunión es acordar qué métrica se observará durante el piloto.',
      ],
      render: () => <RoiSimulator />,
    },
    {
      section: 'Implementación',
      title: 'Un piloto reduce el riesgo de decidir',
      eyebrow: 'Plan de 30 días',
      notes: [
        'Proponé un sector con dolor visible, sponsor identificado y cantidad acotada de activos.',
        'El piloto debe terminar con una reunión de evidencia: qué cambió, qué no y si conviene escalar.',
      ],
      render: () => (
        <div className="grid gap-4 lg:grid-cols-4">
          {[
            ['Semana 1', 'Definir', 'Sector, activos, responsables, línea de base y criterio de éxito.'],
            ['Semana 2', 'Configurar', 'Importar muestra, colocar QR y adaptar parámetros por tipo.'],
            ['Semana 3', 'Operar', 'Realizar rondas, registrar desvíos y acompañar a usuarios.'],
            ['Semana 4', 'Evaluar', 'Revisar evidencia, adopción, tiempos y decisión de escalado.'],
          ].map(([week, action, text], i) => <div key={week} className={`${surface} relative p-5`}><p className="font-mono text-xs text-brand-600">0{i + 1}</p><p className="mt-8 text-xs font-black uppercase tracking-wider text-muted">{week}</p><h3 className="mt-2 text-xl font-black text-content">{action}</h3><p className="mt-3 text-sm leading-relaxed text-muted">{text}</p></div>)}
        </div>
      ),
    },
    {
      section: 'Implementación',
      title: 'El piloto tiene que aprobarse con evidencia, no entusiasmo',
      eyebrow: 'Criterios de éxito',
      notes: [
        'Elegí de tres a cinco criterios. Demasiados indicadores vuelven imposible decidir.',
        'Documentá también fricciones y tareas manuales: son insumos para el escalado.',
      ],
      render: () => (
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-5">
            {[
              ['Adopción', 'Rondas realizadas en ActivaQR / rondas planificadas.'],
              ['Trazabilidad', 'Casos con responsable, evidencia y cierre completo.'],
              ['Velocidad', 'Tiempo desde detección hasta asignación o decisión.'],
              ['Calidad', 'Registros completos y sin duplicación.'],
            ].map(([title, text]) => <div key={title} className="border-l-2 border-brand-600 pl-4"><p className="font-black text-content">{title}</p><p className="mt-1 text-sm text-muted">{text}</p></div>)}
          </div>
          <div className={`${surface} p-7`}>
            <Target size={36} className="text-brand-600" />
            <p className="mt-8 text-2xl font-black leading-tight text-content">Decisión al día 30</p>
            <div className="mt-6 space-y-4 text-sm text-muted">
              <p><strong className="text-content">Escalar:</strong> el flujo aporta evidencia y el equipo lo adopta.</p>
              <p><strong className="text-content">Ajustar:</strong> hay valor, pero faltan datos, integración o capacitación.</p>
              <p><strong className="text-content">Detener:</strong> no supera el proceso actual en el alcance probado.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      section: 'Comercial',
      title: 'La propuesta se adapta al tamaño, no sacrifica la trazabilidad',
      eyebrow: 'Modelo comercial',
      notes: [
        'Presentá el plan después de entender activos, usuarios, sitios e integraciones.',
        'No negocies funciones de seguridad o aislamiento. Negociá alcance, acompañamiento y escala.',
      ],
      render: () => (
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['Inicial', 'Para ordenar un primer universo de activos', ['QR y fichas', 'Mediciones', 'Mantenimiento base']],
            ['Empresa', 'Para coordinar equipos y tomar decisiones', ['Indicadores', 'Auditoría', 'Flujos multiusuario']],
            ['Industrial', 'Para operaciones de mayor escala', ['Mayor capacidad', 'Acompañamiento', 'Integraciones evaluadas']],
          ].map(([name, desc, features], i) => <div key={String(name)} className={`${i === 1 ? 'border-brand-600 bg-brand-600/5' : 'border-line bg-surface/70'} border p-6`}><p className="font-mono text-xs text-brand-600">0{i + 1}</p><h3 className="mt-8 text-2xl font-black text-content">{String(name)}</h3><p className="mt-3 min-h-[48px] text-sm text-muted">{String(desc)}</p><div className="my-6 h-px bg-line" /><ul className="space-y-3 text-sm text-content">{(features as string[]).map((x) => <li key={x} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-600" />{x}</li>)}</ul></div>)}
        </div>
      ),
    },
    {
      section: 'Cierre',
      title: 'El próximo paso no es comprar: es demostrar',
      eyebrow: 'Propuesta de acción',
      notes: [
        'Cerrá con una pregunta concreta: ¿qué sector y qué 20 activos elegirían para una prueba?',
        'Acordá en la misma reunión un responsable técnico, un sponsor y una fecha de relevamiento.',
      ],
      render: () => (
        <div className="grid min-h-[430px] items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <LogoMark />
            <h2 className="mt-10 font-display text-4xl font-black leading-tight text-content sm:text-6xl">El próximo paso no es comprar.<br /><span className="text-brand-600">Es demostrar.</span></h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">Seleccionemos un sector, un grupo de activos y una métrica. En 30 días, la evidencia decide.</p>
          </div>
          <div className={`${surface} p-7`}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Para iniciar el piloto</p>
            <div className="mt-7 space-y-5">
              {['Sector prioritario', '20–50 activos representativos', 'Responsable técnico', 'Criterio de éxito', 'Fecha de inicio'].map((x, i) => <div key={x} className="flex items-center gap-4 border-b border-line pb-4"><span className="font-mono text-sm text-brand-600">0{i + 1}</span><span className="font-bold text-content">{x}</span></div>)}
            </div>
          </div>
        </div>
      ),
    },
  ], []);

  const go = useCallback((index: number) => {
    setCurrent(Math.max(0, Math.min(slides.length - 1, index)));
    setIndexOpen(false);
    presentationRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('app-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slides.length]);

  const limpiarTemporizadorNarracion = useCallback(() => {
    if (narracionTimerRef.current !== null) {
      window.clearTimeout(narracionTimerRef.current);
      narracionTimerRef.current = null;
    }
  }, []);

  const detenerNarracion = useCallback(() => {
    narracionAutomaticaRef.current = false;
    narracionTokenRef.current += 1;
    indiceNarracionRef.current = null;
    limpiarTemporizadorNarracion();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setNarracionAutomatica(false);
    setEstadoNarracion('idle');
    setErrorNarracion('');
  }, [limpiarTemporizadorNarracion]);

  const reproducirNarracion = useCallback((indice: number) => {
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
      narracionAutomaticaRef.current = false;
      setNarracionAutomatica(false);
      setEstadoNarracion('unsupported');
      setErrorNarracion('Este navegador no ofrece narración de voz. La presentación manual sigue disponible.');
      return;
    }

    const motor = window.speechSynthesis;
    const texto = NARRACIONES_PRESENTACION[indice];
    if (!texto) {
      narracionAutomaticaRef.current = false;
      setNarracionAutomatica(false);
      setEstadoNarracion('error');
      setErrorNarracion('No se encontró el guion de esta lámina.');
      return;
    }

    limpiarTemporizadorNarracion();
    const token = narracionTokenRef.current + 1;
    narracionTokenRef.current = token;
    indiceNarracionRef.current = indice;
    motor.cancel();
    setEstadoNarracion('preparing');
    setErrorNarracion('');

    const opcionesDisponibles = crearOpcionesVoz(motor.getVoices());
    const opcionPreferida = opcionVozPreferidaRef.current;
    const opcionesVoz = opcionPreferida
      ? [opcionPreferida, ...opcionesDisponibles.filter((opcion) => claveOpcionVoz(opcion) !== claveOpcionVoz(opcionPreferida))]
      : opcionesDisponibles;
    const partes = dividirNarracion(texto);
    const erroresConAlternativa = new Set([
      'network',
      'synthesis-unavailable',
      'synthesis-failed',
      'language-unavailable',
      'voice-unavailable',
      'invalid-argument',
    ]);

    const fallarNarracion = (error: string) => {
      narracionAutomaticaRef.current = false;
      indiceNarracionRef.current = null;
      setNarracionAutomatica(false);
      setEstadoNarracion(error === 'synthesis-unavailable' ? 'unsupported' : 'error');
      setErrorNarracion(`${explicarErrorVoz(error)} · Código: ${error}.`);
    };

    const pronunciarParte = (parteActual: number, opcionActual = 0, reintentoAudio = 0) => {
      if (!narracionAutomaticaRef.current || narracionTokenRef.current !== token) return;

      const opcion = opcionesVoz[Math.min(opcionActual, opcionesVoz.length - 1)];
      const locucion = new SpeechSynthesisUtterance(partes[parteActual]);
      const idioma = opcion.voz?.lang ?? opcion.idioma;
      if (idioma) locucion.lang = idioma;
      locucion.rate = CONFIGURACION_NARRACION.velocidad;
      locucion.pitch = CONFIGURACION_NARRACION.tono;
      if (opcion.voz) locucion.voice = opcion.voz;
      setNombreVoz(opcion.etiqueta);

      locucion.onstart = () => {
        if (narracionTokenRef.current === token && motor.paused === false) {
          opcionVozPreferidaRef.current = opcion;
          setEstadoNarracion('speaking');
          setErrorNarracion('');
        }
      };

      locucion.onend = () => {
        if (!narracionAutomaticaRef.current || narracionTokenRef.current !== token) return;

        if (parteActual < partes.length - 1) {
          narracionTimerRef.current = window.setTimeout(() => pronunciarParte(parteActual + 1, opcionActual), 170);
          return;
        }

        if (indice < slides.length - 1) {
          setEstadoNarracion('between');
          narracionTimerRef.current = window.setTimeout(() => {
            if (narracionAutomaticaRef.current && narracionTokenRef.current === token) go(indice + 1);
          }, CONFIGURACION_NARRACION.pausaEntreLaminasMs);
          return;
        }

        narracionAutomaticaRef.current = false;
        indiceNarracionRef.current = null;
        setNarracionAutomatica(false);
        setEstadoNarracion('finished');
      };

      locucion.onerror = (event) => {
        if (narracionTokenRef.current !== token || event.error === 'canceled' || event.error === 'interrupted') return;

        const reintentarAudioOcupado = event.error === 'audio-busy' && reintentoAudio < 2;
        const probarOtraVoz = erroresConAlternativa.has(event.error) && opcionActual < opcionesVoz.length - 1;
        if (reintentarAudioOcupado || probarOtraVoz) {
          motor.cancel();
          setEstadoNarracion('preparing');
          setErrorNarracion(`${explicarErrorVoz(event.error)}. Probando una alternativa…`);
          narracionTimerRef.current = window.setTimeout(
            () => pronunciarParte(
              parteActual,
              probarOtraVoz ? opcionActual + 1 : opcionActual,
              reintentarAudioOcupado ? reintentoAudio + 1 : 0,
            ),
            reintentarAudioOcupado ? 700 : 260,
          );
          return;
        }

        fallarNarracion(event.error);
      };

      motor.speak(locucion);
    };

    pronunciarParte(0);
  }, [go, limpiarTemporizadorNarracion, slides.length]);

  const iniciarNarracionAutomatica = () => {
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
      setEstadoNarracion('unsupported');
      setErrorNarracion('Este navegador no ofrece narración de voz. La presentación manual sigue disponible.');
      return;
    }
    narracionAutomaticaRef.current = true;
    setNarracionAutomatica(true);
    setEstadoNarracion('preparing');
    setErrorNarracion('');
    const indiceInicial = current === slides.length - 1 ? 0 : current;
    if (indiceInicial !== current) go(indiceInicial);
    reproducirNarracion(indiceInicial);
  };

  const alternarPausaNarracion = () => {
    if (!('speechSynthesis' in window)) return;
    if (estadoNarracion === 'paused') {
      window.speechSynthesis.resume();
      setEstadoNarracion('speaking');
      return;
    }
    window.speechSynthesis.pause();
    setEstadoNarracion('paused');
  };

  useEffect(() => {
    if (narracionAutomatica && indiceNarracionRef.current !== current) reproducirNarracion(current);
  }, [current, narracionAutomatica, reproducirNarracion]);

  useEffect(() => () => {
    narracionAutomaticaRef.current = false;
    narracionTokenRef.current += 1;
    indiceNarracionRef.current = null;
    limpiarTemporizadorNarracion();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [limpiarTemporizadorNarracion]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === presentationRef.current);
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') go(current + 1);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') go(current - 1);
      if (event.key === 'Home') go(0);
      if (event.key === 'End') go(slides.length - 1);
      if (event.key === 'Escape') setIndexOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, go, slides.length]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await presentationRef.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // Algunos navegadores PWA no permiten fullscreen. La presentación sigue navegable.
    }
  };

  const slide = slides[current];
  const textoNarrado = NARRACIONES_PRESENTACION[current];
  const progress = ((current + 1) / slides.length) * 100;
  const puedeAlternarPausa = estadoNarracion === 'speaking' || estadoNarracion === 'paused';
  const estadoNarracionTexto: Record<EstadoNarracion, string> = {
    idle: 'Narración lista',
    preparing: 'Preparando la voz…',
    speaking: `Narrando la lámina ${current + 1}`,
    paused: 'Narración en pausa',
    between: 'Comentario terminado · pasando a la siguiente lámina…',
    finished: 'Presentación automática finalizada',
    unsupported: 'Narración no disponible en este navegador',
    error: 'La narración se interrumpió',
  };

  return (
    <div
      ref={presentationRef}
      className={`mx-auto max-w-[1500px] space-y-4 ${isFullscreen ? 'h-screen max-w-none overflow-y-auto bg-canvas p-4 sm:p-6' : ''}`}
    >
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600">Demo para clientes potenciales</p>
          <h1 className="mt-1 font-display text-2xl font-black text-content sm:text-3xl">Presentación comercial</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setIndexOpen((value) => !value)} className="press flex min-h-[44px] items-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-bold text-content">
            Lámina {current + 1} de {slides.length} <ChevronDown size={16} />
          </button>
          {!narracionAutomatica ? (
            <button
              onClick={iniciarNarracionAutomatica}
              className="press flex min-h-[44px] items-center gap-2 rounded-md border border-brand-600 bg-brand-600/10 px-4 text-sm font-bold text-brand-600"
            >
              <Volume2 size={17} aria-hidden="true" />
              {estadoNarracion === 'finished' ? 'Repetir automático' : 'Automatizar'}
            </button>
          ) : (
            <div className="flex items-center overflow-hidden rounded-md border border-brand-600 bg-brand-600/10">
              <button
                onClick={alternarPausaNarracion}
                disabled={!puedeAlternarPausa}
                aria-label={estadoNarracion === 'paused' ? 'Reanudar narración' : 'Pausar narración'}
                title={estadoNarracion === 'paused' ? 'Reanudar narración' : 'Pausar narración'}
                className="press grid min-h-[44px] min-w-[44px] place-items-center text-brand-600 hover:bg-brand-600/10 disabled:cursor-wait disabled:opacity-40"
              >
                {estadoNarracion === 'paused' ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
              </button>
              <button
                onClick={detenerNarracion}
                aria-label="Detener presentación automática"
                title="Detener presentación automática"
                className="press grid min-h-[44px] min-w-[44px] place-items-center border-l border-brand-600/30 text-brand-600 hover:bg-brand-600/10"
              >
                <Square size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          <button
            onClick={() => setNotesOpen((value) => !value)}
            aria-label={notesOpen ? 'Ocultar notas del expositor' : 'Abrir notas del expositor'}
            aria-pressed={notesOpen}
            title={notesOpen ? 'Ocultar notas del expositor' : 'Abrir notas del expositor'}
            className={`press grid min-h-[44px] min-w-[44px] place-items-center rounded-md border text-content transition-colors ${notesOpen ? 'border-brand-600 bg-brand-600/10 text-brand-600' : 'border-line bg-surface hover:border-line-strong'}`}
          >
            <PanelRightOpen size={19} aria-hidden="true" />
          </button>
          <button onClick={toggleFullscreen} className="press flex min-h-[44px] items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-bold text-white shadow-soft">
            {isFullscreen ? <Minimize2 size={16} /> : <Expand size={16} />}
            {isFullscreen ? 'Salir' : 'Pantalla completa'}
          </button>
        </div>
      </div>

      {(narracionAutomatica || estadoNarracion === 'finished' || estadoNarracion === 'unsupported' || estadoNarracion === 'error') && (
        <div className={`${surface} no-print flex items-center gap-4 px-4 py-3`} role="status" aria-live="polite">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${estadoNarracion === 'error' || estadoNarracion === 'unsupported' ? 'bg-red-500/10 text-red-500' : 'bg-brand-600/10 text-brand-600'}`}>
            <Volume2 size={19} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-content">{estadoNarracionTexto[estadoNarracion]}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {errorNarracion || `${nombreVoz} · ritmo pausado · la lámina avanza cuando termina el comentario.`}
            </p>
          </div>
          {estadoNarracion === 'finished' && (
            <button onClick={iniciarNarracionAutomatica} className="press shrink-0 rounded-md border border-line bg-surface px-3 py-2 text-xs font-bold text-content">
              Repetir
            </button>
          )}
        </div>
      )}

      {indexOpen && (
        <div className={`${surface} no-print max-h-[420px] overflow-y-auto p-4`}>
          <div className="mb-3 flex items-center justify-between"><p className="text-sm font-black text-content">Índice de la presentación</p><button onClick={() => setIndexOpen(false)} aria-label="Cerrar índice" className="text-muted hover:text-content"><X size={18} /></button></div>
          <div className="grid gap-x-6 md:grid-cols-2 xl:grid-cols-3">
            {slides.map((item, index) => (
              <button key={`${item.section}-${item.title}`} onClick={() => go(index)} className={`flex gap-3 border-b border-line py-3 text-left ${index === current ? 'text-brand-600' : 'text-muted hover:text-content'}`}>
                <span className="font-mono text-xs">{String(index + 1).padStart(2, '0')}</span>
                <span><span className="block text-xs font-black uppercase tracking-wider">{item.section}</span><span className="mt-1 block text-sm leading-snug">{item.title}</span></span>
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="relative overflow-hidden rounded-xl border border-line bg-canvas/95 shadow-lift">
        <div className="absolute inset-x-0 top-0 h-1 bg-line"><div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        <div className="min-h-[620px] p-5 sm:p-8 lg:p-12 xl:p-16">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600">{slide.eyebrow ?? slide.section}</p>
              {current !== 0 && current !== slides.length - 1 && <h2 className="mt-3 max-w-5xl font-display text-3xl font-black leading-tight text-content sm:text-4xl lg:text-5xl">{slide.title}</h2>}
            </div>
            <p className="shrink-0 font-mono text-xs text-faint">{String(current + 1).padStart(2, '0')} / {slides.length}</p>
          </div>
          <div key={current} className="animate-page-in">{slide.render()}</div>
        </div>
      </section>

      {notesOpen && (
        <aside className={`${surface} no-print p-5`}>
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600">Texto de la narración automática</p>
              <p className="mt-4 text-sm leading-7 text-muted">{textoNarrado}</p>
            </div>
            <div className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600">Claves para el expositor</p>
              <ul className="mt-4 grid gap-3">
                {slide.notes.map((note) => <li key={note} className="flex gap-3 text-sm leading-relaxed text-muted"><Play size={15} className="mt-1 shrink-0 text-brand-600" />{note}</li>)}
              </ul>
            </div>
          </div>
        </aside>
      )}

      <div className="no-print flex items-center justify-between gap-3">
        <button disabled={current === 0} onClick={() => go(current - 1)} className="press flex min-h-[46px] items-center gap-2 rounded-md border border-line bg-surface px-5 text-sm font-bold text-content disabled:opacity-30"><ArrowLeft size={18} /> Anterior</button>
        <p className="hidden text-center text-xs text-muted sm:block">{narracionAutomatica ? 'Modo automático: la voz marca el cambio de lámina' : 'Usá ← → para avanzar durante la reunión'}</p>
        <button disabled={current === slides.length - 1} onClick={() => go(current + 1)} className="press flex min-h-[46px] items-center gap-2 rounded-md bg-brand-600 px-5 text-sm font-bold text-white shadow-soft disabled:opacity-30">Siguiente <ArrowRight size={18} /></button>
      </div>
    </div>
  );
};
