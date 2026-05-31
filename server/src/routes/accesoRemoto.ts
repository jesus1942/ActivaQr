/**
 * Rutas de acceso remoto — el superadmin puede solicitar permiso para
 * ver los activos, mediciones y chatear con un cliente.
 * Disponible solo para planes empresa e industrial.
 */
import { Router, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from '../prisma';
import { requireAuth, requireSuperadmin, AuthRequest } from '../auth';
import { enviarEmailAccesoRemoto } from '../email';

const router = Router();

const PLANES_ACCESO_REMOTO = ['empresa', 'industrial'];
const APP_URL = process.env.APP_URL || 'https://jesus1942.github.io/ActivaQr';

// ── Superadmin: solicitar acceso a una empresa ────────────────────────────────

// POST /api/admin/empresas/:id/acceso-remoto
router.post(
  '/empresas/:id/acceso-remoto',
  requireAuth, requireSuperadmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const empresa = await prisma.empresa.findUnique({
        where: { id: req.params.id },
        include: { usuarios: { where: { rol: 'admin' }, take: 1 }, permisoAcceso: true },
      });
      if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada.' });
      if (!PLANES_ACCESO_REMOTO.includes(empresa.plan)) {
        return res.status(403).json({ error: 'El acceso remoto solo está disponible para planes Empresa e Industrial.' });
      }
      if (empresa.permisoAcceso?.estado === 'activo') {
        return res.status(400).json({ error: 'Ya existe un permiso activo para esta empresa.' });
      }

      const { costoMensual } = req.body ?? {};
      const token = randomBytes(32).toString('hex');

      // Upsert: si ya había uno pendiente/revocado, lo reemplaza.
      const permiso = await prisma.permisoAccesoRemoto.upsert({
        where: { empresaId: empresa.id },
        create: { empresaId: empresa.id, token, estado: 'pendiente', costoMensual: costoMensual ?? null },
        update: { token, estado: 'pendiente', solicitadoEn: new Date(), otorgadoEn: null, revocadoEn: null, costoMensual: costoMensual ?? null },
      });

      const linkAprobacion = `${APP_URL}/#/acceso-remoto/aprobar/${token}`;
      const adminEmail = empresa.usuarios[0]?.email;
      const adminNombre = empresa.usuarios[0]?.nombre ?? empresa.nombre;

      // Enviar email si está configurado. Rastreamos si realmente se envió.
      let emailEnviado = false;
      if (adminEmail) {
        try {
          await enviarEmailAccesoRemoto({
            destinatario: adminEmail,
            empresaNombre: empresa.nombre,
            adminNombre,
            linkAprobacion,
            costoMensual: costoMensual ?? null,
          });
          emailEnviado = true;
        } catch {
          emailEnviado = false;
        }
      }

      res.json({ permiso, linkAprobacion, emailEnviado, adminEmail: adminEmail ?? null });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/empresas/:id/acceso-remoto — estado del permiso
router.get(
  '/empresas/:id/acceso-remoto',
  requireAuth, requireSuperadmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const permiso = await prisma.permisoAccesoRemoto.findUnique({
        where: { empresaId: req.params.id },
      });
      res.json(permiso ?? null);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/empresas/:id/acceso-remoto — revocar acceso (superadmin)
router.delete(
  '/empresas/:id/acceso-remoto',
  requireAuth, requireSuperadmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await prisma.permisoAccesoRemoto.update({
        where: { empresaId: req.params.id },
        data: { estado: 'revocado', revocadoEn: new Date() },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// ── Superadmin: datos del cliente con permiso activo ─────────────────────────

function requirePermisoActivo(empresaId: string) {
  return async (_req: AuthRequest, res: Response, next: NextFunction) => {
    const p = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId } });
    if (!p || p.estado !== 'activo') {
      return res.status(403).json({ error: 'No hay permiso activo para esta empresa.' });
    }
    next();
  };
}

// GET /api/admin/empresas/:id/activos-remoto
router.get(
  '/empresas/:id/activos-remoto',
  requireAuth, requireSuperadmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const p = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId: req.params.id } });
      if (!p || p.estado !== 'activo') return res.status(403).json({ error: 'Sin permiso activo.' });

      const activos = await prisma.activo.findMany({
        where: { empresaId: req.params.id },
        include: {
          sector: true, tipo: true, responsable: true,
          mediciones: { orderBy: { fecha: 'desc' }, take: 1 },
        },
        orderBy: { estado: 'asc' },
      });
      res.json(activos);
    } catch (err) { next(err); }
  }
);

// GET /api/admin/empresas/:id/mediciones-remoto?activoId=xxx
router.get(
  '/empresas/:id/mediciones-remoto',
  requireAuth, requireSuperadmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const p = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId: req.params.id } });
      if (!p || p.estado !== 'activo') return res.status(403).json({ error: 'Sin permiso activo.' });

      const where: any = { activo: { empresaId: req.params.id } };
      if (req.query.activoId) where.activoId = req.query.activoId as string;

      const mediciones = await prisma.medicion.findMany({
        where,
        orderBy: { fecha: 'desc' },
        take: 50,
        include: { activo: { select: { nombre: true, codigo: true } } },
      });
      res.json(mediciones);
    } catch (err) { next(err); }
  }
);

// POST /api/admin/empresas/:id/tareas-remoto — crear tarea en empresa del cliente
router.post(
  '/empresas/:id/tareas-remoto',
  requireAuth, requireSuperadmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const p = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId: req.params.id } });
      if (!p || p.estado !== 'activo') return res.status(403).json({ error: 'Sin permiso activo.' });

      const { activoId, tipo, fechaProgramada, observaciones } = req.body ?? {};
      if (!activoId || !tipo || !fechaProgramada) {
        return res.status(400).json({ error: 'activoId, tipo y fechaProgramada son obligatorios.' });
      }
      const tarea = await prisma.tareaMantenimiento.create({
        data: { activoId, tipo, fechaProgramada: new Date(fechaProgramada), observaciones, estado: 'pendiente' },
      });
      res.status(201).json(tarea);
    } catch (err) { next(err); }
  }
);

// ── Chat ─────────────────────────────────────────────────────────────────────

// GET /api/admin/empresas/:id/mensajes-remoto
router.get(
  '/empresas/:id/mensajes-remoto',
  requireAuth, requireSuperadmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const p = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId: req.params.id } });
      if (!p) return res.status(403).json({ error: 'Sin permiso para esta empresa.' });
      const msgs = await prisma.mensajeRemoto.findMany({
        where: { permisoId: p.id },
        orderBy: { creadoEn: 'asc' },
      });
      // Marcar mensajes del cliente como leídos.
      await prisma.mensajeRemoto.updateMany({
        where: { permisoId: p.id, autorRol: 'cliente', leido: false },
        data: { leido: true },
      });
      res.json(msgs);
    } catch (err) { next(err); }
  }
);

// POST /api/admin/empresas/:id/mensajes-remoto
router.post(
  '/empresas/:id/mensajes-remoto',
  requireAuth, requireSuperadmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const p = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId: req.params.id } });
      if (!p || p.estado !== 'activo') return res.status(403).json({ error: 'Sin permiso activo.' });
      const { contenido } = req.body ?? {};
      if (!contenido?.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
      const msg = await prisma.mensajeRemoto.create({
        data: { permisoId: p.id, autorRol: 'superadmin', autorNombre: 'ActivaQR Soporte', contenido: contenido.trim() },
      });
      res.status(201).json(msg);
    } catch (err) { next(err); }
  }
);

// ── Cliente: aprobar, revocar, ver y enviar mensajes ─────────────────────────

// GET /api/acceso-remoto/solicitud — el cliente ve su solicitud pendiente
router.get(
  '/solicitud',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const empresaId = req.auth?.empresaId;
      if (!empresaId) return res.status(403).json({ error: 'Sin empresa.' });
      const permiso = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId } });
      res.json(permiso ?? null);
    } catch (err) { next(err); }
  }
);

// POST /api/acceso-remoto/aprobar/:token — cliente aprueba via link
router.post(
  '/aprobar/:token',
  async (req, res: Response, next: NextFunction) => {
    try {
      const permiso = await prisma.permisoAccesoRemoto.findUnique({ where: { token: req.params.token } });
      if (!permiso || permiso.estado === 'revocado') {
        return res.status(404).json({ error: 'Link inválido o ya expirado.' });
      }
      const updated = await prisma.permisoAccesoRemoto.update({
        where: { token: req.params.token },
        data: { estado: 'activo', otorgadoEn: new Date() },
      });
      res.json({ ok: true, permiso: updated });
    } catch (err) { next(err); }
  }
);

// DELETE /api/acceso-remoto/solicitud — cliente revoca el acceso
router.delete(
  '/solicitud',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const empresaId = req.auth?.empresaId;
      if (!empresaId) return res.status(403).json({ error: 'Sin empresa.' });
      await prisma.permisoAccesoRemoto.update({
        where: { empresaId },
        data: { estado: 'revocado', revocadoEn: new Date() },
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

// GET /api/acceso-remoto/mensajes — cliente lee el chat
router.get(
  '/mensajes',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const empresaId = req.auth?.empresaId;
      if (!empresaId) return res.status(403).json({ error: 'Sin empresa.' });
      const p = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId } });
      if (!p) return res.json([]);
      const msgs = await prisma.mensajeRemoto.findMany({
        where: { permisoId: p.id },
        orderBy: { creadoEn: 'asc' },
      });
      await prisma.mensajeRemoto.updateMany({
        where: { permisoId: p.id, autorRol: 'superadmin', leido: false },
        data: { leido: true },
      });
      res.json(msgs);
    } catch (err) { next(err); }
  }
);

// POST /api/acceso-remoto/mensajes — cliente envía mensaje
router.post(
  '/mensajes',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const empresaId = req.auth?.empresaId;
      if (!empresaId) return res.status(403).json({ error: 'Sin empresa.' });
      const p = await prisma.permisoAccesoRemoto.findUnique({
        where: { empresaId },
        include: { empresa: { include: { usuarios: { where: { rol: 'admin' }, take: 1 } } } },
      });
      if (!p || p.estado !== 'activo') return res.status(403).json({ error: 'Sin permiso activo.' });
      const { contenido } = req.body ?? {};
      if (!contenido?.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
      const autorNombre = p.empresa.usuarios[0]?.nombre ?? p.empresa.nombre;
      const msg = await prisma.mensajeRemoto.create({
        data: { permisoId: p.id, autorRol: 'cliente', autorNombre, contenido: contenido.trim() },
      });
      res.status(201).json(msg);
    } catch (err) { next(err); }
  }
);

export default router;
