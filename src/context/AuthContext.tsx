import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  UsuarioSesion,
  getUsuario,
  login as apiLogin,
  logout as apiLogout,
} from '../data/auth';
import { useRemote } from '../data/store';

interface AuthState {
  usuario: UsuarioSesion | null;
  /** true cuando la app corre contra la API (requiere login). */
  requiereLogin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => getUsuario());

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUsuario(u);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUsuario(null);
    // Limpia cachés de datos de la empresa anterior.
    ['activos', 'mediciones', 'tareas', 'sectores', 'tipos', 'tecnicos'].forEach((k) =>
      localStorage.removeItem(k)
    );
    window.location.reload();
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, requiereLogin: useRemote, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
