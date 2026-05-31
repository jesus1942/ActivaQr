/**
 * seedCategorias.ts
 * Crea las categorías globales de equipos (empresaId = null).
 * Ejecutar: npx ts-node src/seedCategorias.ts
 * O importar y llamar desde index.ts al inicio.
 */
import 'dotenv/config';
import { prisma } from './prisma';

type ParametroInput = {
  nombre: string;
  clave: string;
  unidad?: string;
  tipo?: 'numerico' | 'porcentaje' | 'booleano' | 'texto' | 'seleccion';
  obligatorio?: boolean;
  orden?: number;
  minNormal?: number;
  maxNormal?: number;
  umbralAlerta?: number;
  umbralCritico?: number;
  umbralUrgente?: number;
  invertido?: boolean;
};

type CategoriaInput = {
  nombre: string;
  icono?: string;
  descripcion?: string;
  orden: number;
  parametros: ParametroInput[];
};

const CATEGORIAS_GLOBALES: CategoriaInput[] = [
  {
    nombre: 'Motor Diesel / Generador',
    icono: '⚙️',
    orden: 1,
    parametros: [
      { nombre: 'Temperatura de agua', clave: 'temperatura_agua', unidad: '°C', orden: 1, umbralAlerta: 90, umbralCritico: 100, umbralUrgente: 105 },
      { nombre: 'Temperatura de aceite', clave: 'temperatura_aceite', unidad: '°C', orden: 2, umbralAlerta: 95, umbralCritico: 110, umbralUrgente: 120 },
      { nombre: 'Presión de aceite', clave: 'presion_aceite', unidad: 'bar', orden: 3, invertido: true, umbralAlerta: 2.5, umbralCritico: 1.5, umbralUrgente: 1.0 },
      { nombre: 'RPM', clave: 'rpm', unidad: 'RPM', orden: 4, umbralAlerta: 1900, umbralCritico: 2100, umbralUrgente: 2200 },
      { nombre: 'Voltaje de salida', clave: 'voltaje_salida', unidad: 'V', orden: 5, minNormal: 210, maxNormal: 240, umbralAlerta: 200 },
      { nombre: 'Nivel de combustible', clave: 'nivel_combustible', unidad: '%', tipo: 'porcentaje', orden: 6, invertido: true, umbralAlerta: 20, umbralCritico: 10 },
      { nombre: 'Horas de marcha', clave: 'horas_marcha', unidad: 'h', orden: 7 },
    ],
  },
  {
    nombre: 'Hidráulico / Power Pack',
    icono: '🔧',
    orden: 2,
    parametros: [
      { nombre: 'Presión del sistema', clave: 'presion_sistema', unidad: 'bar', orden: 1, umbralAlerta: 180, umbralCritico: 200, umbralUrgente: 220 },
      { nombre: 'Presión de retorno', clave: 'presion_retorno', unidad: 'bar', orden: 2, umbralAlerta: 5, umbralCritico: 8 },
      { nombre: 'Temperatura del fluido', clave: 'temperatura_fluido', unidad: '°C', orden: 3, umbralAlerta: 60, umbralCritico: 75, umbralUrgente: 85 },
      { nombre: 'Nivel del tanque', clave: 'nivel_tanque', unidad: '%', tipo: 'porcentaje', orden: 4, invertido: true, umbralAlerta: 20, umbralCritico: 10 },
      { nombre: 'Caudal', clave: 'caudal', unidad: 'L/min', orden: 5 },
    ],
  },
  {
    nombre: 'Neumático / Compresor',
    icono: '💨',
    orden: 3,
    parametros: [
      { nombre: 'Presión de trabajo', clave: 'presion_trabajo', unidad: 'bar', orden: 1, umbralAlerta: 8, umbralCritico: 9, umbralUrgente: 10 },
      { nombre: 'Temperatura del compresor', clave: 'temperatura_compresor', unidad: '°C', orden: 2, umbralAlerta: 80, umbralCritico: 95, umbralUrgente: 105 },
      { nombre: 'Humedad', clave: 'humedad', unidad: '%', tipo: 'porcentaje', orden: 3 },
      { nombre: 'Presión de entrada', clave: 'presion_entrada', unidad: 'bar', orden: 4 },
    ],
  },
  {
    nombre: 'Eléctrico / Tablero',
    icono: '⚡',
    orden: 4,
    parametros: [
      { nombre: 'Voltaje L1', clave: 'voltaje_l1', unidad: 'V', orden: 1, minNormal: 210, maxNormal: 240 },
      { nombre: 'Voltaje L2', clave: 'voltaje_l2', unidad: 'V', orden: 2, minNormal: 210, maxNormal: 240 },
      { nombre: 'Voltaje L3', clave: 'voltaje_l3', unidad: 'V', orden: 3, minNormal: 210, maxNormal: 240 },
      { nombre: 'Corriente', clave: 'corriente', unidad: 'A', orden: 4 },
      { nombre: 'Factor de potencia', clave: 'factor_potencia', orden: 5 },
      { nombre: 'Temperatura del gabinete', clave: 'temperatura_gabinete', unidad: '°C', orden: 6, umbralAlerta: 45, umbralCritico: 60 },
    ],
  },
  {
    nombre: 'Bomba Centrífuga',
    icono: '🌀',
    orden: 5,
    parametros: [
      { nombre: 'Caudal', clave: 'caudal', unidad: 'm³/h', orden: 1 },
      { nombre: 'Presión de descarga', clave: 'presion_descarga', unidad: 'bar', orden: 2, umbralAlerta: 5, umbralCritico: 6 },
      { nombre: 'Presión de succión', clave: 'presion_succion', unidad: 'bar', orden: 3 },
      { nombre: 'Temperatura de rodamiento', clave: 'temperatura_rodamiento', unidad: '°C', orden: 4, umbralAlerta: 70, umbralCritico: 85, umbralUrgente: 95 },
      { nombre: 'Nivel de vibración', clave: 'vibracion_nivel', unidad: 'mm/s', orden: 5, umbralAlerta: 4.5, umbralCritico: 7.1, umbralUrgente: 11.2 },
    ],
  },
  {
    nombre: 'HVAC / Climatización',
    icono: '❄️',
    orden: 6,
    parametros: [
      { nombre: 'Temperatura ambiente', clave: 'temperatura_ambiente', unidad: '°C', orden: 1 },
      { nombre: 'Temperatura evaporador', clave: 'temperatura_evaporador', unidad: '°C', orden: 2 },
      { nombre: 'Presión alta', clave: 'presion_alta', unidad: 'bar', orden: 3, umbralAlerta: 18, umbralCritico: 22 },
      { nombre: 'Presión baja', clave: 'presion_baja', unidad: 'bar', orden: 4, invertido: true, umbralAlerta: 3, umbralCritico: 2 },
      { nombre: 'Corriente compresor', clave: 'corriente_compresor', unidad: 'A', orden: 5 },
    ],
  },
  {
    nombre: 'IT / Informática',
    icono: '💻',
    orden: 7,
    parametros: [
      { nombre: 'Temperatura CPU', clave: 'temperatura_cpu', unidad: '°C', orden: 1, umbralAlerta: 75, umbralCritico: 85, umbralUrgente: 95 },
      { nombre: 'Uso de CPU', clave: 'uso_cpu', unidad: '%', tipo: 'porcentaje', orden: 2, umbralAlerta: 85, umbralCritico: 95 },
      { nombre: 'Uso de RAM', clave: 'uso_ram', unidad: '%', tipo: 'porcentaje', orden: 3, umbralAlerta: 85, umbralCritico: 95 },
      { nombre: 'Uso de disco', clave: 'uso_disco', unidad: '%', tipo: 'porcentaje', orden: 4, umbralAlerta: 85, umbralCritico: 95 },
      { nombre: 'Nivel de tóner', clave: 'nivel_toner', unidad: '%', tipo: 'porcentaje', orden: 5, invertido: true, umbralAlerta: 20, umbralCritico: 10 },
      { nombre: 'Batería', clave: 'bateria', unidad: '%', tipo: 'porcentaje', orden: 6, invertido: true, umbralAlerta: 20, umbralCritico: 10 },
      { nombre: 'Contador de páginas', clave: 'contador_paginas', unidad: 'páginas', orden: 7 },
    ],
  },
  {
    nombre: 'General / Otro',
    icono: '📋',
    orden: 8,
    parametros: [
      { nombre: 'Temperatura', clave: 'temperatura', unidad: '°C', orden: 1 },
      { nombre: 'Observación', clave: 'observacion', tipo: 'texto', orden: 2 },
    ],
  },
];

export async function seedCategorias() {
  console.log('Seeding categorías globales de equipos...');
  let created = 0;
  let skipped = 0;

  for (const cat of CATEGORIAS_GLOBALES) {
    const existing = await prisma.categoriaEquipo.findFirst({
      where: { nombre: cat.nombre, empresaId: null },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.categoriaEquipo.create({
      data: {
        empresaId: null,
        nombre: cat.nombre,
        icono: cat.icono,
        descripcion: cat.descripcion,
        orden: cat.orden,
        parametros: {
          create: cat.parametros.map((p) => ({
            nombre: p.nombre,
            clave: p.clave,
            unidad: p.unidad,
            tipo: p.tipo ?? 'numerico',
            obligatorio: p.obligatorio ?? false,
            orden: p.orden ?? 0,
            minNormal: p.minNormal,
            maxNormal: p.maxNormal,
            umbralAlerta: p.umbralAlerta,
            umbralCritico: p.umbralCritico,
            umbralUrgente: p.umbralUrgente,
            invertido: p.invertido ?? false,
          })),
        },
      },
    });
    created++;
  }

  console.log(`seedCategorias: ${created} creadas, ${skipped} ya existían.`);
}

// Run directly if called as script
const isMain = require.main === module;
if (isMain) {
  seedCategorias()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
