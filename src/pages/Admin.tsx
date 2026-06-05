// v1.1.0
import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Power,
  Trash2,
  KeyRound,
  Users,
  Package,
  CreditCard,
  XCircle,
  MonitorSmartphone,
  X,
  ArrowRight,
  TrendingUp,
  BarChart3,
  QrCode,
  Globe,
  ChevronDown,
  Download,
  Search,
  AlertTriangle,
  Clock,
  MapPin,
  Smartphone,
  Monitor,
  Tablet,
  Sparkles,
} from 'lucide-react';
import { exportarCsv } from '../utils/exportCsv';
import {
  EmpresaAdmin,
  SolicitudUpgrade,
  Estadisticas,
  getEstadisticas,
  reiniciarEstadisticas,
  listarEmpresas,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa,
  resetPassword,
  generarSuscripcion,
  cancelarSuscripcion,
  generarStripeSubscripcion,
  generarStripeLinkPago,
  getSolicitudesUpgrade,
  descartarSolicitud,
} from '../data/adminApi';
import {
  PermisoAcceso,
  solicitarAccesoRemoto,
  getPermisoAdmin,
  revocarAccesoAdmin,
} from '../data/accesoRemotoApi';
import { PanelAccesoRemoto } from '../components/PanelAccesoRemoto';
import { NotificacionesPush } from '../components/NotificacionesPush';
import { apiFetch } from '../data/auth';

const PLANES = ['inicial', 'empresa', 'industrial'] as const;

// ── Shared modal shell ─────────────────────────────────────────────────────────
const Modal: React.FC<{ titulo: string; icono?: React.ReactNode; onClose: () => void; children: React.ReactNode; maxW?: string }> = ({
  titulo, icono, onClose, children, maxW = 'max-w-md',
}) => (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4 pb-safe" onClick={onClose}>
    <div
      className={`bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_#1e293b] w-full ${maxW} max-h-[92vh] overflow-y-auto`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between bg-slate-900 text-white px-5 py-4 sticky top-0">
        <h2 className="font-sketch font-black text-base uppercase tracking-wide flex items-center gap-2">
          {icono}{titulo}
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

// ── Campo helper ───────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

const inputCls = "w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none focus:border-orange-500 bg-white font-medium";
const btnPrimary = "w-full bg-orange-500 text-white h-12 font-sketch font-black uppercase tracking-wide border-2 border-slate-900 shadow-[3px_3px_0px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-40 disabled:pointer-events-none";
const btnSecondary = "w-full h-12 border-2 border-slate-400 text-sm font-bold text-slate-600 hover:border-slate-800 transition-colors";

// ── Modal cobro ────────────────────────────────────────────────────────────────
type Moneda = 'ARS' | 'USD' | 'UYU';

const ModalCobro: React.FC<{
  empresa: EmpresaAdmin;
  onClose: () => void;
  onSuscripcion: (monto: number, emailOverride?: string) => Promise<void>;
  onLinkPago: (monto: number, descripcion: string) => Promise<void>;
  onStripeSuscripcion: (monto: number, moneda: 'usd' | 'uyu') => Promise<void>;
  onStripeLinkPago: (monto: number, moneda: 'usd' | 'uyu', descripcion: string) => Promise<void>;
}> = ({ empresa, onClose, onSuscripcion, onLinkPago, onStripeSuscripcion, onStripeLinkPago }) => {
  const [moneda, setMoneda] = useState<Moneda>('ARS');
  const [modo, setModo] = useState<'suscripcion' | 'unico'>('suscripcion');
  const [monto, setMonto] = useState('');
  const [emailOverride, setEmailOverride] = useState('');
  const [descripcion, setDescripcion] = useState(`Pago ActivaQR — ${empresa.nombre}`);
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || Number(monto) <= 0) { setErr('Ingresá un monto válido.'); return; }
    setErr(''); setCargando(true);
    try {
      if (moneda === 'ARS') {
        if (modo === 'suscripcion') await onSuscripcion(Number(monto), emailOverride || undefined);
        else await onLinkPago(Number(monto), descripcion);
      } else {
        const m = moneda.toLowerCase() as 'usd' | 'uyu';
        if (modo === 'suscripcion') await onStripeSuscripcion(Number(monto), m);
        else await onStripeLinkPago(Number(monto), m, descripcion);
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al generar el cobro.');
    } finally { setCargando(false); }
  };

  const esStripe = moneda !== 'ARS';
  const infoTexto = esStripe
    ? modo === 'suscripcion'
      ? `Genera un link de suscripcion mensual por Stripe (${moneda}). Acepta tarjetas internacionales.`
      : `Genera un link de pago unico por Stripe (${moneda}). Acepta tarjetas internacionales.`
    : modo === 'suscripcion'
      ? 'Genera un link de suscripcion recurrente mensual por Mercado Pago. El cliente debe tener cuenta MP.'
      : 'Genera un link de pago unico. Acepta tarjeta, Prex, transferencia y cualquier medio — sin cuenta MP.';

  return (
    <Modal titulo="Generar cobro" icono={<CreditCard size={16} />} onClose={onClose}>
      {/* Selector de moneda */}
      <div className="flex gap-0 mb-4 border-2 border-slate-900">
        {(['ARS', 'USD', 'UYU'] as Moneda[]).map((m, i) => (
          <button
            key={m}
            type="button"
            onClick={() => setMoneda(m)}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wide transition-colors ${i > 0 ? 'border-l-2 border-slate-900' : ''} ${moneda === m ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Selector de modo */}
      <div className="flex gap-0 mb-6 border-2 border-slate-900">
        <button
          type="button"
          onClick={() => setModo('suscripcion')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wide transition-colors ${modo === 'suscripcion' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          Suscripcion mensual
        </button>
        <button
          type="button"
          onClick={() => setModo('unico')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wide border-l-2 border-slate-900 transition-colors ${modo === 'unico' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          Pago unico
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-slate-50 border-2 border-slate-200 px-4 py-3 mb-2">
          <p className="text-xs text-slate-500 font-semibold">{infoTexto}</p>
        </div>

        <Field label={`Monto (${moneda})`} hint={modo === 'suscripcion' ? 'Se debitará automáticamente cada mes' : 'Pago por única vez'}>
          <input
            type="number"
            min="1"
            required
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder={moneda === 'ARS' ? 'Ej: 15000' : 'Ej: 50'}
            className={inputCls}
            autoFocus
          />
        </Field>

        {moneda === 'ARS' && modo === 'suscripcion' && (
          <Field label="Email MP del cliente (opcional)" hint="Solo necesario si el email registrado no tiene cuenta MP">
            <input
              type="email"
              value={emailOverride}
              onChange={(e) => setEmailOverride(e.target.value)}
              placeholder={empresa.usuarios[0]?.email ?? 'cliente@mail.com'}
              className={inputCls}
            />
          </Field>
        )}

        {modo === 'unico' && (
          <Field label="Descripcion del pago">
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={inputCls}
            />
          </Field>
        )}

        {err && <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-200 px-3 py-2">{err}</p>}

        <button type="submit" disabled={cargando} className={btnPrimary}>
          {cargando ? 'Generando...' : 'Generar link de cobro'}
        </button>
        <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
      </form>
    </Modal>
  );
};

// ── Modal reset password ───────────────────────────────────────────────────────
const ModalResetPass: React.FC<{ empresa: EmpresaAdmin; onClose: () => void; onConfirm: (pass: string) => Promise<void> }> = ({
  empresa, onClose, onConfirm,
}) => {
  const [pass, setPass] = useState('');
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass.length < 6) { setErr('La contraseña debe tener al menos 6 caracteres.'); return; }
    setErr(''); setCargando(true);
    try { await onConfirm(pass); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Error.'); }
    finally { setCargando(false); }
  };

  return (
    <Modal titulo="Resetear contraseña" icono={<KeyRound size={16} />} onClose={onClose}>
      <p className="text-sm text-slate-600 mb-5">Nueva contraseña para el administrador de <strong>{empresa.nombre}</strong>.</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nueva contraseña">
          <input
            type="text"
            autoFocus
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Min. 6 caracteres"
            className={inputCls + ' font-mono'}
          />
        </Field>
        {err && <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-200 px-3 py-2">{err}</p>}
        <button type="submit" disabled={cargando} className={btnPrimary}>{cargando ? 'Guardando...' : 'Actualizar contraseña'}</button>
        <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
      </form>
    </Modal>
  );
};

// ── Modal selector de WhatsApp ────────────────────────────────────────────────
const CODIGOS_PAIS = [
  { codigo: '54',  bandera: 'AR', nombre: 'Argentina' },
  { codigo: '598', bandera: 'UY', nombre: 'Uruguay' },
  { codigo: '595', bandera: 'PY', nombre: 'Paraguay' },
  { codigo: '591', bandera: 'BO', nombre: 'Bolivia' },
  { codigo: '56',  bandera: 'CL', nombre: 'Chile' },
  { codigo: '55',  bandera: 'BR', nombre: 'Brasil' },
  { codigo: '51',  bandera: 'PE', nombre: 'Perú' },
  { codigo: '57',  bandera: 'CO', nombre: 'Colombia' },
  { codigo: '34',  bandera: 'ES', nombre: 'España' },
  { codigo: '1',   bandera: 'US', nombre: 'EE.UU. / Canadá' },
];

const ModalWhatsapp: React.FC<{
  titulo: string;
  nombreEmpresa: string;
  numeroPreset?: string;
  onConfirm: (numeroCompleto: string) => void;
  onOmitir: () => void;
}> = ({ titulo, nombreEmpresa, numeroPreset, onConfirm, onOmitir }) => {
  const [pais, setPais] = useState(CODIGOS_PAIS[0]);
  const [numero, setNumero] = useState(numeroPreset ?? '');

  const soloDigitos = numero.replace(/\D/g, '');
  const preview = soloDigitos ? `+${pais.codigo} ${soloDigitos}` : '';
  const completo = soloDigitos ? `${pais.codigo}${soloDigitos}` : '';

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-4 pb-safe">
      <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_#1e293b] w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b-2 border-slate-900 px-5 py-3 bg-slate-900 text-white">
          <h2 className="font-sketch font-black text-base uppercase tracking-wide">{titulo}</h2>
          <button onClick={onOmitir}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            WhatsApp de <strong>{nombreEmpresa}</strong> para enviar el link directamente.
          </p>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Pais</label>
            <select
              value={pais.codigo}
              onChange={(e) => setPais(CODIGOS_PAIS.find((c) => c.codigo === e.target.value) ?? CODIGOS_PAIS[0])}
              className="w-full border-2 border-slate-300 px-3 h-11 text-sm font-semibold outline-none focus:border-orange-500 bg-white"
            >
              {CODIGOS_PAIS.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.bandera} — {c.nombre} (+{c.codigo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
              Numero (sin 0, sin codigo de pais)
            </label>
            <div className="flex gap-2 items-center">
              <span className="border-2 border-slate-300 px-3 h-11 flex items-center font-mono font-black text-slate-700 text-sm bg-slate-50 whitespace-nowrap">
                +{pais.codigo}
              </span>
              <input
                type="tel"
                autoFocus
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="1112345678"
                className="flex-1 border-2 border-slate-300 px-3 h-11 text-base font-mono outline-none focus:border-orange-500 text-center min-w-0"
              />
            </div>
            {preview && (
              <p className="text-xs text-slate-500 mt-1.5 font-mono">
                Numero completo: <span className="font-black text-slate-800">{preview}</span>
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onOmitir}
              className="flex-1 py-2.5 border-2 border-slate-300 text-sm font-bold text-slate-600 hover:border-slate-500 transition-colors"
            >
              Omitir
            </button>
            <button
              onClick={() => completo && onConfirm(completo)}
              disabled={!soloDigitos}
              className="flex-1 py-2.5 bg-slate-900 text-white border-2 border-slate-900 text-sm font-black uppercase tracking-wide hover:bg-slate-700 transition-colors disabled:opacity-40"
            >
              Abrir WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Admin: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [solicitudes, setSolicitudes] = useState<SolicitudUpgrade[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalCobro, setModalCobro] = useState<EmpresaAdmin | null>(null);
  const [modalResetPass, setModalResetPass] = useState<EmpresaAdmin | null>(null);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [stripeOk, setStripeOk] = useState<boolean | null>(null);

  const toggleExpand = (id: string) =>
    setExpandidas((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const [panelRemoto, setPanelRemoto] = useState<{ empresa: EmpresaAdmin; permiso: PermisoAcceso } | null>(null);
  const [permisos, setPermisos] = useState<Record<string, PermisoAcceso | null>>({});
  const [resultadoRemoto, setResultadoRemoto] = useState<{
    empresaNombre: string;
    link: string;
    emailEnviado: boolean;
    waAbierto: boolean;
  } | null>(null);
  const [resultadoSub, setResultadoSub] = useState<{
    empresaNombre: string;
    link: string;
    emailEnviado: boolean;
    waEnviado: boolean;
  } | null>(null);
  const [modalWa, setModalWa] = useState<{
    titulo: string;
    nombreEmpresa: string;
    mensaje: string;
    numeroPreset?: string;
    onDone: (waAbierto: boolean) => void;
  } | null>(null);

  const cargarSolicitudes = async () => {
    try {
      const s = await getSolicitudesUpgrade();
      setSolicitudes(s);
    } catch {
      // silencioso
    }
  };

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const [lista] = await Promise.all([listarEmpresas(), cargarSolicitudes()]);
      setEmpresas(lista);
      const entries = await Promise.all(
        lista.map(async (e) => {
          try { return [e.id, await getPermisoAdmin(e.id)] as [string, PermisoAcceso | null]; }
          catch { return [e.id, null] as [string, null]; }
        })
      );
      setPermisos(Object.fromEntries(entries));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Admin] Error cargando empresas:', e);
      setError(`Error al cargar empresas: ${msg}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    apiFetch('admin/stripe-status')
      .then((r) => r.json())
      .then((d) => setStripeOk(!!d?.configurado))
      .catch(() => setStripeOk(false));
  }, []);

  const toggleEstado = async (emp: EmpresaAdmin) => {
    if (toggling.has(emp.id)) return;
    const nuevo = emp.estado === 'activa' ? 'suspendida' : 'activa';
    setToggling((prev) => new Set(prev).add(emp.id));
    // Actualización optimista: la UI responde al instante.
    setEmpresas((prev) => prev.map((e) => e.id === emp.id ? { ...e, estado: nuevo } : e));
    try {
      await actualizarEmpresa(emp.id, { estado: nuevo });
    } catch {
      // Revertir si falla.
      setEmpresas((prev) => prev.map((e) => e.id === emp.id ? { ...e, estado: emp.estado } : e));
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(emp.id); return s; });
    }
  };

  const borrar = async (emp: EmpresaAdmin) => {
    if (
      !confirm(
        `¿Eliminar "${emp.nombre}" y TODOS sus datos (${emp._count.activos} activos)? Esta acción no se puede deshacer.`
      )
    )
      return;
    await eliminarEmpresa(emp.id);
    cargar();
  };

  const resetear = (emp: EmpresaAdmin) => setModalResetPass(emp);

  const confirmarResetPass = async (pass: string) => {
    if (!modalResetPass) return;
    await resetPassword(modalResetPass.id, pass);
  };

  const suscribir = (emp: EmpresaAdmin) => setModalCobro(emp);

  const handleSuscripcion = async (monto: number, emailOverride?: string) => {
    if (!modalCobro) return;
    const res = await generarSuscripcion(modalCobro.id, monto, emailOverride);
    const initPoint = res.initPoint;
    await navigator.clipboard?.writeText(initPoint).catch(() => {});
    const mensajeWa = `Hola! Te enviamos el link para activar tu suscripcion en *ActivaQR*:\n\n${initPoint}\n\nCualquier consulta estamos a disposicion.`;
    const emailEnviado = !!(res as { emailEnviado?: boolean }).emailEnviado;
    setModalCobro(null);
    setModalWa({
      titulo: 'Enviar link por WhatsApp',
      nombreEmpresa: modalCobro.nombre,
      mensaje: mensajeWa,
      onDone: (waEnviado) => {
        setModalWa(null);
        setResultadoSub({ empresaNombre: modalCobro.nombre, link: initPoint, emailEnviado, waEnviado });
        cargar();
      },
    });
  };

  const handleLinkPago = async (monto: number, descripcion: string) => {
    if (!modalCobro) return;
    const res = await apiFetch(`admin/empresas/${modalCobro.id}/link-pago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monto, descripcion }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error generando link');
    const initPoint = data.initPoint;
    await navigator.clipboard?.writeText(initPoint).catch(() => {});
    const mensajeWa = `Hola! Te enviamos el link para realizar el pago de *ActivaQR*:\n\n${initPoint}\n\nPodés pagar con tarjeta, Prex o cualquier medio disponible.`;
    setModalCobro(null);
    setModalWa({
      titulo: 'Enviar link por WhatsApp',
      nombreEmpresa: modalCobro.nombre,
      mensaje: mensajeWa,
      onDone: (waEnviado) => {
        setModalWa(null);
        setResultadoSub({ empresaNombre: modalCobro.nombre, link: initPoint, emailEnviado: false, waEnviado });
        cargar();
      },
    });
  };

  const handleStripeSubscripcion = async (monto: number, moneda: 'usd' | 'uyu') => {
    if (!modalCobro) return;
    const res = await generarStripeSubscripcion(modalCobro.id, monto, moneda);
    await navigator.clipboard?.writeText(res.sessionUrl).catch(() => {});
    const mensajeWa = `Hola! Te enviamos el link para activar tu suscripcion en *ActivaQR*:\n\n${res.sessionUrl}\n\nPodés pagar con tarjeta internacional.`;
    setModalCobro(null);
    setModalWa({
      titulo: 'Enviar link por WhatsApp',
      nombreEmpresa: modalCobro.nombre,
      mensaje: mensajeWa,
      onDone: (waEnviado) => {
        setModalWa(null);
        setResultadoSub({ empresaNombre: modalCobro.nombre, link: res.sessionUrl, emailEnviado: false, waEnviado });
        cargar();
      },
    });
  };

  const handleStripeLinkPago = async (monto: number, moneda: 'usd' | 'uyu', descripcion: string) => {
    if (!modalCobro) return;
    const res = await generarStripeLinkPago(modalCobro.id, monto, moneda, descripcion);
    await navigator.clipboard?.writeText(res.sessionUrl).catch(() => {});
    const mensajeWa = `Hola! Te enviamos el link para realizar el pago de *ActivaQR*:\n\n${res.sessionUrl}\n\nPodés pagar con tarjeta internacional.`;
    setModalCobro(null);
    setModalWa({
      titulo: 'Enviar link por WhatsApp',
      nombreEmpresa: modalCobro.nombre,
      mensaje: mensajeWa,
      onDone: (waEnviado) => {
        setModalWa(null);
        setResultadoSub({ empresaNombre: modalCobro.nombre, link: res.sessionUrl, emailEnviado: false, waEnviado });
        cargar();
      },
    });
  };

  const cancelar = async (emp: EmpresaAdmin) => {
    if (!confirm(`¿Cancelar la suscripción de "${emp.nombre}"?\nEsto la dará de baja en Mercado Pago.`)) return;
    try {
      await cancelarSuscripcion(emp.id);
      cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo cancelar la suscripción.');
    }
  };

  const abrirAccesoRemoto = async (emp: EmpresaAdmin) => {
    const permiso = permisos[emp.id];
    if (permiso?.estado === 'activo') {
      setPanelRemoto({ empresa: emp, permiso });
      return;
    }
    // Solicitar acceso nuevo.
    const costoStr = prompt(`Costo mensual adicional del servicio de soporte para "${emp.nombre}" (ARS, dejá vacío si es sin cargo):`);
    const costo = costoStr ? Number(costoStr) : undefined;
    try {
      const { permiso: nuevo, linkAprobacion, emailEnviado } = await solicitarAccesoRemoto(emp.id, costo);
      setPermisos((prev) => ({ ...prev, [emp.id]: nuevo }));

      const msgRemoto = `Hola! Te enviamos una solicitud de acceso remoto de soporte desde *ActivaQR*.\nAprobá el acceso desde este link:\n\n${linkAprobacion}\n\nTambién podés aprobarlo directamente desde la sección *Mensajes* en la app.`;

      const telefonoCliente = emp.usuarios[0]?.telefono ?? undefined;
      setModalWa({
        titulo: 'Enviar solicitud por WhatsApp',
        nombreEmpresa: emp.nombre,
        mensaje: msgRemoto,
        numeroPreset: telefonoCliente,
        onDone: (waAbierto) => {
          setModalWa(null);
          setResultadoRemoto({ empresaNombre: emp.nombre, link: linkAprobacion, emailEnviado, waAbierto });
        },
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al solicitar acceso remoto.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-sketch text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Building2 size={32} /> Administración
            {solicitudes.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white text-xs font-black border-2 border-slate-900">
                {solicitudes.length}
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{empresas.length} empresas registradas</p>
          {stripeOk === false && (
            <div className="flex items-center gap-1.5 mt-1 text-xs font-black uppercase tracking-wide text-amber-700 bg-amber-50 border-2 border-amber-400 px-2 py-1 w-fit">
              <AlertTriangle size={13} /> Stripe no configurado — USD/UYU no disponible
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const res = await apiFetch('admin/seed-demo', { method: 'POST' });
                if (res.ok) { cargar(); } else { alert('Error al recrear demo'); }
              } catch { alert('Error al recrear demo'); }
            }}
            className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 font-sketch font-bold uppercase border-2 border-slate-900 shadow-[3px_3px_0px_0px_#1e293b] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-sm"
            title="Recrear empresa y usuario demo si fueron eliminados"
          >
            Recrear demo
          </button>
          <button
            onClick={() => exportarCsv('empresas', empresas.map((e) => ({
              Nombre: e.nombre,
              CUIT: e.cuit ?? '',
              Plan: e.plan,
              Estado: e.estado,
              Activos: e._count.activos,
              Usuarios: e._count.usuarios,
              'Admin Email': e.usuarios[0]?.email ?? '',
              Suscripcion: e.mpEstadoSub ?? '',
              'Monto Mensual': e.mpMonto ?? '',
              'Ultimo Pago': e.mpUltimoPago ?? '',
              'Creada': e.creadaEn,
            })))}
            className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 font-sketch font-bold uppercase border-2 border-slate-900 shadow-[3px_3px_0px_0px_#1e293b] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-sm"
            title="Exportar lista de empresas a CSV"
          >
            <Download size={16} /> CSV
          </button>
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 font-sketch font-bold uppercase border-2 border-slate-900 shadow-[3px_3px_0px_0px_#1e293b] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            <Plus size={18} /> Nueva empresa
          </button>
        </div>
      </div>

      <NotificacionesPush />

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar empresa por nombre, CUIT o email..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border-2 border-slate-300 pl-9 pr-4 h-11 text-sm outline-none focus:border-orange-500 bg-white font-medium"
        />
      </div>


      {error && (
        <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 font-semibold">
          {error}
        </div>
      )}

      {/* Solicitudes de upgrade */}
      {solicitudes.length > 0 && (
        <div className="border-2 border-orange-400 bg-orange-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4">
          <h2 className="font-sketch font-black text-lg uppercase tracking-tight text-slate-900 flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-orange-500" /> Solicitudes de upgrade
            <span className="inline-flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs font-black border-2 border-slate-900">
              {solicitudes.length}
            </span>
          </h2>
          <div className="space-y-3">
            {solicitudes.map((sol) => (
              <SolicitudUpgradeRow
                key={sol.id}
                solicitud={sol}
                empresas={empresas}
                onProcesar={async () => {
                  const emp = empresas.find((e) => e.id === sol.id);
                  // 1. Aplicar el nuevo plan en la base de datos
                  await actualizarEmpresa(sol.id, { plan: sol.planSolicitado });
                  // 2. Generar link de suscripcion MP
                  if (emp) await suscribir({ ...emp, plan: sol.planSolicitado as EmpresaAdmin['plan'] });
                  // 3. Limpiar la solicitud
                  await descartarSolicitud(sol.id);
                  // 4. Recargar lista completa para reflejar el nuevo plan en las cards
                  cargar();
                }}
                onDescartar={async () => {
                  if (!confirm(`Descartar la solicitud de upgrade de "${sol.nombre}"?`)) return;
                  await descartarSolicitud(sol.id);
                  cargar();
                }}
              />
            ))}
          </div>
        </div>
      )}

      {cargando ? (
        <p className="text-slate-400 py-8 text-center font-sketch text-xl">Cargando…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {empresas.filter((e) => {
            if (!busqueda.trim()) return true;
            const q = busqueda.toLowerCase();
            return (
              e.nombre.toLowerCase().includes(q) ||
              (e.cuit ?? '').includes(q) ||
              e.usuarios.some((u) => u.email.toLowerCase().includes(q))
            );
          }).map((emp) => {
            const abierta = expandidas.has(emp.id);
            return (
            <div
              key={emp.id}
              className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#1e293b]"
            >
              {/* Cabecera clicable */}
              <button
                onClick={() => toggleExpand(emp.id)}
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-sketch font-black text-lg text-slate-900 leading-tight truncate">
                      {emp.nombre}
                    </h3>
                    {emp.cuit && <p className="text-xs font-mono text-slate-500">{emp.cuit}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-black uppercase px-2 py-1 border-2 ${
                        emp.estado === 'activa'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                          : 'bg-red-50 border-red-400 text-red-700'
                      }`}
                    >
                      {emp.estado}
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${abierta ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {emp.esTrial && (() => {
                  const ahora = Date.now();
                  const fin = emp.trialFin ? new Date(emp.trialFin).getTime() : 0;
                  const lecturaFin = emp.trialLecturaFin ? new Date(emp.trialLecturaFin).getTime() : 0;
                  const fase = ahora < fin ? 'activo' : ahora < lecturaFin ? 'lectura' : 'vencido';
                  const diasCompleto = fase === 'activo' ? Math.ceil((fin - ahora) / 86400000) : 0;
                  const diasLectura = fase === 'lectura' ? Math.ceil((lecturaFin - ahora) / 86400000) : 0;
                  return (
                    <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 border-2 text-xs font-black uppercase ${
                      fase === 'activo' ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : fase === 'lectura' ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-red-400 bg-red-50 text-red-700'
                    }`}>
                      <Clock size={11} />
                      {fase === 'activo' && `Trial — ${diasCompleto}d restantes`}
                      {fase === 'lectura' && `Solo lectura — ${diasLectura}d`}
                      {fase === 'vencido' && 'Trial vencido'}
                    </div>
                  );
                })()}

                <div className="flex gap-3 mt-2 text-xs font-mono text-slate-600 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Package size={13} /> {emp._count.activos} activos
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={13} /> {emp._count.usuarios}
                  </span>
                  <span className="ml-auto uppercase font-black text-orange-600">{emp.plan}</span>
                </div>

                {emp.usuarios[0] && (
                  <p className="text-xs text-slate-500 mt-1 font-mono truncate">
                    {emp.usuarios[0].email}
                    {emp.usuarios[0].telefono && (
                      <span className="ml-2 text-slate-400">· {emp.usuarios[0].telefono}</span>
                    )}
                  </p>
                )}

                {emp.mpEstadoSub && (
                  <p className="text-xs mt-1 font-mono text-slate-600">
                    <span className="uppercase font-black text-slate-400">Sub:</span>{' '}
                    <span className={emp.mpEstadoSub === 'authorized' ? 'text-emerald-600' : 'text-amber-600'}>
                      {emp.mpEstadoSub}
                    </span>
                    {emp.mpMonto ? ` · $${emp.mpMonto}/mes` : ''}
                  </p>
                )}
                <p className="text-[10px] font-mono text-slate-400 mt-1">
                  Alta: {new Date(emp.creadaEn).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </button>

              {/* Panel de operaciones desplegable */}
              {abierta && (
                <div className="border-t-2 border-slate-900 p-3 bg-slate-50 space-y-2">
                  {/* Cambio de plan manual */}
                  <div className="flex gap-2">
                    {(['inicial', 'empresa', 'industrial'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={async () => {
                          if (emp.plan === p) return;
                          await actualizarEmpresa(emp.id, { plan: p });
                          cargar();
                        }}
                        className={`flex-1 py-1.5 text-xs font-black uppercase border-2 transition-colors ${
                          emp.plan === p
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white border-slate-300 hover:border-orange-500 hover:text-orange-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => toggleEstado(emp)}
                    disabled={toggling.has(emp.id)}
                    className="w-full flex items-center gap-2 border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold hover:border-slate-900 transition-colors disabled:opacity-50"
                  >
                    <Power size={15} className={toggling.has(emp.id) ? 'animate-spin' : ''} />
                    {toggling.has(emp.id) ? 'Procesando...' : emp.estado === 'activa' ? 'Suspender empresa' : 'Activar empresa'}
                  </button>

                  <button
                    onClick={() => suscribir(emp)}
                    className="w-full flex items-center gap-2 border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold hover:border-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <CreditCard size={15} /> Generar cobro
                  </button>

                  {emp.mpPreapprovalId && emp.mpEstadoSub !== 'cancelled' && (
                    <button
                      onClick={() => cancelar(emp)}
                      className="w-full flex items-center gap-2 border-2 border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 hover:border-red-600 transition-colors"
                    >
                      <XCircle size={15} /> Cancelar suscripcion
                    </button>
                  )}

                  <button
                    onClick={() => resetear(emp)}
                    className="w-full flex items-center gap-2 border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold hover:border-slate-900 transition-colors"
                  >
                    <KeyRound size={15} /> Resetear contrasena
                  </button>

                  {(['empresa', 'industrial'].includes(emp.plan) || permisos[emp.id] != null) && (
                    <button
                      onClick={() => abrirAccesoRemoto(emp)}
                      className={`w-full flex items-center gap-2 border-2 bg-white px-3 py-2 text-sm font-bold transition-colors ${
                        permisos[emp.id]?.estado === 'activo'
                          ? 'border-emerald-400 text-emerald-700 hover:border-emerald-600'
                          : permisos[emp.id]?.estado === 'pendiente'
                            ? 'border-amber-400 text-amber-700 hover:border-amber-600'
                            : 'border-slate-300 hover:border-orange-500 hover:text-orange-600'
                      }`}
                    >
                      <MonitorSmartphone size={15} />
                      {permisos[emp.id]?.estado === 'activo' ? 'Abrir panel remoto' : permisos[emp.id]?.estado === 'pendiente' ? 'Acceso remoto pendiente' : 'Solicitar acceso remoto'}
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      if (!confirm(`Sembrar dataset demo "Escuela Nueva Austral" en ${emp.nombre}?\n\nCrea 50 activos con prefijo AUS-, 18 meses de mediciones y tareas, incluyendo casos de tendencia para el modulo predictivo.\n\nIdempotente: re-corre sin duplicar. Los activos del cliente sin prefijo AUS- no se tocan.`)) return;
                      try {
                        const res = await apiFetch(`admin/empresas/${emp.id}/seed-austral`, { method: 'POST' });
                        if (!res.ok) { alert('Error al sembrar dataset.'); return; }
                        const r = await res.json();
                        alert(`Listo.\n\nSectores nuevos: ${r.sectoresCreados}\nTipos nuevos: ${r.tiposCreados}\nActivos nuevos: ${r.activosCreados}\nActivos reseedeados: ${r.activosExistentes}\nMediciones: ${r.medicionesCreadas}\nTareas: ${r.tareasCreadas}`);
                        cargar();
                      } catch { alert('Error al sembrar dataset.'); }
                    }}
                    className="w-full flex items-center gap-2 border-2 border-violet-300 bg-white px-3 py-2 text-sm font-bold text-violet-700 hover:border-violet-600 transition-colors"
                  >
                    <Sparkles size={15} /> Sembrar dataset Austral
                  </button>

                  <button
                    onClick={() => borrar(emp)}
                    className="w-full flex items-center gap-2 border-2 border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-600 hover:border-red-600 transition-colors"
                  >
                    <Trash2 size={15} /> Eliminar empresa
                  </button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {modalAbierto && (
        <ModalNuevaEmpresa
          onClose={() => setModalAbierto(false)}
          onCreada={() => {
            setModalAbierto(false);
            cargar();
          }}
        />
      )}

      {panelRemoto && (
        <PanelAccesoRemoto
          empresaId={panelRemoto.empresa.id}
          empresaNombre={panelRemoto.empresa.nombre}
          permiso={panelRemoto.permiso}
          onClose={() => setPanelRemoto(null)}
        />
      )}

      {resultadoRemoto && (
        <ModalResultadoRemoto
          empresaNombre={resultadoRemoto.empresaNombre}
          link={resultadoRemoto.link}
          emailEnviado={resultadoRemoto.emailEnviado}
          waAbierto={resultadoRemoto.waAbierto}
          onClose={() => setResultadoRemoto(null)}
        />
      )}

      {resultadoSub && (
        <ModalResultadoSuscripcion
          empresaNombre={resultadoSub.empresaNombre}
          link={resultadoSub.link}
          emailEnviado={resultadoSub.emailEnviado}
          waEnviado={resultadoSub.waEnviado}
          onClose={() => setResultadoSub(null)}
        />
      )}

      {modalWa && (
        <ModalWhatsapp
          titulo={modalWa.titulo}
          nombreEmpresa={modalWa.nombreEmpresa}
          numeroPreset={modalWa.numeroPreset}
          onConfirm={(numero) => {
            const texto = encodeURIComponent(modalWa.mensaje);
            const esMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const url = esMobile
              ? `whatsapp://send?phone=${numero}&text=${texto}`
              : `https://web.whatsapp.com/send?phone=${numero}&text=${texto}`;
            window.open(url, '_blank');
            modalWa.onDone(true);
          }}
          onOmitir={() => modalWa.onDone(false)}
        />
      )}
      {modalCobro && (
        <ModalCobro
          empresa={modalCobro}
          onClose={() => setModalCobro(null)}
          onSuscripcion={handleSuscripcion}
          onLinkPago={handleLinkPago}
          onStripeSuscripcion={handleStripeSubscripcion}
          onStripeLinkPago={handleStripeLinkPago}
        />
      )}
      {modalResetPass && (
        <ModalResetPass
          empresa={modalResetPass}
          onClose={() => setModalResetPass(null)}
          onConfirm={confirmarResetPass}
        />
      )}
    </div>
  );
};

const ModalNuevaEmpresa: React.FC<{ onClose: () => void; onCreada: () => void }> = ({
  onClose,
  onCreada,
}) => {
  const [form, setForm] = useState({
    nombre: '',
    cuit: '',
    plan: 'inicial',
    adminNombre: '',
    adminEmail: '',
    adminPassword: '',
    adminTelefono: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await crearEmpresa(form);
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la empresa.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_#1e293b] w-full max-w-md my-8">
        <div className="flex items-center justify-between border-b-2 border-slate-900 px-5 py-3">
          <h2 className="font-sketch font-black text-xl uppercase">Nueva empresa</h2>
          <button onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          <Campo label="Nombre de la empresa *">
            <input
              required
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              className="campo"
            />
          </Campo>
          <Campo label="CUIT">
            <input value={form.cuit} onChange={(e) => set('cuit', e.target.value)} className="campo" />
          </Campo>
          <Campo label="Plan">
            <select value={form.plan} onChange={(e) => set('plan', e.target.value)} className="campo">
              {PLANES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Campo>

          <div className="pt-2 border-t-2 border-slate-100">
            <p className="text-xs font-black uppercase tracking-wider text-orange-600 mb-2">
              Usuario administrador de la empresa
            </p>
            <Campo label="Nombre">
              <input
                value={form.adminNombre}
                onChange={(e) => set('adminNombre', e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo label="Email *">
              <input
                required
                type="email"
                value={form.adminEmail}
                onChange={(e) => set('adminEmail', e.target.value)}
                className="campo font-mono"
              />
            </Campo>
            <Campo label="Contraseña *">
              <input
                required
                value={form.adminPassword}
                onChange={(e) => set('adminPassword', e.target.value)}
                className="campo font-mono"
              />
            </Campo>
            <Campo label="Telefono (WhatsApp)">
              <input
                type="tel"
                value={form.adminTelefono}
                onChange={(e) => set('adminTelefono', e.target.value)}
                placeholder="Ej: 2995012345 (sin 0, sin 15)"
                className="campo font-mono"
              />
            </Campo>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 text-sm px-3 py-2 font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-orange-500 text-white h-11 font-sketch font-black uppercase border-2 border-slate-900 shadow-[3px_3px_0px_0px_#1e293b] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50"
          >
            {guardando ? 'Creando…' : 'Crear empresa'}
          </button>
        </form>
      </div>

      <style>{`
        .campo {
          width: 100%;
          border: 2px solid #cbd5e1;
          padding: 0.5rem 0.75rem;
          outline: none;
        }
        .campo:focus { border-color: #f97316; }
      `}</style>
    </div>
  );
};

// ── Shared link result row ─────────────────────────────────────────────────────
const EstadoRow: React.FC<{ ok: boolean; textoOk: string; textoNo: string }> = ({ ok, textoOk, textoNo }) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <span className={`w-6 h-6 flex items-center justify-center text-xs font-black border-2 flex-shrink-0 ${ok ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-amber-50 border-amber-300 text-amber-600'}`}>
      {ok ? '✓' : '!'}
    </span>
    <span className="text-sm font-semibold text-slate-700">{ok ? textoOk : textoNo}</span>
  </div>
);

const LinkCopiable: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">{label}</p>
    <div className="flex gap-2">
      <input readOnly value={value} className="flex-1 border-2 border-slate-300 px-3 py-2 text-xs font-mono truncate outline-none bg-slate-50" onFocus={(e) => e.target.select()} />
      <button onClick={() => navigator.clipboard?.writeText(value)} className="border-2 border-slate-900 px-4 text-xs font-black bg-white hover:bg-slate-100 transition-colors whitespace-nowrap">
        Copiar
      </button>
    </div>
  </div>
);

const ModalResultadoSuscripcion: React.FC<{
  empresaNombre: string; link: string; emailEnviado: boolean; waEnviado: boolean; onClose: () => void;
}> = ({ empresaNombre, link, emailEnviado, waEnviado, onClose }) => (
  <Modal titulo="Link generado" icono={<CreditCard size={16} />} onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Link para <strong className="text-slate-900">{empresaNombre}</strong> copiado al portapapeles.</p>
      <div className="border-2 border-slate-200 divide-y-2 divide-slate-200">
        <EstadoRow ok={waEnviado} textoOk="WhatsApp abierto con el mensaje listo" textoNo="WhatsApp no enviado" />
        <EstadoRow ok={emailEnviado} textoOk="Email enviado automaticamente" textoNo="Email no enviado (sin RESEND_API_KEY)" />
      </div>
      <LinkCopiable label="Link de pago" value={link} />
      <button onClick={onClose} className={btnPrimary}>Listo</button>
    </div>
  </Modal>
);

const ModalResultadoRemoto: React.FC<{
  empresaNombre: string; link: string; emailEnviado: boolean; waAbierto: boolean; onClose: () => void;
}> = ({ empresaNombre, link, emailEnviado, waAbierto, onClose }) => (
  <Modal titulo="Solicitud enviada" icono={<MonitorSmartphone size={16} />} onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Solicitud de acceso remoto para <strong className="text-slate-900">{empresaNombre}</strong>. El cliente debe aprobar desde el link.
      </p>
      <div className="border-2 border-slate-200 divide-y-2 divide-slate-200">
        <EstadoRow ok={waAbierto} textoOk="WhatsApp abierto con mensaje listo" textoNo="WhatsApp bloqueado — copiá el link manualmente" />
        <EstadoRow ok={emailEnviado} textoOk="Email de aprobacion enviado" textoNo="Email no enviado (sin RESEND_API_KEY)" />
      </div>
      <LinkCopiable label="Link de aprobacion para el cliente" value={link} />
      {!waAbierto && (
        <div className="bg-amber-50 border-2 border-amber-300 px-3 py-2 text-xs text-amber-800 font-semibold">
          Copiá el link de arriba y envialo manualmente por WhatsApp.
        </div>
      )}
      <button onClick={onClose} className={btnPrimary}>Listo</button>
    </div>
  </Modal>
);

const PLAN_LABEL: Record<string, string> = { inicial: 'Inicial', empresa: 'Empresa', industrial: 'Industrial' };

const SolicitudUpgradeRow: React.FC<{
  solicitud: SolicitudUpgrade;
  empresas: EmpresaAdmin[];
  onProcesar: () => Promise<void>;
  onDescartar: () => Promise<void>;
}> = ({ solicitud, onProcesar, onDescartar }) => {
  const [procesando, setProcesando] = useState(false);
  const [descartando, setDescartando] = useState(false);

  return (
    <div className="bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 flex items-center justify-between flex-wrap gap-3">
      <div className="min-w-0">
        <p className="font-sketch font-black text-slate-900 text-base leading-tight">{solicitud.nombre}</p>
        {solicitud.adminEmail && (
          <p className="text-xs font-mono text-slate-500 mt-0.5">{solicitud.adminEmail}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-black uppercase px-2 py-0.5 border-2 border-slate-300 text-slate-600">
            {PLAN_LABEL[solicitud.plan] ?? solicitud.plan}
          </span>
          <ArrowRight size={14} className="text-orange-500 flex-shrink-0" />
          <span className="text-xs font-black uppercase px-2 py-0.5 border-2 border-orange-400 bg-orange-50 text-orange-700">
            {PLAN_LABEL[solicitud.planSolicitado] ?? solicitud.planSolicitado}
          </span>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={async () => { setProcesando(true); try { await onProcesar(); } finally { setProcesando(false); } }}
          disabled={procesando || descartando}
          className="px-4 py-2 bg-orange-500 text-white border-2 border-slate-900 font-black uppercase text-xs shadow-[2px_2px_0px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50"
        >
          {procesando ? '...' : 'Procesar'}
        </button>
        <button
          onClick={async () => { setDescartando(true); try { await onDescartar(); } finally { setDescartando(false); } }}
          disabled={procesando || descartando}
          className="px-4 py-2 border-2 border-red-300 text-red-600 font-bold text-xs hover:border-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {descartando ? '...' : 'Descartar'}
        </button>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; valor: number }> = ({ label, valor }) => (
  <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#1e293b] p-3 text-center">
    <p className="font-sketch font-black text-3xl sm:text-4xl text-orange-500 leading-none">{valor}</p>
    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 mt-1">{label}</p>
  </div>
);

export const PanelEstadisticas: React.FC<{ estadisticas: Estadisticas; onReiniciar: () => void }> = ({ estadisticas, onReiniciar }) => {
  const maxVisitas = estadisticas.topFichas.reduce((m, f) => Math.max(m, f.visitas), 0) || 1;
  const maxSeccion = (estadisticas.topSecciones ?? []).reduce((m, s) => Math.max(m, s.visitas), 0) || 1;
  return (
    <div className="border-2 border-slate-900 bg-slate-50 shadow-[4px_4px_0px_0px_#1e293b] p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-sketch font-black text-lg uppercase tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 size={20} className="text-orange-500" /> Visitas
        </h2>
        <button
          onClick={onReiniciar}
          className="text-xs font-bold uppercase tracking-wide text-slate-500 border-2 border-slate-300 px-3 py-1.5 hover:border-red-400 hover:text-red-500 transition-colors"
        >
          Reiniciar contador
        </button>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <Globe size={14} /> Landing
        </p>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Hoy" valor={estadisticas.landingHoy} />
          <StatCard label="Semana" valor={estadisticas.landingSemana} />
          <StatCard label="Total" valor={estadisticas.landingTotal} />
        </div>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <QrCode size={14} /> Fichas QR
        </p>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Hoy" valor={estadisticas.fichasHoy} />
          <StatCard label="Semana" valor={estadisticas.fichasSemana} />
          <StatCard label="Total" valor={estadisticas.fichasTotal} />
        </div>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Equipos mas escaneados</p>
        {estadisticas.topFichas.length === 0 ? (
          <p className="text-sm text-slate-400 font-semibold py-2">Aun no hay escaneos registrados.</p>
        ) : (
          <div className="space-y-2">
            {estadisticas.topFichas.map((f) => (
              <div
                key={f.activoId}
                className="bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#1e293b] p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-orange-500">{f.codigo}</p>
                    <p className="font-sketch font-black text-sm text-slate-900 leading-tight truncate">{f.nombre}</p>
                    <p className="text-xs text-slate-500 truncate">{f.empresa}</p>
                  </div>
                  <span className="font-sketch font-black text-2xl text-slate-900 shrink-0">{f.visitas}</span>
                </div>
                <div className="mt-2 h-2 bg-slate-100 border border-slate-300">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${Math.round((f.visitas / maxVisitas) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {estadisticas.topCiudades?.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <MapPin size={14} /> Ciudades de origen
          </p>
          <div className="space-y-1.5">
            {estadisticas.topCiudades.map((c) => (
              <div key={c.ciudad} className="flex items-center justify-between gap-2 bg-white border-2 border-slate-200 px-3 py-1.5">
                <span className="text-sm font-semibold text-slate-800">{c.ciudad} <span className="text-slate-400 font-normal text-xs">{c.pais}</span></span>
                <span className="font-black text-slate-900 text-sm">{c.visitas}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {estadisticas.dispositivos && (
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Dispositivos</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#1e293b] p-2.5 flex flex-col items-center gap-1">
              <Smartphone size={16} className="text-orange-500" />
              <span className="font-black text-xl text-slate-900">{estadisticas.dispositivos.mobile}</span>
              <span className="text-[10px] font-black uppercase text-slate-500">Celular</span>
            </div>
            <div className="bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#1e293b] p-2.5 flex flex-col items-center gap-1">
              <Monitor size={16} className="text-orange-500" />
              <span className="font-black text-xl text-slate-900">{estadisticas.dispositivos.desktop}</span>
              <span className="text-[10px] font-black uppercase text-slate-500">Desktop</span>
            </div>
            <div className="bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#1e293b] p-2.5 flex flex-col items-center gap-1">
              <Tablet size={16} className="text-orange-500" />
              <span className="font-black text-xl text-slate-900">{estadisticas.dispositivos.tablet}</span>
              <span className="text-[10px] font-black uppercase text-slate-500">Tablet</span>
            </div>
          </div>
        </div>
      )}

      {estadisticas.trials && (
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Cuentas de prueba</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#1e293b] p-2.5 flex flex-col items-center gap-0.5">
              <span className="font-black text-xl text-slate-900">{estadisticas.trials.total}</span>
              <span className="text-[10px] font-black uppercase text-slate-500">Total</span>
            </div>
            <div className="bg-white border-2 border-emerald-500 shadow-[2px_2px_0px_0px_#1e293b] p-2.5 flex flex-col items-center gap-0.5">
              <span className="font-black text-xl text-emerald-600">{estadisticas.trials.activos}</span>
              <span className="text-[10px] font-black uppercase text-slate-500">Activos</span>
            </div>
            <div className="bg-white border-2 border-amber-500 shadow-[2px_2px_0px_0px_#1e293b] p-2.5 flex flex-col items-center gap-0.5">
              <span className="font-black text-xl text-amber-600">{estadisticas.trials.lectura}</span>
              <span className="text-[10px] font-black uppercase text-slate-500">Lectura</span>
            </div>
            <div className="bg-white border-2 border-red-400 shadow-[2px_2px_0px_0px_#1e293b] p-2.5 flex flex-col items-center gap-0.5">
              <span className="font-black text-xl text-red-600">{estadisticas.trials.vencidos}</span>
              <span className="text-[10px] font-black uppercase text-slate-500">Vencidos</span>
            </div>
          </div>
        </div>
      )}

      {estadisticas.topSecciones?.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Secciones más usadas</p>
          <div className="space-y-1.5">
            {estadisticas.topSecciones.map((s) => (
              <div key={s.seccion} className="bg-white border-2 border-slate-200 px-3 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{s.seccion}</span>
                  <span className="font-black text-slate-900 text-sm">{s.visitas}</span>
                </div>
                <div className="mt-1 h-1.5 bg-slate-100">
                  <div className="h-full bg-orange-500" style={{ width: `${Math.round((s.visitas / maxSeccion) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-2">
    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
      {label}
    </label>
    {children}
  </div>
);

