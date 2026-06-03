// v1.1.0
import React, { useState } from 'react';
import { LogIn, Lock, Mail, UserPlus, Building2, User, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, logout as clearSession } from '../data/auth';

const LOGO = '/ActivaQr/company-logo-hd.png';

const DEMO_EMAIL = 'demo@activaqr.com';
const DEMO_PASS = 'demo1234';

function isDemoParam() {
  const hash = window.location.hash; // e.g. #/login?demo=1
  return hash.includes('demo=1');
}

function isRegistroParam() {
  return window.location.hash.includes('registro=1');
}

export const Login: React.FC = () => {
  const { login, registro } = useAuth();
  const isDemo = isDemoParam();
  const [vistaRegistro, setVistaRegistro] = useState(isRegistroParam());
  const [regEmpresa, setRegEmpresa] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regCargando, setRegCargando] = useState(false);

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegCargando(true);
    try {
      await registro({
        empresaNombre: regEmpresa,
        nombre: regNombre,
        email: regEmail,
        password: regPassword,
        telefono: regTelefono || undefined,
      });
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_#1e293b] p-8">
          <div className="text-center mb-6">
            <img src={LOGO} alt="ActivaQR" className="h-14 mx-auto mb-3 object-contain" />
            <h1 className="font-sketch text-3xl font-black text-slate-900 uppercase tracking-tight">
              ActivaQR
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium uppercase tracking-wider">
              {vistaRegistro ? 'Probá gratis 14 días' : 'Activos bajo control'}
            </p>
          </div>

          {vistaRegistro ? (
            <form onSubmit={handleRegistro} className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Empresa</label>
                <div className="flex items-center gap-2 border-2 border-slate-300 px-3 h-12 focus-within:border-orange-500">
                  <Building2 size={18} className="text-slate-400" />
                  <input value={regEmpresa} onChange={(e) => setRegEmpresa(e.target.value)} placeholder="Nombre de tu empresa" className="flex-1 outline-none bg-transparent" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Tu nombre</label>
                <div className="flex items-center gap-2 border-2 border-slate-300 px-3 h-12 focus-within:border-orange-500">
                  <User size={18} className="text-slate-400" />
                  <input value={regNombre} onChange={(e) => setRegNombre(e.target.value)} placeholder="Nombre y apellido" className="flex-1 outline-none bg-transparent" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Email</label>
                <div className="flex items-center gap-2 border-2 border-slate-300 px-3 h-12 focus-within:border-orange-500">
                  <Mail size={18} className="text-slate-400" />
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="tu@empresa.com" className="flex-1 outline-none bg-transparent font-mono" autoComplete="username" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Teléfono <span className="text-slate-400 font-normal lowercase">(opcional)</span></label>
                <div className="flex items-center gap-2 border-2 border-slate-300 px-3 h-12 focus-within:border-orange-500">
                  <Phone size={18} className="text-slate-400" />
                  <input value={regTelefono} onChange={(e) => setRegTelefono(e.target.value)} placeholder="+54 9 ..." className="flex-1 outline-none bg-transparent font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Contraseña</label>
                <div className="flex items-center gap-2 border-2 border-slate-300 px-3 h-12 focus-within:border-orange-500">
                  <Lock size={18} className="text-slate-400" />
                  <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="flex-1 outline-none bg-transparent font-mono" autoComplete="new-password" minLength={8} required />
                </div>
              </div>

              {regError && (
                <div className="bg-red-50 border-2 border-red-300 text-red-700 text-sm px-3 py-2 font-semibold">{regError}</div>
              )}

              <button type="submit" disabled={regCargando} className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white h-12 font-sketch font-black text-xl uppercase border-2 border-slate-900 shadow-[4px_4px_0px_0px_#1e293b] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1e293b] transition-all disabled:opacity-50">
                <UserPlus size={20} />
                {regCargando ? 'Creando…' : 'Crear cuenta y probar'}
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-snug">14 días de acceso completo, hasta 10 activos. Sin tarjeta de crédito.</p>

              <div className="text-center mt-2">
                <button type="button" onClick={() => { setVistaRegistro(false); setRegError(null); }} className="text-xs text-slate-500 hover:text-orange-500 underline transition-colors">
                  Ya tengo cuenta — Ingresar
                </button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                Email
              </label>
              <div className="flex items-center gap-2 border-2 border-slate-300 px-3 h-12 focus-within:border-orange-500">
                <Mail size={18} className="text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="flex-1 outline-none bg-transparent font-mono"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                Contraseña
              </label>
              <div className="flex items-center gap-2 border-2 border-slate-300 px-3 h-12 focus-within:border-orange-500">
                <Lock size={18} className="text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 outline-none bg-transparent font-mono"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 text-sm px-3 py-2 font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white h-12 font-sketch font-black text-xl uppercase border-2 border-slate-900 shadow-[4px_4px_0px_0px_#1e293b] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1e293b] transition-all disabled:opacity-50"
            >
              <LogIn size={20} />
              {cargando ? 'Ingresando…' : 'Ingresar'}
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => { setVistaForgot(true); setError(null); }}
                className="text-xs text-slate-500 hover:text-orange-500 underline transition-colors"
              >
                Olvidaste tu contraseña?
              </button>
            </div>
          </form>
          )}

          {!vistaRegistro && !vistaForgot && (
            <div className="mt-4 border-t-2 border-slate-200 pt-4 text-center">
              <p className="text-xs text-slate-400 mb-3">Técnicos y operadores de campo ingresan con el mismo formulario usando las credenciales que les asignó el administrador.</p>
              <p className="text-xs text-slate-500 mb-2">¿No tenés cuenta todavía?</p>
              <button
                type="button"
                onClick={() => { setVistaRegistro(true); setError(null); }}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white h-11 font-black text-sm uppercase tracking-wide border-2 border-slate-900 hover:bg-orange-500 transition-colors"
              >
                <UserPlus size={18} />
                Probar gratis 14 días
              </button>
            </div>
          )}

          {vistaForgot && (
            <div className="mt-4 border-t-2 border-slate-200 pt-4">
              {forgotExito ? (
                <div className="space-y-2">
                  <div className="bg-green-50 border-2 border-green-300 text-green-700 text-sm px-3 py-3 font-semibold space-y-1">
                    <p>Solicitud recibida.</p>
                    <p className="font-normal text-xs">Si tenés Telegram configurado, te llega el link ahí en segundos. Si no, te avisamos por otro medio.</p>
                  </div>
                  <button onClick={() => { setVistaForgot(false); setForgotExito(false); }} className="text-xs text-slate-500 underline hover:text-orange-500">
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
                  <p className="text-xs font-black uppercase tracking-wider text-slate-600">Recuperar contraseña</p>
                  <div className="flex items-center gap-2 border-2 border-slate-300 px-3 h-10 focus-within:border-orange-500">
                    <Mail size={16} className="text-slate-400" />
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="tu@email.com" className="flex-1 outline-none bg-transparent text-sm" required />
                  </div>
                  {forgotError && <p className="text-red-600 text-xs">{forgotError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={forgotCargando} className="flex-1 bg-slate-900 text-white text-xs font-black uppercase py-2 border-2 border-slate-900 disabled:opacity-50">
                      {forgotCargando ? 'Enviando...' : 'Enviar instrucciones'}
                    </button>
                    <button type="button" onClick={() => setVistaForgot(false)} className="text-xs text-slate-500 underline px-2">
                      Volver
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-slate-400 text-xs mt-4 font-mono">
          ActivaQR · Gestión de activos industriales
        </p>
      </div>
    </div>
  );
};
