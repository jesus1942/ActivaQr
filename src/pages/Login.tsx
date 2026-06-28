// v1.1.0
import React, { useState } from 'react';
import { LogIn, Lock, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, logout as clearSession } from '../data/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ThemeToggle } from '../components/ui/ThemeToggle';

const LOGO_LIGHT = '/ActivaQr/company-logo-hd.png';
const LOGO_DARK = '/ActivaQr/company-logo1.png';

const DEMO_EMAIL = 'demo@activaqr.com';
const DEMO_PASS = 'demo1234';

function isDemoParam() {
  return window.location.hash.includes('demo=1');
}

// Fondo con formas orgánicas / aura de marca.
const OrganicBackdrop: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden brand-aura">
    <div className="absolute -top-24 -left-24 w-96 h-96 organic-blob bg-brand-100/60 dark:bg-brand-600/10 blur-2xl" />
    <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] organic-blob-2 bg-brand-200/40 dark:bg-brand-500/10 blur-3xl" />
  </div>
);

export const Login: React.FC = () => {
  const { login } = useAuth();
  const isDemo = isDemoParam();
  // En demo saltamos directo al formulario con credenciales precargadas.
  const [vista, setVista] = useState<'bienvenida' | 'login'>(isDemo ? 'login' : 'bienvenida');
  const [email, setEmail] = useState(isDemo ? DEMO_EMAIL : '');
  const [password, setPassword] = useState(isDemo ? DEMO_PASS : '');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [vistaForgot, setVistaForgot] = useState(false);

  React.useEffect(() => {
    if (isDemo) clearSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotExito, setForgotExito] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotCargando, setForgotCargando] = useState(false);

  const doLogin = async (mail: string, pass: string) => {
    setError(null);
    setCargando(true);
    try {
      await login(mail, pass);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  const handleDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASS);
    doLogin(DEMO_EMAIL, DEMO_PASS);
  };

  const Logo = (
    <>
      <img src={LOGO_LIGHT} alt="ActivaQR" className="h-14 mx-auto object-contain dark:hidden" />
      <img src={LOGO_DARK} alt="ActivaQR" className="h-14 mx-auto object-contain hidden dark:block" />
    </>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-canvas p-5 overflow-hidden">
      <OrganicBackdrop />
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>

      {/* ── Pantalla de bienvenida ── */}
      {vista === 'bienvenida' && (
        <div className="relative w-full max-w-md text-center animate-fade-up">
          <div className="mb-8">{Logo}</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-content tracking-tight">
            ActivaQR
          </h1>
          <p className="mt-4 text-muted text-base leading-relaxed max-w-sm mx-auto">
            Gestión inteligente de activos para mantenimiento industrial
          </p>
          <div className="mt-10 space-y-3">
            <Button
              size="lg"
              block
              onClick={() => setVista('login')}
              iconRight={<ArrowRight size={20} />}
            >
              Ingresar
            </Button>
            <Button
              size="lg"
              block
              variant="secondary"
              onClick={handleDemo}
              loading={cargando}
            >
              Probar demo
            </Button>
          </div>
          <p className="mt-10 text-faint text-xs font-mono">
            ActivaQR · Gestión de activos industriales
          </p>
        </div>
      )}

      {/* ── Formulario de acceso ── */}
      {vista === 'login' && (
        <div className="relative w-full max-w-md animate-scale-in">
          <div className="bg-surface border border-line rounded-xl shadow-soft p-7 sm:p-8">
            {!isDemo && (
              <button
                onClick={() => { setVista('bienvenida'); setError(null); }}
                className="press flex items-center gap-1.5 text-sm text-muted hover:text-content mb-5 transition-colors"
              >
                <ArrowLeft size={16} /> Volver
              </button>
            )}
            <div className="text-center mb-7">
              {Logo}
              <h1 className="font-display text-2xl font-bold text-content tracking-tight mt-3">
                Iniciar sesión
              </h1>
              <p className="text-muted text-sm mt-1">Accedé a tu panel de control</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                icon={<Mail size={18} />}
                autoComplete="username"
                required
              />
              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock size={18} />}
                autoComplete="current-password"
                required
              />

              {error && (
                <div className="bg-danger/10 text-danger-strong dark:text-danger text-sm px-3.5 py-2.5 rounded-md font-medium">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" block loading={cargando} iconLeft={<LogIn size={20} />}>
                {cargando ? 'Ingresando…' : 'Ingresar'}
              </Button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setVistaForgot(true); setError(null); }}
                  className="text-sm text-muted hover:text-brand-600 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>

            {vistaForgot && (
              <div className="mt-5 border-t border-line pt-5">
                {forgotExito ? (
                  <div className="space-y-3">
                    <div className="bg-ok/10 text-ok-strong dark:text-ok text-sm px-3.5 py-2.5 rounded-md font-medium">
                      Revisá tu email, te enviamos las instrucciones.
                    </div>
                    <button
                      onClick={() => { setVistaForgot(false); setForgotExito(false); }}
                      className="text-sm text-muted hover:text-brand-600"
                    >
                      Volver al login
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setForgotError(null);
                      setForgotCargando(true);
                      try {
                        await apiFetch('auth/forgot-password', {
                          method: 'POST',
                          body: JSON.stringify({ email: forgotEmail }),
                        });
                        setForgotExito(true);
                      } catch {
                        setForgotError('Error al enviar. Intentá de nuevo.');
                      } finally {
                        setForgotCargando(false);
                      }
                    }}
                    className="space-y-3"
                  >
                    <p className="text-sm font-semibold text-content">Recuperar contraseña</p>
                    <Input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="tu@email.com"
                      icon={<Mail size={16} />}
                      error={forgotError ?? undefined}
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit" variant="secondary" block loading={forgotCargando}>
                        {forgotCargando ? 'Enviando…' : 'Enviar instrucciones'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setVistaForgot(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-faint text-xs mt-5 font-mono">
            ActivaQR · Gestión de activos industriales
          </p>
        </div>
      )}
    </div>
  );
};
