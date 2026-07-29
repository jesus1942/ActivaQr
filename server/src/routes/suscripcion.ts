import { Router, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest, requireAdmin } from '../auth';
import { enviarPushASuperadmin } from '../push';
import { crearPreapproval, mpConfigurado, obtenerPreapproval } from '../mercadopago';
import {
  bloquesExtra, esPlanId, multiplicadorPrecio, PLAN_IDS, PLANES,
  precioBaseArs, precioReferenciaUsd,
} from '../planCatalog';

const router = Router();

const ORDEN_PLAN: Record<string, number> = { inicial: 0, empresa: 1, industrial: 2 };

router.get('/planes', (_req, res) => {
  res.json({
    mercadoPagoConfigurado: mpConfigurado(),
    planes: PLAN_IDS.map((plan) => ({
      plan,
      nombre: PLANES[plan].nombre,
      precioArs: precioBaseArs(plan),
      precioReferenciaUsd: PLANES[plan].precioReferenciaUsd,
      activosIncluidos: PLANES[plan].activosIncluidos,
      recargoPorBloqueUsd: PLANES[plan].recargoPorBloqueUsd,
      tamanoBloqueExtra: PLANES[plan].tamanoBloqueExtra,
    })),
  });
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
    const montoBase = precioBaseArs(plan);
    if (!montoBase) {
      return res.status(503).json({ code: 'precio_no_configurado', error: 'Este plan todavía no tiene un precio en pesos configurado.' });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { usuarios: { where: { rol: 'admin' }, take: 1 } },
    });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada.' });
    if (!empresa.politicasAceptadasEn) {
      return res.status(409).json({ error: 'Primero tenés que aceptar las políticas.' });
    }
    if (empresa.mpEstadoSub === 'authorized') {
      return res.status(409).json({ error: 'Ya existe una suscripción activa.' });
    }
    if (empresa.mpEstadoSub === 'pending' && empresa.mpPreapprovalId) {
      const pendiente = await obtenerPreapproval(empresa.mpPreapprovalId);
      if (pendiente.status === 'pending' && pendiente.init_point) {
        return res.json({ initPoint: pendiente.init_point, preapprovalId: pendiente.id });
      }
    }

    const payerEmail = empresa.usuarios[0]?.email;
    if (!payerEmail) return res.status(400).json({ error: 'La empresa no tiene un administrador.' });
    const cantidadActivos = await prisma.activo.count({ where: { empresaId } });
    const monto = Math.round(montoBase * multiplicadorPrecio(plan, cantidadActivos));
    const extras = bloquesExtra(plan, cantidadActivos);
    const appUrl = process.env.MP_BACK_URL || process.env.APP_PUBLIC_URL || 'https://activaqr.net/app/';
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
      },
    });
    res.json({
      initPoint: pre.init_point,
      preapprovalId: pre.id,
      montoArs: monto,
      precioReferenciaUsd: precioReferenciaUsd(plan, cantidadActivos),
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
