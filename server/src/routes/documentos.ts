import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';
import { auditar } from '../auditoria';
import { AuthRequest } from '../auth';

const router = Router();

const TIPOS = ['manual', 'plano', 'ficha', 'certificado', 'protocolo', 'foto', 'otro'];
const MAX_BYTES = 8_000_000; // ~6MB reales en base64

// MIME types permitidos para adjuntos (data URLs). Bloquea ejecutables/HTML.
const MIME_PERMITIDOS = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function urlPermitida(url: string): boolean {
  // Links externos http(s) se permiten; data URLs deben tener un MIME de la allowlist.
  if (/^https?:\/\//i.test(url)) return true;
  const m = url.match(/^data:([^;,]+)[;,]/i);
  return !!m && MIME_PERMITIDOS.includes(m[1].toLowerCase());
}

// GET /api/documentos?activoId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const activoId = typeof req.query.activoId === 'string' ? req.query.activoId : undefined;
    if (!activoId) return res.status(400).json({ error: 'Falta activoId' });

    const activo = await prisma.activo.findFirst({ where: { id: activoId, empresaId } });
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });

    const documentos = await prisma.documento.findMany({
      where: { activoId },
      orderBy: { creadoEn: 'desc' },
    });
    res.json(documentos);
  } catch (err) {
    next(err);
  }
});

// POST /api/documentos
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const { activoId, nombre, tipo, url } = req.body ?? {};
    if (!activoId || !nombre || !url) {
      return res.status(400).json({ error: 'Faltan datos: activoId, nombre y url.' });
    }
    if (typeof url === 'string' && url.length > MAX_BYTES) {
      return res.status(413).json({ error: 'El archivo supera el tamaño maximo (6MB).' });
    }
    if (typeof url !== 'string' || !urlPermitida(url)) {
      return res.status(415).json({ error: 'Tipo de archivo no permitido. Solo PDF, imágenes, Word o Excel.' });
    }

    const activo = await prisma.activo.findFirst({ where: { id: activoId, empresaId } });
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });

    const documento = await prisma.documento.create({
      data: {
        activoId,
        nombre: String(nombre).slice(0, 200),
        tipo: TIPOS.includes(tipo) ? tipo : 'otro',
        url,
      },
    });
    void auditar(req as AuthRequest, 'crear', 'documento', documento.id, `${documento.nombre} en ${activo.codigo}`);
    res.status(201).json(documento);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documentos/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.documento.findFirst({
      where: { id: req.params.id, activo: { empresaId } },
    });
    if (!existing) return res.status(404).json({ error: 'Documento no encontrado' });

    await prisma.documento.delete({ where: { id: req.params.id } });
    void auditar(req as AuthRequest, 'eliminar', 'documento', existing.id, existing.nombre);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
