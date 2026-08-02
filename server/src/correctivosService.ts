import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { nivelDesdeMedicion, textosAlerta, type NivelAlerta } from './correctivosCore';

export function numeroDocumento(prefijo: 'AT' | 'OT' | 'AQ', id: string, fecha = new Date()): string {
  const ymd = fecha.toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefijo}-${ymd}-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export async function registrarAlertaDesdeMedicion(params: {
  empresaId: string;
  activo: { id: string; codigo: string; nombre: string };
  medicionId: string;
  estadoMedicion: string;
  nivelSolicitado?: unknown;
  observaciones?: unknown;
  creadaPorId?: string | null;
  creadaPorNombre: string;
  db?: Prisma.TransactionClient;
}) {
  const db = params.db ?? prisma;
  const nivel = nivelDesdeMedicion(params.estadoMedicion, params.nivelSolicitado);
  if (!nivel) return null;
  const existente = await db.alertaTecnica.findUnique({
    where: { medicionId: params.medicionId },
  });
  if (existente) return existente;
  const id = randomUUID();
  const textos = textosAlerta(nivel, params.activo, params.observaciones);
  return db.alertaTecnica.create({
    data: {
      id,
      numero: numeroDocumento('AT', id),
      empresaId: params.empresaId,
      activoId: params.activo.id,
      medicionId: params.medicionId,
      nivel: nivel as NivelAlerta,
      ...textos,
      creadaPorId: params.creadaPorId ?? null,
      creadaPorNombre: params.creadaPorNombre,
    },
  });
}
