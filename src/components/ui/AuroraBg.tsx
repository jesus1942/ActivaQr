// v3.0.0
// Fondo decorativo "aurora": columnas VERTICALES de glow + cintas verticales
// fluidas (caen de arriba a abajo, orgánicas, no paralelas, no matriciales).
// - Flotado lento e infinito (animaciones aurora-1 / aurora-2).
// - Parallax suave con el scroll del contenedor `#app-scroll` (o window).
import React, { useEffect, useRef } from 'react';

interface Props {
  scrollSelector?: string;
  factor?: number;
}

export const AuroraBg: React.FC<Props> = ({ scrollSelector = '#app-scroll', factor = 0.14 }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target: HTMLElement | Window =
      (document.querySelector(scrollSelector) as HTMLElement) || window;
    let raf = 0;
    const read = () =>
      target instanceof Window ? window.scrollY : (target as HTMLElement).scrollTop;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (ref.current) ref.current.style.transform = `translate3d(0, ${read() * factor}px, 0)`;
      });
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      target.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollSelector, factor]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas" aria-hidden="true">
      <div ref={ref} className="absolute inset-[-20%] will-change-transform">
        {/* Columnas verticales de glow (altas y angostas -> lectura vertical) */}
        <div className="absolute -top-[20%] left-[12%] w-[22vw] h-[140vh] rounded-full bg-brand-500/25 blur-[110px] animate-aurora-1" />
        <div className="absolute -top-[20%] left-[52%] w-[20vw] h-[140vh] rounded-full bg-cyan-400/20 blur-[120px] animate-aurora-2" />
        <div className="absolute -top-[20%] left-[82%] w-[20vw] h-[140vh] rounded-full bg-brand-400/18 blur-[110px] animate-aurora-1" />

        {/* Cintas verticales fluidas (caen de arriba abajo, sway suave, no paralelas) */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1440 1000"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <linearGradient id="aq-vstream" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0" />
              <stop offset="30%" stopColor="#5EEAD4" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#22D3EE" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0FB5A6" stopOpacity="0" />
            </linearGradient>
            <filter id="aq-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#aq-glow)" stroke="url(#aq-vstream)" fill="none">
            {/* cada cinta recorre TODO el alto (y: -60 -> 1320) con sway lateral chico */}
            <path d="M 180 -60 C 300 230, 90 520, 230 790 C 330 990, 150 1140, 250 1320" strokeWidth="2.2" opacity="0.9" />
            <path d="M 560 -60 C 440 250, 660 540, 500 800 C 380 1010, 600 1150, 470 1320" strokeWidth="1.8" opacity="0.7" />
            <path d="M 900 -60 C 1030 240, 770 540, 940 800 C 1070 1020, 820 1150, 960 1320" strokeWidth="1.7" opacity="0.65" />
            <path d="M 1240 -60 C 1120 260, 1340 540, 1190 810 C 1070 1020, 1300 1160, 1170 1320" strokeWidth="1.5" opacity="0.55" />
            <path d="M 380 -60 C 300 280, 470 560, 360 820 C 270 1030, 430 1160, 350 1320" strokeWidth="1.2" opacity="0.4" />
          </g>
        </svg>
      </div>
    </div>
  );
};
