import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export interface FallaSeedInput {
  codigo?: string;
  sintoma: string;
  causas: Array<{
    causa: string;
    probabilidad: 'alta' | 'media' | 'baja';
  }>;
  solucion: string;
  severidad: 'info' | 'advertencia' | 'critico';
  orden: number;
}

export async function guardarFallasCatalogo(params: {
  categoriaNombre: string;
  etiqueta: string;
  fallas: FallaSeedInput[];
}): Promise<void> {
  const categoria = await prisma.categoriaEquipo.findFirst({
    where: { nombre: params.categoriaNombre, empresaId: null },
  });
  if (!categoria) {
    console.log(`${params.etiqueta}: categoria "${params.categoriaNombre}" no encontrada, saltando`);
    return;
  }

  let creadas = 0;
  let actualizadas = 0;
  for (const falla of params.fallas) {
    const existente = await prisma.fallaCatalogo.findFirst({
      where: { categoriaId: categoria.id, empresaId: null, codigo: falla.codigo },
    });
    const data = {
      sintoma: falla.sintoma,
      causas: falla.causas as unknown as Prisma.InputJsonValue,
      solucion: falla.solucion,
      severidad: falla.severidad,
      orden: falla.orden,
    };
    if (existente) {
      await prisma.fallaCatalogo.update({
        where: { id: existente.id },
        data,
      });
      actualizadas++;
    } else {
      await prisma.fallaCatalogo.create({
        data: {
          ...data,
          categoriaId: categoria.id,
          empresaId: null,
          codigo: falla.codigo,
        },
      });
      creadas++;
    }
  }
  console.log(`${params.etiqueta}: ${creadas} creadas, ${actualizadas} actualizadas`);
}

export function ejecutarSeedStandalone(seed: () => Promise<void>): void {
  seed()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
