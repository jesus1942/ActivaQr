// v2.0.0
// Fondo decorativo "aurora": glows turquesa + cintas VERTICALES fluidas
// (orgánicas, no paralelas, no matriciales), con glow suave.
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
        {/* Glows suaves */}
        <div className="absolute -top-1/4 left-1/4 w-[45vw] h-[60vh] rounded-full bg-brand-500/25 blur-[120px] animate-aurora-1" />
        <div className="absolute top-1/4 right-1/4 w-[40vw] h-[70vh] rounded-full bg-cyan-400/20 blur-[130px] animate-aurora-2" />
        <div className="absolute bottom-0 left-1/2 w-[40vw] h-[50vh] rounded-full bg-brand-400/15 blur-[120px] animate-aurora-1" />

        {/* Cintas verticales fluidas (orgánicas, no paralelas) */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1440 1000"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <linearGradient id="aq-vstream" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0" />
              <stop offset="35%" stopColor="#5EEAD4" stopOpacity="0.65" />
              <stop offset="65%" stopColor="#22D3EE" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0FB5A6" stopOpacity="0" />
            </linearGradient>
            <filter id="aq-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* grupo con glow */}
          <g filter="url(#aq-glow)" stroke="url(#aq-vstream)" fill="none">
            <path d="M 210 -80 C 520 180, 40 420, 330 650 C 560 840, 180 980, 300 1120" strokeWidth="2.2" opacity="0.9" />
            <path d="M 760 -80 C 560 220, 1020 460, 820 700 C 660 900, 980 1020, 840 1160" strokeWidth="1.8" opacity="0.7" />
            <path d="M 1180 -80 C 1380 240, 980 480, 1230 740 C 1420 940, 1080 1040, 1260 1180" strokeWidth="1.6" opacity="0.6" />
            <path d="M 470 -80 C 360 260, 700 520, 520 800 C 400 980, 640 1080, 540 1200" strokeWidth="1.3" opacity="0.45" />
          </g>
        </svg>
      </div>
    </div>
  );
};
