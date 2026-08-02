import { randomUUID } from 'node:crypto';
import { Router, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import {
  AuthRequest,
  requireAdmin,
  requireAuth,
  requireAuthAndActiveEmpresa,
  requireSuperadmin,
} from '../auth';
import { APP_URL } from '../urls';
import { enviarEmailCotizacion } from '../email';
import { enviarMensajeTelegram } from '../telegram';
import { enviarPushAEmpresa, enviarPushASuperadmin } from '../push';
import {
  armarTextoCotizacion,
  calcularCotizacionGestionada,
  type DetalleCotizacionGestionada,
} from '../cotizacionesCore';
import { armarTextoCorrectivo, type PropuestaCorrectiva } from '../correctivosCore';
import { numeroDocumento } from '../correctivosService';

const incluirCotizacion = {
  empresa: {
    select: {
      id: true,
      nombre: true,
      usuarios: {
        where: { rol: 'admin' as const, activo: true },
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          telegramChatId: true,
        },
      },
    },
  },
  envios: { orderBy: { creadoEn: 'desc' as const } },
  mensajes: { orderBy: { creadoEn: 'asc' as const } },
  alertaTecnica: {
    include: { activo: { select: { codigo: true, nombre: true } } },
  },
};

function textoDe(cotizacion: any): string {
  if (cotizacion.tipo === 'correctivo') {
    const detalle = cotizacion.detalle as PropuestaCorrectiva & {
      alertaNumero: string;
      activoCodigo: string;
      activoNombre: string;
      nivel: 'desmejorado' | 'riesgo' | 'critico';
      hallazgo: string;
      riesgo: string;
      recomendacion: string;
    };
    const alerta = cotizacion.alertaTecnica;
    return armarTextoCorrectivo({
      numero: cotizacion.numero,
      clienteNombre: cotizacion.clienteNombre,
      activoCodigo: alerta?.activo?.codigo ?? detalle.activoCodigo,
      activoNombre: alerta?.activo?.nombre ?? detalle.activoNombre,
      alertaNumero: alerta?.numero ?? detalle.alertaNumero,
      nivel: alerta?.nivel ?? detalle.nivel,
      hallazgo: alerta?.hallazgo ?? detalle.hallazgo,
      riesgo: alerta?.riesgo ?? detalle.riesgo,
      recomendacion: alerta?.recomendacion ?? detalle.recomendacion,
      detalle,
      vigenciaHasta: cotizacion.vigenciaHasta,
    });
  }
  return armarTextoCotizacion({
    numero: cotizacion.numero,
    clienteNombre: cotizacion.clienteNombre,
    concepto: cotizacion.concepto,
    planSoftware: cotizacion.planSoftware,
    detalle: cotizacion.detalle as DetalleCotizacionGestionada,
    subtotal: cotizacion.subtotal,
    descuento: cotizacion.descuento,
    total: cotizacion.total,
    vigenciaHasta: cotizacion.vigenciaHasta,
  });
}

function presentar(cotizacion: any) {
  const admins = cotizacion.empresa?.usuarios ?? [];
  const contacto = admins.find((usuario: any) => usuario.email === cotizacion.contactoEmail)
    ?? admins[0]
    ?? null;
  return {
    ...cotizacion,
    empresa: cotizacion.empresa
      ? { id: cotizacion.empresa.id, nombre: cotizacion.empresa.nombre }
      : undefined,
    telegramDisponible: Boolean(contacto?.telegramChatId),
    texto: textoDe(cotizacion),
  };
}

async function vencerCotizaciones() {
  await prisma.cotizacion.updateMany({
    where: {
      vigenciaHasta: { lt: new Date() },
      estado: { in: ['enviada', 'vista'] },
    },
    data: { estado: 'vencida' },
  });
}

function numeroCotizacion(id: string, fecha = new Date()): string {
  const ymd = fecha.toISOString().slice(0, 10).replace(/-/g, '');
  return `AQ-${ymd}-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

function whatsappUrl(telefono: string, texto: string): string {
  let digitos = telefono.replace(/\D/g, '');
  if (digitos.startsWith('0') && digitos.length === 11) digitos = digitos.slice(1);
  if (digitos.length === 10) digitos = `549${digitos}`;
  if (digitos.startsWith('54') && !digitos.startsWith('549') && digitos.length === 12) {
    digitos = `549${digitos.slice(2)}`;
  }
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`;
}

async function registrarEnvio(cotizacion: any, canal: string, estado: string, detalle?: string) {
  const ahora = new Date();
  await prisma.$transaction([
    prisma.cotizacionEnvio.create({
      data: { cotizacionId: cotizacion.id, canal, estado, detalle: detalle ?? null },
    }),
    prisma.cotizacion.update({
      where: { id: cotizacion.id },
      data: {
        ...(cotizacion.estado === 'borrador' ? { estado: 'enviada' } : {}),
        enviadaEn: cotizacion.enviadaEn ?? ahora,
      },
    }),
  ]);
}

export const adminCotizacionesRouter = Router();
adminCotizacionesRouter.use(requireAuth, requireSuperadmin);

adminCotizacionesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await vencerCotizaciones();
    const empresaId = typeof req.query.empresaId === 'string' ? req.query.empresaId : undefined;
    const cotizaciones = await prisma.cotizacion.findMany({
      where: empresaId ? { empresaId } : undefined,
      orderBy: { creadaEn: 'desc' },
      include: incluirCotizacion,
    });
    res.json(cotizaciones.map(presentar));
  } catch (error) {
    next(error);
  }
});

adminCotizacionesRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = typeof req.body?.empresaId === 'string' ? req.body.empresaId : '';
    if (!empresaId) return res.status(400).json({ error: 'Elegí una empresa de tu nómina.' });

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        usuarios: {
          where: { rol: 'admin', activo: true },
          select: { id: true, nombre: true, email: true, telefono: true, telegramChatId: true },
        },
      },
    });
    if (!empresa) return res.status(404).json({ error: 'La empresa seleccionada no existe.' });

    const contactoId = typeof req.body?.contactoId === 'string' ? req.body.contactoId : '';
    const contacto = empresa.usuarios.find((usuario) => usuario.id === contactoId)
      ?? empresa.usuarios[0]
      ?? null;
    const calculada = calcularCotizacionGestionada(req.body ?? {});
    const ahora = new Date();
    const vigenciaHasta = new Date(ahora.getTime() + calculada.vigenciaDias * 86_400_000);
    const id = randomUUID();

    const cotizacion = await prisma.cotizacion.create({
      data: {
        id,
        numero: numeroCotizacion(id, ahora),
        empresaId: empresa.id,
        clienteNombre: empresa.nombre,
        contactoNombre: contacto?.nombre ?? null,
        contactoEmail: contacto?.email ?? null,
        contactoTelefono: contacto?.telefono ?? null,
        concepto: calculada.concepto,
        planSoftware: calculada.planSoftware,
        detalle: calculada.detalle as unknown as Prisma.InputJsonValue,
        moneda: 'ARS',
        subtotal: calculada.subtotal,
        descuento: calculada.descuento,
        total: calculada.total,
        vigenciaHasta,
        creadaPorId: req.auth!.userId,
        creadaPorNombre: req.auth!.email,
      },
      include: incluirCotizacion,
    });
    res.status(201).json(presentar(cotizacion));
  } catch (error) {
    if (error instanceof Error && /debe|válid|vigencia/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

adminCotizacionesRouter.post('/:id/enviar', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const canal = typeof req.body?.canal === 'string' ? req.body.canal : '';
    if (!['plataforma', 'email', 'whatsapp', 'telegram'].includes(canal)) {
      return res.status(400).json({ error: 'Canal de envío no válido.' });
    }
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: req.params.id },
      include: incluirCotizacion,
    });
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' });

    const texto = textoDe(cotizacion);
    const plataformaUrl = `${APP_URL}/#/cotizaciones?cotizacion=${cotizacion.id}`;
    const admins = cotizacion.empresa.usuarios;
    const contacto = admins.find((usuario) => usuario.email === cotizacion.contactoEmail)
      ?? admins[0]
      ?? null;

    if (canal === 'email') {
      if (!cotizacion.contactoEmail) {
        return res.status(400).json({ error: 'La empresa no tiene un email de contacto.' });
      }
      try {
        const enviado = await enviarEmailCotizacion({
          destinatario: cotizacion.contactoEmail,
          contactoNombre: cotizacion.contactoNombre,
          empresaNombre: cotizacion.clienteNombre,
          numero: cotizacion.numero,
          concepto: cotizacion.concepto,
          total: cotizacion.total,
          vigenciaHasta: cotizacion.vigenciaHasta,
          texto,
          plataformaUrl,
        });
        if (!enviado) return res.status(503).json({ error: 'El envío de email no está configurado.' });
        await registrarEnvio(cotizacion, canal, 'enviado');
      } catch (error) {
        await prisma.cotizacionEnvio.create({
          data: { cotizacionId: cotizacion.id, canal, estado: 'error', detalle: 'No se pudo entregar.' },
        });
        return res.status(502).json({ error: 'No se pudo enviar el email. Intentá nuevamente.' });
      }
    }

    if (canal === 'telegram') {
      if (!contacto?.telegramChatId) {
        return res.status(400).json({ error: 'El contacto todavía no vinculó Telegram.' });
      }
      try {
        const enviado = await enviarMensajeTelegram(
          contacto.telegramChatId,
          `${texto}\n\nVer y responder: ${plataformaUrl}`,
        );
        if (!enviado) return res.status(503).json({ error: 'El bot de Telegram no está configurado.' });
        await registrarEnvio(cotizacion, canal, 'enviado');
      } catch {
        await prisma.cotizacionEnvio.create({
          data: { cotizacionId: cotizacion.id, canal, estado: 'error', detalle: 'No se pudo entregar.' },
        });
        return res.status(502).json({ error: 'Telegram no pudo entregar la cotización.' });
      }
    }

    if (canal === 'whatsapp') {
      if (!cotizacion.contactoTelefono) {
        return res.status(400).json({ error: 'La empresa no tiene un WhatsApp de contacto.' });
      }
      await registrarEnvio(cotizacion, canal, 'preparado');
      enviarPushAEmpresa(cotizacion.empresaId, {
        title: `Nueva cotización ${cotizacion.numero}`,
        body: `${cotizacion.concepto} · $${cotizacion.total.toLocaleString('es-AR')} ARS`,
        url: plataformaUrl,
      }, ['admin']).catch((error) => console.error('[cotizaciones] error push empresa:', error));
      return res.json({
        ok: true,
        url: whatsappUrl(cotizacion.contactoTelefono, `${texto}\n\nVer y responder: ${plataformaUrl}`),
        estadoEnvio: 'preparado',
      });
    }

    if (canal === 'plataforma') {
      await registrarEnvio(cotizacion, canal, 'enviado');
    }

    enviarPushAEmpresa(cotizacion.empresaId, {
      title: `Nueva cotización ${cotizacion.numero}`,
      body: `${cotizacion.concepto} · $${cotizacion.total.toLocaleString('es-AR')} ARS`,
      url: plataformaUrl,
    }, ['admin']).catch((error) => console.error('[cotizaciones] error push empresa:', error));

    const actualizada = await prisma.cotizacion.findUnique({
      where: { id: cotizacion.id },
      include: incluirCotizacion,
    });
    res.json({ ok: true, cotizacion: actualizada ? presentar(actualizada) : null });
  } catch (error) {
    next(error);
  }
});

adminCotizacionesRouter.post('/:id/mensajes', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const contenido = typeof req.body?.contenido === 'string' ? req.body.contenido.trim().slice(0, 2_000) : '';
    if (!contenido) return res.status(400).json({ error: 'Escribí un mensaje.' });
    const cotizacion = await prisma.cotizacion.findUnique({ where: { id: req.params.id } });
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' });
    if (cotizacion.estado === 'borrador') {
      return res.status(409).json({ error: 'Publicá la cotización antes de escribirle al cliente.' });
    }
    const mensaje = await prisma.cotizacionMensaje.create({
      data: {
        cotizacionId: cotizacion.id,
        autorId: req.auth!.userId,
        autorRol: 'superadmin',
        autorNombre: 'ActivaQR',
        contenido,
      },
    });
    enviarPushAEmpresa(cotizacion.empresaId, {
      title: `Respuesta de ActivaQR · ${cotizacion.numero}`,
      body: contenido.slice(0, 140),
      url: `${APP_URL}/#/cotizaciones?cotizacion=${cotizacion.id}`,
    }, ['admin']).catch((error) => console.error('[cotizaciones] error push respuesta:', error));
    res.status(201).json(mensaje);
  } catch (error) {
    next(error);
  }
});

export const clienteCotizacionesRouter = Router();
clienteCotizacionesRouter.use(requireAuthAndActiveEmpresa, requireAdmin);

clienteCotizacionesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth?.empresaId;
    if (!empresaId) return res.status(403).json({ error: 'No tenés una empresa asociada.' });
    await vencerCotizaciones();
    const ahora = new Date();
    await prisma.cotizacion.updateMany({
      where: { empresaId, estado: 'enviada' },
      data: { estado: 'vista', vistaEn: ahora },
    });
    const cotizaciones = await prisma.cotizacion.findMany({
      where: { empresaId, estado: { not: 'borrador' } },
      orderBy: { creadaEn: 'desc' },
      include: incluirCotizacion,
    });
    res.json(cotizaciones.map(presentar));
  } catch (error) {
    next(error);
  }
});

clienteCotizacionesRouter.post('/:id/responder', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth?.empresaId;
    const accion = typeof req.body?.accion === 'string' ? req.body.accion : 'consultar';
    const entrada = typeof req.body?.mensaje === 'string' ? req.body.mensaje.trim().slice(0, 2_000) : '';
    if (!empresaId) return res.status(403).json({ error: 'No tenés una empresa asociada.' });
    if (!['aceptar', 'rechazar', 'consultar'].includes(accion)) {
      return res.status(400).json({ error: 'Respuesta no válida.' });
    }
    if (accion === 'consultar' && !entrada) {
      return res.status(400).json({ error: 'Escribí la consulta que querés enviar.' });
    }
    const cotizacion = await prisma.cotizacion.findFirst({
      where: { id: req.params.id, empresaId, estado: { not: 'borrador' } },
      include: { alertaTecnica: { include: { orden: true } } },
    });
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' });
    if (cotizacion.estado === 'vencida' && accion === 'aceptar') {
      return res.status(409).json({ error: 'La cotización venció. Pedí una actualización desde el mensaje.' });
    }
    if (['aceptada', 'rechazada'].includes(cotizacion.estado) && accion !== 'consultar') {
      return res.status(409).json({ error: 'Esta cotización ya tiene una decisión registrada.' });
    }

    const estado = accion === 'aceptar'
      ? 'aceptada'
      : accion === 'rechazar'
        ? 'rechazada'
        : (cotizacion.estado === 'enviada' ? 'vista' : cotizacion.estado);
    const prefijo = accion === 'aceptar'
      ? 'Cotización aceptada.'
      : accion === 'rechazar'
        ? 'Cotización rechazada.'
        : '';
    const contenido = [prefijo, entrada].filter(Boolean).join(' ');
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.auth!.userId },
      select: { nombre: true },
    });

    const mensaje = await prisma.$transaction(async (tx) => {
      await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: { estado, respondidaEn: new Date(), vistaEn: cotizacion.vistaEn ?? new Date() },
      });
      const creado = await tx.cotizacionMensaje.create({
        data: {
          cotizacionId: cotizacion.id,
          autorId: req.auth!.userId,
          autorRol: 'cliente',
          autorNombre: usuario?.nombre ?? 'Cliente',
          contenido,
        },
      });
      if (cotizacion.tipo === 'correctivo' && cotizacion.alertaTecnica) {
        if (accion === 'aceptar') {
          const detalle = cotizacion.detalle as unknown as PropuestaCorrectiva;
          await tx.alertaTecnica.update({
            where: { id: cotizacion.alertaTecnica.id }, data: { estado: 'autorizada' },
          });
          if (!cotizacion.alertaTecnica.orden) {
            const ordenId = randomUUID();
            await tx.ordenTrabajoCorrectiva.create({
              data: {
                id: ordenId,
                numero: numeroDocumento('OT', ordenId),
                empresaId,
                activoId: cotizacion.alertaTecnica.activoId,
                alertaId: cotizacion.alertaTecnica.id,
                cotizacionId: cotizacion.id,
                alcance: detalle.alcance,
                materialesPrevistos: detalle.materialesPrevistos,
                plazoEstimadoDias: detalle.plazoEstimadoDias,
                costoAprobado: cotizacion.total,
                moneda: cotizacion.moneda,
                requierePermiso: detalle.requierePermiso,
                estadoPermiso: detalle.requierePermiso ? 'pendiente' : 'no_requerido',
                permisoCondiciones: detalle.condicionesSeguridad,
                autorizadaPorId: req.auth!.userId,
                autorizadaPorNombre: usuario?.nombre ?? 'Administrador de la empresa',
              },
            });
          }
        } else if (accion === 'rechazar') {
          await tx.alertaTecnica.update({
            where: { id: cotizacion.alertaTecnica.id }, data: { estado: 'rechazada' },
          });
        }
      }
      return creado;
    });

    enviarPushASuperadmin({
      title: `${cotizacion.clienteNombre} · ${accion}`,
      body: `${cotizacion.numero}: ${contenido}`.slice(0, 160),
      url: `${APP_URL}/#/cotizaciones?cotizacion=${cotizacion.id}`,
    }).catch((error) => console.error('[cotizaciones] error push superadmin:', error));
    res.status(201).json({ ok: true, estado, mensaje });
  } catch (error) {
    next(error);
  }
});
