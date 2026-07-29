import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, Lock, MessageCircle, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../data/auth';
import { SubscriptionCheckout } from './SubscriptionCheckout';

const WHATSAPP = '5492804018359';

function diasRestantes(fechaIso?: string | null): number {
  if (!fechaIso) return 0;
  const ms = new Date(fechaIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function linkWhatsapp(empresaNombre: string): string {
  const msg = encodeURIComponent(
    `Hola! Soy de ${empresaNombre}. Probé ActivaQR y quiero suscribirme para seguir usándola.`
  );
  return `https://wa.me/${WHATSAPP}?text=${msg}`;
}

/** Banner fijo con los días que quedan de prueba. Solo para cuentas trial. */
export const TrialBanner: React.FC = () => {
  const { usuario } = useAuth();
  const emp = usuario?.empresa;
  if (!emp?.esTrial || !emp.fase || emp.fase === 'vencido') return null;

  if (emp.fase === 'lectura') {
    const dias = diasRestantes(emp.trialLecturaFin);
    return (
      <div className="bg-warn/10 border-b border-line px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm font-bold text-amber-900 flex items-center gap-2">
          <Eye size={16} /> Modo solo lectura — podés ver tus activos pero no cargar datos. Quedan {dias} {dias === 1 ? 'día' : 'días'} de consulta.
        </span>
        <a
          href={linkWhatsapp(emp.nombre)}
          target="_blank"
          rel="noopener"
          className="text-xs font-black uppercase tracking-wide bg-slate-900 text-white px-3 py-1.5 border border-line hover:bg-brand-600 transition-colors"
        >
          Suscribirme
        </a>
      </div>
    );
  }

  const dias = diasRestantes(emp.trialFin);
  return (
    <div className="bg-brand-50 border-b border-line px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
      <span className="text-sm font-bold text-brand-700 flex items-center gap-2">
        <Clock size={16} /> Prueba gratis — quedan {dias} {dias === 1 ? 'día' : 'días'} de acceso completo.
      </span>
      <a
        href={linkWhatsapp(emp.nombre)}
        target="_blank"
        rel="noopener"
        className="text-xs font-black uppercase tracking-wide bg-brand-600 text-white px-3 py-1.5 border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
      >
        Suscribirme
      </a>
    </div>
  );
};

/** Pantalla de bloqueo total al vencer el período completo de prueba. */
export const PantallaTrialVencido: React.FC = () => {
  const { usuario, logout } = useAuth();
  const nombre = usuario?.empresa?.nombre ?? 'tu empresa';
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft max-w-md w-full">
        <div className="bg-brand-600 px-6 py-4 border-b-4 border-line flex items-center gap-3">
          <Lock size={28} className="text-white" />
          <h1 className="font-black text-white text-2xl uppercase tracking-wide">Prueba finalizada</h1>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-content font-semibold text-base leading-relaxed">
            Terminó tu período de prueba de ActivaQR. Tus datos quedaron guardados — al suscribirte recuperás todo tal como lo dejaste.
          </p>
          <p className="text-muted text-sm">
            Escribinos por WhatsApp y activamos tu suscripción en el día. Elegí entre suscripción mensual o el paquete completo de visita + app.
          </p>
          <a
            href={linkWhatsapp(nombre)}
            target="_blank"
            rel="noopener"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white font-black uppercase tracking-wide border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-sm"
          >
            <MessageCircle size={18} /> Quiero suscribirme
          </a>
          <SubscriptionCheckout empresaNombre={nombre} planInicial={usuario?.empresa?.plan} compact />
          <button
            onClick={logout}
            className="w-full px-4 py-3 border border-line-strong font-bold text-muted hover:border-content transition-colors text-sm uppercase tracking-wide"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

const NOMBRE_SECCION: Record<string, string> = {
  '/': 'Dashboard',
  '/indicadores': 'Indicadores',
  '/auditoria': 'Auditoría',
  '/activos': 'Activos',
  '/medicion': 'Mediciones',
  '/mantenimiento': 'Mantenimiento',
  '/reportes': 'Reportes',
  '/importar': 'Importar',
  '/qr': 'Gestión QR',
  '/configuracion': 'Configuración',
  '/mensajes': 'Mensajes',
};

function nombreDeRuta(pathname: string): string {
  if (NOMBRE_SECCION[pathname]) return NOMBRE_SECCION[pathname];
  if (pathname.startsWith('/activos')) return 'Activos';
  if (pathname.startsWith('/medicion')) return 'Mediciones';
  return 'Otra';
}

/** Registra navegación interna para la analítica del superadmin. Fire-and-forget. */
export const SeccionTracker: React.FC = () => {
  const { pathname } = useLocation();
  const ultima = useRef<string>('');
  useEffect(() => {
    const seccion = nombreDeRuta(pathname);
    if (seccion === ultima.current) return;
    ultima.current = seccion;
    apiFetch('visitas/seccion', {
      method: 'POST',
      body: JSON.stringify({ seccion }),
    }).catch(() => {});
  }, [pathname]);
  return null;
};
