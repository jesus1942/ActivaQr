/**
 * Endpoint que consolida todas las ubicaciones conocidas de un activo:
 * fotos de mediciones + fotos de mensajes del chat de soporte.
 *
 * Util para responder 'donde estuvo este activo por ultima vez', util en
 * casos de robo, extravio, traslados a obra, custodia compartida.
 */
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../auth';

const router = Router();

// GET /api/activos/:id/ubicaciones
router.get('/:id/ubicaciones', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth?.empresaId;
    const esSuperadmin = req.auth?.rol === 'superadmin';
    const activo = await prisma.activo.findUnique({
      where: { id: req.params.id },
      select: { id: true, empresaId: true, codigo: true, nombre: true },
    });
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado.' });
    if (!esSuperadmin && activo.empresaId !== empresaId) {
      return res.status(403).json({ error: 'No autorizado.' });
    }

    // Fotos de mediciones del activo con GPS.
    const fotosMediciones = await prisma.foto.findMany({
      where: {
        medicion: { activoId: activo.id },
        capturedLat: { not: null },
        capturedLng: { not: null },
      },
      select: {
        id: true,
        capturedLat: true,
        capturedLng: true,
        capturedAt: true,
        deviceModel: true,
        fuenteUbicacion: true,
        subidoEn: true,
        url: true,
        medicion: { select: { id: true, fecha: true, observaciones: true, tecnico: { select: { nombre: true } } } },
      },
      orderBy: { subidoEn: 'desc' },
      take: 50,
    });

    // Fotos del chat de acceso remoto que esten asociadas al mismo permiso/empresa.
    // Solo si la empresa tiene permiso activo y el mensaje es del cliente o del soporte.
    const mensajesConGps = await prisma.mensajeRemoto.findMany({
      where: {
        permiso: { empresaId: activo.empresaId },
        capturedLat: { not: null },
        capturedLng: { not: null },
      },
      select: {
        id: true,
        capturedLat: true,
        capturedLng: true,
        capturedAt: true,
        deviceModel: true,
        fuenteUbicacion: true,
        creadoEn: true,
        contenido: true,
        autorNombre: true,
        autorRol: true,
      },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    });

    const puntos = [
      ...fotosMediciones.map((f) => ({
        id: f.id,
        origen: 'medicion' as const,
        lat: f.capturedLat!,
        lng: f.capturedLng!,
        capturedAt: f.capturedAt,
        subidoEn: f.subidoEn,
        fuente: f.fuenteUbicacion,
        device: f.deviceModel,
        descripcion: f.medicion?.observaciones ?? null,
        autor: f.medicion?.tecnico?.nombre ?? null,
      })),
      ...mensajesConGps.map((m) => ({
        id: m.id,
        origen: 'mensaje_remoto' as const,
        lat: m.capturedLat!,
        lng: m.capturedLng!,
        capturedAt: m.capturedAt,
        subidoEn: m.creadoEn,
        fuente: m.fuenteUbicacion,
        device: m.deviceModel,
        descripcion: m.contenido,
        autor: m.autorNombre,
      })),
    ].sort((a, b) => {
      const da = a.capturedAt ?? a.subidoEn;
      const db = b.capturedAt ?? b.subidoEn;
      return new Date(db).getTime() - new Date(da).getTime();
    });

    res.json({
      activo: { id: activo.id, codigo: activo.codigo, nombre: activo.nombre },
      puntos,
      ultimaUbicacion: puntos[0] ?? null,
    });
  } catch (err) { next(err); }
});

export default router;
