import React from 'react';
import { Heart, Coffee, CreditCard, Globe } from 'lucide-react';

// Los URLs los configura Jesus por variables de entorno de Vite.
// Si una variable esta vacia, el boton se oculta.
const URL_CAFECITO = (import.meta.env.VITE_CAFECITO_URL as string | undefined) ?? '';
const URL_MP_APOYO = (import.meta.env.VITE_MP_APOYO_URL as string | undefined) ?? '';
const URL_STRIPE_APOYO = (import.meta.env.VITE_STRIPE_APOYO_URL as string | undefined) ?? '';

interface BotonProps {
  href: string;
  icon: React.ReactNode;
  titulo: string;
  sub: string;
  bg: string;
}

const Boton: React.FC<BotonProps> = ({ href, icon, titulo, sub, bg }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`flex items-center gap-3 ${bg} text-white p-4 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.8)] transition-all flex-1 min-w-0`}
  >
    <div className="flex-shrink-0 w-10 h-10 bg-white/20 border-2 border-white/40 flex items-center justify-center">
      {icon}
    </div>
    <div className="min-w-0 flex-1 text-left">
      <p className="font-black uppercase tracking-wide text-sm leading-tight">{titulo}</p>
      <p className="text-xs opacity-90 leading-snug mt-0.5">{sub}</p>
    </div>
  </a>
);

export const SeccionApoyo: React.FC = () => {
  const hayAlguno = URL_CAFECITO || URL_MP_APOYO || URL_STRIPE_APOYO;
  if (!hayAlguno) return null;

  return (
    <section className="w-full max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 bg-orange-500 text-white border-2 border-slate-900 flex items-center justify-center">
            <Heart size={20} />
          </div>
          <h2 className="font-sketch text-2xl sm:text-3xl font-black text-slate-900 uppercase leading-tight">
            Apoyá el proyecto
          </h2>
        </div>
        <p className="text-slate-700 leading-relaxed mb-5">
          ActivaQR lo construye una persona, Jesús, desde Neuquén. Cada aporte ayuda a que pueda seguir mejorando la herramienta y mantenerla accesible para las PYMES que la necesitan.
        </p>
        <div className="flex flex-col gap-3">
          {URL_CAFECITO && (
            <Boton
              href={URL_CAFECITO}
              icon={<Coffee size={20} />}
              titulo="Invitame un café"
              sub="Cafecito · ARS, simple y rápido"
              bg="bg-amber-700 hover:bg-amber-800"
            />
          )}
          {URL_MP_APOYO && (
            <Boton
              href={URL_MP_APOYO}
              icon={<CreditCard size={20} />}
              titulo="Mercado Pago"
              sub="Monto a elección · ARS"
              bg="bg-sky-600 hover:bg-sky-700"
            />
          )}
          {URL_STRIPE_APOYO && (
            <Boton
              href={URL_STRIPE_APOYO}
              icon={<Globe size={20} />}
              titulo="Stripe"
              sub="Aporte internacional · USD"
              bg="bg-violet-600 hover:bg-violet-700"
            />
          )}
        </div>
        <p className="text-xs text-slate-500 mt-5 font-mono leading-relaxed">
          Si querés apoyar de otra manera (experiencia, contactos, feedback técnico), dejá tu testimonio acá arriba o escribinos por WhatsApp.
        </p>
      </div>
    </section>
  );
};
