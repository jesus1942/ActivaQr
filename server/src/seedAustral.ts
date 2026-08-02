// Seed de dataset realista para "Escuela Nueva Austral" (o cualquier empresa
// que el superadmin elija). Pensado para que el modulo de analisis predictivo
// y los KPIs tengan de donde agarrarse en demos: 50 activos con 18 meses de
// historial, mediciones plausibles, y algunos casos sembrados de tendencia
// (bateria degradando, temperatura subiendo, etc.).
//
// Idempotente: identifica todo con prefijo AUS- (sectores y activos por
// nombre/codigo). Si un activo AUS-X ya existe en la empresa, se borran sus
// mediciones y tareas seed y se reseedean; los datos cargados a mano por el
// cliente (activos sin prefijo AUS-) NO se tocan.

import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from './prisma';

// ── Catalogo de personal (Usuarios con rol operador) ────────────────────────
// Estos usuarios aparecen en el dropdown de "Responsable" en todas las
// pantallas (editar tarea, asignar tarea, registrar medicion). Si re-corres
// el seed y ya existen, NO se recrean ni se cambian sus passwords.
interface PersonalSpec {
  key: 'mantenimiento' | 'ti' | 'servicios';
  nombre: string;
  cargo: string;
}
const PERSONAL: PersonalSpec[] = [
  { key: 'mantenimiento', nombre: 'Responsable de Mantenimiento', cargo: 'Tecnico de Mantenimiento' },
  { key: 'ti',            nombre: 'Responsable de TI',            cargo: 'Soporte TI' },
  { key: 'servicios',     nombre: 'Responsable de Servicios',     cargo: 'Auxiliar de Servicios' },
];

// ── Catalogo de sectores ────────────────────────────────────────────────────
const SECTORES = [
  'Primaria',
  'Secundaria',
  'Administracion',
  'Cocina Comedor',
  'Sala Docentes',
  'Patio Servicios',
];

// ── Catalogo de tipos (con sus flags de medicion) ───────────────────────────
type TipoFlags = {
  mideTemperatura?: boolean;
  mideAmperaje?: boolean;
  mideVoltaje?: boolean;
  midePresion?: boolean;
  mideVibracion?: boolean;
  mideBateria?: boolean;
  mideToner?: boolean;
  mideContador?: boolean;
};

interface TipoSpec {
  nombre: string;
  icono: string;
  flags: TipoFlags;
}

const TIPOS: Record<string, TipoSpec> = {
  laptop:     { nombre: 'Laptop',                icono: 'laptop',     flags: { mideTemperatura: true, mideBateria: true } },
  tablet:     { nombre: 'Tablet',                icono: 'tablet',     flags: { mideTemperatura: true, mideBateria: true } },
  proyector:  { nombre: 'Proyector',             icono: 'projector',  flags: { mideTemperatura: true, mideContador: true } },
  split:      { nombre: 'Split AC',              icono: 'snowflake',  flags: { mideTemperatura: true, mideAmperaje: true, midePresion: true } },
  calefactor: { nombre: 'Calefactor TB',         icono: 'flame',      flags: { mideTemperatura: true, midePresion: true } },
  dispenser:  { nombre: 'Dispenser Agua',        icono: 'droplet',    flags: { mideTemperatura: true } },
  impresora:  { nombre: 'Impresora Multifuncion', icono: 'printer',   flags: { mideToner: true, mideContador: true } },
  microondas: { nombre: 'Microondas',            icono: 'microwave',  flags: { mideVoltaje: true } },
  bomba:      { nombre: 'Bomba de Agua',         icono: 'pump',       flags: { mideAmperaje: true, mideVibracion: true } },
  grupoElec:  { nombre: 'Grupo Electrogeno',     icono: 'generator',  flags: { mideTemperatura: true, mideAmperaje: true, mideVoltaje: true, midePresion: true, mideVibracion: true, mideContador: true } },
  extractor:  { nombre: 'Extractor Cocina',      icono: 'fan',        flags: { mideAmperaje: true, mideVibracion: true } },
};
type CategoriaKey = keyof typeof TIPOS;

// ── Catalogo de activos ─────────────────────────────────────────────────────
type Tendencia = 'normal' | 'bateria-degradando' | 'temperatura-subiendo' | 'horas-acumuladas' | 'toner-bajo' | 'fallas-recurrentes' | 'vibracion-creciente';

interface ActivoSpec {
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  categoria: CategoriaKey;
  sector: string;
  ubicacion: string;
  mesesEnUso: number; // antiguedad del activo en meses
  tendencia: Tendencia;
}

const ACTIVOS: ActivoSpec[] = [
  // 15 Laptops
  { codigo: 'AUS-LAP-001', nombre: 'Laptop Aula P-1', marca: 'Lenovo', modelo: 'ThinkPad E14', categoria: 'laptop', sector: 'Primaria', ubicacion: 'Aula 1 - Primaria', mesesEnUso: 14, tendencia: 'normal' },
  { codigo: 'AUS-LAP-002', nombre: 'Laptop Aula P-2', marca: 'Lenovo', modelo: 'ThinkPad E14', categoria: 'laptop', sector: 'Primaria', ubicacion: 'Aula 2 - Primaria', mesesEnUso: 14, tendencia: 'normal' },
  { codigo: 'AUS-LAP-003', nombre: 'Laptop Aula P-3', marca: 'HP',     modelo: 'ProBook 440',  categoria: 'laptop', sector: 'Primaria', ubicacion: 'Aula 3 - Primaria', mesesEnUso: 26, tendencia: 'bateria-degradando' },
  { codigo: 'AUS-LAP-004', nombre: 'Laptop Aula P-4', marca: 'HP',     modelo: 'ProBook 440',  categoria: 'laptop', sector: 'Primaria', ubicacion: 'Aula 4 - Primaria', mesesEnUso: 12, tendencia: 'normal' },
  { codigo: 'AUS-LAP-005', nombre: 'Laptop Aula P-5', marca: 'Lenovo', modelo: 'IdeaPad 5',    categoria: 'laptop', sector: 'Primaria', ubicacion: 'Aula 5 - Primaria', mesesEnUso: 9,  tendencia: 'normal' },
  { codigo: 'AUS-LAP-006', nombre: 'Laptop Direccion P', marca: 'Dell',modelo: 'Latitude 5430',categoria: 'laptop', sector: 'Primaria', ubicacion: 'Direccion Primaria', mesesEnUso: 18, tendencia: 'normal' },
  { codigo: 'AUS-LAP-007', nombre: 'Laptop Biblioteca P', marca: 'HP', modelo: 'ProBook 440',  categoria: 'laptop', sector: 'Primaria', ubicacion: 'Biblioteca P',       mesesEnUso: 22, tendencia: 'normal' },
  { codigo: 'AUS-LAP-008', nombre: 'Laptop Comp P',      marca: 'Asus',modelo: 'U43F',         categoria: 'laptop', sector: 'Primaria', ubicacion: 'Lab Computacion P',   mesesEnUso: 30, tendencia: 'normal' },
  { codigo: 'AUS-LAP-009', nombre: 'Laptop Aula S-1', marca: 'Lenovo', modelo: 'ThinkPad E14', categoria: 'laptop', sector: 'Secundaria', ubicacion: 'Aula 1 - Secundaria', mesesEnUso: 16, tendencia: 'normal' },
  { codigo: 'AUS-LAP-010', nombre: 'Laptop Aula S-2', marca: 'Lenovo', modelo: 'ThinkPad E14', categoria: 'laptop', sector: 'Secundaria', ubicacion: 'Aula 2 - Secundaria', mesesEnUso: 16, tendencia: 'normal' },
  { codigo: 'AUS-LAP-011', nombre: 'Laptop Aula S-3', marca: 'HP',     modelo: 'ProBook 450',  categoria: 'laptop', sector: 'Secundaria', ubicacion: 'Aula 3 - Secundaria', mesesEnUso: 12, tendencia: 'normal' },
  { codigo: 'AUS-LAP-012', nombre: 'Laptop Aula S-4', marca: 'HP',     modelo: 'ProBook 450',  categoria: 'laptop', sector: 'Secundaria', ubicacion: 'Aula 4 - Secundaria', mesesEnUso: 12, tendencia: 'normal' },
  { codigo: 'AUS-LAP-013', nombre: 'Laptop Direccion S', marca: 'Dell',modelo: 'Latitude 5430',categoria: 'laptop', sector: 'Secundaria', ubicacion: 'Direccion Secundaria',mesesEnUso: 24, tendencia: 'normal' },
  { codigo: 'AUS-LAP-014', nombre: 'Laptop Comp S',      marca: 'Asus',modelo: 'VivoBook 15',  categoria: 'laptop', sector: 'Secundaria', ubicacion: 'Lab Computacion S',   mesesEnUso: 20, tendencia: 'normal' },
  { codigo: 'AUS-LAP-015', nombre: 'Laptop Repuesto',   marca: 'Lenovo',modelo: 'IdeaPad 3',   categoria: 'laptop', sector: 'Administracion', ubicacion: 'Direccion',       mesesEnUso: 6,  tendencia: 'normal' },

  // 6 Tablets
  { codigo: 'AUS-TAB-001', nombre: 'Tablet Aula P-1',  marca: 'Samsung', modelo: 'Galaxy Tab A8', categoria: 'tablet', sector: 'Primaria', ubicacion: 'Aula 1 - Primaria', mesesEnUso: 10, tendencia: 'normal' },
  { codigo: 'AUS-TAB-002', nombre: 'Tablet Aula P-2',  marca: 'Samsung', modelo: 'Galaxy Tab A8', categoria: 'tablet', sector: 'Primaria', ubicacion: 'Aula 2 - Primaria', mesesEnUso: 10, tendencia: 'normal' },
  { codigo: 'AUS-TAB-003', nombre: 'Tablet Aula P-3',  marca: 'Lenovo',  modelo: 'Tab M10',       categoria: 'tablet', sector: 'Primaria', ubicacion: 'Aula 3 - Primaria', mesesEnUso: 14, tendencia: 'normal' },
  { codigo: 'AUS-TAB-004', nombre: 'Tablet Aula S-1',  marca: 'Samsung', modelo: 'Galaxy Tab S6', categoria: 'tablet', sector: 'Secundaria', ubicacion: 'Aula 1 - Secundaria', mesesEnUso: 8,  tendencia: 'normal' },
  { codigo: 'AUS-TAB-005', nombre: 'Tablet Aula S-2',  marca: 'Samsung', modelo: 'Galaxy Tab S6', categoria: 'tablet', sector: 'Secundaria', ubicacion: 'Aula 2 - Secundaria', mesesEnUso: 8,  tendencia: 'normal' },
  { codigo: 'AUS-TAB-006', nombre: 'Tablet Biblioteca',marca: 'Apple',   modelo: 'iPad 9th',      categoria: 'tablet', sector: 'Secundaria', ubicacion: 'Biblioteca S',       mesesEnUso: 18, tendencia: 'normal' },

  // 6 Proyectores
  { codigo: 'AUS-PRY-001', nombre: 'Proyector P-1', marca: 'Epson',     modelo: 'PowerLite X49', categoria: 'proyector', sector: 'Primaria',   ubicacion: 'Aula 1 - Primaria',   mesesEnUso: 22, tendencia: 'normal' },
  { codigo: 'AUS-PRY-002', nombre: 'Proyector P-2', marca: 'Epson',     modelo: 'PowerLite X49', categoria: 'proyector', sector: 'Primaria',   ubicacion: 'Aula 3 - Primaria',   mesesEnUso: 22, tendencia: 'normal' },
  { codigo: 'AUS-PRY-003', nombre: 'Proyector P-3', marca: 'BenQ',      modelo: 'MS550',         categoria: 'proyector', sector: 'Primaria',   ubicacion: 'Salon Actos P',       mesesEnUso: 30, tendencia: 'normal' },
  { codigo: 'AUS-PRY-004', nombre: 'Proyector S-1', marca: 'Epson',     modelo: 'PowerLite X49', categoria: 'proyector', sector: 'Secundaria', ubicacion: 'Aula 1 - Secundaria', mesesEnUso: 18, tendencia: 'normal' },
  { codigo: 'AUS-PRY-005', nombre: 'Proyector S-2', marca: 'Epson',     modelo: 'PowerLite X49', categoria: 'proyector', sector: 'Secundaria', ubicacion: 'Aula 3 - Secundaria', mesesEnUso: 18, tendencia: 'normal' },
  { codigo: 'AUS-PRY-006', nombre: 'Proyector SUM', marca: 'BenQ',      modelo: 'MX560',         categoria: 'proyector', sector: 'Secundaria', ubicacion: 'SUM',                 mesesEnUso: 36, tendencia: 'normal' },

  // 6 Splits AC
  { codigo: 'AUS-SPL-001', nombre: 'Split Direccion P',   marca: 'BGH',     modelo: 'BSI32CT', categoria: 'split', sector: 'Primaria',     ubicacion: 'Direccion Primaria',   mesesEnUso: 24, tendencia: 'normal' },
  { codigo: 'AUS-SPL-002', nombre: 'Split Sala Docentes', marca: 'Samsung', modelo: 'AR12TXH', categoria: 'split', sector: 'Sala Docentes',ubicacion: 'Sala Docentes',        mesesEnUso: 36, tendencia: 'temperatura-subiendo' },
  { codigo: 'AUS-SPL-003', nombre: 'Split Aula S-1',     marca: 'BGH',     modelo: 'BSI45CT', categoria: 'split', sector: 'Secundaria',   ubicacion: 'Aula 1 - Secundaria',  mesesEnUso: 20, tendencia: 'normal' },
  { codigo: 'AUS-SPL-004', nombre: 'Split Aula S-2',     marca: 'BGH',     modelo: 'BSI45CT', categoria: 'split', sector: 'Secundaria',   ubicacion: 'Aula 2 - Secundaria',  mesesEnUso: 20, tendencia: 'normal' },
  { codigo: 'AUS-SPL-005', nombre: 'Split Biblioteca S', marca: 'LG',      modelo: 'S4-Q12',  categoria: 'split', sector: 'Secundaria',   ubicacion: 'Biblioteca S',         mesesEnUso: 28, tendencia: 'normal' },
  { codigo: 'AUS-SPL-006', nombre: 'Split Admin',        marca: 'Samsung', modelo: 'AR18TXH', categoria: 'split', sector: 'Administracion',ubicacion: 'Administracion',      mesesEnUso: 16, tendencia: 'normal' },

  // 4 Calefactores
  { codigo: 'AUS-CAL-001', nombre: 'Calefactor Aula P-1',marca: 'Eskabe',modelo: 'TT-9 TB',  categoria: 'calefactor', sector: 'Primaria',   ubicacion: 'Aula 1 - Primaria',   mesesEnUso: 48, tendencia: 'normal' },
  { codigo: 'AUS-CAL-002', nombre: 'Calefactor Aula P-3',marca: 'Eskabe',modelo: 'TT-9 TB',  categoria: 'calefactor', sector: 'Primaria',   ubicacion: 'Aula 3 - Primaria',   mesesEnUso: 48, tendencia: 'normal' },
  { codigo: 'AUS-CAL-003', nombre: 'Calefactor Aula S-1',marca: 'Coppens',modelo: 'CTB-5',   categoria: 'calefactor', sector: 'Secundaria', ubicacion: 'Aula 1 - Secundaria', mesesEnUso: 36, tendencia: 'normal' },
  { codigo: 'AUS-CAL-004', nombre: 'Calefactor Admin',   marca: 'Eskabe',modelo: 'TT-6 TB',  categoria: 'calefactor', sector: 'Administracion', ubicacion: 'Administracion',  mesesEnUso: 30, tendencia: 'normal' },

  // 4 Dispensers
  { codigo: 'AUS-DIS-001', nombre: 'Dispenser Primaria', marca: 'James',  modelo: 'DA-2200', categoria: 'dispenser', sector: 'Primaria',     ubicacion: 'Pasillo Primaria',  mesesEnUso: 30, tendencia: 'fallas-recurrentes' },
  { codigo: 'AUS-DIS-002', nombre: 'Dispenser Secundaria',marca: 'James', modelo: 'DA-2200', categoria: 'dispenser', sector: 'Secundaria',   ubicacion: 'Pasillo Secundaria',mesesEnUso: 14, tendencia: 'normal' },
  { codigo: 'AUS-DIS-003', nombre: 'Dispenser Admin',    marca: 'EcoH2O', modelo: 'Mini',    categoria: 'dispenser', sector: 'Administracion',ubicacion: 'Administracion',   mesesEnUso: 18, tendencia: 'normal' },
  { codigo: 'AUS-DIS-004', nombre: 'Dispenser Docentes', marca: 'James',  modelo: 'DA-2200', categoria: 'dispenser', sector: 'Sala Docentes',ubicacion: 'Sala Docentes',     mesesEnUso: 14, tendencia: 'normal' },

  // 3 Impresoras
  { codigo: 'AUS-IMP-001', nombre: 'Impresora Admin',     marca: 'Brother', modelo: 'MFC-L2750', categoria: 'impresora', sector: 'Administracion',ubicacion: 'Administracion',   mesesEnUso: 20, tendencia: 'normal' },
  { codigo: 'AUS-IMP-002', nombre: 'Impresora Direccion P',marca: 'HP',     modelo: 'LaserJet M428',categoria: 'impresora', sector: 'Primaria',   ubicacion: 'Direccion Primaria',mesesEnUso: 16, tendencia: 'toner-bajo' },
  { codigo: 'AUS-IMP-003', nombre: 'Impresora Direccion S',marca: 'Brother',modelo: 'MFC-L2750',categoria: 'impresora', sector: 'Secundaria', ubicacion: 'Direccion Secundaria',mesesEnUso: 12, tendencia: 'normal' },

  // 2 Microondas
  { codigo: 'AUS-MIC-001', nombre: 'Microondas Cocina',   marca: 'BGH', modelo: 'B228D', categoria: 'microondas', sector: 'Cocina Comedor', ubicacion: 'Cocina Comedor', mesesEnUso: 36, tendencia: 'normal' },
  { codigo: 'AUS-MIC-002', nombre: 'Microondas Docentes', marca: 'Atma',modelo: 'MD1723', categoria: 'microondas', sector: 'Sala Docentes',  ubicacion: 'Sala Docentes',   mesesEnUso: 24, tendencia: 'normal' },

  // 2 Bombas
  { codigo: 'AUS-BMB-001', nombre: 'Bomba Tanque Alto', marca: 'Rowa', modelo: 'Tango 0.5HP',categoria: 'bomba', sector: 'Patio Servicios', ubicacion: 'Sala Bombas - Patio', mesesEnUso: 42, tendencia: 'vibracion-creciente' },
  { codigo: 'AUS-BMB-002', nombre: 'Bomba Cisterna',    marca: 'Pedrollo',modelo: 'PKm 60', categoria: 'bomba', sector: 'Patio Servicios', ubicacion: 'Cisterna - Patio',     mesesEnUso: 30, tendencia: 'normal' },

  // 1 Grupo Electrogeno
  { codigo: 'AUS-GEN-001', nombre: 'Grupo Electrogeno Escolar', marca: 'Honda', modelo: 'EU22i', categoria: 'grupoElec', sector: 'Patio Servicios', ubicacion: 'Caseta Servicios', mesesEnUso: 24, tendencia: 'horas-acumuladas' },

  // 1 Extractor
  { codigo: 'AUS-EXT-001', nombre: 'Extractor Cocina', marca: 'Soler & Palau', modelo: 'TD-800/200', categoria: 'extractor', sector: 'Cocina Comedor', ubicacion: 'Cocina Comedor', mesesEnUso: 30, tendencia: 'normal' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function jitter(base: number, pct: number): number {
  const delta = base * pct * (Math.random() * 2 - 1);
  return Math.round((base + delta) * 100) / 100;
}
function fechaMesesAtras(meses: number, diaOffset = 0): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  d.setDate(15 + diaOffset);
  d.setHours(10, 0, 0, 0);
  return d;
}

// Genera mediciones mensuales para un activo, aplicando la tendencia indicada.
function generarMediciones(
  activoId: string,
  spec: ActivoSpec,
  flags: TipoFlags,
  horasAcumuladasFinal: { value: number },
) {
  const mesesHistorial = Math.min(spec.mesesEnUso, 18);
  const result: any[] = [];
  let horasAcum = 0;

  // Horas mensuales segun categoria (estimacion para acumular contadores).
  const horasPorMes: Record<CategoriaKey, number> = {
    laptop: 80, tablet: 40, proyector: 30, split: 120, calefactor: 90,
    dispenser: 220, impresora: 30, microondas: 8, bomba: 60, grupoElec: 20, extractor: 100,
  };

  for (let m = mesesHistorial; m >= 0; m--) {
    const fecha = fechaMesesAtras(m);
    horasAcum += horasPorMes[spec.categoria];
    // ratio 0 (fecha mas vieja) → 1 (hoy), para aplicar tendencias progresivas
    const ratio = mesesHistorial === 0 ? 1 : (mesesHistorial - m) / mesesHistorial;

    const med: any = {
      activoId,
      fecha,
      horasMarcha: horasAcum,
      origen: 'manual',
      observaciones: m === 0 ? 'Inspeccion rutinaria mensual.' : null,
      estado: 'normal',
    };

    if (flags.mideTemperatura) {
      let tempBase = ({ laptop: 38, tablet: 36, proyector: 60, split: 10, calefactor: 80, dispenser: 5, grupoElec: 70 } as Record<string, number>)[spec.categoria] ?? 40;
      if (spec.tendencia === 'temperatura-subiendo') tempBase += ratio * 6;
      med.temperatura = jitter(tempBase, 0.05);
    }
    if (flags.mideAmperaje) {
      const ampBase = ({ split: 6.5, bomba: 7.5, grupoElec: 15, extractor: 9 } as Record<string, number>)[spec.categoria] ?? 5;
      med.amperaje = jitter(ampBase, 0.08);
    }
    if (flags.mideVoltaje) {
      med.voltaje = jitter(220, 0.03);
    }
    if (flags.midePresion) {
      const pBase = ({ split: 4.5, calefactor: 1.0, grupoElec: 3.0 } as Record<string, number>)[spec.categoria] ?? 1;
      med.presion = jitter(pBase, 0.08);
    }
    if (flags.mideVibracion) {
      if (spec.tendencia === 'vibracion-creciente') {
        med.vibracion = ratio < 0.4 ? 'ninguna' : ratio < 0.75 ? 'leve' : 'moderada';
      } else {
        med.vibracion = Math.random() < 0.92 ? 'ninguna' : 'leve';
      }
    }
    if (flags.mideBateria) {
      let bateria = 100 - ratio * 12; // degradacion normal
      if (spec.tendencia === 'bateria-degradando') bateria = 100 - ratio * 35;
      med.porcentajeBateria = Math.max(20, Math.round(bateria - Math.random() * 5));
    }
    if (flags.mideToner) {
      let toner = 100 - ratio * 60;
      if (spec.tendencia === 'toner-bajo') toner = 100 - ratio * 88;
      med.nivelToner = Math.max(5, Math.round(toner));
    }
    if (flags.mideContador) {
      med.contador = horasAcum;
    }
    result.push(med);
  }

  horasAcumuladasFinal.value = horasAcum;
  return result;
}

// Genera tareas de mantenimiento: preventivas cada 6 meses + correctivas
// segun la tendencia del activo.
function generarTareas(activoId: string, spec: ActivoSpec, numeroBase: { value: number }, responsables: { mantenimiento: string; ti: string; servicios: string }) {
  const tareas: any[] = [];
  const mesesHistorial = Math.min(spec.mesesEnUso, 18);

  // Resolver responsable segun categoria del activo
  const responsablePorCategoria = (cat: CategoriaKey): string => {
    if (cat === 'laptop' || cat === 'tablet' || cat === 'proyector' || cat === 'impresora') return responsables.ti;
    if (cat === 'dispenser' || cat === 'microondas') return responsables.servicios;
    return responsables.mantenimiento;
  };
  const respId = responsablePorCategoria(spec.categoria);

  // Preventivas regulares
  for (let m = mesesHistorial; m >= 6; m -= 6) {
    numeroBase.value += 1;
    tareas.push({
      activoId,
      responsableId: respId,
      numero: numeroBase.value,
      tipo: 'preventivo',
      prioridad: 'media',
      fechaProgramada: fechaMesesAtras(m, -2),
      fechaRealizada: fechaMesesAtras(m, 0),
      estado: 'completado',
      observaciones: 'Mantenimiento preventivo programado. Limpieza general, revision visual, prueba funcional.',
      materiales: spec.categoria === 'split' ? 'Filtros de aire, limpiador desinfectante' :
                  spec.categoria === 'calefactor' ? 'Junta de gas, limpieza de quemador' :
                  spec.categoria === 'impresora' ? 'Kit limpieza rodillos' :
                  spec.categoria === 'bomba' ? 'Grasa para rodamientos' : 'Insumos varios',
      horasTrabajo: spec.categoria === 'grupoElec' ? 3 : spec.categoria === 'split' ? 1.5 : 1,
      cerradaPor: 'Tecnico externo',
    });
  }

  // Correctivas segun tendencia
  if (spec.tendencia === 'fallas-recurrentes') {
    [14, 8, 3].forEach((m) => {
      numeroBase.value += 1;
      tareas.push({
        activoId,
        responsableId: respId,
        numero: numeroBase.value,
        tipo: 'correctivo',
        prioridad: 'alta',
        fechaProgramada: fechaMesesAtras(m, -1),
        fechaRealizada: fechaMesesAtras(m, 0),
        estado: 'completado',
        observaciones: 'No enfria el agua. Recambio de termostato y revision de gas refrigerante.',
        materiales: 'Termostato dispenser, gas refrigerante R134a',
        horasTrabajo: 2,
        cerradaPor: 'Tecnico externo',
      });
    });
  }
  if (spec.tendencia === 'temperatura-subiendo') {
    numeroBase.value += 1;
    tareas.push({
      activoId,
        responsableId: respId,
      numero: numeroBase.value,
      tipo: 'correctivo',
      prioridad: 'alta',
      fechaProgramada: fechaMesesAtras(2),
      fechaRealizada: null,
      estado: 'pendiente',
      observaciones: 'Temperatura de descarga subiendo gradualmente desde hace 6 meses. Revisar carga de gas y limpieza de serpentina condensadora.',
    });
  }
  if (spec.tendencia === 'horas-acumuladas') {
    numeroBase.value += 1;
    tareas.push({
      activoId,
        responsableId: respId,
      numero: numeroBase.value,
      tipo: 'preventivo',
      prioridad: 'alta',
      fechaProgramada: fechaMesesAtras(0, 5),
      fechaRealizada: null,
      estado: 'pendiente',
      observaciones: 'Mantenimiento por horas acumuladas: cambio de aceite, filtro de aire y filtro de combustible.',
    });
  }
  if (spec.tendencia === 'vibracion-creciente') {
    numeroBase.value += 1;
    tareas.push({
      activoId,
        responsableId: respId,
      numero: numeroBase.value,
      tipo: 'predictivo',
      prioridad: 'alta',
      fechaProgramada: fechaMesesAtras(1),
      fechaRealizada: null,
      estado: 'pendiente',
      observaciones: 'Vibracion creciente detectada en las ultimas inspecciones. Recambio preventivo de rodamientos antes de que falle.',
    });
  }
  if (spec.tendencia === 'toner-bajo') {
    numeroBase.value += 1;
    tareas.push({
      activoId,
        responsableId: respId,
      numero: numeroBase.value,
      tipo: 'predictivo',
      prioridad: 'media',
      fechaProgramada: fechaMesesAtras(0, 7),
      fechaRealizada: null,
      estado: 'pendiente',
      observaciones: 'Toner por debajo del umbral de alerta. Tener repuesto disponible.',
    });
  }

  return tareas;
}

// ── Seed principal ──────────────────────────────────────────────────────────
export async function seedAustral(empresaId: string): Promise<{
  empresaId: string;
  sectoresCreados: number;
  tiposCreados: number;
  activosCreados: number;
  activosExistentes: number;
  medicionesCreadas: number;
  tareasCreadas: number;
  personalCreado: number;
  personalExistente: number;
  passwordsIniciales: { email: string; password: string | null }[];
}> {
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) throw Object.assign(new Error('Empresa no encontrada'), { status: 404 });

  // 0. Personal: crear 3 operadores que aparezcan en el dropdown de
  //    Responsable. Si ya existen, NO se recrean ni se cambia su password.
  const personalIds: Record<string, string> = {};
  const passwordsIniciales: { email: string; password: string | null }[] = [];
  let personalCreado = 0;
  let personalExistente = 0;
  for (const p of PERSONAL) {
    // El dominio .invalid nunca recibe correo. El id de empresa evita que un
    // seed ejecutado en otro tenant reutilice accidentalmente el mismo usuario.
    const email = `${p.key}.${empresaId}@personal.activaqr.invalid`;
    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      personalIds[p.key] = existente.id;
      personalExistente++;
      passwordsIniciales.push({ email, password: null });
    } else {
      const passwordInicial = randomBytes(18).toString('base64url');
      const hash = await bcrypt.hash(passwordInicial, 10);
      const nuevo = await prisma.usuario.create({
        data: {
          empresaId,
          email,
          passwordHash: hash,
          nombre: p.nombre,
          rol: 'operador',
          cargo: p.cargo,
          activo: true,
        },
      });
      personalIds[p.key] = nuevo.id;
      personalCreado++;
      passwordsIniciales.push({ email, password: passwordInicial });
    }
  }
  const responsables = {
    mantenimiento: personalIds.mantenimiento,
    ti: personalIds.ti,
    servicios: personalIds.servicios,
  };

  // 1. Upsert sectores
  const sectoresMap = new Map<string, string>();
  let sectoresCreados = 0;
  for (const nombre of SECTORES) {
    const existente = await prisma.sector.findFirst({ where: { empresaId, nombre } });
    if (existente) {
      sectoresMap.set(nombre, existente.id);
    } else {
      const nuevo = await prisma.sector.create({ data: { empresaId, nombre, activo: true } });
      sectoresMap.set(nombre, nuevo.id);
      sectoresCreados++;
    }
  }

  // 2. Upsert tipos
  const tiposMap = new Map<CategoriaKey, string>();
  let tiposCreados = 0;
  for (const key of Object.keys(TIPOS) as CategoriaKey[]) {
    const spec = TIPOS[key];
    const existente = await prisma.tipoActivo.findFirst({ where: { empresaId, nombre: spec.nombre } });
    if (existente) {
      // Actualizo los flags por si el tipo ya estaba pero con flags pobres.
      await prisma.tipoActivo.update({
        where: { id: existente.id },
        data: {
          icono: spec.icono,
          mideTemperatura: !!spec.flags.mideTemperatura,
          mideAmperaje: !!spec.flags.mideAmperaje,
          midePresion: !!spec.flags.midePresion,
          mideVibracion: !!spec.flags.mideVibracion,
          mideBateria: !!spec.flags.mideBateria,
          mideToner: !!spec.flags.mideToner,
          mideContador: !!spec.flags.mideContador,
          mideVoltaje: !!spec.flags.mideVoltaje,
        },
      });
      tiposMap.set(key, existente.id);
    } else {
      const nuevo = await prisma.tipoActivo.create({
        data: {
          empresaId,
          nombre: spec.nombre,
          icono: spec.icono,
          mideTemperatura: !!spec.flags.mideTemperatura,
          mideAmperaje: !!spec.flags.mideAmperaje,
          midePresion: !!spec.flags.midePresion,
          mideVibracion: !!spec.flags.mideVibracion,
          mideBateria: !!spec.flags.mideBateria,
          mideToner: !!spec.flags.mideToner,
          mideContador: !!spec.flags.mideContador,
          mideVoltaje: !!spec.flags.mideVoltaje,
          activo: true,
        },
      });
      tiposMap.set(key, nuevo.id);
      tiposCreados++;
    }
  }

  // 3. Activos + mediciones + tareas
  let activosCreados = 0;
  let activosExistentes = 0;
  let medicionesCreadas = 0;
  let tareasCreadas = 0;
  const numeroBase = { value: await prisma.tareaMantenimiento.count({ where: { activo: { empresaId } } }) };

  for (const spec of ACTIVOS) {
    const tipoId = tiposMap.get(spec.categoria);
    const sectorId = sectoresMap.get(spec.sector);
    if (!tipoId || !sectorId) continue;

    const yaExiste = await prisma.activo.findFirst({ where: { empresaId, codigo: spec.codigo } });

    let activoId: string;
    if (yaExiste) {
      activoId = yaExiste.id;
      activosExistentes++;
      // Limpiar historial seed para regenerar (mediciones y tareas)
      await prisma.medicion.deleteMany({ where: { activoId } });
      await prisma.tareaMantenimiento.deleteMany({ where: { activoId } });
    } else {
      const flags = TIPOS[spec.categoria].flags;
      const fechaIngreso = fechaMesesAtras(spec.mesesEnUso);
      const respActivo =
        spec.categoria === 'laptop' || spec.categoria === 'tablet' || spec.categoria === 'proyector' || spec.categoria === 'impresora'
          ? responsables.ti
          : spec.categoria === 'dispenser' || spec.categoria === 'microondas'
            ? responsables.servicios
            : responsables.mantenimiento;
      const nuevo = await prisma.activo.create({
        data: {
          empresaId,
          codigo: spec.codigo,
          nombre: spec.nombre,
          marca: spec.marca,
          modelo: spec.modelo,
          sectorId,
          tipoId,
          responsableId: respActivo,
          ubicacion: spec.ubicacion,
          fechaIngreso,
          horasActuales: 0,
          estado: 'normal',
          estadoOperativo: 'operativo',
          // Rangos default segun flags
          ...(flags.mideTemperatura ? { temperaturaMin: 5, temperaturaMax: 70, temperaturaAlerta: 75, temperaturaCritica: 85 } : {}),
          ...(flags.mideAmperaje ? { amperajeNormal: 8, amperajeAlerta: 12, amperajeCritico: 15 } : {}),
          ...(flags.mideVoltaje ? { voltajeMin: 210, voltajeMax: 230, voltajeAlerta: 240 } : {}),
          ...(flags.midePresion ? { presionNormal: 4, presionAlerta: 6, presionCritica: 7 } : {}),
          ...(flags.mideBateria ? { bateriaAlerta: 30, bateriaCritica: 15 } : {}),
          ...(flags.mideToner ? { tonerAlerta: 20, tonerCritico: 10 } : {}),
          intervaloMedicionHoras: 720,
          proximoMantenimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      activoId = nuevo.id;
      activosCreados++;
    }

    // Mediciones
    const horasFinal = { value: 0 };
    const meds = generarMediciones(activoId, spec, TIPOS[spec.categoria].flags, horasFinal);
    if (meds.length) {
      await prisma.medicion.createMany({ data: meds });
      medicionesCreadas += meds.length;
    }
    // Actualizar horasActuales del activo con el ultimo valor acumulado
    if (horasFinal.value > 0) {
      await prisma.activo.update({ where: { id: activoId }, data: { horasActuales: horasFinal.value } });
    }

    // Tareas
    const tareas = generarTareas(activoId, spec, numeroBase, responsables);
    if (tareas.length) {
      await prisma.tareaMantenimiento.createMany({ data: tareas });
      tareasCreadas += tareas.length;
    }
  }

  return {
    empresaId,
    sectoresCreados,
    tiposCreados,
    activosCreados,
    activosExistentes,
    medicionesCreadas,
    tareasCreadas,
    personalCreado,
    personalExistente,
    passwordsIniciales,
  };
}
