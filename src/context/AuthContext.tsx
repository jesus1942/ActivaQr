// v1.1.0
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  UsuarioSesion,
  getUsuario,
  login as apiLogin,
  registro as apiRegistro,
  logout as apiLogout,
  EmpresaSuspendidaError,
  TrialVencidoError,
} from '../data/auth';
import { useRemote } from '../data/store';

interface AuthState {
  usuario: UsuarioSesion | null;
  /** true cuando la app corre contra la API (requiere login). */
  requiereLogin: boolean;
  /** true cuando la empresa fue suspendida — bloquea la app inmediatamente. */
  empresaSuspendida: boolean;
  /** true cuando el período de prueba venció — bloquea con pantalla de pago. */
  trialVencido: boolean;
  login: (email: string, password: string) => Promise<void>;
  registro: (payload: { empresaNombre: string; nombre: string; email: string; password: string; telefono?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => getUsuario());
  const [empresaSuspendida, setEmpresaSuspendida] = useState(false);
  const [trialVencido, setTrialVencido] = useState(() => getUsuario()?.empresa?.fase === 'vencido');

  // Captura global: cualquier apiFetch que reciba 403 lanza el error especial
  // como promesa rechazada no manejada.
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof EmpresaSuspendidaError) {
        setEmpresaSuspendida(true);
        e.preventDefault();
      } else if (e.reason instanceof TrialVencidoError) {
        setTrialVencido(true);
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setEmpresaSuspendida(false);
    setTrialVencido(u.empresa?.fase === 'vencido');
    setUsuario(u);
  }, []);

  const registro = useCallback(async (payload: { empresaNombre: string; nombre: string; email: string; password: string; telefono?: string }) => {
    const u = await apiRegistro(payload);
    setEmpresaSuspendida(false);
    setTrialVencido(false);
    setUsuario(u);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUsuario(null);
    setEmpresaSuspendida(false);
    setTrialVencido(false);
    ['activos', 'mediciones', 'tareas', 'sectores', 'tipos', 'tecnicos'].forEach((k) =>
      localStorage.removeItem(k)
    );
    window.location.reload();
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, requiereLogin: useRemote, empresaSuspendida, trialVencido, login, registro, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
