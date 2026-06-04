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
import { EstadoPoliticas, getEstadoPoliticas } from '../data/cuentaApi';

interface AuthState {
  usuario: UsuarioSesion | null;
  /** true cuando la app corre contra la API (requiere login). */
  requiereLogin: boolean;
  /** true cuando la empresa fue suspendida — bloquea la app inmediatamente. */
  empresaSuspendida: boolean;
  /** true cuando el período de prueba venció — bloquea con pantalla de pago. */
  trialVencido: boolean;
  /** Estado de aceptacion de politicas del tenant logueado. */
  estadoPoliticas: EstadoPoliticas | null;
  refrescarEstadoPoliticas: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  registro: (payload: { empresaNombre: string; nombre: string; email: string; password: string; telefono?: string; aceptaPoliticas: boolean }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => getUsuario());
  const [empresaSuspendida, setEmpresaSuspendida] = useState(false);
  const [trialVencido, setTrialVencido] = useState(() => getUsuario()?.empresa?.fase === 'vencido');
  const [estadoPoliticas, setEstadoPoliticas] = useState<EstadoPoliticas | null>(null);

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

  const refrescarEstadoPoliticas = useCallback(async () => {
    if (!usuario || usuario.rol === 'superadmin' || !usuario.empresaId) {
      setEstadoPoliticas(null);
      return;
    }
    try {
      setEstadoPoliticas(await getEstadoPoliticas());
    } catch {
      // silencioso: si falla no bloqueamos al usuario
    }
  }, [usuario]);

  useEffect(() => {
    refrescarEstadoPoliticas();
  }, [refrescarEstadoPoliticas]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setEmpresaSuspendida(false);
    setTrialVencido(u.empresa?.fase === 'vencido');
    setUsuario(u);
  }, []);

  const registro = useCallback(async (payload: { empresaNombre: string; nombre: string; email: string; password: string; telefono?: string; aceptaPoliticas: boolean }) => {
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
    setEstadoPoliticas(null);
    ['activos', 'mediciones', 'tareas', 'sectores', 'tipos', 'tecnicos'].forEach((k) =>
      localStorage.removeItem(k)
    );
    window.location.reload();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        requiereLogin: useRemote,
        empresaSuspendida,
        trialVencido,
        estadoPoliticas,
        refrescarEstadoPoliticas,
        login,
        registro,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
