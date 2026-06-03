import { useEffect, useRef, useState } from 'react';

const DURACION = 2800;
const FADE_START = 2300;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let startTime: number | null = null;
    let raf: number;

    const draw = (ts: number) => {
      if (!startTime) startTime = ts;
      const t = ts - startTime;
      const { width: w, height: h } = canvas;

      ctx.clearRect(0, 0, w, h);

      // Fade out
      let alpha = 1;
      if (t > FADE_START) alpha = Math.max(0, 1 - (t - FADE_START) / (DURACION - FADE_START));
      ctx.globalAlpha = alpha;

      // Fondo negro
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      // Cuadrícula de fondo estilo neo-brutalist
      ctx.strokeStyle = 'rgba(249,115,22,0.08)';
      ctx.lineWidth = 1;
      const GRID = 40;
      for (let x = 0; x < w; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Sombra del bloque naranja (desplazada, estilo brutalista)
      const progreso = Math.min(1, t / 1200);
      const easeOut = 1 - Math.pow(1 - progreso, 3);
      const boxW = Math.min(w - 48, 340);
      const boxH = 180;
      const boxX = cx - boxW / 2;
      const boxY = cy - boxH / 2 - 20;

      ctx.fillStyle = '#f97316';
      ctx.fillRect(boxX + 6, boxY + 6, boxW, boxH);

      // Bloque principal blanco
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Texto ACTIVAQR
      const fontSize = Math.min(52, boxW * 0.18);
      ctx.font = `900 ${fontSize}px 'Arial Black', Arial, sans-serif`;
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '2px';
      ctx.fillText('ACTIVAQR', cx, boxY + boxH * 0.38);

      // Línea naranja separadora
      ctx.fillStyle = '#f97316';
      ctx.fillRect(boxX + 20, boxY + boxH * 0.58, (boxW - 40) * easeOut, 3);

      // Subtítulo
      const subSize = Math.min(15, boxW * 0.045);
      ctx.font = `700 ${subSize}px Arial, sans-serif`;
      ctx.fillStyle = '#475569';
      ctx.letterSpacing = '3px';
      ctx.fillText('ACTIVOS BAJO CONTROL', cx, boxY + boxH * 0.78);

      // Barra de carga debajo del bloque
      const barY = boxY + boxH + 28;
      const barW = boxW;
      const barH = 6;
      const barX = boxX;
      const barProgreso = Math.min(1, t / FADE_START);

      // Sombra barra
      ctx.fillStyle = '#f97316';
      ctx.fillRect(barX + 3, barY + 3, barW, barH);

      // Fondo barra
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeRect(barX, barY, barW, barH);

      // Progreso naranja
      if (barProgreso > 0) {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(barX + 1, barY + 1, (barW - 2) * barProgreso, barH - 2);
      }

      // Texto de carga
      ctx.font = '700 11px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.letterSpacing = '2px';
      ctx.fillText('CARGANDO...', cx, barY + barH + 18);

      if (t < DURACION) {
        raf = requestAnimationFrame(draw);
      } else {
        ctx.globalAlpha = 0;
        setVisible(false);
        onDone();
      }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [onDone]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 99999, display: 'block',
      }}
    />
  );
}
