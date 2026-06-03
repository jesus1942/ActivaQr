/**
 * Rutas de acceso remoto — el superadmin puede solicitar permiso para
 * ver los activos, mediciones y chatear con un cliente.
 * Disponible solo para planes empresa e industrial.
 */
import { Router, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import rateLimit from 'express-rate-limit';
import { prisma } from '../prisma';
import { requireAuth, requireSuperadmin, AuthRequest } from '../auth';
import { enviarEmailAccesoRemoto } from '../email';
import { calcularEstadoAutomatico, estadoMedicionAActivo } from '../alertas';
import { enviarPushASuperadmin, enviarPushAEmpresa } from '../push';
import { registrarAuditoria } from '../auditoria';

const MAX_ADJUNTO = 8_000_000; // ~6MB en base64

const aprobacionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Esperá un minuto.' },
});

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

      enviarPushASuperadmin({
        title: 'Nueva solicitud de acceso remoto',
        body: 'Empresa: ' + empresa.nombre,
        url: '#/admin',
      }).catch((e) => console.error('[acceso-remoto] error push solicitud:', e));

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

// POST /api/admin/empresas/:id/mediciones-remoto — intervenir: registrar medición remota
router.post(
  '/empresas/:id/mediciones-remoto',
  requireAuth, requireSuperadmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const p = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId: req.params.id } });
      if (!p || p.estado !== 'activo') return res.status(403).json({ error: 'Sin permiso activo.' });

      const {
        activoId, temperatura, amperaje, presion, vibracion,
        voltaje, porcentajeBateria, nivelToner, observaciones,
      } = req.body ?? {};

      if (!activoId || typeof activoId !== 'string') {
        return res.status(400).json({ error: 'El campo "activoId" es obligatorio.' });
      }

      const activo = await prisma.activo.findFirst({
        where: { id: activoId, empresaId: req.params.id },
      });
      if (!activo) return res.status(404).json({ error: 'Activo no encontrado.' });

      // Estado automático según umbrales del activo.
      const estadoCalculado = calcularEstadoAutomatico(
        { temperatura, amperaje, presion, voltaje, porcentajeBateria, nivelToner },
        activo,
      );
      // Mapear el nivel calculado al enum EstadoMedicion (normal | revision | urgente).
      const estadoMedicion: 'normal' | 'revision' | 'urgente' =
        estadoCalculado === 'urgente' ? 'urgente'
        : estadoCalculado === 'normal' ? 'normal'
        : 'revision';

      // El tecnico asignado: responsable del activo o primer operador de la empresa.
      let tecnicoId: string | null = activo.responsableId;
      if (!tecnicoId) {
        const operador = await prisma.usuario.findFirst({ where: { empresaId: req.params.id, rol: 'operador' } });
        tecnicoId = operador?.id ?? null;
      }

      const medicion = await prisma.medicion.create({
        data: {
          activoId,
          tecnicoId,
          fecha: new Date(),
          temperatura: temperatura ?? null,
          amperaje: amperaje ?? null,
          presion: presion ?? null,
          vibracion: vibracion ?? undefined,
          voltaje: voltaje ?? null,
          porcentajeBateria: porcentajeBateria ?? null,
          nivelToner: nivelToner ?? null,
          estado: estadoMedicion as any,
          observaciones: observaciones ?? null,
          origen: 'manual',
        },
      });

      // Escalar el estado del activo al peor entre el calculado y el actual.
      const nuevoEstadoActivo = estadoMedicionAActivo(estadoCalculado);
      const nivelActivo: Record<string, number> = { normal: 0, alerta: 1, mantenimiento: 1, critico: 2 };
      if ((nivelActivo[nuevoEstadoActivo] ?? 0) > (nivelActivo[activo.estado] ?? 0)) {
        await prisma.activo.update({ where: { id: activoId }, data: { estado: nuevoEstadoActivo } });
      }

      void registrarAuditoria({
        empresaId: req.params.id,
        usuarioId: req.auth?.userId ?? null,
        usuarioNombre: req.auth?.email ?? 'soporte',
        usuarioRol: 'soporte_remoto',
        accion: 'acceso_remoto',
        entidad: 'medicion',
        entidadId: medicion.id,
        detalle: `Soporte registró medición remota en ${activo.codigo} (${estadoMedicion})`,
      });
      // Notificar al cliente que soporte intervino.
      enviarPushAEmpresa(
        req.params.id,
        { title: 'Intervención de soporte', body: `Se registró una medición en ${activo.nombre}`, url: '#/activos/' + activo.id },
        ['admin', 'operador'],
      ).catch(() => {});

      res.status(201).json(medicion);
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
      void registrarAuditoria({
        empresaId: req.params.id,
        usuarioId: req.auth?.userId ?? null,
        usuarioNombre: req.auth?.email ?? 'soporte',
        usuarioRol: 'soporte_remoto',
        accion: 'acceso_remoto',
        entidad: 'orden_trabajo',
        entidadId: tarea.id,
        detalle: `Soporte creó tarea remota: ${tipo}`,
      });
      enviarPushAEmpresa(
        req.params.id,
        { title: 'Intervención de soporte', body: `Se creó una tarea: ${tipo}`, url: '#/mantenimiento' },
        ['admin', 'operador'],
      ).catch(() => {});
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
      const { contenido, tipo, adjunto } = req.body ?? {};
      if (!contenido?.trim() && !adjunto) {
        return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
      }
      if (adjunto && adjunto.length > MAX_ADJUNTO) {
        return res.status(413).json({ error: 'El adjunto es demasiado grande (máx. ~6MB).' });
      }
      const msg = await prisma.mensajeRemoto.create({
        data: {
          permisoId: p.id,
          autorRol: 'superadmin',
          autorNombre: 'ActivaQR Soporte',
          contenido: contenido?.trim() || null,
          tipo: tipo || 'texto',
          adjunto: adjunto || null,
        },
      });
      enviarPushAEmpresa(req.params.id, {
        title: 'Nuevo mensaje de soporte',
        body: contenido?.trim()?.slice(0, 120) || 'Adjunto recibido',
        url: '#/mensajes',
      }, ['admin', 'operador']).catch((e) => console.error('[acceso-remoto] error push msg cliente:', e));
      res.status(201).json(msg);
    } catch (err) { next(err); }
  }
);

// ── Cliente: aprobar, revocar, ver y enviar mensajes ─────────────────────────

// GET /api/acceso-remoto/notificaciones — badge liviano para el sidebar
router.get(
  '/notificaciones',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const empresaId = req.auth?.empresaId;
      if (!empresaId) return res.json({ mensajesNoLeidos: 0, tienePermisoPendiente: false });
      const permiso = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId } });
      if (!permiso) return res.json({ mensajesNoLeidos: 0, tienePermisoPendiente: false });
      const mensajesNoLeidos = permiso.estado === 'activo'
        ? await prisma.mensajeRemoto.count({
            where: { permisoId: permiso.id, autorRol: 'superadmin', leido: false },
          })
        : 0;
      res.json({
        mensajesNoLeidos,
        tienePermisoPendiente: permiso.estado === 'pendiente',
      });
    } catch (err) { next(err); }
  }
);

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
  aprobacionLimiter,
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
      const { contenido, tipo, adjunto } = req.body ?? {};
      if (!contenido?.trim() && !adjunto) {
        return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
      }
      if (adjunto && adjunto.length > MAX_ADJUNTO) {
        return res.status(413).json({ error: 'El adjunto es demasiado grande (máx. ~6MB).' });
      }
      const autorNombre = p.empresa.usuarios[0]?.nombre ?? p.empresa.nombre;
      const msg = await prisma.mensajeRemoto.create({
        data: {
          permisoId: p.id,
          autorRol: 'cliente',
          autorNombre,
          contenido: contenido?.trim() || null,
          tipo: tipo || 'texto',
          adjunto: adjunto || null,
        },
      });
      enviarPushASuperadmin({
        title: 'Nuevo mensaje de ' + (p.empresa.nombre || autorNombre),
        body: contenido?.trim()?.slice(0, 120) || 'Adjunto recibido',
        url: '#/admin',
      }).catch((e) => console.error('[acceso-remoto] error push msg superadmin:', e));
      res.status(201).json(msg);
    } catch (err) { next(err); }
  }
);

// GET /api/admin/empresas/:id/personal-remoto — técnicos y usuarios de la empresa
router.get(
  '/empresas/:id/personal-remoto',
  requireAuth, requireSuperadmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const p = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId: req.params.id } });
      if (!p || p.estado !== 'activo') return res.status(403).json({ error: 'Sin permiso activo.' });

      // Personal (operadores y admins de la empresa)
      const personal = await prisma.usuario.findMany({
        where: { empresaId: req.params.id },
        select: {
          id: true, nombre: true, rol: true, cargo: true, email: true, telefono: true, activo: true, ultimoAcceso: true,
        },
        orderBy: { nombre: 'asc' },
      });

      res.json({ personal, usuarios: personal });
    } catch (err) { next(err); }
  }
);

// GET /api/admin/empresas/:id/actividad-remoto — registro de auditoría reciente
router.get(
  '/empresas/:id/actividad-remoto',
  requireAuth, requireSuperadmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const p = await prisma.permisoAccesoRemoto.findUnique({ where: { empresaId: req.params.id } });
      if (!p || p.estado !== 'activo') return res.status(403).json({ error: 'Sin permiso activo.' });

      const registros = await prisma.registroAuditoria.findMany({
        where: { empresaId: req.params.id },
        orderBy: { creadoEn: 'desc' },
        take: 60,
        select: {
          id: true, accion: true, entidad: true, entidadId: true,
          detalle: true, usuarioNombre: true, creadoEn: true,
        },
      });

      res.json(registros);
    } catch (err) { next(err); }
  }
);

export default router;
