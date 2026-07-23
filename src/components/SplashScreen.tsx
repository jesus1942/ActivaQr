import { useEffect, useRef, useState } from 'react';

const DURACION = 900;
const FADE_START = 620;

// Logo claro (para fondo oscuro).
const LOGO_SRC = '/ActivaQr/company-logo1.png';

// Splash sobrio: fondo oscuro, una cinta vertical ondulada turquesa con glow,
// el logo centrado con halo y una barra de progreso fina. Coherente con el
// resto del rediseño (oscuro/teal, neumorfismo suave).
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const logo = new Image();
    logo.src = LOGO_SRC;

    let startTime: number | null = null;
    let raf: number;

    const draw = (ts: number) => {
      if (!startTime) startTime = ts;
      const t = ts - startTime;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      let alpha = 1;
      if (t > FADE_START) alpha = Math.max(0, 1 - (t - FADE_START) / (DURACION - FADE_START));
      ctx.globalAlpha = alpha;

      // Fondo oscuro con gradiente vertical
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0B1120');
      grad.addColorStop(1, '#0F172A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Halo turquesa suave detrás del logo
      const halo = ctx.createRadialGradient(cx, cy - h * 0.06, 0, cx, cy - h * 0.06, Math.min(w, h) * 0.45);
      halo.addColorStop(0, 'rgba(20,184,166,0.16)');
      halo.addColorStop(1, 'rgba(20,184,166,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Cinta vertical ondulada con glow (sway lento)
      const sway = Math.sin(t / 700) * (w * 0.012);
      ctx.save();
      ctx.shadowColor = 'rgba(45,212,191,0.55)';
      ctx.shadowBlur = 16;
      const lineGrad = ctx.createLinearGradient(0, 0, 0, h);
      lineGrad.addColorStop(0, 'rgba(45,212,191,0)');
      lineGrad.addColorStop(0.35, 'rgba(94,234,212,0.85)');
      lineGrad.addColorStop(0.7, 'rgba(34,211,238,0.7)');
      lineGrad.addColorStop(1, 'rgba(15,181,166,0)');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const x0 = cx + w * 0.18;
      ctx.moveTo(x0, -20);
      for (let y = -20; y <= h + 20; y += 8) {
        const p = y / h;
        const x = x0 + Math.sin(p * Math.PI * 2.4 + t / 900) * (w * 0.05) + sway;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Logo centrado con halo
      if (logo.complete && logo.naturalWidth > 0) {
        const targetH = Math.min(h * 0.16, 150);
        const ratio = logo.naturalWidth / logo.naturalHeight;
        const targetW = targetH * ratio;
        ctx.save();
        ctx.shadowColor = 'rgba(45,212,191,0.6)';
        ctx.shadowBlur = 28;
        ctx.drawImage(logo, cx - targetW / 2, cy - h * 0.12 - targetH / 2, targetW, targetH);
        ctx.restore();
      }

      // Wordmark
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#F1F5F9';
      ctx.font = `700 ${Math.min(34, w * 0.07)}px 'Manrope', 'Inter', system-ui, sans-serif`;
      ctx.fillText('ActivaQR', cx, cy + h * 0.04);

      // Subtítulo
      ctx.fillStyle = 'rgba(148,163,184,0.85)';
      ctx.font = `600 ${Math.min(12, w * 0.03)}px 'Inter', system-ui, sans-serif`;
      const sub = 'A C T I V O S   B A J O   C O N T R O L';
      ctx.fillText(sub, cx, cy + h * 0.04 + Math.min(30, w * 0.06));

      // Barra de progreso fina
      const barW = Math.min(w * 0.5, 240);
      const barH = 3;
      const barX = cx - barW / 2;
      const barY = cy + h * 0.13;
      const progreso = Math.min(1, t / FADE_START);

      ctx.fillStyle = 'rgba(148,163,184,0.18)';
      ctx.fillRect(barX, barY, barW, barH);

      ctx.save();
      ctx.shadowColor = 'rgba(45,212,191,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#2DD4BF';
      ctx.fillRect(barX, barY, barW * progreso, barH);
      ctx.restore();

      if (t < DURACION) {
        raf = requestAnimationFrame(draw);
      } else {
        setVisible(false);
        onDone();
      }
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [onDone]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 99999, display: 'block' }}
    />
  );
}
