// v1.0.0
// Fondo decorativo "aurora": glows turquesa + líneas onduladas fluidas.
// - Flotado lento e infinito (animaciones aurora-1 / aurora-2).
// - Parallax suave: se desplaza con el scroll del contenedor `#app-scroll`
//   (o window como fallback) sin re-render de React.
import React, { useEffect, useRef } from 'react';

interface Props {
  /** Selector del contenedor scrolleable. Default: '#app-scroll'. */
  scrollSelector?: string;
  /** Intensidad del parallax (px por px de scroll). */
  factor?: number;
}

export const AuroraBg: React.FC<Props> = ({ scrollSelector = '#app-scroll', factor = 0.12 }) => {
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
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div ref={ref} className="absolute inset-[-15%] will-change-transform">
        {/* Glows */}
        <div className="absolute -top-1/4 -left-1/5 w-[55vw] h-[55vw] rounded-full bg-brand-500/40 blur-[90px] animate-aurora-1" />
        <div className="absolute top-1/4 -right-1/4 w-[50vw] h-[50vw] rounded-full bg-cyan-400/35 blur-[100px] animate-aurora-2" />
        <div className="absolute -bottom-1/4 left-1/3 w-[48vw] h-[48vw] rounded-full bg-brand-400/30 blur-[100px] animate-aurora-1" />

        {/* Líneas onduladas */}
        <svg
          className="absolute inset-0 w-full h-full opacity-80"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <linearGradient id="aq-wave" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0" />
              <stop offset="50%" stopColor="#5EEAD4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M-100 200 C 250 90 480 330 760 230 C 1040 130 1240 320 1560 200" stroke="url(#aq-wave)" strokeWidth="2" />
          <path d="M-100 340 C 280 240 520 470 800 360 C 1080 250 1280 450 1560 340" stroke="url(#aq-wave)" strokeWidth="1.6" />
          <path d="M-100 520 C 240 430 520 640 800 540 C 1080 440 1300 620 1560 520" stroke="url(#aq-wave)" strokeWidth="1.6" />
          <path d="M-100 700 C 240 620 500 800 780 700 C 1060 600 1300 760 1560 680" stroke="url(#aq-wave)" strokeWidth="1.4" />
        </svg>
      </div>
    </div>
  );
};
