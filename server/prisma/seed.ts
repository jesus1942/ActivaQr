import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed de despliegue deliberadamente no destructivo.
 *
 * Las migraciones crean el esquema, ensureAdmin gestiona al propietario desde
 * variables privadas y seedDemo mantiene su tenant aislado al iniciar la API.
 * Este paso nunca borra ni reemplaza datos de clientes.
 */
async function main() {
  const empresas = await prisma.empresa.count();
  console.log(
    empresas === 0
      ? 'Base inicializada sin datos de clientes; la API creara la demo aislada.'
      : `Base verificada: ${empresas} empresa(s), sin resembrar ni borrar datos.`
  );
}

main()
  .catch((error) => {
    console.error('Error verificando la base:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
