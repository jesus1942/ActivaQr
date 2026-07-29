import React, { useEffect, useState } from 'react';
import { CreditCard, MessageCircle } from 'lucide-react';
import { getPlanesComerciales, iniciarSuscripcion, PlanComercial } from '../data/adminApi';

const WHATSAPP = '5492804018359';

function alcance(plan: PlanComercial): string {
  return plan.recargoPorBloqueUsd && plan.tamanoBloqueExtra
    ? `Hasta ${plan.activosIncluidos} equipos · +USD ${plan.recargoPorBloqueUsd} cada ${plan.tamanoBloqueExtra}`
    : `Hasta ${plan.activosIncluidos} equipos`;
}

export const SubscriptionCheckout: React.FC<{
  empresaNombre: string;
  planInicial?: string;
  compact?: boolean;
}> = ({ empresaNombre, planInicial = 'inicial', compact = false }) => {
  const [planes, setPlanes] = useState<PlanComercial[]>([]);
  const [mpConfigurado, setMpConfigurado] = useState(false);
  const [seleccion, setSeleccion] = useState(planInicial);
  const [cargando, setCargando] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlanesComerciales()
      .then((data) => {
        setPlanes(data.planes);
        setMpConfigurado(data.mercadoPagoConfigurado);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No pudimos consultar los planes.'))
      .finally(() => setCargando(false));
  }, []);

  const elegido = planes.find((p) => p.plan === seleccion);
  const puedePagar = mpConfigurado && !!elegido?.precioArs;
  const whatsapp = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    `Hola! Soy de ${empresaNombre}. Quiero contratar el plan ${elegido?.nombre ?? seleccion} de ActivaQR.`
  )}`;

  const pagar = async () => {
    setPagando(true);
    setError(null);
    try {
      const { initPoint } = await iniciarSuscripcion(seleccion);
      window.location.assign(initPoint);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciar el pago.');
      setPagando(false);
    }
  };

  if (cargando) return <p className="text-sm text-muted">Consultando planes…</p>;

  return (
    <div className={compact ? 'space-y-3' : 'border border-line bg-surface/70 p-4 space-y-4'}>
      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
        {planes.map((plan) => (
          <button key={plan.plan} type="button" onClick={() => setSeleccion(plan.plan)}
            className={`text-left border p-3 ${seleccion === plan.plan ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface'}`}>
            <span className="block font-black text-content">{plan.nombre}</span>
            <span className="block text-sm font-bold text-content">USD {plan.precioReferenciaUsd} / mes</span>
            <span className="block text-xs text-muted">{alcance(plan)}</span>
          </button>
        ))}
      </div>
      {puedePagar ? (
        <button type="button" onClick={pagar} disabled={pagando}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white font-black uppercase border border-line disabled:opacity-50">
          <CreditCard size={18} /> {pagando ? 'Abriendo Mercado Pago…' : 'Contratar'}
        </button>
      ) : (
        <a href={whatsapp} target="_blank" rel="noopener"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white font-black uppercase border border-line">
          <MessageCircle size={18} /> Consultar contratación
        </a>
      )}
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
};
