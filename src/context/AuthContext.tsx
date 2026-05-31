import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  UsuarioSesion,
  getUsuario,
  login as apiLogin,
  logout as apiLogout,
  EmpresaSuspendidaError,
} from '../data/auth';
import { useRemote } from '../data/store';

interface AuthState {
  usuario: UsuarioSesion | null;
  /** true cuando la app corre contra la API (requiere login). */
  requiereLogin: boolean;
  /** true cuando la empresa fue suspendida — bloquea la app inmediatamente. */
  empresaSuspendida: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => getUsuario());
  const [empresaSuspendida, setEmpresaSuspendida] = useState(false);

  // Captura global: cualquier apiFetch que reciba 403 empresa_suspendida
  // lanza EmpresaSuspendidaError como promesa rechazada no manejada.
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof EmpresaSuspendidaError) {
        setEmpresaSuspendida(true);
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setEmpresaSuspendida(false);
    setUsuario(u);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUsuario(null);
    setEmpresaSuspendida(false);
    ['activos', 'mediciones', 'tareas', 'sectores', 'tipos', 'tecnicos'].forEach((k) =>
      localStorage.removeItem(k)
    );
    window.location.reload();
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, requiereLogin: useRemote, empresaSuspendida, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
