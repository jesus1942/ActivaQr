import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Activo, Medicion, TareaMantenimiento, TipoActivo } from '../data/types';
import type { Kpis } from '../data/indicadoresApi';

const SLATE900: [number, number, number] = [30, 41, 59];
const SLATE100: [number, number, number] = [241, 245, 249];
const SLATE50:  [number, number, number] = [248, 250, 252];
const ORANGE:   [number, number, number] = [249, 115, 22];
const RED:      [number, number, number] = [220, 38, 38];
const GREEN:    [number, number, number] = [22, 163, 74];
const AMBER:    [number, number, number] = [217, 119, 6];
const WHITE:    [number, number, number] = [255, 255, 255];
const BLACK:    [number, number, number] = [0, 0, 0];
const PDF_BRAND = 'Generado por ActivaQR — activaqr.net';

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

function fmtMantenimiento(activo: Activo): string {
  if (activo.estrategiaMantenimiento === 'horas') {
    return activo.proximoMantenimientoLectura == null
      ? '—'
      : `${activo.proximoMantenimientoLectura.toLocaleString('es-AR')} h`;
  }
  if (activo.estrategiaMantenimiento === 'kilometros') {
    return activo.proximoMantenimientoLectura == null
      ? '—'
      : `${activo.proximoMantenimientoLectura.toLocaleString('es-AR')} km`;
  }
  return fmtFecha(activo.proximoMantenimiento);
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
  // Si se pasa el tipo, la ficha respeta los flags mide* y oculta los
  // parametros que no aplican. Para activos estaticos (piscina, mueble,
  // pileta), sin flags activos, NO se imprime la columna derecha de
  // motor ni columnas de mediciones que no se cargan. Sin tipo, vuelve
  // al comportamiento legacy (compatibilidad con llamadas viejas).
  tipo?: TipoActivo | null;
}

interface FlagsMedicion {
  temperatura: boolean;
  amperaje: boolean;
  presion: boolean;
  vibracion: boolean;
}

function flagsDeTipo(tipo: TipoActivo | null | undefined): FlagsMedicion {
  // Si no hay tipo, asumimos que mide todo (legacy).
  if (!tipo) return { temperatura: true, amperaje: true, presion: true, vibracion: true };
  return {
    temperatura: !!tipo.mideTemperatura,
    amperaje: !!tipo.mideAmperaje,
    presion: !!tipo.midePresion,
    vibracion: !!tipo.mideVibracion,
  };
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
  const flags = flagsDeTipo(p.tipo);
  const llevaHoras = flags.temperatura || flags.amperaje || flags.presion || flags.vibracion;
  const izq: [string, string][] = [
    ['Tipo', p.tipoNombre],
    ['Sector', p.sectorNombre],
    ['Marca', p.activo.marca || '—'],
    ['Modelo', p.activo.modelo || '—'],
    ['Ubicacion', p.activo.ubicacion || '—'],
    ['Responsable', p.responsableNombre || '—'],
    ['Fecha ingreso', fmtFecha(p.activo.fechaIngreso)],
    ...(llevaHoras ? [['Horas actuales', fmtNum(p.activo.horasActuales, ' hs')] as [string, string]] : []),
    ...(p.activo.estrategiaMantenimiento === 'kilometros'
      ? [['Kilometraje actual', fmtNum(p.activo.kilometrosActuales, ' km')] as [string, string]]
      : []),
    ['Prox. mantenimiento', fmtMantenimiento(p.activo)],
    ['Estado operativo', labelEstado(p.activo.estadoOperativo ?? 'operativo')],
  ];

  const der: [string, string][] = [];
  if (flags.temperatura) {
    der.push(['Temp. min/max', `${fmtNum(p.activo.temperaturaMin)}°C / ${fmtNum(p.activo.temperaturaMax)}°C`]);
    der.push(['Temp. alerta', fmtNum(p.activo.temperaturaAlerta, '°C')]);
    der.push(['Temp. critica', fmtNum(p.activo.temperaturaCritica, '°C')]);
  }
  if (flags.amperaje) {
    der.push(['Amperaje normal', fmtNum(p.activo.amperajeNormal, ' A')]);
    der.push(['Amperaje alerta', fmtNum(p.activo.amperajeAlerta, ' A')]);
    der.push(['Amperaje critico', fmtNum(p.activo.amperajeCritico, ' A')]);
  }
  if (flags.presion) {
    der.push(['Presion normal', fmtNum(p.activo.presionNormal, ' bar')]);
    der.push(['Presion alerta', fmtNum(p.activo.presionAlerta, ' bar')]);
    der.push(['Presion critica', fmtNum(p.activo.presionCritica, ' bar')]);
  }
  // Intervalo de medicion solo si el equipo lleva horas (algo que medir).
  if (flags.temperatura || flags.amperaje || flags.presion || flags.vibracion) {
    der.push(['Intervalo medicion', fmtNum(p.activo.intervaloMedicionHoras, ' hs')]);
  }

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

    // Armar columnas dinamicamente segun los flags del tipo. Estaticas:
    // Fecha + Estado + Observaciones. Las columnas de motor solo si
    // aplican.
    type Col = { label: string; getter: (m: Medicion) => string; width: number };
    const dynamicCols: Col[] = [];
    if (flags.temperatura) dynamicCols.push({ label: 'Temp',      getter: (m) => fmtNum(m.temperatura, '°'), width: 18 });
    if (flags.amperaje)    dynamicCols.push({ label: 'Amp',       getter: (m) => fmtNum(m.amperaje, 'A'),    width: 18 });
    if (flags.presion)     dynamicCols.push({ label: 'Presion',   getter: (m) => fmtNum(m.presion, 'b'),     width: 18 });
    if (flags.vibracion)   dynamicCols.push({ label: 'Vibracion', getter: (m) => m.vibracion ?? '—',         width: 20 });

    const FECHA_W = 26;
    const ESTADO_W = 22;
    const dynamicW = dynamicCols.reduce((s, c) => s + c.width, 0);
    const OBS_W = Math.max(20, W - MAR * 2 - FECHA_W - dynamicW - ESTADO_W - 4);

    // Construir array de posiciones X
    let cursor = MAR + 2;
    const xFecha = cursor; cursor += FECHA_W;
    const xDyn: number[] = [];
    dynamicCols.forEach((c) => { xDyn.push(cursor); cursor += c.width; });
    const xEstado = cursor; cursor += ESTADO_W;
    const xObs = cursor;

    doc.setFillColor(...SLATE900);
    doc.rect(MAR, y - 2, W - MAR * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text('Fecha', xFecha, y + 2.5);
    dynamicCols.forEach((c, i) => doc.text(c.label, xDyn[i], y + 2.5));
    doc.text('Estado', xEstado, y + 2.5);
    doc.text('Observaciones', xObs, y + 2.5);
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
      doc.text(fmtFecha(m.fecha), xFecha, y + 2);
      dynamicCols.forEach((c, i) => doc.text(c.getter(m), xDyn[i], y + 2));

      const ec = colorEstado(m.estado);
      doc.setTextColor(...ec);
      doc.setFont('helvetica', 'bold');
      doc.text(labelEstado(m.estado), xEstado, y + 2);
      doc.setTextColor(...BLACK);
      doc.setFont('helvetica', 'normal');
      const obs = doc.splitTextToSize(m.observaciones ?? '', OBS_W);
      doc.text(obs[0] ?? '', xObs, y + 2);
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
  doc.text(PDF_BRAND, MAR, H - 3.5);
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
    doc.text(fmtMantenimiento(a), colX[7], y + 2);

    y += 6.5;
  });

  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...SLATE100);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(PDF_BRAND, MAR, H - 3.5);
  doc.text(`Total: ${p.activos.length} activos`, W - MAR, H - 3.5, { align: 'right' });

  doc.save(`ActivaQR-Activos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export interface InformeMensualPdfParams {
  kpis: Kpis;
  empresaNombre: string;
  periodo: string; // ej: "Junio 2026"
  responsableInforme?: string;
}

export function exportarInformeMensualPdf(p: InformeMensualPdfParams) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const MAR = 14;
  const r = p.kpis.resumen;

  // ── Portada / encabezado ───────────────────────────────────────────
  doc.setFillColor(...SLATE900);
  doc.rect(0, 0, W, 46, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, 46, W, 3, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('ACTIVAQR', MAR, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestion de activos industriales', MAR, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Informe mensual de mantenimiento', MAR, 36);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(p.periodo, W - MAR, 18, { align: 'right' });
  doc.text(p.empresaNombre, W - MAR, 24, { align: 'right' });

  let y = 58;

  // ── Resumen ejecutivo (tarjetas) ───────────────────────────────────
  doc.setTextColor(...BLACK);
  y = seccionTitulo(doc, y, 'Resumen ejecutivo');

  const tarjetas: [string, string, [number, number, number]][] = [
    ['Disponibilidad', `${r.disponibilidad}%`, GREEN],
    ['Activos totales', String(r.totalActivos), SLATE900],
    ['Cumplimiento prev.', `${r.cumplimiento}%`, ORANGE],
    ['Tareas pendientes', String(r.tareasPendientes), r.tareasVencidas > 0 ? RED : SLATE900],
    ['MTTR (dias)', r.mttrDias != null ? String(r.mttrDias) : '—', SLATE900],
    ['MTBF (dias)', r.mtbfDias != null ? String(r.mtbfDias) : '—', SLATE900],
    ['Ordenes cerradas', String(r.tareasCompletadas), GREEN],
    ['Estado critico', String(r.porEstado.critico ?? 0), RED],
  ];

  const cardW = (W - MAR * 2 - 9) / 4;
  const cardH = 22;
  tarjetas.forEach((t, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = MAR + col * (cardW + 3);
    const cy = y + row * (cardH + 3);
    doc.setDrawColor(...SLATE900);
    doc.setLineWidth(0.4);
    doc.rect(x, cy, cardW, cardH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(t[0].toUpperCase(), x + 2.5, cy + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...t[2]);
    doc.text(t[1], x + 2.5, cy + 16);
  });

  y += 2 * (cardH + 3) + 6;

  // ── Mantenimiento predictivo ───────────────────────────────────────
  doc.setTextColor(...BLACK);
  y = seccionTitulo(doc, y, 'Mantenimiento predictivo');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (p.kpis.predictivo.length === 0) {
    doc.text('Sin tendencias ascendentes en los parametros monitoreados. Todo dentro de lo esperado.', MAR + 2, y);
    y += 8;
  } else {
    doc.text('Parametros con tendencia creciente — revisar antes de que escalen a falla:', MAR + 2, y);
    y += 6;
    p.kpis.predictivo.slice(0, 10).forEach((pr, idx) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(...SLATE50); doc.rect(MAR, y - 3.5, W - MAR * 2, 6, 'F'); }
      doc.setTextColor(...BLACK);
      doc.setFont('helvetica', 'normal');
      doc.text(`${pr.codigo} — ${pr.nombre}`, MAR + 2, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...AMBER);
      doc.text(`${pr.parametro} en ascenso`, W - MAR - 2, y, { align: 'right' });
      y += 6;
    });
    y += 2;
  }

  // ── Equipos con mas fallas ─────────────────────────────────────────
  doc.setTextColor(...BLACK);
  if (y > 240) { doc.addPage(); y = 20; }
  y = seccionTitulo(doc, y, 'Equipos con mas fallas');
  doc.setFontSize(8);
  if (p.kpis.equiposConMasFallas.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Sin fallas registradas en el periodo.', MAR + 2, y);
    y += 8;
  } else {
    p.kpis.equiposConMasFallas.forEach((e, idx) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(...SLATE50); doc.rect(MAR, y - 3.5, W - MAR * 2, 6, 'F'); }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BLACK);
      doc.text(`${e.codigo} — ${e.nombre}`, MAR + 2, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...RED);
      doc.text(`${e.fallas} fallas`, W - MAR - 2, y, { align: 'right' });
      y += 6;
    });
    y += 2;
  }

  // ── Alertas por sector ─────────────────────────────────────────────
  doc.setTextColor(...BLACK);
  if (y > 235) { doc.addPage(); y = 20; }
  y = seccionTitulo(doc, y, 'Estado por sector');
  doc.setFontSize(8);
  if (p.kpis.alertasPorSector.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Sin sectores definidos.', MAR + 2, y);
    y += 8;
  } else {
    p.kpis.alertasPorSector.forEach((s, idx) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(...SLATE50); doc.rect(MAR, y - 3.5, W - MAR * 2, 6, 'F'); }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BLACK);
      doc.text(s.sector, MAR + 2, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(s.criticos > 0 ? RED[0] : GREEN[0], s.criticos > 0 ? RED[1] : GREEN[1], s.criticos > 0 ? RED[2] : GREEN[2]);
      doc.text(`${s.total} activos · ${s.criticos} en alerta`, W - MAR - 2, y, { align: 'right' });
      y += 6;
    });
    y += 2;
  }

  // ── Tendencia de fallas (6 meses) ──────────────────────────────────
  doc.setTextColor(...BLACK);
  if (y > 220) { doc.addPage(); y = 20; }
  y = seccionTitulo(doc, y, 'Tendencia de fallas (6 meses)');
  const tf = p.kpis.tendenciaFallas;
  const maxF = Math.max(1, ...tf.map((t) => t.fallas));
  const chartH = 36;
  const chartW = W - MAR * 2;
  const barGap = 4;
  const barW = (chartW - barGap * (tf.length - 1)) / tf.length;
  const baseY = y + chartH;
  tf.forEach((t, i) => {
    const bx = MAR + i * (barW + barGap);
    const bh = (t.fallas / maxF) * chartH;
    doc.setFillColor(...ORANGE);
    doc.setDrawColor(...SLATE900);
    doc.setLineWidth(0.3);
    if (bh > 0) doc.rect(bx, baseY - bh, barW, bh, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BLACK);
    doc.text(String(t.fallas), bx + barW / 2, baseY - bh - 1.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(t.mes.slice(5), bx + barW / 2, baseY + 4, { align: 'center' });
  });
  y = baseY + 10;

  // ── Cierre / firma ─────────────────────────────────────────────────
  if (y > 255) { doc.addPage(); y = 20; }
  doc.setDrawColor(...SLATE100);
  doc.setLineWidth(0.5);
  doc.line(MAR, y, W - MAR, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const obs = p.responsableInforme
    ? `Informe elaborado por ${p.responsableInforme}. Ante alertas criticas se notifica al cliente por los canales acordados.`
    : 'Ante alertas criticas se notifica al cliente por los canales acordados.';
  doc.text(doc.splitTextToSize(obs, W - MAR * 2), MAR, y);

  // ── Footer en todas las paginas ────────────────────────────────────
  const H = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(...SLATE100);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`ActivaQR — Informe mensual · ${p.empresaNombre}`, MAR, H - 3.5);
    doc.text(`${p.periodo} · Pag. ${i}/${pages}`, W - MAR, H - 3.5, { align: 'right' });
  }

  const slug = p.empresaNombre.replace(/\s+/g, '-').toLowerCase();
  doc.save(`ActivaQR-Informe-${slug}-${p.periodo.replace(/\s+/g, '-')}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────
// REPORTE DE CADENA DE CUSTODIA
// Documento que prueba donde y cuando estuvo registrado un activo.
// Util para auditoria, seguros y disputas por extravio o daño en traslado.

interface PuntoCustodia {
  id: string;
  origen: 'medicion' | 'mensaje_remoto';
  lat: number;
  lng: number;
  capturedAt: string | null;
  subidoEn: string;
  fuente: string | null;
  device: string | null;
  descripcion: string | null;
  autor: string | null;
}

export interface CadenaCustodiaPdfParams {
  activoCodigo: string;
  activoNombre: string;
  empresaNombre?: string;
  puntos: PuntoCustodia[];
}

export function exportarCadenaCustodiaPdf(p: CadenaCustodiaPdfParams) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const MAR = 14;

  header(doc, 'CADENA DE CUSTODIA DIGITAL', `${p.activoCodigo} — ${p.activoNombre}`);
  let y = 40;

  // Resumen
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE900);
  const resumen = `Este documento reporta ${p.puntos.length} ubicacion${p.puntos.length === 1 ? '' : 'es'} geolocalizada${p.puntos.length === 1 ? '' : 's'} del activo, ordenadas de mas reciente a mas antigua. Cada punto incluye la coordenada GPS, la fecha y hora del registro, el dispositivo que captura los datos y la fuente (EXIF de la imagen, mas confiable, o ubicacion del navegador como respaldo).`;
  const lineas = doc.splitTextToSize(resumen, W - MAR * 2);
  doc.text(lineas, MAR, y);
  y += lineas.length * 4 + 4;

  if (p.empresaNombre) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Empresa: ${p.empresaNombre}`, MAR, y);
    y += 6;
  }

  if (p.puntos.length === 0) {
    y = seccionTitulo(doc, y, 'SIN UBICACIONES REGISTRADAS');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE900);
    doc.text('Todavia no hay fotos con GPS asociadas a este activo.', MAR, y);
    doc.save(`ActivaQR-Custodia-${p.activoCodigo}.pdf`);
    return;
  }

  // Tabla de puntos
  y = seccionTitulo(doc, y + 2, 'REGISTRO CRONOLOGICO');

  for (let i = 0; i < p.puntos.length; i++) {
    const pt = p.puntos[i];
    const fechaReal = pt.capturedAt ?? pt.subidoEn;
    let fechaFmt = '';
    try {
      fechaFmt = format(parseISO(fechaReal), "dd/MM/yyyy HH:mm 'hs'", { locale: es });
    } catch {
      fechaFmt = fechaReal;
    }

    // Salto de pagina si no entra el bloque entero (necesita ~28mm)
    if (y + 32 > H - 15) {
      doc.addPage();
      header(doc, 'CADENA DE CUSTODIA DIGITAL (cont.)', `${p.activoCodigo} — ${p.activoNombre}`);
      y = 40;
    }

    // Recuadro del bloque
    doc.setDrawColor(...SLATE100);
    doc.setLineWidth(0.3);
    doc.rect(MAR, y, W - MAR * 2, 28);

    // Numero + indicador EXIF
    doc.setFillColor(...(i === 0 ? ORANGE : SLATE900));
    doc.rect(MAR, y, 12, 28, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(String(i + 1), MAR + 6, y + 12, { align: 'center' });
    doc.setFontSize(6);
    if (i === 0) doc.text('MAS', MAR + 6, y + 18, { align: 'center' });
    if (i === 0) doc.text('RECIENTE', MAR + 6, y + 21, { align: 'center' });

    // Contenido del bloque
    const x = MAR + 16;
    doc.setTextColor(...SLATE900);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(fechaFmt, x, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Lat: ${pt.lat.toFixed(6)}   Lng: ${pt.lng.toFixed(6)}`, x, y + 10);

    const origenTxt = pt.origen === 'medicion' ? 'Medicion del operario' : 'Mensaje de soporte';
    const autorTxt = pt.autor ? ` - ${pt.autor}` : '';
    doc.text(`${origenTxt}${autorTxt}`, x, y + 15);

    if (pt.device) {
      doc.text(`Dispositivo: ${pt.device}`, x, y + 20);
    }

    // Badge de fuente (EXIF / Navegador)
    const badgeX = W - MAR - 28;
    if (pt.fuente === 'exif') {
      doc.setFillColor(...GREEN);
      doc.rect(badgeX, y + 3, 26, 5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('EXIF VERIFICADO', badgeX + 13, y + 6.5, { align: 'center' });
    } else if (pt.fuente === 'browser') {
      doc.setFillColor(...AMBER);
      doc.rect(badgeX, y + 3, 26, 5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('NAVEGADOR', badgeX + 13, y + 6.5, { align: 'center' });
    }

    // Link Google Maps
    doc.setTextColor(...ORANGE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const linkMaps = `https://www.google.com/maps?q=${pt.lat},${pt.lng}`;
    doc.textWithLink('Ver en Google Maps', badgeX, y + 14, { url: linkMaps });

    if (pt.descripcion) {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      const desc = pt.descripcion.length > 80 ? pt.descripcion.slice(0, 80) + '...' : pt.descripcion;
      doc.text(desc, x, y + 25);
    }

    y += 30;
  }

  // Footer en cada pagina
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(...SLATE100);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`ActivaQR — Cadena de custodia · ${p.activoCodigo}`, MAR, H - 3.5);
    doc.text(`Generado ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })} · Pag. ${i}/${pages}`, W - MAR, H - 3.5, { align: 'right' });
  }

  const slug = p.activoCodigo.replace(/\s+/g, '-').toLowerCase();
  doc.save(`ActivaQR-Custodia-${slug}.pdf`);
}
