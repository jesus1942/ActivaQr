import { Router, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../auth';

const router = Router();

// GET /api/tecnicos
// Devuelve los Usuarios de la empresa en shape compatible con el viejo
// modelo Tecnico que usa el frontend. Esto resuelve el dropdown vacio
// de "Responsable" en editar tarea / nueva tarea / nueva medicion.
//
// Accesible para cualquier rol logueado (admin, operador, superadmin)
// porque cualquiera necesita el listado para asignar responsable.
//
// Solo expone {id, nombre, cargo, activo}. No expone email/telefono/rol;
// para gestion completa se usa /api/operadores (solo admin).
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth?.empresaId;
    if (!empresaId) {
      return res.status(400).json({ error: 'Sin empresa asignada.' });
    }
    const usuarios = await prisma.usuario.findMany({
      where: {
        empresaId,
        rol: { in: ['admin', 'operador', 'tecnico', 'mantenimiento', 'jefatura'] },
      },
      select: { id: true, nombre: true, cargo: true, activo: true },
      orderBy: { nombre: 'asc' },
    });
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
});

export default router;
