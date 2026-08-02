import { Router, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest, requireAdmin } from '../auth';
import { enviarPushASuperadmin } from '../push';
import {
  actualizarMontoPreapproval,
  crearPreapproval,
  mpConfigurado,
  obtenerPreapproval,
} from '../mercadopago';
import {
  bloquesExtra, esPlanId, PLAN_IDS, PLANES,
  precioReferenciaUsd,
} from '../planCatalog';
import { calcularPrecioPlanActual, obtenerCotizacionMep } from '../cotizacion';
import { POLITICAS_VERSION } from '../politicas';
import { MP_BACK_URL } from '../urls';

const router = Router();

const ORDEN_PLAN: Record<string, number> = { inicial: 0, empresa: 1, industrial: 2 };

router.get('/planes', async (_req, res) => {
  try {
    const cotizacion = await obtenerCotizacionMep();
    res.json({
      mercadoPagoConfigurado: mpConfigurado(),
      cotizacion: {
        tipo: 'MEP',
        venta: cotizacion.venta,
        fuente: cotizacion.fuente,
        fecha: cotizacion.fechaFuente,
        desdeCache: cotizacion.desdeCache,
      },
      planes: PLAN_IDS.map((plan) => ({
        plan,
        nombre: PLANES[plan].nombre,
        precioArs: Math.ceil(
          PLANES[plan].precioReferenciaUsd * cotizacion.venta / 100
        ) * 100,
        precioReferenciaUsd: PLANES[plan].precioReferenciaUsd,
        activosIncluidos: PLANES[plan].activosIncluidos,
        recargoPorBloqueUsd: PLANES[plan].recargoPorBloqueUsd,
        tamanoBloqueExtra: PLANES[plan].tamanoBloqueExtra,
      })),
    });
  } catch {
    res.json({
      mercadoPagoConfigurado: false,
      cotizacion: null,
      planes: PLAN_IDS.map((plan) => ({
        plan,
        nombre: PLANES[plan].nombre,
        precioArs: null,
        precioReferenciaUsd: PLANES[plan].precioReferenciaUsd,
        activosIncluidos: PLANES[plan].activosIncluidos,
        recargoPorBloqueUsd: PLANES[plan].recargoPorBloqueUsd,
        tamanoBloqueExtra: PLANES[plan].tamanoBloqueExtra,
      })),
    });
  }
});

router.post('/iniciar', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth?.empresaId;
    if (!empresaId) return res.status(403).json({ error: 'Acción solo disponible para empresas.' });
    const plan = String(req.body?.plan ?? '');
    if (!esPlanId(plan)) return res.status(400).json({ error: 'Plan inválido.' });
    if (!mpConfigurado()) {
      return res.status(503).json({ code: 'pago_no_configurado', error: 'El pago automático todavía no está habilitado.' });
    }
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { usuarios: { where: { rol: 'admin' }, take: 1 } },
    });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada.' });
    if (
      !empresa.politicasAceptadasEn ||
      empresa.politicasVersion !== POLITICAS_VERSION
    ) {
      return res.status(409).json({
        code: 'politicas_no_aceptadas',
        error: 'Primero tenés que aceptar la versión vigente de las políticas.',
      });
    }
    if (empresa.mpEstadoSub === 'authorized') {
      return res.status(409).json({ error: 'Ya existe una suscripción activa.' });
    }
    const cantidadActivos = await prisma.activo.count({ where: { empresaId } });
    const precio = await calcularPrecioPlanActual(plan, cantidadActivos, {
      forzarCotizacion: true,
    });
    if (empresa.mpEstadoSub === 'pending' && empresa.mpPreapprovalId) {
      const pendiente = await obtenerPreapproval(empresa.mpPreapprovalId);
      if (pendiente.status === 'pending' && pendiente.init_point) {
        if (Number(pendiente.auto_recurring?.transaction_amount) !== precio.montoArs) {
          await actualizarMontoPreapproval(
            pendiente.id,
            precio.montoArs,
            `ActivaQR ${PLANES[plan].nombre} — USD ${precio.montoUsd} al MEP`,
          );
          await prisma.empresa.update({
            where: { id: empresaId },
            data: {
              planSolicitado: plan,
              mpMonto: precio.montoArs,
              mpMontoUsd: precio.montoUsd,
              mpCotizacionUsdArs: precio.cotizacion.venta,
              mpCotizacionFuente: precio.cotizacion.fuente,
              mpCotizacionActualizadaEn: new Date(),
            },
          });
        }
        return res.json({
          initPoint: pendiente.init_point,
          preapprovalId: pendiente.id,
          montoArs: precio.montoArs,
          precioReferenciaUsd: precio.montoUsd,
          cotizacionMep: precio.cotizacion.venta,
        });
      }
    }

    const payerEmail = empresa.usuarios[0]?.email;
    if (!payerEmail) return res.status(400).json({ error: 'La empresa no tiene un administrador.' });
    const monto = precio.montoArs;
    const extras = bloquesExtra(plan, cantidadActivos);
    const appUrl = MP_BACK_URL;
    const pre = await crearPreapproval({
      empresaId,
      payerEmail,
      monto,
      razon: `ActivaQR ${PLANES[plan].nombre}${extras ? ` + ${extras} bloque(s) extra` : ''}`,
      backUrl: `${appUrl.replace(/\/$/, '')}/#/configuracion?pago=retorno`,
    });
    await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        planSolicitado: plan,
        mpPreapprovalId: pre.id,
        mpEstadoSub: pre.status,
        mpMonto: monto,
        mpMontoUsd: precio.montoUsd,
        mpCotizacionUsdArs: precio.cotizacion.venta,
        mpCotizacionFuente: precio.cotizacion.fuente,
        mpCotizacionActualizadaEn: new Date(),
      },
    });
    res.json({
      initPoint: pre.init_point,
      preapprovalId: pre.id,
      montoArs: monto,
      precioReferenciaUsd: precioReferenciaUsd(plan, cantidadActivos),
      cotizacionMep: precio.cotizacion.venta,
      cotizacionFuente: precio.cotizacion.fuente,
      bloquesExtra: extras,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/suscripcion/solicitar-upgrade
// Requires auth + active empresa (applied by parent router in index.ts)
router.post('/solicitar-upgrade', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth?.empresaId;
    if (!empresaId) {
      return res.status(403).json({ error: 'Acción solo disponible para empresas.' });
    }

    const { plan } = req.body ?? {};
    if (!plan || !['empresa', 'industrial'].includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido. Debe ser "empresa" o "industrial".' });
    }

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada.' });

    const planActualOrden = ORDEN_PLAN[empresa.plan] ?? 0;
    const planSolicitadoOrden = ORDEN_PLAN[plan] ?? 0;

    if (planSolicitadoOrden <= planActualOrden) {
      return res.status(400).json({ error: 'El plan solicitado debe ser mayor al plan actual.' });
    }

    await prisma.empresa.update({
      where: { id: empresaId },
      data: { planSolicitado: plan as 'empresa' | 'industrial' },
    });

    enviarPushASuperadmin({
      title: 'Solicitud de upgrade',
      body: `${empresa.nombre} solicita el plan ${plan}`,
      url: '#/admin',
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
