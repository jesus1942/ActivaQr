import { useEffect, useRef, useState, useCallback } from 'react';

const DURACION = 3200;
const FADE_START = 2700;

function dibujarPelota(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // Pelota blanca
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pentágono central negro
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const ang = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const px = x + (r * 0.38) * Math.cos(ang);
    const py = y + (r * 0.38) * Math.sin(ang);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#111';
  ctx.fill();

  // 5 pentágonos exteriores
  for (let i = 0; i < 5; i++) {
    const ang = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const cx2 = x + (r * 0.72) * Math.cos(ang);
    const cy2 = y + (r * 0.72) * Math.sin(ang);
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const a2 = (j * 2 * Math.PI) / 5 + ang + Math.PI;
      const px = cx2 + (r * 0.28) * Math.cos(a2);
      const py = cy2 + (r * 0.28) * Math.sin(a2);
      j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#111';
    ctx.fill();
  }
}

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    let startTime: number | null = null;
    let raf: number;

    const draw = (ts: number) => {
      if (!startTime) startTime = ts;
      const t = ts - startTime;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      let alpha = 1;
      if (t > FADE_START) alpha = Math.max(0, 1 - (t - FADE_START) / (DURACION - FADE_START));
      ctx.globalAlpha = alpha;

      // Fondo: césped con gradiente
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0d5c2e');
      grad.addColorStop(1, '#1a8f4c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Líneas del campo
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      const PASO = 60;
      for (let x = 0; x < w; x += PASO) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += PASO) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Círculo central del campo
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const cx = w / 2;
      const cy = h / 2;
      const ballR = Math.min(w, h) * 0.07;

      // Pelota rebotando
      const rebote = Math.abs(Math.sin(t / 140)) * (h * 0.12);
      const ballY = cy - h * 0.22 - rebote;

      // Sombra de la pelota
      const shadowScale = 1 - rebote / (h * 0.15);
      ctx.beginPath();
      ctx.ellipse(cx, cy - h * 0.17, ballR * 0.7 * shadowScale, ballR * 0.15 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();

      dibujarPelota(ctx, cx, ballY, ballR);

      // Bloque título con sombra dorada (brutalista)
      const boxW = Math.min(w - 48, 320);
      const boxH = 110;
      const boxX = cx - boxW / 2;
      const boxY = cy - boxH / 2 + h * 0.06;

      ctx.fillStyle = '#ffd700';
      ctx.fillRect(boxX + 5, boxY + 5, boxW, boxH);
      ctx.fillStyle = '#0d5c2e';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // ACTIVAQR
      ctx.font = `900 ${Math.min(48, boxW * 0.16)}px 'Arial Black', Arial, sans-serif`;
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 8;
      ctx.fillText('ACTIVAQR', cx, boxY + boxH * 0.38);
      ctx.shadowBlur = 0;

      // Subtítulo
      ctx.font = `700 ${Math.min(13, boxW * 0.042)}px Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText('ACTIVOS BAJO CONTROL', cx, boxY + boxH * 0.72);

      // Barra de carga
      const barW = boxW;
      const barH = 7;
      const barX = boxX;
      const barY2 = boxY + boxH + 20;
      const progreso = Math.min(1, t / FADE_START);

      ctx.fillStyle = '#ffd700';
      ctx.fillRect(barX + 4, barY2 + 4, barW, barH);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.fillRect(barX, barY2, barW, barH);
      ctx.strokeRect(barX, barY2, barW, barH);

      if (progreso > 0) {
        const g2 = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        g2.addColorStop(0, '#ffd700');
        g2.addColorStop(1, '#fff');
        ctx.fillStyle = g2;
        ctx.fillRect(barX + 1, barY2 + 1, (barW - 2) * progreso, barH - 2);
      }

      ctx.font = '700 10px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('CARGANDO...', cx, barY2 + barH + 16);

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
