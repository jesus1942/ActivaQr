import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Activo, Medicion, TareaMantenimiento } from '../data/types';

const SLATE900: [number, number, number] = [30, 41, 59];
const SLATE100: [number, number, number] = [241, 245, 249];
const SLATE50:  [number, number, number] = [248, 250, 252];
const ORANGE:   [number, number, number] = [249, 115, 22];
const RED:      [number, number, number] = [220, 38, 38];
const GREEN:    [number, number, number] = [22, 163, 74];
const AMBER:    [number, number, number] = [217, 119, 6];
const WHITE:    [number, number, number] = [255, 255, 255];
const BLACK:    [number, number, number] = [0, 0, 0];

function colorEstado(estado: string): [number, number, number] {
  if (estado === 'critico' || estado === 'urgente') return RED;
  if (estado === 'alerta' || estado === 'revision') return AMBER;
  if (estado === 'normal') return GREEN;
  return SLATE900;
}

function labelEstado(estado: string): string {
  const map: Record<string, string> = {
    normal: 'NORMAL', alerta: 'ALERTA', critico: 'CRITICO',
    mantenimiento: 'MANTENIMIENTO', revision: 'REVISION', urgente: 'URGENTE',
    operativo: 'OPERATIVO', pausa: 'PAUSA', montaje: 'MONTAJE',
    fuera_servicio: 'FUERA DE SERVICIO',
  };
  return map[estado] ?? estado.toUpperCase();
}

function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'dd/MM/yyyy', { locale: es }); } catch { return iso; }
}

function fmtNum(n?: number | null, unit = ''): string {
  if (n == null) return '—';
  return `${n}${unit}`;
}

function header(doc: jsPDF, titulo: string, subtitulo: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...SLATE900);
  doc.rect(0, 0, W, 20, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, 20, W, 2, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ACTIVAQR', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(titulo, 14, 8);

  const fecha = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });
  doc.text(fecha, W - 14, 13, { align: 'right' });

  doc.setTextColor(...BLACK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(subtitulo, 14, 30);
}

function seccionTitulo(doc: jsPDF, y: number, texto: string): number {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...SLATE100);
  doc.rect(14, y, W - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE900);
  doc.text(texto.toUpperCase(), 16, y + 5);
  doc.setTextColor(...BLACK);
  return y + 10;
}

export interface FichaActivoPdfParams {
  activo: Activo;
  mediciones: Medicion[];
  tareas: TareaMantenimiento[];
  sectorNombre: string;
  tipoNombre: string;
  responsableNombre: string;
  empresaNombre?: string;
}

export function exportarFichaActivoPdf(p: FichaActivoPdfParams) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const MAR = 14;
  const COL = (W - MAR * 2) / 2;

  header(doc, p.empresaNombre ?? 'Ficha Tecnica', `${p.activo.codigo} — ${p.activo.nombre}`);

  // Estado badge
  const estadoColor = colorEstado(p.activo.estado);
  doc.setFillColor(...estadoColor);
  doc.rect(W - MAR - 30, 23, 30, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(labelEstado(p.activo.estado), W - MAR - 15, 28.5, { align: 'center' });
  doc.setTextColor(...BLACK);

  let y = 36;

  // ── Bloque identidad + parámetros ──────────────────────────────────
  const izq: [string, string][] = [
    ['Tipo', p.tipoNombre],
    ['Sector', p.sectorNombre],
    ['Marca', p.activo.marca || '—'],
    ['Modelo', p.activo.modelo || '—'],
    ['Ubicacion', p.activo.ubicacion || '—'],
    ['Responsable', p.responsableNombre || '—'],
    ['Fecha ingreso', fmtFecha(p.activo.fechaIngreso)],
    ['Horas actuales', fmtNum(p.activo.horasActuales, ' hs')],
    ['Prox. mantenimiento', fmtFecha(p.activo.proximoMantenimiento)],
    ['Estado operativo', labelEstado(p.activo.estadoOperativo ?? 'operativo')],
  ];

  const der: [string, string][] = [
    ['Temp. min/max', `${fmtNum(p.activo.temperaturaMin)}°C / ${fmtNum(p.activo.temperaturaMax)}°C`],
    ['Temp. alerta', fmtNum(p.activo.temperaturaAlerta, '°C')],
    ['Temp. critica', fmtNum(p.activo.temperaturaCritica, '°C')],
    ['Amperaje normal', fmtNum(p.activo.amperajeNormal, ' A')],
    ['Amperaje alerta', fmtNum(p.activo.amperajeAlerta, ' A')],
    ['Amperaje critico', fmtNum(p.activo.amperajeCritico, ' A')],
    ['Presion normal', fmtNum(p.activo.presionNormal, ' bar')],
    ['Presion alerta', fmtNum(p.activo.presionAlerta, ' bar')],
    ['Presion critica', fmtNum(p.activo.presionCritica, ' bar')],
    ['Intervalo medicion', fmtNum(p.activo.intervaloMedicionHoras, ' hs')],
  ];

  doc.setFontSize(8);
  const startY = y;

  izq.forEach(([lbl, val], i) => {
    const rowY = startY + i * 6.5;
    if (i % 2 === 0) {
      doc.setFillColor(...SLATE50);
      doc.rect(MAR, rowY - 1, COL - 2, 6, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, MAR + 2, rowY + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BLACK);
    const lines = doc.splitTextToSize(val, COL - 28);
    doc.text(lines[0], MAR + 32, rowY + 3.5);
  });

  der.forEach(([lbl, val], i) => {
    const rowY = startY + i * 6.5;
    if (i % 2 === 0) {
      doc.setFillColor(...SLATE50);
      doc.rect(MAR + COL + 2, rowY - 1, COL - 2, 6, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, MAR + COL + 4, rowY + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BLACK);
    doc.text(val, MAR + COL + 38, rowY + 3.5);
  });

  y = startY + Math.max(izq.length, der.length) * 6.5 + 6;

  // ── Notas ──────────────────────────────────────────────────────────
  if (p.activo.notas) {
    y = seccionTitulo(doc, y, 'Notas');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    const lines = doc.splitTextToSize(p.activo.notas, W - MAR * 2 - 4);
    doc.text(lines, MAR + 2, y);
    y += lines.length * 4.5 + 4;
  }

  // ── Ultimas mediciones ─────────────────────────────────────────────
  if (p.mediciones.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    y = seccionTitulo(doc, y, `Ultimas ${p.mediciones.length} mediciones`);

    const cols = ['Fecha', 'Temp', 'Amp', 'Presion', 'Vibracion', 'Estado', 'Observaciones'];
    const colX = [MAR + 2, MAR + 28, MAR + 46, MAR + 64, MAR + 82, MAR + 103, MAR + 122];
    const colW = [25, 17, 17, 17, 20, 18, W - MAR - 122 - 2];

    doc.setFillColor(...SLATE900);
    doc.rect(MAR, y - 2, W - MAR * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    cols.forEach((c, i) => doc.text(c, colX[i], y + 2.5));
    doc.setTextColor(...BLACK);
    y += 8;

    [...p.mediciones].reverse().forEach((m, idx) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(...SLATE50);
        doc.rect(MAR, y - 2, W - MAR * 2, 6.5, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...BLACK);
      doc.text(fmtFecha(m.fecha), colX[0], y + 2);
      doc.text(fmtNum(m.temperatura, '°'), colX[1], y + 2);
      doc.text(fmtNum(m.amperaje, 'A'), colX[2], y + 2);
      doc.text(fmtNum(m.presion, 'b'), colX[3], y + 2);
      doc.text(m.vibracion ?? '—', colX[4], y + 2);

      const ec = colorEstado(m.estado);
      doc.setTextColor(...ec);
      doc.setFont('helvetica', 'bold');
      doc.text(labelEstado(m.estado), colX[5], y + 2);
      doc.setTextColor(...BLACK);
      doc.setFont('helvetica', 'normal');
      const obs = doc.splitTextToSize(m.observaciones ?? '', colW[6]);
      doc.text(obs[0] ?? '', colX[6], y + 2);
      y += 6.5;
    });
    y += 4;
  }

  // ── Ordenes de trabajo abiertas ────────────────────────────────────
  const tareasAbiertas = p.tareas.filter((t) => t.estado !== 'completado');
  if (tareasAbiertas.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = seccionTitulo(doc, y, `Ordenes de trabajo (${tareasAbiertas.length})`);

    const colsOT = ['OT', 'Tipo', 'Prioridad', 'Fecha prog.', 'Estado'];
    const colXOT = [MAR + 2, MAR + 22, MAR + 70, MAR + 95, MAR + 120];

    doc.setFillColor(...SLATE900);
    doc.rect(MAR, y - 2, W - MAR * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    colsOT.forEach((c, i) => doc.text(c, colXOT[i], y + 2.5));
    doc.setTextColor(...BLACK);
    y += 8;

    tareasAbiertas.forEach((t, idx) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(...SLATE50);
        doc.rect(MAR, y - 2, W - MAR * 2, 6.5, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...BLACK);
      doc.text(t.numero ? `OT-${String(t.numero).padStart(5, '0')}` : '—', colXOT[0], y + 2);
      const tipoLines = doc.splitTextToSize(t.tipo ?? '—', 46);
      doc.text(tipoLines[0], colXOT[1], y + 2);

      const prioColor: Record<string, [number, number, number]> = {
        alta: RED, media: AMBER, baja: GREEN,
      };
      doc.setTextColor(...(prioColor[t.prioridad ?? 'media'] ?? SLATE900));
      doc.setFont('helvetica', 'bold');
      doc.text((t.prioridad ?? 'media').toUpperCase(), colXOT[2], y + 2);
      doc.setTextColor(...BLACK);
      doc.setFont('helvetica', 'normal');
      doc.text(fmtFecha(t.fechaProgramada), colXOT[3], y + 2);
      doc.text(labelEstado(t.estado), colXOT[4], y + 2);
      y += 6.5;
    });
  }

  // ── Footer ─────────────────────────────────────────────────────────
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...SLATE100);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Generado por ActivaQR — activaqr.com', MAR, H - 3.5);
  doc.text(`${p.activo.codigo} — ${p.activo.nombre}`, W - MAR, H - 3.5, { align: 'right' });

  doc.save(`ActivaQR-Ficha-${p.activo.codigo}.pdf`);
}

export interface ResumenActivosPdfParams {
  activos: Activo[];
  getSectorNombre: (id: string) => string;
  getTipoNombre: (id: string) => string;
  getTecnicoNombre: (id: string) => string;
  empresaNombre?: string;
}

export function exportarResumenActivosPdf(p: ResumenActivosPdfParams) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const MAR = 14;

  header(doc, p.empresaNombre ?? 'Resumen de activos', `${p.activos.length} activos`);

  let y = 36;

  const cols = ['Codigo', 'Nombre', 'Tipo', 'Sector', 'Responsable', 'Estado', 'Op.', 'Prox. Mant.'];
  const colX = [MAR, MAR + 22, MAR + 68, MAR + 105, MAR + 140, MAR + 178, MAR + 203, MAR + 227];
  const colW = [21, 45, 36, 34, 37, 24, 23, 38];

  doc.setFillColor(...SLATE900);
  doc.rect(MAR, y - 2, W - MAR * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  cols.forEach((c, i) => doc.text(c, colX[i], y + 2.5));
  doc.setTextColor(...BLACK);
  y += 8;

  p.activos.forEach((a, idx) => {
    if (y > 185) {
      doc.addPage();
      y = 20;
      doc.setFillColor(...SLATE900);
      doc.rect(MAR, y - 2, W - MAR * 2, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...WHITE);
      cols.forEach((c, i) => doc.text(c, colX[i], y + 2.5));
      doc.setTextColor(...BLACK);
      y += 8;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(...SLATE50);
      doc.rect(MAR, y - 2, W - MAR * 2, 6.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);

    doc.text(a.codigo, colX[0], y + 2);
    doc.text(doc.splitTextToSize(a.nombre, colW[1])[0], colX[1], y + 2);
    doc.text(doc.splitTextToSize(p.getTipoNombre(a.tipoId), colW[2])[0], colX[2], y + 2);
    doc.text(doc.splitTextToSize(p.getSectorNombre(a.sectorId), colW[3])[0], colX[3], y + 2);
    doc.text(doc.splitTextToSize(p.getTecnicoNombre(a.responsableId ?? null), colW[4])[0], colX[4], y + 2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colorEstado(a.estado));
    doc.text(labelEstado(a.estado), colX[5], y + 2);

    doc.setTextColor(...colorEstado(a.estadoOperativo ?? 'operativo'));
    const opLabel = labelEstado(a.estadoOperativo ?? 'operativo');
    doc.text(doc.splitTextToSize(opLabel, colW[6])[0], colX[6], y + 2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BLACK);
    doc.text(fmtFecha(a.proximoMantenimiento), colX[7], y + 2);

    y += 6.5;
  });

  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...SLATE100);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Generado por ActivaQR — activaqr.com', MAR, H - 3.5);
  doc.text(`Total: ${p.activos.length} activos`, W - MAR, H - 3.5, { align: 'right' });

  doc.save(`ActivaQR-Activos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
