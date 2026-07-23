import 'dotenv/config';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const BASELINE = '20260723000000_baseline';
const prisma = new PrismaClient();
const prismaBin = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);

function runPrisma(args: string[]) {
  const result = spawnSync(prismaBin, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    throw new Error(`Prisma terminó con código ${result.status}: ${args.join(' ')}`);
  }
}

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ relation: string | null }>>(
    'SELECT to_regclass($1)::text AS relation',
    `public.${name}`,
  );
  return Boolean(rows[0]?.relation);
}

async function main() {
  // La base de Railway nació antes de que existieran migraciones. Si ya
  // contiene el esquema pero no el historial, marcamos una única baseline.
  const [hasEmpresa, hasMigrationHistory] = await Promise.all([
    tableExists('"Empresa"'),
    tableExists('_prisma_migrations'),
  ]);

  if (hasEmpresa && !hasMigrationHistory) {
    console.log(`[migrate] Base existente detectada. Registrando baseline ${BASELINE}.`);
    runPrisma(['migrate', 'resolve', '--applied', BASELINE]);
  }

  runPrisma(['migrate', 'deploy']);
}

main()
  .catch((error) => {
    console.error('[migrate] Error fatal:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
