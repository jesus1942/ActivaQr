import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  const email = process.env.SUPERADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD;
  const nombre = process.env.SUPERADMIN_NOMBRE || 'Administrador ActivaQR';

  const existente = email
    ? await prisma.usuario.findUnique({ where: { email } })
    : null;
  if (email && existente) {
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
  } else if (email && password) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.usuario.create({
      data: { email, passwordHash, nombre, rol: 'superadmin', empresaId: null },
    });
    console.log(`Superadmin creado: ${email}`);
  } else if (!email) {
    console.error(
      'SUPERADMIN_EMAIL no está definida: no se crea ni se modifica el superadmin.'
    );
  } else {
    console.error(
      'No existe el superadmin y SUPERADMIN_PASSWORD no está definida: no se crea. ' +
        'Definí SUPERADMIN_PASSWORD en las variables de entorno.'
    );
  }

  // Nunca generar ni imprimir credenciales desde el arranque. Las empresas
  // huérfanas se informan para que el superadmin cree o reasigne un usuario
  // mediante el flujo protegido del panel.
  const empresas = await prisma.empresa.findMany({
    include: { usuarios: true },
  });
  for (const emp of empresas) {
    if (emp.usuarios.length > 0) continue;
    console.warn(`Empresa sin usuarios: "${emp.nombre}" (${emp.id}). Requiere asignacion manual.`);
  }
}

main()
  .catch((e) => {
    console.error('Error asegurando el superadmin:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
