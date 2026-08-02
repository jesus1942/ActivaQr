import { prisma } from './prisma';
import {
  CotizacionRemota,
  parsearArgentinaDatos,
  parsearDolarApi,
} from './cotizacionCore';
import {
  PlanId,
  precioArsDesdeCotizacion,
  precioReferenciaUsd,
} from './planCatalog';

const CACHE_FRESCA_MS = 60 * 60 * 1000;
const CACHE_MAXIMA_MS = 7 * 24 * 60 * 60 * 1000;
const TIMEOUT_PROVEEDOR_MS = 5_000;

const PROVEEDORES = [
  {
    url: 'https://dolarapi.com/v1/dolares/bolsa',
    parsear: parsearDolarApi,
  },
  {
    url: 'https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa',
    parsear: parsearArgentinaDatos,
  },
] as const;

export interface CotizacionMep {
  compra: number | null;
  venta: number;
  fechaFuente: Date;
  consultadaEn: Date;
  fuente: string;
  desdeCache: boolean;
}

async function consultarJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_PROVEEDOR_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizarCache(cache: {
  compra: number | null;
  venta: number;
  fechaFuente: Date;
  consultadaEn: Date;
  fuente: string;
}): CotizacionMep {
  return { ...cache, desdeCache: true };
}

async function guardarCotizacion(cotizacion: CotizacionRemota): Promise<CotizacionMep> {
  const consultadaEn = new Date();
  const guardada = await prisma.cotizacionUsdArs.upsert({
    where: { id: 'mep' },
    create: {
      id: 'mep',
      tipo: 'MEP',
      compra: cotizacion.compra,
      venta: cotizacion.venta,
      fuente: cotizacion.fuente,
      fechaFuente: cotizacion.fechaFuente,
      consultadaEn,
    },
    update: {
      compra: cotizacion.compra,
      venta: cotizacion.venta,
      fuente: cotizacion.fuente,
      fechaFuente: cotizacion.fechaFuente,
      consultadaEn,
    },
  });
  return { ...guardada, desdeCache: false };
}

export async function obtenerCotizacionMep(
  opciones: { forzar?: boolean } = {},
): Promise<CotizacionMep> {
  const cache = await prisma.cotizacionUsdArs.findUnique({ where: { id: 'mep' } });
  const ahora = Date.now();
  if (
    cache &&
    !opciones.forzar &&
    ahora - cache.consultadaEn.getTime() < CACHE_FRESCA_MS
  ) {
    return normalizarCache(cache);
  }

  const errores: string[] = [];
  for (const proveedor of PROVEEDORES) {
    try {
      const payload = await consultarJson(proveedor.url);
      const cotizacion = proveedor.parsear(payload);
      const antiguedad = Date.now() - cotizacion.fechaFuente.getTime();
      if (antiguedad > CACHE_MAXIMA_MS || antiguedad < -24 * 60 * 60 * 1000) {
        throw new Error('La fecha de la cotización MEP no es vigente.');
      }
      return await guardarCotizacion(cotizacion);
    } catch (error) {
      errores.push(`${proveedor.url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (cache && ahora - cache.consultadaEn.getTime() <= CACHE_MAXIMA_MS) {
    console.warn('[COTIZACION] Proveedores no disponibles; se usa la última cotización válida.', errores);
    return normalizarCache(cache);
  }

  throw new Error('No pudimos obtener una cotización MEP vigente.');
}

export interface PrecioPlanActual {
  plan: PlanId;
  cantidadActivos: number;
  montoUsd: number;
  montoArs: number;
  cotizacion: CotizacionMep;
}

export async function calcularPrecioPlanActual(
  plan: PlanId,
  cantidadActivos: number,
  opciones: { forzarCotizacion?: boolean } = {},
): Promise<PrecioPlanActual> {
  const cotizacion = await obtenerCotizacionMep({ forzar: opciones.forzarCotizacion });
  return {
    plan,
    cantidadActivos,
    montoUsd: precioReferenciaUsd(plan, cantidadActivos),
    montoArs: precioArsDesdeCotizacion(plan, cantidadActivos, cotizacion.venta),
    cotizacion,
  };
}
