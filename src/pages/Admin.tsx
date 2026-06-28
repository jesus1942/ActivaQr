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
  <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-safe" onClick={onClose}>
    <div
      className={`bg-surface/85 backdrop-blur-xl border border-line shadow-soft w-full ${maxW} max-h-[92vh] overflow-y-auto`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between bg-slate-900 text-white px-5 py-4 sticky top-0">
        <h2 className="font-display font-black text-base uppercase tracking-wide flex items-center gap-2">
          {icono}{titulo}
        </h2>
        <button onClick={onClose} className="text-faint hover:text-white transition-colors"><X size={20} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

// ── Campo helper ───────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-faint mt-1">{hint}</p>}
  </div>
);

const inputCls = "w-full border border-line px-3 h-11 text-sm outline-none focus:border-brand-600 bg-surface font-medium";
const btnPrimary = "w-full bg-brand-600 text-white h-12 font-display font-black uppercase tracking-wide border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-40 disabled:pointer-events-none";
const btnSecondary = "w-full h-12 border border-line-strong text-sm font-bold text-muted hover:border-content transition-colors";

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
      <div className="flex gap-0 mb-4 border border-line">
        {(['ARS', 'USD', 'UYU'] as Moneda[]).map((m, i) => (
          <button
            key={m}
            type="button"
            onClick={() => setMoneda(m)}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wide transition-colors ${i > 0 ? 'border-l-2 border-line' : ''} ${moneda === m ? 'bg-slate-900 text-white' : 'bg-surface text-muted hover:bg-subtle'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Selector de modo */}
      <div className="flex gap-0 mb-6 border border-line">
        <button
          type="button"
          onClick={() => setModo('suscripcion')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wide transition-colors ${modo === 'suscripcion' ? 'bg-brand-600 text-white' : 'bg-surface text-muted hover:bg-subtle'}`}
        >
          Suscripcion mensual
        </button>
        <button
          type="button"
          onClick={() => setModo('unico')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wide border-l-2 border-line transition-colors ${modo === 'unico' ? 'bg-brand-600 text-white' : 'bg-surface text-muted hover:bg-subtle'}`}
        >
          Pago unico
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-subtle border border-line px-4 py-3 mb-2">
          <p className="text-xs text-muted font-semibold">{infoTexto}</p>
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

        {err && <p className="text-xs font-bold text-danger bg-danger/10 border border-danger px-3 py-2">{err}</p>}

        <button type="submit" disabled={cargando} className={btnPrimary}>
          {cargando ? 'Generando...' : 'Generar link de cobro'}
        </button>
        <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
      </form>
    </Modal>
  );
};

// ── Modal reset password ───────────────────────────────────────────────────────
const ModalResetPass: React.FC<{ empresa: EmpresaAdmin; onClose: () => void; onConfirm: (currentPassword: string) => Promise<void> }> = ({
  empresa, onClose, onConfirm,
}) => {
  const [pass, setPass] = useState('');
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pass) { setErr('Reingresa tu contrasena para confirmar.'); return; }
    setErr(''); setCargando(true);
    try { await onConfirm(pass); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Error.'); }
    finally { setCargando(false); }
  };

  return (
    <Modal titulo="Resetear contraseña" icono={<KeyRound size={16} />} onClose={onClose}>
      <div className="space-y-3 mb-5">
        <p className="text-sm text-content">
          Vamos a resetear la contraseña del administrador de <strong>{empresa.nombre}</strong>.
        </p>
        <div className="border border-warn bg-warn/10 p-3 text-xs text-warn-strong dark:text-warn leading-snug space-y-1">
          <p className="font-bold">Que va a pasar:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>La contraseña actual del cliente queda invalidada al instante.</li>
            <li>Al cliente le llega un link por Telegram (si tiene) y por email para crear una contraseña nueva.</li>
            <li>El link expira en 1 hora.</li>
            <li>Vos NO eliges su nueva contraseña — la define el cliente.</li>
          </ul>
        </div>
        <p className="text-xs text-muted">Reingresa <strong>tu</strong> contrasena para confirmar la operacion.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tu contraseña (la del superadmin)">
          <input
            type="password"
            autoFocus
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            className={inputCls + ' font-mono'}
          />
        </Field>
        {err && <p className="text-xs font-bold text-danger bg-danger/10 border border-danger px-3 py-2">{err}</p>}
        <button type="submit" disabled={cargando} className={btnPrimary}>{cargando ? 'Reseteando...' : 'Resetear y notificar al cliente'}</button>
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
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-safe">
      <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border border-line px-5 py-3 bg-slate-900 text-white">
          <h2 className="font-display font-black text-base uppercase tracking-wide">{titulo}</h2>
          <button onClick={onOmitir}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted">
            WhatsApp de <strong>{nombreEmpresa}</strong> para enviar el link directamente.
          </p>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Pais</label>
            <select
              value={pais.codigo}
              onChange={(e) => setPais(CODIGOS_PAIS.find((c) => c.codigo === e.target.value) ?? CODIGOS_PAIS[0])}
              className="w-full border border-line px-3 h-11 text-sm font-semibold outline-none focus:border-brand-600 bg-surface"
            >
              {CODIGOS_PAIS.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.bandera} — {c.nombre} (+{c.codigo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">
              Numero (sin 0, sin codigo de pais)
            </label>
            <div className="flex gap-2 items-center">
              <span className="border border-line px-3 h-11 flex items-center font-mono font-black text-content text-sm bg-subtle whitespace-nowrap">
                +{pais.codigo}
              </span>
              <input
                type="tel"
                autoFocus
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="1112345678"
                className="flex-1 border border-line px-3 h-11 text-base font-mono outline-none focus:border-brand-600 text-center min-w-0"
              />
            </div>
            {preview && (
              <p className="text-xs text-muted mt-1.5 font-mono">
                Numero completo: <span className="font-black text-content">{preview}</span>
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onOmitir}
              className="flex-1 py-2.5 border border-line text-sm font-bold text-muted hover:border-content transition-colors"
            >
              Omitir
            </button>
            <button
              onClick={() => completo && onConfirm(completo)}
              disabled={!soloDigitos}
              className="flex-1 py-2.5 bg-slate-900 text-white border border-line text-sm font-black uppercase tracking-wide hover:bg-slate-800 transition-colors disabled:opacity-40"
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
  // Modo seed: oculto por default. Vive en sessionStorage para que muera al
  // cerrar la pestaña; asi nunca queda "ON" entre sesiones por accidente.
  const [modoSeed, setModoSeed] = useState<boolean>(() => sessionStorage.getItem('modoSeed') === '1');
  useEffect(() => { sessionStorage.setItem('modoSeed', modoSeed ? '1' : '0'); }, [modoSeed]);
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

  const confirmarResetPass = async (currentPassword: string) => {
    if (!modalResetPass) return;
    const r = await resetPassword(modalResetPass.id, currentPassword);
    const canalTxt =
      r.canal === 'telegram' ? 'Telegram + email (doble canal)' :
      r.canal === 'admin-fallback' ? 'email del cliente (Telegram no configurado, link enviado a tu Telegram de soporte)' :
      'email del cliente';
    alert(`Contraseña reseteada en ${modalResetPass.nombre}.\n\nNotificacion enviada al cliente por:\n${canalTxt}\n\nEmail: ${r.email}\nTelegram cliente: ${r.telegram ? 'si' : 'no'}\n\nEl link expira en 1 hora. El cliente define su nueva contraseña.`);
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
      {modoSeed && (
        <div className="flex items-center justify-between gap-3 bg-danger text-white border border-danger px-4 py-2 font-black uppercase tracking-wider text-sm shadow-soft">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} /> Modo seed activo — operaciones destructivas habilitadas
          </span>
          <button
            onClick={() => setModoSeed(false)}
            className="bg-surface text-danger-strong dark:text-danger px-3 py-1 border border-danger text-xs font-black hover:bg-danger/10"
          >
            Desactivar
          </button>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-content uppercase tracking-tight flex items-center gap-2">
            <Building2 size={32} /> Administración
            {solicitudes.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-brand-600 text-white text-xs font-black border border-line">
                {solicitudes.length}
              </span>
            )}
          </h1>
          <p className="text-muted text-sm mt-1">{empresas.length} empresas registradas</p>
          {stripeOk === false && (
            <div className="flex items-center gap-1.5 mt-1 text-xs font-black uppercase tracking-wide text-warn-strong dark:text-warn bg-warn/10 border border-warn px-2 py-1 w-fit">
              <AlertTriangle size={13} /> Stripe no configurado — USD/UYU no disponible
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (modoSeed) { setModoSeed(false); return; }
              const ok = confirm('Activar MODO SEED?\n\nVa a aparecer un boton para sembrar datasets demo en cada empresa. Es destructivo si te equivocas de fila. Solo activalo cuando lo necesites.\n\nSe desactiva automaticamente al cerrar la pestaña.');
              if (ok) setModoSeed(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 font-display font-bold uppercase border border-line shadow-soft hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-sm ${
              modoSeed ? 'bg-danger text-white' : 'bg-surface text-content'
            }`}
            title="Habilita herramientas de seed (destructivas). Oculto por default."
          >
            <Sparkles size={15} /> Seed: {modoSeed ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={async () => {
              try {
                const res = await apiFetch('admin/seed-demo', { method: 'POST' });
                if (res.ok) { cargar(); } else { alert('Error al recrear demo'); }
              } catch { alert('Error al recrear demo'); }
            }}
            className="flex items-center gap-2 bg-surface text-content px-4 py-2 font-display font-bold uppercase border border-line shadow-soft hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-sm"
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
            className="flex items-center gap-2 bg-surface text-content px-4 py-2 font-display font-bold uppercase border border-line shadow-soft hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-sm"
            title="Exportar lista de empresas a CSV"
          >
            <Download size={16} /> CSV
          </button>
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 font-display font-bold uppercase border border-line shadow-soft hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            <Plus size={18} /> Nueva empresa
          </button>
        </div>
      </div>

      <NotificacionesPush />

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar empresa por nombre, CUIT o email..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-line pl-9 pr-4 h-11 text-sm outline-none focus:border-brand-600 bg-surface font-medium"
        />
      </div>


      {error && (
        <div className="bg-danger/10 border border-danger text-danger-strong dark:text-danger px-4 py-3 font-semibold">
          {error}
        </div>
      )}

      {/* Solicitudes de upgrade */}
      {solicitudes.length > 0 && (
        <div className="border border-brand-600 bg-brand-50 shadow-soft p-4">
          <h2 className="font-display font-black text-lg uppercase tracking-tight text-content flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-brand-600" /> Solicitudes de upgrade
            <span className="inline-flex items-center justify-center w-5 h-5 bg-brand-600 text-white text-xs font-black border border-line">
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
        <p className="text-faint py-8 text-center font-display text-xl">Cargando…</p>
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
              className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft"
            >
              {/* Cabecera clicable */}
              <button
                onClick={() => toggleExpand(emp.id)}
                className="w-full text-left p-4 hover:bg-subtle transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-black text-lg text-content leading-tight truncate">
                      {emp.nombre}
                    </h3>
                    {emp.cuit && <p className="text-xs font-mono text-muted">{emp.cuit}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-black uppercase px-2 py-1 border ${
                        emp.estado === 'activa'
                          ? 'bg-ok/10 border-ok text-ok-strong dark:text-ok'
                          : 'bg-danger/10 border-danger text-danger-strong dark:text-danger'
                      }`}
                    >
                      {emp.estado}
                    </span>
                    <ChevronDown size={16} className={`text-faint transition-transform ${abierta ? 'rotate-180' : ''}`} />
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
                    <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 border text-xs font-black uppercase ${
                      fase === 'activo' ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : fase === 'lectura' ? 'border-warn bg-warn/10 text-warn-strong dark:text-warn'
                      : 'border-danger bg-danger/10 text-danger-strong dark:text-danger'
                    }`}>
                      <Clock size={11} />
                      {fase === 'activo' && `Trial — ${diasCompleto}d restantes`}
                      {fase === 'lectura' && `Solo lectura — ${diasLectura}d`}
                      {fase === 'vencido' && 'Trial vencido'}
                    </div>
                  );
                })()}

                <div className="flex gap-3 mt-2 text-xs font-mono text-muted flex-wrap">
                  <span className="flex items-center gap-1">
                    <Package size={13} /> {emp._count.activos} activos
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={13} /> {emp._count.usuarios}
                  </span>
                  <span className="ml-auto uppercase font-black text-brand-600">{emp.plan}</span>
                </div>

                {emp.usuarios[0] && (
                  <p className="text-xs text-muted mt-1 font-mono truncate">
                    {emp.usuarios[0].email}
                    {emp.usuarios[0].telefono && (
                      <span className="ml-2 text-faint">· {emp.usuarios[0].telefono}</span>
                    )}
                  </p>
                )}

                {emp.mpEstadoSub && (
                  <p className="text-xs mt-1 font-mono text-muted">
                    <span className="uppercase font-black text-faint">Sub:</span>{' '}
                    <span className={emp.mpEstadoSub === 'authorized' ? 'text-ok-strong dark:text-ok' : 'text-warn-strong dark:text-warn'}>
                      {emp.mpEstadoSub}
                    </span>
                    {emp.mpMonto ? ` · $${emp.mpMonto}/mes` : ''}
                  </p>
                )}
                <p className="text-[10px] font-mono text-faint mt-1">
                  Alta: {new Date(emp.creadaEn).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </button>

              {/* Panel de operaciones desplegable */}
              {abierta && (
                <div className="border border-line p-3 bg-subtle space-y-2">
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
                        className={`flex-1 py-1.5 text-xs font-black uppercase border transition-colors ${
                          emp.plan === p
                            ? 'bg-slate-900 text-white border-line'
                            : 'bg-surface border-line hover:border-brand-600 hover:text-brand-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => toggleEstado(emp)}
                    disabled={toggling.has(emp.id)}
                    className="w-full flex items-center gap-2 border border-line bg-surface px-3 py-2 text-sm font-bold hover:border-content transition-colors disabled:opacity-50"
                  >
                    <Power size={15} className={toggling.has(emp.id) ? 'animate-spin' : ''} />
                    {toggling.has(emp.id) ? 'Procesando...' : emp.estado === 'activa' ? 'Suspender empresa' : 'Activar empresa'}
                  </button>

                  <button
                    onClick={() => suscribir(emp)}
                    className="w-full flex items-center gap-2 border border-line bg-surface px-3 py-2 text-sm font-bold hover:border-emerald-600 hover:text-ok-strong dark:text-ok transition-colors"
                  >
                    <CreditCard size={15} /> Generar cobro
                  </button>

                  {emp.mpPreapprovalId && emp.mpEstadoSub !== 'cancelled' && (
                    <button
                      onClick={() => cancelar(emp)}
                      className="w-full flex items-center gap-2 border border-danger bg-surface px-3 py-2 text-sm font-bold text-danger hover:border-danger transition-colors"
                    >
                      <XCircle size={15} /> Cancelar suscripcion
                    </button>
                  )}

                  <button
                    onClick={() => resetear(emp)}
                    className="w-full flex items-center gap-2 border border-line bg-surface px-3 py-2 text-sm font-bold hover:border-content transition-colors"
                  >
                    <KeyRound size={15} /> Resetear contrasena
                  </button>

                  {(['empresa', 'industrial'].includes(emp.plan) || permisos[emp.id] != null) && (
                    <button
                      onClick={() => abrirAccesoRemoto(emp)}
                      className={`w-full flex items-center gap-2 border bg-surface px-3 py-2 text-sm font-bold transition-colors ${
                        permisos[emp.id]?.estado === 'activo'
                          ? 'border-ok text-ok-strong dark:text-ok hover:border-emerald-600'
                          : permisos[emp.id]?.estado === 'pendiente'
                            ? 'border-warn text-warn-strong dark:text-warn hover:border-warn'
                            : 'border-line hover:border-brand-600 hover:text-brand-600'
                      }`}
                    >
                      <MonitorSmartphone size={15} />
                      {permisos[emp.id]?.estado === 'activo' ? 'Abrir panel remoto' : permisos[emp.id]?.estado === 'pendiente' ? 'Acceso remoto pendiente' : 'Solicitar acceso remoto'}
                    </button>
                  )}

                  {modoSeed && (
                    <button
                      onClick={async () => {
                        const advertencia =
                          `DATASET: ESCUELA (50 activos)\n\n` +
                          `Sembrar en: ${emp.nombre}\n\n` +
                          `Contiene equipos tipicos de una escuela:\n` +
                          `laptops, tablets, proyectores, splits AC, calefactores,\n` +
                          `dispensers, impresoras, microondas, bombas, grupo electrogeno\n` +
                          `y extractor de cocina. NO sembrar en otros rubros (panaderia,\n` +
                          `alquiler de herramientas, etc) o vas a tener data incoherente.\n\n` +
                          `Crea 18 meses de historial, mediciones, tareas y casos de\n` +
                          `tendencia para el modulo predictivo. Activos con prefijo AUS-.\n\n` +
                          `Idempotente: re-corre sin duplicar.\n` +
                          `Los activos SIN prefijo AUS- NO se tocan.\n\n` +
                          `Para confirmar, escribi el nombre EXACTO de la empresa:`;
                        const confirmacion = prompt(advertencia);
                        if (confirmacion == null) return;
                        if (confirmacion.trim().toLowerCase() !== emp.nombre.trim().toLowerCase()) {
                          alert('Nombre no coincide. Operacion cancelada.');
                          return;
                        }
                        try {
                          const res = await apiFetch(`admin/empresas/${emp.id}/seed-austral`, { method: 'POST' });
                          if (!res.ok) {
                            const detalle = await res.text().catch(() => '');
                            alert(`Error al sembrar dataset (${res.status}).\n\n${detalle.slice(0, 500)}`);
                            return;
                          }
                          const r = await res.json();
                          const passwordsLineas = (r.passwordsIniciales ?? [])
                            .map((p: { email: string; password: string | null }) => p.password
                              ? `  - ${p.email}  /  ${p.password}`
                              : `  - ${p.email}  (ya existia, password no cambio)`)
                            .join('\n');
                          alert(
                            `Listo en ${emp.nombre}.\n\n` +
                            `Sectores nuevos: ${r.sectoresCreados}\n` +
                            `Tipos nuevos: ${r.tiposCreados}\n` +
                            `Activos nuevos: ${r.activosCreados}\n` +
                            `Activos reseedeados: ${r.activosExistentes}\n` +
                            `Mediciones: ${r.medicionesCreadas}\n` +
                            `Tareas: ${r.tareasCreadas}\n` +
                            `Personal nuevo: ${r.personalCreado}\n` +
                            `Personal ya existente: ${r.personalExistente}\n\n` +
                            `Credenciales iniciales:\n${passwordsLineas}\n\n` +
                            `Copialas ahora. No se vuelven a mostrar.`
                          );
                          cargar();
                        } catch (e) {
                          alert(`Error al sembrar dataset.\n\n${e instanceof Error ? e.message : String(e)}`);
                        }
                      }}
                      className="w-full flex items-center gap-2 border border-violet-400 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-800 hover:border-violet-700 transition-colors"
                    >
                      <Sparkles size={15} /> Sembrar dataset ESCUELA (Austral)
                    </button>
                  )}

                  <button
                    onClick={() => borrar(emp)}
                    className="w-full flex items-center gap-2 border border-danger bg-surface px-3 py-2 text-sm font-bold text-danger hover:border-danger transition-colors"
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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft w-full max-w-md my-8">
        <div className="flex items-center justify-between border border-line px-5 py-3">
          <h2 className="font-display font-black text-xl uppercase">Nueva empresa</h2>
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

          <div className="pt-2 border border-line">
            <p className="text-xs font-black uppercase tracking-wider text-brand-600 mb-2">
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
            <div className="bg-danger/10 border border-danger text-danger-strong dark:text-danger text-sm px-3 py-2 font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-brand-600 text-white h-11 font-display font-black uppercase border border-line shadow-soft hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50"
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
    <span className={`w-6 h-6 flex items-center justify-center text-xs font-black border flex-shrink-0 ${ok ? 'bg-ok/10 border-ok text-ok-strong dark:text-ok' : 'bg-warn/10 border-warn text-warn-strong dark:text-warn'}`}>
      {ok ? '✓' : '!'}
    </span>
    <span className="text-sm font-semibold text-content">{ok ? textoOk : textoNo}</span>
  </div>
);

const LinkCopiable: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-black uppercase tracking-wider text-muted mb-2">{label}</p>
    <div className="flex gap-2">
      <input readOnly value={value} className="flex-1 border border-line px-3 py-2 text-xs font-mono truncate outline-none bg-subtle" onFocus={(e) => e.target.select()} />
      <button onClick={() => navigator.clipboard?.writeText(value)} className="border border-line px-4 text-xs font-black bg-surface hover:bg-subtle transition-colors whitespace-nowrap">
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
      <p className="text-sm text-muted">Link para <strong className="text-content">{empresaNombre}</strong> copiado al portapapeles.</p>
      <div className="border border-line divide-y-2 divide-slate-200">
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
      <p className="text-sm text-muted">
        Solicitud de acceso remoto para <strong className="text-content">{empresaNombre}</strong>. El cliente debe aprobar desde el link.
      </p>
      <div className="border border-line divide-y-2 divide-slate-200">
        <EstadoRow ok={waAbierto} textoOk="WhatsApp abierto con mensaje listo" textoNo="WhatsApp bloqueado — copiá el link manualmente" />
        <EstadoRow ok={emailEnviado} textoOk="Email de aprobacion enviado" textoNo="Email no enviado (sin RESEND_API_KEY)" />
      </div>
      <LinkCopiable label="Link de aprobacion para el cliente" value={link} />
      {!waAbierto && (
        <div className="bg-warn/10 border border-warn px-3 py-2 text-xs text-warn-strong dark:text-warn font-semibold">
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
    <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 flex items-center justify-between flex-wrap gap-3">
      <div className="min-w-0">
        <p className="font-display font-black text-content text-base leading-tight">{solicitud.nombre}</p>
        {solicitud.adminEmail && (
          <p className="text-xs font-mono text-muted mt-0.5">{solicitud.adminEmail}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-black uppercase px-2 py-0.5 border border-line text-muted">
            {PLAN_LABEL[solicitud.plan] ?? solicitud.plan}
          </span>
          <ArrowRight size={14} className="text-brand-600 flex-shrink-0" />
          <span className="text-xs font-black uppercase px-2 py-0.5 border border-brand-600 bg-brand-50 text-brand-700">
            {PLAN_LABEL[solicitud.planSolicitado] ?? solicitud.planSolicitado}
          </span>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={async () => { setProcesando(true); try { await onProcesar(); } finally { setProcesando(false); } }}
          disabled={procesando || descartando}
          className="px-4 py-2 bg-brand-600 text-white border border-line font-black uppercase text-xs shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50"
        >
          {procesando ? '...' : 'Procesar'}
        </button>
        <button
          onClick={async () => { setDescartando(true); try { await onDescartar(); } finally { setDescartando(false); } }}
          disabled={procesando || descartando}
          className="px-4 py-2 border border-danger text-danger font-bold text-xs hover:border-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
        >
          {descartando ? '...' : 'Descartar'}
        </button>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; valor: number }> = ({ label, valor }) => (
  <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-3 text-center">
    <p className="font-display font-black text-3xl sm:text-4xl text-brand-600 leading-none">{valor}</p>
    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted mt-1">{label}</p>
  </div>
);

export const PanelEstadisticas: React.FC<{ estadisticas: Estadisticas; onReiniciar: () => void }> = ({ estadisticas, onReiniciar }) => {
  const maxVisitas = estadisticas.topFichas.reduce((m, f) => Math.max(m, f.visitas), 0) || 1;
  const maxSeccion = (estadisticas.topSecciones ?? []).reduce((m, s) => Math.max(m, s.visitas), 0) || 1;
  return (
    <div className="border border-line bg-subtle shadow-soft p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-display font-black text-lg uppercase tracking-tight text-content flex items-center gap-2">
          <BarChart3 size={20} className="text-brand-600" /> Visitas
        </h2>
        <button
          onClick={onReiniciar}
          className="text-xs font-bold uppercase tracking-wide text-muted border border-line px-3 py-1.5 hover:border-danger hover:text-danger transition-colors"
        >
          Reiniciar contador
        </button>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
          <Globe size={14} /> Landing
        </p>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Hoy" valor={estadisticas.landingHoy} />
          <StatCard label="Semana" valor={estadisticas.landingSemana} />
          <StatCard label="Total" valor={estadisticas.landingTotal} />
        </div>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
          <QrCode size={14} /> Fichas QR
        </p>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Hoy" valor={estadisticas.fichasHoy} />
          <StatCard label="Semana" valor={estadisticas.fichasSemana} />
          <StatCard label="Total" valor={estadisticas.fichasTotal} />
        </div>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted mb-2">Equipos mas escaneados</p>
        {estadisticas.topFichas.length === 0 ? (
          <p className="text-sm text-faint font-semibold py-2">Aun no hay escaneos registrados.</p>
        ) : (
          <div className="space-y-2">
            {estadisticas.topFichas.map((f) => (
              <div
                key={f.activoId}
                className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-brand-600">{f.codigo}</p>
                    <p className="font-display font-black text-sm text-content leading-tight truncate">{f.nombre}</p>
                    <p className="text-xs text-muted truncate">{f.empresa}</p>
                  </div>
                  <span className="font-display font-black text-2xl text-content shrink-0">{f.visitas}</span>
                </div>
                <div className="mt-2 h-2 bg-subtle border border-line">
                  <div
                    className="h-full bg-brand-600"
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
          <p className="text-xs font-black uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
            <MapPin size={14} /> Ciudades de origen
          </p>
          <div className="space-y-1.5">
            {estadisticas.topCiudades.map((c) => (
              <div key={c.ciudad} className="flex items-center justify-between gap-2 bg-surface/85 backdrop-blur-xl border border-line px-3 py-1.5">
                <span className="text-sm font-semibold text-content">{c.ciudad} <span className="text-faint font-normal text-xs">{c.pais}</span></span>
                <span className="font-black text-content text-sm">{c.visitas}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {estadisticas.dispositivos && (
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted mb-2">Dispositivos</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-2.5 flex flex-col items-center gap-1">
              <Smartphone size={16} className="text-brand-600" />
              <span className="font-black text-xl text-content">{estadisticas.dispositivos.mobile}</span>
              <span className="text-[10px] font-black uppercase text-muted">Celular</span>
            </div>
            <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-2.5 flex flex-col items-center gap-1">
              <Monitor size={16} className="text-brand-600" />
              <span className="font-black text-xl text-content">{estadisticas.dispositivos.desktop}</span>
              <span className="text-[10px] font-black uppercase text-muted">Desktop</span>
            </div>
            <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-2.5 flex flex-col items-center gap-1">
              <Tablet size={16} className="text-brand-600" />
              <span className="font-black text-xl text-content">{estadisticas.dispositivos.tablet}</span>
              <span className="text-[10px] font-black uppercase text-muted">Tablet</span>
            </div>
          </div>
        </div>
      )}

      {estadisticas.trials && (
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted mb-2">Cuentas de prueba</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-2.5 flex flex-col items-center gap-0.5">
              <span className="font-black text-xl text-content">{estadisticas.trials.total}</span>
              <span className="text-[10px] font-black uppercase text-muted">Total</span>
            </div>
            <div className="bg-surface border border-ok shadow-soft p-2.5 flex flex-col items-center gap-0.5">
              <span className="font-black text-xl text-ok-strong dark:text-ok">{estadisticas.trials.activos}</span>
              <span className="text-[10px] font-black uppercase text-muted">Activos</span>
            </div>
            <div className="bg-surface border border-warn shadow-soft p-2.5 flex flex-col items-center gap-0.5">
              <span className="font-black text-xl text-warn-strong dark:text-warn">{estadisticas.trials.lectura}</span>
              <span className="text-[10px] font-black uppercase text-muted">Lectura</span>
            </div>
            <div className="bg-surface border border-danger shadow-soft p-2.5 flex flex-col items-center gap-0.5">
              <span className="font-black text-xl text-danger">{estadisticas.trials.vencidos}</span>
              <span className="text-[10px] font-black uppercase text-muted">Vencidos</span>
            </div>
          </div>
        </div>
      )}

      {estadisticas.topSecciones?.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted mb-2">Secciones más usadas</p>
          <div className="space-y-1.5">
            {estadisticas.topSecciones.map((s) => (
              <div key={s.seccion} className="bg-surface/85 backdrop-blur-xl border border-line px-3 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-content">{s.seccion}</span>
                  <span className="font-black text-content text-sm">{s.visitas}</span>
                </div>
                <div className="mt-1 h-1.5 bg-subtle">
                  <div className="h-full bg-brand-600" style={{ width: `${Math.round((s.visitas / maxSeccion) * 100)}%` }} />
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
    <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">
      {label}
    </label>
    {children}
  </div>
);

