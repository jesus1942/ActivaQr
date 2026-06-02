import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { requireAuth, requireSuperadmin, AuthRequest } from '../auth';
import { crearPreapproval, cancelarPreapproval, crearLinkPago, mpConfigurado } from '../mercadopago';
import { enviarEmailSuscripcion } from '../email';
import { enviarPushAEmpresa } from '../push';

const router = Router();

// Todas las rutas de admin requieren superadmin.
router.use(requireAuth, requireSuperadmin);

// GET /api/admin/empresas — lista con conteo de activos y usuarios
router.get('/empresas', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresas = await prisma.empresa.findMany({
      orderBy: { creadaEn: 'desc' },
      include: {
        _count: { select: { activos: true, usuarios: true } },
        usuarios: {
          where: { rol: 'admin' },
          select: { id: true, nombre: true, email: true, activo: true, ultimoAcceso: true },
        },
      },
    });
    res.json(empresas);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/empresas — crea empresa + su usuario administrador
router.post('/empresas', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { nombre, cuit, plan, adminNombre, adminEmail, adminPassword } = req.body ?? {};
    if (!nombre || !adminEmail || !adminPassword) {
      return res.status(400).json({
        error: 'Faltan datos: nombre de empresa, email y contraseña del administrador.',
      });
    }
    if (String(adminPassword).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const emailNorm = String(adminEmail).toLowerCase().trim();
    const yaExiste = await prisma.usuario.findUnique({ where: { email: emailNorm } });
    if (yaExiste) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const empresa = await prisma.empresa.create({
      data: {
        nombre,
        cuit: cuit || null,
        plan: plan || 'inicial',
        usuarios: {
          create: {
            email: emailNorm,
            passwordHash,
            nombre: adminNombre || 'Administrador',
            rol: 'admin',
          },
        },
      },
      include: { _count: { select: { activos: true, usuarios: true } } },
    });

    res.status(201).json(empresa);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/empresas/:id — editar datos / plan / estado (suspender)
router.put('/empresas/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { nombre, cuit, plan, estado } = req.body ?? {};
    // Solo incluir los campos que vienen definidos — nunca pisar con undefined.
    const data: Record<string, unknown> = {};
    if (nombre  !== undefined) data.nombre  = nombre;
    if (cuit    !== undefined) data.cuit    = cuit;
    if (plan    !== undefined) data.plan    = plan;
    if (estado  !== undefined) data.estado  = estado;
    const anterior = await prisma.empresa.findUnique({ where: { id: req.params.id } });
    const empresa = await prisma.empresa.update({
      where: { id: req.params.id },
      data,
    });

    if (plan && anterior && plan !== anterior.plan) {
      enviarPushAEmpresa(empresa.id, {
        title: 'Plan actualizado',
        body: `Tu plan fue actualizado a ${plan.toUpperCase()}`,
        url: '#/configuracion',
      }).catch(() => {});
    }
    if (estado && anterior && estado !== anterior.estado) {
      enviarPushAEmpresa(empresa.id, {
        title: estado === 'activa' ? 'Cuenta activada' : 'Cuenta suspendida',
        body: estado === 'activa'
          ? 'Tu cuenta en ActivaQR fue reactivada.'
          : 'Tu cuenta en ActivaQR fue suspendida. Contactanos para mas informacion.',
        url: '#/',
      }).catch(() => {});
    }

    res.json(empresa);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    next(err);
  }
});

// DELETE /api/admin/empresas/:id — elimina empresa y todos sus datos (cascade)
router.delete('/empresas/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.empresa.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    next(err);
  }
});

// POST /api/admin/empresas/:id/reset-password — resetea la clave del admin
router.post('/empresas/:id/reset-password', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body ?? {};
    if (!password) return res.status(400).json({ error: 'Falta la nueva contraseña.' });

    const admin = await prisma.usuario.findFirst({
      where: { empresaId: req.params.id, rol: 'admin' },
    });
    if (!admin) return res.status(404).json({ error: 'Usuario administrador no encontrado.' });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.usuario.update({ where: { id: admin.id }, data: { passwordHash } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/empresas/:id/suscripcion — genera el link de adhesión de MP
router.post('/empresas/:id/suscripcion', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!mpConfigurado()) {
      return res.status(503).json({
        error: 'Mercado Pago no está configurado. Falta la variable MP_ACCESS_TOKEN.',
      });
    }

    const { monto, payerEmailOverride } = req.body ?? {};
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      return res.status(400).json({ error: 'Indicá un monto mensual válido.' });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: req.params.id },
      include: { usuarios: { where: { rol: 'admin' }, take: 1 } },
    });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada.' });

    // En modo prueba (token TEST-) el payer_email debe ser de una cuenta MP
    // argentina de prueba. El superadmin puede pasarlo manualmente con
    // payerEmailOverride, o usamos el email real del admin de la empresa.
    const payerEmail = payerEmailOverride || empresa.usuarios[0]?.email;
    if (!payerEmail) {
      return res.status(400).json({ error: 'La empresa no tiene un administrador con email.' });
    }

    const backUrl = process.env.MP_BACK_URL || 'https://jesus1942.github.io/ActivaQr/';

    const pre = await crearPreapproval({
      empresaId: empresa.id,
      payerEmail,
      monto: montoNum,
      razon: `Suscripción ActivaQR — ${empresa.nombre}`,
      backUrl,
    });

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { mpPreapprovalId: pre.id, mpEstadoSub: pre.status, mpMonto: montoNum },
    });

    // Enviar email con el link de pago (si Resend está configurado)
    await enviarEmailSuscripcion({
      destinatario: payerEmail,
      empresaNombre: empresa.nombre,
      adminNombre: empresa.usuarios[0]?.nombre ?? '',
      linkPago: pre.init_point,
      monto: montoNum,
    }).catch(() => {}); // silencioso si falla el email

    res.json({ initPoint: pre.init_point, preapprovalId: pre.id, emailEnviado: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/empresas/:id/link-pago — link de pago único, acepta cualquier medio
router.post('/empresas/:id/link-pago', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!mpConfigurado()) {
      return res.status(503).json({ error: 'Mercado Pago no configurado. Falta MP_ACCESS_TOKEN.' });
    }
    const { monto, descripcion } = req.body ?? {};
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) return res.status(400).json({ error: 'Indicá un monto válido.' });

    const empresa = await prisma.empresa.findUnique({
      where: { id: req.params.id },
      include: { usuarios: { where: { rol: 'admin' }, take: 1 } },
    });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada.' });

    const backUrl = process.env.MP_BACK_URL || 'https://jesus1942.github.io/ActivaQr/';
    const desc = descripcion || `Pago ActivaQR — ${empresa.nombre}`;
    const payerEmail = empresa.usuarios[0]?.email;

    const link = await crearLinkPago({ empresaId: empresa.id, monto: montoNum, descripcion: desc, backUrl, payerEmail });
    res.json({ initPoint: link.init_point, preferenceId: link.id });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/empresas/:id/suscripcion — cancela la suscripción en MP
router.delete('/empresas/:id/suscripcion', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: req.params.id } });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada.' });
    if (!empresa.mpPreapprovalId) return res.status(400).json({ error: 'Esta empresa no tiene suscripción activa.' });

    if (mpConfigurado()) {
      await cancelarPreapproval(empresa.mpPreapprovalId);
    }

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { mpEstadoSub: 'cancelled' },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/solicitudes-upgrade — lista empresas con upgrade pendiente
router.get('/solicitudes-upgrade', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const solicitudes = await prisma.empresa.findMany({
      where: { planSolicitado: { not: null } },
      select: {
        id: true,
        nombre: true,
        plan: true,
        planSolicitado: true,
        usuarios: {
          where: { rol: 'admin' },
          select: { email: true },
          take: 1,
        },
      },
      orderBy: { creadaEn: 'desc' },
    });

    const result = solicitudes.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      plan: e.plan,
      planSolicitado: e.planSolicitado,
      adminEmail: e.usuarios[0]?.email ?? null,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/solicitudes-upgrade/:empresaId — descarta la solicitud
router.delete('/solicitudes-upgrade/:empresaId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.empresa.update({
      where: { id: req.params.empresaId },
      data: { planSolicitado: null },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'Empresa no encontrada.' });
    }
    next(err);
  }
});

// GET /api/admin/estadisticas — analítica propia de visitas (landing + fichas)
router.get('/estadisticas', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ahora = Date.now();
    const hace24h = new Date(ahora - 24 * 60 * 60 * 1000);
    const hace7d = new Date(ahora - 7 * 24 * 60 * 60 * 1000);

    const [
      landingHoy,
      landingSemana,
      landingTotal,
      fichasHoy,
      fichasSemana,
      fichasTotal,
      topGrupos,
    ] = await Promise.all([
      prisma.visita.count({ where: { tipo: 'landing', creadoEn: { gte: hace24h } } }),
      prisma.visita.count({ where: { tipo: 'landing', creadoEn: { gte: hace7d } } }),
      prisma.visita.count({ where: { tipo: 'landing' } }),
      prisma.visita.count({ where: { tipo: 'ficha', creadoEn: { gte: hace24h } } }),
      prisma.visita.count({ where: { tipo: 'ficha', creadoEn: { gte: hace7d } } }),
      prisma.visita.count({ where: { tipo: 'ficha' } }),
      prisma.visita.groupBy({
        by: ['activoId'],
        where: { tipo: 'ficha', activoId: { not: null } },
        _count: { activoId: true },
        orderBy: { _count: { activoId: 'desc' } },
        take: 10,
      }),
    ]);

    const activoIds = topGrupos
      .map((g) => g.activoId)
      .filter((id): id is string => !!id);

    const activos = activoIds.length
      ? await prisma.activo.findMany({
          where: { id: { in: activoIds } },
          select: { id: true, nombre: true, codigo: true, empresa: { select: { nombre: true } } },
        })
      : [];
    const activoMap = new Map(activos.map((a) => [a.id, a]));

    const topFichas = topGrupos
      .map((g) => {
        const a = g.activoId ? activoMap.get(g.activoId) : undefined;
        if (!a) return null; // activo eliminado: lo saltamos
        return {
          activoId: a.id,
          nombre: a.nombre,
          codigo: a.codigo,
          empresa: a.empresa?.nombre ?? '',
          visitas: g._count.activoId,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    res.json({
      landingHoy,
      landingSemana,
      landingTotal,
      fichasHoy,
      fichasSemana,
      fichasTotal,
      topFichas,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/estadisticas — reinicia el contador de visitas
router.delete('/estadisticas', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.visita.deleteMany({});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/seed-demo — recrea la empresa demo si no existe
router.post('/seed-demo', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { seedDemo } = await import('../seedDemo');
    await seedDemo();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
