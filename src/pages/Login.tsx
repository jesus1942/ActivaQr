// v1.0
import React, { useState } from 'react';
import { LogIn, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LOGO = '/ActivaQr/company-logo-hd.png';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

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
          </form>
        </div>

        <p className="text-center text-slate-400 text-xs mt-4 font-mono">
          ActivaQR · Gestión de activos industriales
        </p>
      </div>
    </div>
  );
};
