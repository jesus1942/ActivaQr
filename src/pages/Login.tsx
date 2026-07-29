// v1.1.0
import React, { useState } from 'react';
import { LogIn, Lock, Mail, UserPlus, Building2, User, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL, apiFetch, logout as clearSession } from '../data/auth';
import { AuroraBg } from '../components/ui/AuroraBg';
import { useNavigate } from 'react-router-dom';

const LOGO = `${import.meta.env.BASE_URL}company-logo-hd.png`;      // negro (tema claro)
const LOGO_DARK_SRC = `${import.meta.env.BASE_URL}company-logo1.png`; // blanco (tema oscuro)

const DEMO_EMAIL = 'demo@activaqr.com';
const DEMO_PASS = 'demo1234';

function isDemoParam() {
  const hash = window.location.hash; // e.g. #/login?demo=1
  return hash.includes('demo=1');
}

function isRegistroParam() {
  return window.location.hash.includes('registro=1');
}

function parametrosCampana() {
  const query = window.location.hash.split('?')[1] ?? '';
  const p = new URLSearchParams(query);
  return {
    plan: p.get('plan') ?? 'inicial',
    atribucion: {
      source: p.get('utm_source') ?? undefined,
      medium: p.get('utm_medium') ?? undefined,
      campaign: p.get('utm_campaign') ?? undefined,
      content: p.get('utm_content') ?? undefined,
      term: p.get('utm_term') ?? undefined,
    },
  };
}

export const Login: React.FC = () => {
  const { login, registro } = useAuth();
  const navigate = useNavigate();
  const isDemo = isDemoParam();
  const [vistaRegistro, setVistaRegistro] = useState(isRegistroParam());
  const [regEmpresa, setRegEmpresa] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAcepta, setRegAcepta] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regCargando, setRegCargando] = useState(false);

  const apiBase = (API_URL || '').replace(/\/api$/, '');

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    if (!regAcepta) {
      setRegError('Para crear la cuenta tenes que aceptar la Politica de Uso y la Politica de Privacidad.');
      return;
    }
    setRegCargando(true);
    try {
      await registro({
        empresaNombre: regEmpresa,
        nombre: regNombre,
        email: regEmail,
        password: regPassword,
        telefono: regTelefono || undefined,
        aceptaPoliticas: true,
        ...parametrosCampana(),
      });
      navigate('/', { replace: true });
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setRegCargando(false);
    }
  };
  const [email, setEmail] = useState(isDemo ? DEMO_EMAIL : '');
  const [password, setPassword] = useState(isDemo ? DEMO_PASS : '');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [vistaForgot, setVistaForgot] = useState(false);

  // Si llega con ?demo=1 limpiar sesión previa sin recargar la página
  React.useEffect(() => {
    if (isDemo) clearSession();
  }, []);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotExito, setForgotExito] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotCargando, setForgotCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  const fieldCls = 'flex items-center gap-2 border border-line rounded-md bg-surface px-3 h-12 focus-within:border-brand-400 focus-within:shadow-ring transition-all';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-muted mb-1';
  const inputCls = 'flex-1 outline-none bg-transparent text-content placeholder:text-faint';

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-transparent p-4 overflow-hidden">
      <AuroraBg scrollSelector="#none" single />
      <div className="w-full max-w-md animate-page-in">
        <div className="bg-surface/85 backdrop-blur-xl border border-line rounded-xl shadow-lift p-8">
          <div className="text-center mb-6">
            <img src={LOGO} alt="ActivaQR" className="h-24 mx-auto mb-3 object-contain drop-shadow-[0_0_24px_rgba(45,212,191,0.7)] dark:hidden" />
            <img src={LOGO_DARK_SRC} alt="ActivaQR" className="h-24 mx-auto mb-3 object-contain drop-shadow-[0_0_24px_rgba(45,212,191,0.7)] hidden dark:block" />
            <h1 className="font-display text-3xl font-bold text-content tracking-tight">
              ActivaQR
            </h1>
            <p className="text-muted text-sm mt-1 font-medium uppercase tracking-wider">
              {vistaRegistro ? 'Probá gratis 30 días' : 'Activos bajo control'}
            </p>
          </div>

          {vistaRegistro ? (
            <form onSubmit={handleRegistro} className="space-y-3">
              <div>
                <label className={labelCls}>Empresa</label>
                <div className={fieldCls}>
                  <Building2 size={18} className="text-faint" />
                  <input value={regEmpresa} onChange={(e) => setRegEmpresa(e.target.value)} placeholder="Nombre de tu empresa" className={inputCls} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>Tu nombre</label>
                <div className={fieldCls}>
                  <User size={18} className="text-faint" />
                  <input value={regNombre} onChange={(e) => setRegNombre(e.target.value)} placeholder="Nombre y apellido" className={inputCls} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <div className={fieldCls}>
                  <Mail size={18} className="text-faint" />
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="tu@empresa.com" className={`${inputCls} font-mono`} autoComplete="username" required />
                </div>
              </div>
              <div>
                <label className={labelCls}>Teléfono <span className="text-faint font-normal lowercase">(opcional)</span></label>
                <div className={fieldCls}>
                  <Phone size={18} className="text-faint" />
                  <input value={regTelefono} onChange={(e) => setRegTelefono(e.target.value)} placeholder="+54 9 ..." className={`${inputCls} font-mono`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Contraseña</label>
                <div className={fieldCls}>
                  <Lock size={18} className="text-faint" />
                  <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className={`${inputCls} font-mono`} autoComplete="new-password" minLength={8} required />
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs text-muted leading-snug cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={regAcepta}
                  onChange={(e) => setRegAcepta(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-brand-600 flex-shrink-0"
                  required
                />
                <span>
                  Lei y acepto la{' '}
                  <a href={`${apiBase}/politica-uso`} target="_blank" rel="noopener noreferrer" className="text-brand-600 font-semibold underline">Politica de Uso</a>
                  {' '}y la{' '}
                  <a href={`${apiBase}/politica-privacidad`} target="_blank" rel="noopener noreferrer" className="text-brand-600 font-semibold underline">Politica de Privacidad</a>
                  {' '}de ActivaQR.
                </span>
              </label>

              {regError && (
                <div className="bg-danger/10 text-danger-strong dark:text-danger text-sm px-3.5 py-2.5 rounded-md font-medium">{regError}</div>
              )}

              <button type="submit" disabled={regCargando || !regAcepta} className="press w-full flex items-center justify-center gap-2 bg-brand-600 text-white h-12 font-display font-bold text-lg rounded-md shadow-soft hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <UserPlus size={20} />
                {regCargando ? 'Creando…' : 'Crear cuenta y probar'}
              </button>

              <p className="text-[11px] text-faint text-center leading-snug">30 días de acceso completo con el límite del plan elegido. Sin tarjeta de crédito.</p>

              <div className="text-center mt-2">
                <button type="button" onClick={() => { setVistaRegistro(false); setRegError(null); }} className="text-xs text-muted hover:text-brand-600 underline transition-colors">
                  Ya tengo cuenta — Ingresar
                </button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>
                Email
              </label>
              <div className={fieldCls}>
                <Mail size={18} className="text-faint" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className={`${inputCls} font-mono`}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Contraseña
              </label>
              <div className={fieldCls}>
                <Lock size={18} className="text-faint" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} font-mono`}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 text-danger-strong dark:text-danger text-sm px-3.5 py-2.5 rounded-md font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="press w-full flex items-center justify-center gap-2 bg-brand-600 text-white h-12 font-display font-bold text-lg rounded-md shadow-soft hover:bg-brand-700 transition-all disabled:opacity-50"
            >
              <LogIn size={20} />
              {cargando ? 'Ingresando…' : 'Ingresar'}
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => { setVistaForgot(true); setError(null); }}
                className="text-xs text-muted hover:text-brand-600 underline transition-colors"
              >
                Olvidaste tu contraseña?
              </button>
            </div>
          </form>
          )}

          {!vistaRegistro && !vistaForgot && (
            <div className="mt-4 border-t border-line pt-4 text-center">
              <p className="text-xs text-faint mb-3">Técnicos y operadores de campo ingresan con el mismo formulario usando las credenciales que les asignó el administrador.</p>
              <p className="text-xs text-muted mb-2">¿No tenés cuenta todavía?</p>
              <button
                type="button"
                onClick={() => { setVistaRegistro(true); setError(null); }}
                className="press w-full flex items-center justify-center gap-2 bg-surface text-content border border-line-strong h-11 font-semibold text-sm rounded-md hover:border-brand-600 hover:text-brand-600 transition-colors"
              >
                <UserPlus size={18} />
                Probar gratis 30 días
              </button>
            </div>
          )}

          {vistaForgot && (
            <div className="mt-4 border-t border-line pt-4">
              {forgotExito ? (
                <div className="space-y-2">
                  <div className="bg-ok/10 text-ok-strong dark:text-ok text-sm px-3.5 py-3 rounded-md font-medium space-y-1">
                    <p>Solicitud recibida.</p>
                    <p className="font-normal text-xs">Si tenés Telegram configurado, te llega el link ahí en segundos. Si no, te avisamos por otro medio.</p>
                  </div>
                  <button onClick={() => { setVistaForgot(false); setForgotExito(false); }} className="text-xs text-muted underline hover:text-brand-600">
                    Volver al login
                  </button>
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setForgotError(null);
                  setForgotCargando(true);
                  try {
                    await apiFetch('auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: forgotEmail }) });
                    setForgotExito(true);
                  } catch {
                    setForgotError('Error al enviar. Intentá de nuevo.');
                  } finally {
                    setForgotCargando(false);
                  }
                }} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Recuperar contraseña</p>
                  <div className="flex items-center gap-2 border border-line rounded-md bg-surface px-3 h-10 focus-within:border-brand-600 focus-within:shadow-ring transition-all">
                    <Mail size={16} className="text-faint" />
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="tu@email.com" className="flex-1 outline-none bg-transparent text-sm text-content placeholder:text-faint" required />
                  </div>
                  {forgotError && <p className="text-danger text-xs">{forgotError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={forgotCargando} className="press flex-1 bg-brand-600 text-white text-xs font-semibold uppercase py-2 rounded-md hover:bg-brand-700 transition-colors disabled:opacity-50">
                      {forgotCargando ? 'Enviando...' : 'Enviar instrucciones'}
                    </button>
                    <button type="button" onClick={() => setVistaForgot(false)} className="text-xs text-muted underline px-2">
                      Volver
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-faint text-xs mt-4 font-mono">
          ActivaQR · Gestión de activos industriales
        </p>
        <p className="text-center text-faint text-[11px] mt-1 font-mono">
          <a href={`${apiBase}/politica-uso`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 underline">Política de Uso</a>
          <span className="mx-2">·</span>
          <a href={`${apiBase}/politica-privacidad`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 underline">Política de Privacidad</a>
        </p>
      </div>
    </div>
  );
};
