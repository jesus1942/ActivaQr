// v1.1.0
import React, { useEffect, useState } from 'react';

const FRASES = [
  'Iniciando motores...',
  'Sincronizando activos...',
  'Cargando datos...',
  'Verificando sensores...',
  'Preparando tablero...',
];

export const PantallaCarga: React.FC = () => {
  const [frase, setFrase] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setFrase((f) => (f + 1) % FRASES.length), 1400);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-content flex flex-col items-center justify-center gap-10">
      {/* Motor SVG */}
      <div className="relative flex items-center justify-center">
        {/* Engranaje exterior — gira lento */}
        <svg
          className="absolute animate-[spin_3s_linear_infinite]"
          width="160"
          height="160"
          viewBox="0 0 100 100"
        >
          <GearPath r={46} teeth={16} color="#f97316" opacity={0.25} />
        </svg>
        {/* Engranaje medio — gira al revés más rápido */}
        <svg
          className="absolute animate-[spin_2s_linear_infinite_reverse]"
          width="120"
          height="120"
          viewBox="0 0 100 100"
        >
          <GearPath r={38} teeth={12} color="#f97316" opacity={0.55} />
        </svg>
        {/* Engranaje interior — gira */}
        <svg
          className="relative animate-[spin_1.2s_linear_infinite]"
          width="80"
          height="80"
          viewBox="0 0 100 100"
        >
          <GearPath r={30} teeth={8} color="#f97316" opacity={1} />
        </svg>
        {/* Logo en el centro */}
        <div className="absolute flex items-center justify-center w-10 h-10 bg-content rounded-full">
          <span className="text-white font-black text-xs tracking-tighter">AQ</span>
        </div>
      </div>

      {/* Texto */}
      <div className="text-center space-y-2">
        <p className="text-brand-400 font-black text-xl uppercase tracking-widest animate-pulse">
          ActivaQR
        </p>
        <p
          key={frase}
          className="text-faint text-sm font-mono tracking-wide transition-opacity duration-500"
        >
          {FRASES[frase]}
        </p>
      </div>

      {/* Barra de progreso pulsante */}
      <div className="w-48 h-1 bg-slate-700 overflow-hidden">
        <div className="h-full bg-brand-600 animate-[progress_1.5s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes progress {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

// Genera el path SVG de un engranaje centrado en 50,50
function GearPath({ r, teeth, color, opacity }: { r: number; teeth: number; color: string; opacity: number }) {
  const innerR = r * 0.78;
  const toothH = r * 0.18;
  const toothW = (2 * Math.PI * r) / teeth * 0.38;
  const cx = 50;
  const cy = 50;

  let d = '';
  for (let i = 0; i < teeth; i++) {
    const angle = (i / teeth) * 2 * Math.PI;
    const nextAngle = ((i + 0.5) / teeth) * 2 * Math.PI;
    const endAngle = ((i + 1) / teeth) * 2 * Math.PI;
    const halfW = toothW / (2 * r);

    const ax = cx + innerR * Math.cos(angle);
    const ay = cy + innerR * Math.sin(angle);
    const bx = cx + (innerR + toothH) * Math.cos(angle - halfW);
    const by = cy + (innerR + toothH) * Math.sin(angle - halfW);
    const ccx = cx + (innerR + toothH) * Math.cos(nextAngle + halfW);
    const ccy = cy + (innerR + toothH) * Math.sin(nextAngle + halfW);
    const dx2 = cx + innerR * Math.cos(endAngle);
    const dy2 = cy + innerR * Math.sin(endAngle);

    d += i === 0
      ? `M ${ax} ${ay} L ${bx} ${by} L ${ccx} ${ccy} L ${dx2} ${dy2} `
      : `L ${ax} ${ay} L ${bx} ${by} L ${ccx} ${ccy} L ${dx2} ${dy2} `;
  }
  d += 'Z';

  return (
    <g opacity={opacity}>
      <path d={d} fill={color} />
      <circle cx={cx} cy={cy} r={innerR * 0.45} fill="none" stroke={color} strokeWidth="2.5" />
    </g>
  );
}
