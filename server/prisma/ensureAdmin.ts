import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Asegura que exista el usuario superadmin (dueño de ActivaQR).
 * Idempotente: se ejecuta en cada arranque sin duplicar.
 * Las credenciales vienen de variables de entorno:
 *   SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, SUPERADMIN_NOMBRE
 */
async function main() {
  const email = (process.env.SUPERADMIN_EMAIL || 'chucky9425@gmail.com').toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD || 'activaqr-admin';
  const nombre = process.env.SUPERADMIN_NOMBRE || 'Administrador ActivaQR';

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    // Garantiza que siga siendo superadmin y esté activo.
    if (existente.rol !== 'superadmin' || !existente.activo) {
      await prisma.usuario.update({
        where: { id: existente.id },
        data: { rol: 'superadmin', activo: true },
      });
    }
    console.log(`Superadmin ya existe: ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.usuario.create({
      data: { email, passwordHash, nombre, rol: 'superadmin', empresaId: null },
    });
    console.log(`Superadmin creado: ${email}`);
  }

  // Empresas existentes sin usuario admin (ej: la empresa demo previa a auth):
  // se les crea un acceso para no perder sus datos.
  const empresas = await prisma.empresa.findMany({
    include: { usuarios: true },
  });
  for (const emp of empresas) {
    if (emp.usuarios.length > 0) continue;
    const demoEmail = `demo+${emp.id.slice(0, 8)}@activaqr.com`;
    const demoHash = await bcrypt.hash('demo1234', 10);
    await prisma.usuario.create({
      data: {
        empresaId: emp.id,
        email: demoEmail,
        passwordHash: demoHash,
        nombre: 'Administrador',
        rol: 'admin',
      },
    });
    console.log(`Acceso demo creado para "${emp.nombre}": ${demoEmail} / demo1234`);
  }
}

main()
  .catch((e) => {
    console.error('Error asegurando el superadmin:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
