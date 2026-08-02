import { prisma } from './prisma';
import { actualizarMontoPreapproval, mpConfigurado } from './mercadopago';
import { calcularPrecioPlanActual } from './cotizacion';
import type { PlanId } from './planCatalog';

const INTERVALO_SINCRONIZACION_MS = 6 * 60 * 60 * 1000;
let sincronizacionEnCurso: Promise<ResultadoSincronizacion> | null = null;

export interface ResultadoSincronizacion {
  revisadas: number;
  actualizadas: number;
  sinCambios: number;
  errores: number;
  cotizacion: number;
}

async function ejecutarSincronizacion(): Promise<ResultadoSincronizacion> {
  const empresas = await prisma.empresa.findMany({
    where: {
      mpPreapprovalId: { not: null },
      mpEstadoSub: { in: ['pending', 'authorized'] },
    },
    select: {
      id: true,
      nombre: true,
      plan: true,
      mpPreapprovalId: true,
      mpMonto: true,
      _count: { select: { activos: true } },
    },
  });

  const primera = await calcularPrecioPlanActual('inicial', 0, { forzarCotizacion: true });
  const resultado: ResultadoSincronizacion = {
    revisadas: empresas.length,
    actualizadas: 0,
    sinCambios: 0,
    errores: 0,
    cotizacion: primera.cotizacion.venta,
  };

  for (const empresa of empresas) {
    const plan = empresa.plan as PlanId;
    const precio = await calcularPrecioPlanActual(plan, empresa._count.activos);
    const montoAnterior = empresa.mpMonto;
    if (montoAnterior === precio.montoArs) {
      resultado.sinCambios += 1;
      continue;
    }

    try {
      await actualizarMontoPreapproval(
        empresa.mpPreapprovalId!,
        precio.montoArs,
        `ActivaQR ${plan} — USD ${precio.montoUsd} al MEP`,
      );
      await prisma.$transaction([
        prisma.empresa.update({
          where: { id: empresa.id },
          data: {
            mpMonto: precio.montoArs,
            mpMontoUsd: precio.montoUsd,
            mpCotizacionUsdArs: precio.cotizacion.venta,
            mpCotizacionFuente: precio.cotizacion.fuente,
            mpCotizacionActualizadaEn: new Date(),
          },
        }),
        prisma.registroAuditoria.create({
          data: {
            empresaId: empresa.id,
            usuarioNombre: 'Sistema de cotización',
            usuarioRol: 'sistema',
            accion: 'actualizar_precio_suscripcion',
            entidad: 'suscripcion',
            entidadId: empresa.mpPreapprovalId,
            detalle: JSON.stringify({
              montoAnteriorArs: montoAnterior,
              montoNuevoArs: precio.montoArs,
              montoUsd: precio.montoUsd,
              cotizacionMep: precio.cotizacion.venta,
              fuente: precio.cotizacion.fuente,
              fechaFuente: precio.cotizacion.fechaFuente.toISOString(),
            }),
          },
        }),
      ]);
      resultado.actualizadas += 1;
    } catch (error) {
      resultado.errores += 1;
      console.error(`[COTIZACION] No se pudo actualizar ${empresa.nombre}:`, error);
      await prisma.registroAuditoria.create({
        data: {
          empresaId: empresa.id,
          usuarioNombre: 'Sistema de cotización',
          usuarioRol: 'sistema',
          accion: 'error_actualizacion_precio_suscripcion',
          entidad: 'suscripcion',
          entidadId: empresa.mpPreapprovalId,
          detalle: JSON.stringify({
            montoObjetivoArs: precio.montoArs,
            montoUsd: precio.montoUsd,
            cotizacionMep: precio.cotizacion.venta,
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      }).catch(() => {});
    }
  }

  console.log('[COTIZACION] Sincronización terminada:', resultado);
  return resultado;
}

export function sincronizarPreciosSuscripciones(): Promise<ResultadoSincronizacion> {
  if (!sincronizacionEnCurso) {
    sincronizacionEnCurso = ejecutarSincronizacion()
      .finally(() => { sincronizacionEnCurso = null; });
  }
  return sincronizacionEnCurso;
}

export function iniciarSincronizadorPrecios(): void {
  if (!mpConfigurado()) {
    console.log('[COTIZACION] Sincronizador en espera: falta MP_ACCESS_TOKEN.');
    return;
  }
  const ejecutar = () => {
    sincronizarPreciosSuscripciones()
      .catch((error) => console.error('[COTIZACION] Sincronización automática falló:', error));
  };
  const inicio = setTimeout(ejecutar, 15_000);
  inicio.unref();
  const intervalo = setInterval(ejecutar, INTERVALO_SINCRONIZACION_MS);
  intervalo.unref();
}
