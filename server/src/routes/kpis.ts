import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';

const router = Router();

const DIA_MS = 1000 * 60 * 60 * 24;

// Analiza la tendencia de una serie de valores (más reciente primero).
// Devuelve 'subiendo' | 'bajando' | 'estable' según la pendiente simple.
function tendencia(valores: number[]): 'subiendo' | 'bajando' | 'estable' {
  const v = valores.filter((x) => typeof x === 'number' && !isNaN(x));
  if (v.length < 3) return 'estable';
  // v viene de más reciente a más antiguo; lo damos vuelta para orden cronológico
  const serie = [...v].reverse();
  const n = serie.length;
  const mediaX = (n - 1) / 2;
  const mediaY = serie.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  serie.forEach((y, x) => {
    num += (x - mediaX) * (y - mediaY);
    den += (x - mediaX) ** 2;
  });
  const pendiente = den === 0 ? 0 : num / den;
  // Umbral relativo al rango de la serie para evitar falsos positivos
  // cuando los valores son cercanos a cero.
  const rango = Math.max(...serie) - Math.min(...serie);
  const umbral = Math.max(Math.abs(mediaY) * 0.05, rango * 0.1, 0.01);
  if (pendiente > umbral) return 'subiendo';
  if (pendiente < -umbral) return 'bajando';
  return 'estable';
}

// GET /api/kpis — métricas de gestión + dashboard ejecutivo + predictivo
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);

    const [activos, tareas, mediciones, sectores] = await Promise.all([
      prisma.activo.findMany({ where: { empresaId }, include: { sector: true } }),
      prisma.tareaMantenimiento.findMany({ where: { activo: { empresaId } } }),
      prisma.medicion.findMany({
        where: { activo: { empresaId } },
        orderBy: { fecha: 'desc' },
        select: {
          activoId: true, fecha: true, estado: true,
          temperatura: true, amperaje: true, presion: true,
          voltaje: true, porcentajeBateria: true, nivelToner: true,
          horasMarcha: true, vibracion: true,
        },
      }),
      prisma.sector.findMany({ where: { empresaId } }),
    ]);

    const totalActivos = activos.length;
    const porEstado = { normal: 0, alerta: 0, critico: 0, mantenimiento: 0 } as Record<string, number>;
    activos.forEach((a) => { porEstado[a.estado] = (porEstado[a.estado] ?? 0) + 1; });

    const operativos = activos.filter((a) => a.estadoOperativo === 'operativo').length;
    const disponibilidad = totalActivos ? Math.round((operativos / totalActivos) * 100) : 100;

    // Tareas
    const tareasPendientes = tareas.filter((t) => t.estado === 'pendiente').length;
    const tareasVencidas = tareas.filter((t) => t.estado === 'vencido').length;
    const tareasCompletadas = tareas.filter((t) => t.estado === 'completado').length;

    // Cumplimiento preventivo: % de tareas completadas a tiempo (fechaRealizada <= fechaProgramada)
    const completadas = tareas.filter((t) => t.estado === 'completado' && t.fechaRealizada);
    const aTiempo = completadas.filter((t) => t.fechaRealizada! <= t.fechaProgramada).length;
    const cumplimiento = completadas.length ? Math.round((aTiempo / completadas.length) * 100) : 100;

    // MTTR: promedio de días entre fechaProgramada y fechaRealizada en órdenes cerradas
    const reparaciones = completadas
      .map((t) => (t.fechaRealizada!.getTime() - t.fechaProgramada.getTime()) / DIA_MS)
      .filter((d) => d >= 0);
    const mttrDias = reparaciones.length
      ? Math.round((reparaciones.reduce((a, b) => a + b, 0) / reparaciones.length) * 10) / 10
      : null;

    // Fallas por activo (mediciones urgentes/críticas)
    const fallasPorActivo = new Map<string, { fechas: Date[] }>();
    mediciones.forEach((m) => {
      if (m.estado === 'urgente' || m.estado === 'revision') {
        if (!fallasPorActivo.has(m.activoId)) fallasPorActivo.set(m.activoId, { fechas: [] });
        fallasPorActivo.get(m.activoId)!.fechas.push(m.fecha);
      }
    });

    const nombrePorId = new Map(activos.map((a) => [a.id, a]));
    const equiposConMasFallas = [...fallasPorActivo.entries()]
      .map(([activoId, { fechas }]) => ({
        activoId,
        codigo: nombrePorId.get(activoId)?.codigo ?? '',
        nombre: nombrePorId.get(activoId)?.nombre ?? '',
        fallas: fechas.length,
      }))
      .sort((a, b) => b.fallas - a.fallas)
      .slice(0, 5);

    // MTBF global: promedio de días entre fallas (todas las series con 2+ fallas)
    const intervalos: number[] = [];
    fallasPorActivo.forEach(({ fechas }) => {
      const orden = fechas.map((f) => f.getTime()).sort((a, b) => a - b);
      for (let i = 1; i < orden.length; i++) intervalos.push((orden[i] - orden[i - 1]) / DIA_MS);
    });
    const mtbfDias = intervalos.length
      ? Math.round((intervalos.reduce((a, b) => a + b, 0) / intervalos.length) * 10) / 10
      : null;

    // Alertas por sector
    const alertasPorSector = sectores.map((s) => {
      const enSector = activos.filter((a) => a.sectorId === s.id);
      const criticos = enSector.filter((a) => a.estado === 'critico' || a.estado === 'alerta').length;
      return { sector: s.nombre, total: enSector.length, criticos };
    });

    // Tendencia de fallas por mes (últimos 6 meses)
    const ahora = new Date();
    const tendenciaFallas: { mes: string; fallas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const fin = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 1);
      const fallas = mediciones.filter(
        (m) => (m.estado === 'urgente' || m.estado === 'revision') && m.fecha >= d && m.fecha < fin
      ).length;
      tendenciaFallas.push({ mes: d.toISOString().slice(0, 7), fallas });
    }

    // ── Análisis predictivo ───────────────────────────────────────────────────
    const predictivo: { activoId: string; codigo: string; nombre: string; parametro: string; tendencia: string }[] = [];
    const VIBRACION_NUM: Record<string, number> = { ninguna: 0, leve: 1, moderada: 2, alta: 3 };

    activos.forEach((a) => {
      const ms = mediciones.filter((m) => m.activoId === a.id).slice(0, 8);
      if (ms.length < 3) return;

      const agregar = (parametro: string, t: string) =>
        predictivo.push({ activoId: a.id, codigo: a.codigo, nombre: a.nombre, parametro, tendencia: t });

      // Parámetros con tendencia ascendente (malo que suban)
      const ascendentes: { clave: keyof typeof ms[0]; label: string }[] = [
        { clave: 'temperatura', label: 'Temperatura' },
        { clave: 'amperaje', label: 'Amperaje' },
        { clave: 'presion', label: 'Presion' },
        { clave: 'voltaje', label: 'Voltaje' },
      ];
      ascendentes.forEach(({ clave, label }) => {
        const serie = ms.map((m) => m[clave] as number | null).filter((x): x is number => typeof x === 'number' && !isNaN(x));
        if (serie.length >= 3 && tendencia(serie) === 'subiendo') agregar(label, 'subiendo');
      });

      // Parámetros con tendencia descendente (malo que bajen)
      const descendentes: { clave: keyof typeof ms[0]; label: string }[] = [
        { clave: 'porcentajeBateria', label: 'Bateria' },
        { clave: 'nivelToner', label: 'Toner' },
      ];
      descendentes.forEach(({ clave, label }) => {
        const serie = ms.map((m) => m[clave] as number | null).filter((x): x is number => typeof x === 'number' && !isNaN(x));
        if (serie.length >= 3 && tendencia(serie) === 'bajando') agregar(label, 'bajando');
      });

      // Vibración: convertir enum a número y detectar escalada
      const vibSerie = ms
        .map((m) => VIBRACION_NUM[m.vibracion as string] ?? null)
        .filter((x): x is number => x !== null);
      if (vibSerie.length >= 3 && tendencia(vibSerie) === 'subiendo') {
        const ultima = ms[0].vibracion as string;
        if (ultima === 'moderada' || ultima === 'alta') agregar('Vibracion', 'subiendo');
      }

      // Aceleración de horas de marcha: si el incremento entre mediciones crece (uso intensivo)
      const horas = ms.map((m) => m.horasMarcha).filter((x): x is number => typeof x === 'number' && x > 0);
      if (horas.length >= 4) {
        const incrementos: number[] = [];
        for (let i = 0; i < horas.length - 1; i++) incrementos.push(horas[i] - horas[i + 1]);
        if (incrementos.length >= 3 && tendencia(incrementos) === 'subiendo') {
          agregar('Uso acelerado', 'subiendo');
        }
      }

      // Frecuencia de revisiones: si en las últimas 6 el % de estado revision/urgente sube
      const estadosSerie = ms.slice(0, 6).map((m) => (m.estado === 'revision' || m.estado === 'urgente' ? 1 : 0));
      if (estadosSerie.length >= 3) {
        const ventana1 = estadosSerie.slice(0, 3).filter(Boolean).length;
        const ventana2 = estadosSerie.slice(3).filter(Boolean).length;
        if (ventana1 > ventana2 && ventana1 >= 2) agregar('Inestabilidad reciente', 'subiendo');
      }
    });

    res.json({
      resumen: {
        totalActivos,
        porEstado,
        operativos,
        disponibilidad,
        tareasPendientes,
        tareasVencidas,
        tareasCompletadas,
        cumplimiento,
        mttrDias,
        mtbfDias,
      },
      equiposConMasFallas,
      alertasPorSector,
      tendenciaFallas,
      predictivo,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
