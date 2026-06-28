import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { apiFetch } from '../data/auth';

const LOGO = '/ActivaQr/company-logo-hd.png';

export const ResetPassword: React.FC = () => {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="w-full max-w-md bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-8 text-center">
          <p className="font-black text-lg uppercase text-content">Link invalido</p>
          <p className="text-muted text-sm mt-2">El link de recuperacion no es valido. Solicita uno nuevo.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmar) {
      setError('Las contrasenas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }
    setCargando(true);
    try {
      const res = await apiFetch('auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Error al restablecer la contrasena.');
      }
      setExito(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contrasena.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-8">
          <div className="text-center mb-6">
            <img src={LOGO} alt="ActivaQR" className="h-14 mx-auto mb-3 object-contain" />
            <h1 className="font-display text-3xl font-black text-content uppercase tracking-tight">
              ActivaQR
            </h1>
            <p className="text-muted text-sm mt-1 font-medium uppercase tracking-wider">
              Nueva contrasena
            </p>
          </div>

          {exito ? (
            <div className="space-y-4 text-center">
              <div className="bg-green-50 border border-green-300 text-green-700 text-sm px-3 py-3 font-semibold">
                Contrasena actualizada. Podes iniciar sesion.
              </div>
              <a
                href="#/"
                className="inline-block mt-2 text-xs text-muted underline hover:text-brand-600 transition-colors"
              >
                Ir al inicio de sesion
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">
                  Nueva contrasena
                </label>
                <div className="flex items-center gap-2 border border-line px-3 h-12 focus-within:border-brand-600">
                  <Lock size={18} className="text-faint" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1 outline-none bg-transparent font-mono"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">
                  Confirmar contrasena
                </label>
                <div className="flex items-center gap-2 border border-line px-3 h-12 focus-within:border-brand-600">
                  <Lock size={18} className="text-faint" />
                  <input
                    type="password"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1 outline-none bg-transparent font-mono"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger text-danger-strong dark:text-danger text-sm px-3 py-2 font-semibold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white h-12 font-display font-black text-xl uppercase border border-line shadow-soft hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-soft transition-all disabled:opacity-50"
              >
                {cargando ? 'Guardando...' : 'Guardar contrasena'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-faint text-xs mt-4 font-mono">
          ActivaQR · Gestion de activos industriales
        </p>
      </div>
    </div>
  );
};
