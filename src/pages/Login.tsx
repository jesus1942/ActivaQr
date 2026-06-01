// v1.1.0
import React, { useState } from 'react';
import { LogIn, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../data/auth';

const LOGO = '/ActivaQr/company-logo-hd.png';

const DEMO_EMAIL = 'demo@activaqr.com';
const DEMO_PASS = 'demo1234';

function isDemoParam() {
  const hash = window.location.hash; // e.g. #/login?demo=1
  return hash.includes('demo=1');
}

export const Login: React.FC = () => {
  const { login, logout } = useAuth();
  const isDemo = isDemoParam();
  const [email, setEmail] = useState(isDemo ? DEMO_EMAIL : '');
  const [password, setPassword] = useState(isDemo ? DEMO_PASS : '');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [vistaForgot, setVistaForgot] = useState(false);

  // Si llega con ?demo=1 limpiar sesión previa
  React.useEffect(() => {
    if (isDemo) logout();
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
              Activos bajo control
            </p>
          </div>

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

          {vistaForgot && (
            <div className="mt-4 border-t-2 border-slate-200 pt-4">
              {forgotExito ? (
                <div className="space-y-2">
                  <div className="bg-green-50 border-2 border-green-300 text-green-700 text-sm px-3 py-2 font-semibold">
                    Revisa tu email, te enviamos las instrucciones.
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
