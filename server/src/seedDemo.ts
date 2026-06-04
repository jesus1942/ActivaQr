import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

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

  console.log('seedDemo: empresa y usuario demo creados.');
}

const isMain = require.main === module;
if (isMain) {
  seedDemo()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
