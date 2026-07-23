import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

async function asegurarEscenarioFrio(empresaId: string) {
  const sede = await prisma.sede.findFirst({ where: { empresaId, nombre: 'Buque factoría Austral I' } })
    ?? await prisma.sede.create({
      data: { empresaId, nombre: 'Buque factoría Austral I', ciudad: 'Puerto Madryn' },
    });
  const sector = await prisma.sector.findFirst({ where: { empresaId, nombre: 'Planta de frío' } })
    ?? await prisma.sector.create({
      data: { empresaId, nombre: 'Planta de frío', color: '#14b8a6' },
    });

  const asegurarTipo = async (nombre: string, extra: Record<string, boolean>) =>
    await prisma.tipoActivo.findFirst({ where: { empresaId, nombre } })
      ?? await prisma.tipoActivo.create({
        data: { empresaId, nombre, mideTemperatura: true, ...extra },
      });

  const tipoCamara = await asegurarTipo('Cámara frigorífica', {});
  const tipoTunel = await asegurarTipo('Túnel de congelado', {});
  const tipoCompresor = await asegurarTipo('Compresor frigorífico', {
    mideAmperaje: true,
    midePresion: true,
    mideVibracion: true,
  });

  const camara = await prisma.activo.upsert({
    where: { empresaId_codigo: { empresaId, codigo: 'FRIO-001' } },
    create: {
      empresaId, sedeId: sede.id, sectorId: sector.id, tipoId: tipoCamara.id,
      codigo: 'FRIO-001', nombre: 'Cámara frigorífica de bodega 1',
      marca: 'Bitzer', modelo: 'Bodega -25 °C', fechaIngreso: new Date('2025-02-10'),
      estado: 'alerta', temperaturaMin: -25, temperaturaMax: -18,
      temperaturaAlerta: -16, temperaturaCritica: -12,
      intervaloMedicionHoras: 4, proximoMantenimiento: new Date(Date.now() + 5 * 86400000),
    },
    update: {
      sedeId: sede.id, sectorId: sector.id, tipoId: tipoCamara.id,
      estado: 'alerta', temperaturaMin: -25, temperaturaMax: -18,
      temperaturaAlerta: -16, temperaturaCritica: -12, intervaloMedicionHoras: 4,
    },
  });
  const tunel = await prisma.activo.upsert({
    where: { empresaId_codigo: { empresaId, codigo: 'TUNEL-001' } },
    create: {
      empresaId, sedeId: sede.id, sectorId: sector.id, tipoId: tipoTunel.id,
      codigo: 'TUNEL-001', nombre: 'Túnel de congelado rápido',
      marca: 'GEA', modelo: 'IQF Marine', fechaIngreso: new Date('2024-08-18'),
      estado: 'normal', temperaturaMin: -40, temperaturaMax: -30,
      temperaturaAlerta: -27, temperaturaCritica: -22, intervaloMedicionHoras: 2,
    },
    update: {
      sedeId: sede.id, sectorId: sector.id, tipoId: tipoTunel.id,
      estado: 'normal', temperaturaMin: -40, temperaturaMax: -30,
      temperaturaAlerta: -27, temperaturaCritica: -22, intervaloMedicionHoras: 2,
    },
  });
  const compresor = await prisma.activo.upsert({
    where: { empresaId_codigo: { empresaId, codigo: 'COMP-FRIO-01' } },
    create: {
      empresaId, sedeId: sede.id, sectorId: sector.id, tipoId: tipoCompresor.id,
      codigo: 'COMP-FRIO-01', nombre: 'Compresor frigorífico principal',
      marca: 'Mycom', modelo: 'N160VLD', fechaIngreso: new Date('2024-08-18'),
      estado: 'critico', temperaturaAlerta: 85, temperaturaCritica: 95,
      amperajeNormal: 92, amperajeAlerta: 110, amperajeCritico: 125,
      presionNormal: 12, presionAlerta: 15, presionCritica: 18,
      intervaloMedicionHoras: 2,
    },
    update: {
      sedeId: sede.id, sectorId: sector.id, tipoId: tipoCompresor.id,
      estado: 'critico', temperaturaAlerta: 85, temperaturaCritica: 95,
      amperajeNormal: 92, amperajeAlerta: 110, amperajeCritico: 125,
      presionNormal: 12, presionAlerta: 15, presionCritica: 18,
    },
  });

  const horasAtras = (horas: number) => new Date(Date.now() - horas * 3600000);
  const mediciones = [
    { id: 'demo-frio-med-01', activoId: camara.id, fecha: horasAtras(48), temperatura: -22, estado: 'normal' as const, observaciones: 'Ronda normal de guardia.' },
    { id: 'demo-frio-med-02', activoId: camara.id, fecha: horasAtras(24), temperatura: -18, estado: 'normal' as const, observaciones: 'Temperatura en límite superior.' },
    { id: 'demo-frio-med-03', activoId: camara.id, fecha: horasAtras(2), temperatura: -14, estado: 'revision' as const, observaciones: 'Desvío sostenido. Se solicita revisar cierre y evaporador.' },
    { id: 'demo-tunel-med-01', activoId: tunel.id, fecha: horasAtras(1), temperatura: -36, estado: 'normal' as const, observaciones: 'Ciclo de congelado estable.' },
    { id: 'demo-comp-med-01', activoId: compresor.id, fecha: horasAtras(3), temperatura: 98, amperaje: 129, presion: 18.4, estado: 'urgente' as const, observaciones: 'Alta descarga y consumo. Equipo derivado a mantenimiento.' },
  ];
  for (const medicion of mediciones) {
    await prisma.medicion.upsert({
      where: { id: medicion.id },
      create: { ...medicion, origen: 'manual' },
      update: { ...medicion, origen: 'manual' },
    });
  }

  await prisma.tareaMantenimiento.upsert({
    where: { id: 'demo-ot-frio-01' },
    create: {
      id: 'demo-ot-frio-01', activoId: compresor.id, numero: 1001,
      tipo: 'Revisar alta presión y consumo del compresor',
      prioridad: 'critica', fechaProgramada: horasAtras(2), estado: 'pendiente',
      observaciones: 'Generada por la medición urgente de la guardia.',
    },
    update: {
      activoId: compresor.id, numero: 1001,
      tipo: 'Revisar alta presión y consumo del compresor',
      prioridad: 'critica', fechaProgramada: horasAtras(2), estado: 'pendiente',
      observaciones: 'Generada por la medición urgente de la guardia.',
    },
  });
}

export async function seedDemo() {
  const DEMO_EMAIL = 'demo@activaqr.com';
  const DEMO_EMPRESA = 'Demo ActivaQR';

  const existingUser = await prisma.usuario.findUnique({
    where: { email: DEMO_EMAIL },
    include: { empresa: true },
  });
  // Si la empresa demo ya existe, forzar politicas aceptadas para que el modal
  // legal no interrumpa la experiencia demo.
  if (existingUser?.empresa) {
    if (!existingUser.empresa.politicasAceptadasEn) {
      await prisma.empresa.update({
        where: { id: existingUser.empresa.id },
        data: {
          politicasAceptadasEn: new Date(),
          politicasAceptadasIp: 'seed-demo',
          politicasVersion: 'demo',
        },
      });
    }
    await asegurarEscenarioFrio(existingUser.empresa.id);
    return;
  }
  // Usuario existe pero empresa fue borrada — borrar usuario huerfano y recrear todo
  if (existingUser) {
    await prisma.usuario.delete({ where: { id: existingUser.id } });
  }

  const passwordHash = await bcrypt.hash('demo1234', 10);

  const empresa = await prisma.empresa.create({
    data: {
      nombre: DEMO_EMPRESA,
      plan: 'empresa',
      estado: 'activa',
      politicasAceptadasEn: new Date(),
      politicasAceptadasIp: 'seed-demo',
      politicasVersion: 'demo',
    },
  });

  await prisma.usuario.create({
    data: {
      empresaId: empresa.id,
      email: DEMO_EMAIL,
      passwordHash,
      nombre: 'Demo',
      rol: 'admin',
      activo: true,
    },
  });

  const sede = await prisma.sede.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Planta Principal',
      ciudad: 'Buenos Aires',
    },
  });

  const sector = await prisma.sector.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Sala de Máquinas',
      color: '#f97316',
    },
  });

  const categoriaCompre = await prisma.categoriaEquipo.findFirst({
    where: { nombre: 'Neumático / Compresor', empresaId: null },
  });
  const categoriaBomba = await prisma.categoriaEquipo.findFirst({
    where: { nombre: 'Bomba Centrífuga', empresaId: null },
  });
  const categoriaTablero = await prisma.categoriaEquipo.findFirst({
    where: { nombre: 'Eléctrico / Tablero', empresaId: null },
  });

  const tipoCompresor = await prisma.tipoActivo.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Compresor',
      categoriaId: categoriaCompre?.id ?? null,
      midePresion: true,
      mideTemperatura: true,
    },
  });
  const tipoBomba = await prisma.tipoActivo.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Bomba',
      categoriaId: categoriaBomba?.id ?? null,
      midePresion: true,
      mideTemperatura: true,
      mideAmperaje: true,
    },
  });
  const tipoTablero = await prisma.tipoActivo.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Tablero Eléctrico',
      categoriaId: categoriaTablero?.id ?? null,
      mideVoltaje: true,
      mideAmperaje: true,
      mideTemperatura: true,
    },
  });

  const activos = [
    {
      codigo: 'DEMO-001',
      nombre: 'Compresor de aire',
      marca: 'Atlas Copco',
      modelo: 'GA 11',
      tipoId: tipoCompresor.id,
      presionNormal: 7.5,
      presionAlerta: 9.0,
      presionCritica: 10.0,
      temperaturaMin: 10,
      temperaturaMax: 80,
      temperaturaAlerta: 95,
    },
    {
      codigo: 'DEMO-002',
      nombre: 'Tablero eléctrico principal',
      marca: 'Siemens',
      modelo: 'SIVACON S8',
      tipoId: tipoTablero.id,
      voltajeMin: 210,
      voltajeMax: 240,
      voltajeAlerta: 200,
      amperajeNormal: 63,
      amperajeAlerta: 80,
      amperajeCritico: 100,
    },
    {
      codigo: 'DEMO-003',
      nombre: 'Bomba centrifuga',
      marca: 'Grundfos',
      modelo: 'CM 10-3',
      tipoId: tipoBomba.id,
      presionNormal: 4.0,
      presionAlerta: 5.5,
      presionCritica: 6.5,
      amperajeNormal: 4.2,
      amperajeAlerta: 5.5,
      amperajeCritico: 7.0,
    },
    {
      codigo: 'DEMO-004',
      nombre: 'Motor ventilación sala',
      marca: 'WEG',
      modelo: 'W22 5.5kW',
      tipoId: tipoCompresor.id,
      temperaturaMin: 5,
      temperaturaMax: 70,
      temperaturaAlerta: 85,
      amperajeNormal: 10,
      amperajeAlerta: 13,
      amperajeCritico: 16,
    },
  ];

  for (const activo of activos) {
    await prisma.activo.create({
      data: {
        empresaId: empresa.id,
        sedeId: sede.id,
        sectorId: sector.id,
        fechaIngreso: new Date('2024-01-15'),
        estado: 'normal',
        horasActuales: Math.floor(Math.random() * 3000) + 500,
        ...activo,
      },
    });
  }

  await asegurarEscenarioFrio(empresa.id);
  console.log('seedDemo: empresa y usuario demo creados.');
}

const isMain = require.main === module;
if (isMain) {
  seedDemo()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
