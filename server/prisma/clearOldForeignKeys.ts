import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`UPDATE "Activo" SET "responsableId" = NULL`);
  await prisma.$executeRawUnsafe(`UPDATE "TareaMantenimiento" SET "responsableId" = NULL`);
  await prisma.$executeRawUnsafe(`UPDATE "Medicion" SET "tecnicoId" = NULL`);
  console.log('[pre-migrate] responsableId y tecnicoId limpiados OK');
}

main()
  .catch((e) => { console.error('[pre-migrate] error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
