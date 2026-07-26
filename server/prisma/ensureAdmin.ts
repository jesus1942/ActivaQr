import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * Asegura que exista el usuario superadmin (dueño de ActivaQR).
 * Idempotente: se ejecuta en cada arranque sin duplicar.
 * Las credenciales vienen de variables de entorno:
 *   SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, SUPERADMIN_NOMBRE
 *
 * SUPERADMIN_PASSWORD no tiene valor por defecto: el repo es público y una
 * contraseña de fábrica sería conocida por cualquiera. Sin la variable,
 * nunca se toca la contraseña de un superadmin existente, y no se crea
 * uno nuevo.
 */
async function main() {
  const email = (process.env.SUPERADMIN_EMAIL || 'chucky9425@gmail.com').toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD;
  const nombre = process.env.SUPERADMIN_NOMBRE || 'Administrador ActivaQR';

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    // Garantiza superadmin/activo. La contraseña solo se sincroniza si
    // SUPERADMIN_PASSWORD está definida (cambiarla en Railway tiene efecto).
    const data: { rol: 'superadmin'; activo: boolean; passwordHash?: string } = {
      rol: 'superadmin',
      activo: true,
    };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    await prisma.usuario.update({ where: { id: existente.id }, data });
    console.log(`Superadmin actualizado: ${email}${password ? ' (contraseña sincronizada)' : ''}`);
  } else if (password) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.usuario.create({
      data: { email, passwordHash, nombre, rol: 'superadmin', empresaId: null },
    });
    console.log(`Superadmin creado: ${email}`);
  } else {
    console.error(
      'No existe el superadmin y SUPERADMIN_PASSWORD no está definida: no se crea. ' +
        'Definí SUPERADMIN_PASSWORD en las variables de entorno.'
    );
  }

  // Empresas existentes sin usuario admin (ej: la empresa demo previa a auth):
  // se les crea un acceso para no perder sus datos, con contraseña aleatoria
  // que queda en los logs del servidor (nunca una contraseña de fábrica).
  const empresas = await prisma.empresa.findMany({
    include: { usuarios: true },
  });
  for (const emp of empresas) {
    if (emp.usuarios.length > 0) continue;
    const demoEmail = `demo+${emp.id.slice(0, 8)}@activaqr.com`;
    const demoPassword = randomBytes(9).toString('base64url');
    const demoHash = await bcrypt.hash(demoPassword, 10);
    await prisma.usuario.create({
      data: {
        empresaId: emp.id,
        email: demoEmail,
        passwordHash: demoHash,
        nombre: 'Administrador',
        rol: 'admin',
      },
    });
    console.log(`Acceso creado para "${emp.nombre}": ${demoEmail} / ${demoPassword}`);
  }
}

main()
  .catch((e) => {
    console.error('Error asegurando el superadmin:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
