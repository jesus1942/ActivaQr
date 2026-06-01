import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helpers de fechas relativas a hoy.
const today = new Date();
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d;
};
const subDays = (n: number) => addDays(-n);
const date = (s: string) => new Date(s + 'T00:00:00Z');

async function main() {
  // Si ya hay datos, no re-sembrar (evita borrar datos reales en cada deploy).
  const yaHayDatos = await prisma.empresa.count();
  if (yaHayDatos > 0) {
    console.log('La base ya tiene datos, se omite el seed.');
    return;
  }

  console.log('Limpiando datos previos...');
  // Orden inverso de dependencias.
  await prisma.foto.deleteMany();
  await prisma.medicion.deleteMany();
  await prisma.tareaMantenimiento.deleteMany();
  await prisma.activo.deleteMany();
  await prisma.tecnico.deleteMany();
  await prisma.tipoActivo.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.sede.deleteMany();
  await prisma.empresa.deleteMany();

  console.log('Creando empresa...');
  const empresa = await prisma.empresa.create({
    data: {
      nombre: 'Industrias Patagónicas S.A.',
      cuit: '30-71234567-9',
      plan: 'industrial',
    },
  });

  console.log('Creando sedes...');
  const sedeMadryn = await prisma.sede.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Puerto Madryn',
      direccion: 'Parque Industrial Pesado, Lote 12',
      ciudad: 'Puerto Madryn',
    },
  });
  const sedeRawson = await prisma.sede.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Rawson',
      direccion: 'Av. Almirante Brown 2300',
      ciudad: 'Rawson',
    },
  });

  console.log('Creando sectores...');
  const sectoresData = [
    { nombre: 'Planta', color: '#2563eb' },
    { nombre: 'Taller', color: '#f59e0b' },
    { nombre: 'Pescadería', color: '#0891b2' },
    { nombre: 'Frigorífico', color: '#0ea5e9' },
    { nombre: 'Electricidad', color: '#eab308' },
    { nombre: 'Generación', color: '#dc2626' },
  ];
  const sectores: Record<string, string> = {};
  for (const s of sectoresData) {
    const created = await prisma.sector.create({
      data: { empresaId: empresa.id, nombre: s.nombre, color: s.color },
    });
    sectores[s.nombre] = created.id;
  }

  console.log('Creando tipos de activo...');
  // mide: [temperatura, amperaje, presion, vibracion]
  const tiposData = [
    { nombre: 'Motor', icono: 'cpu', temp: true, amp: true, pres: false, vib: true },
    { nombre: 'Compresor', icono: 'wind', temp: true, amp: true, pres: true, vib: true },
    { nombre: 'Bomba', icono: 'droplet', temp: true, amp: true, pres: true, vib: true },
    { nombre: 'Cámara de frío', icono: 'snowflake', temp: true, amp: true, pres: true, vib: false },
    { nombre: 'Tablero', icono: 'zap', temp: true, amp: true, pres: false, vib: false },
    { nombre: 'Rodamiento', icono: 'circle-dot', temp: true, amp: false, pres: false, vib: true },
    { nombre: 'Generador', icono: 'battery-charging', temp: true, amp: true, pres: true, vib: true },
  ];
  const tipos: Record<string, string> = {};
  for (const t of tiposData) {
    const created = await prisma.tipoActivo.create({
      data: {
        empresaId: empresa.id,
        nombre: t.nombre,
        icono: t.icono,
        mideTemperatura: t.temp,
        mideAmperaje: t.amp,
        midePresion: t.pres,
        mideVibracion: t.vib,
      },
    });
    tipos[t.nombre] = created.id;
  }

  console.log('Creando técnicos...');
  const juan = await prisma.tecnico.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Juan Rodríguez',
      rol: 'admin',
      email: 'juan.rodriguez@indpatagonicas.com',
      telefono: '+54 280 4123456',
    },
  });
  const carlos = await prisma.tecnico.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Carlos Vera',
      rol: 'supervisor',
      email: 'carlos.vera@indpatagonicas.com',
      telefono: '+54 280 4123457',
    },
  });
  const maria = await prisma.tecnico.create({
    data: {
      empresaId: empresa.id,
      nombre: 'María González',
      rol: 'tecnico',
      email: 'maria.gonzalez@indpatagonicas.com',
      telefono: '+54 280 4123458',
    },
  });

  console.log('Creando activos...');
  // Definición de los 8 activos, mapeando responsables del frontend a los 3 técnicos.
  const activosData = [
    {
      key: 'act-001',
      codigo: 'HOR-MOT-001',
      nombre: 'Motor Hormigonera Principal',
      tipo: 'Motor',
      sector: 'Planta',
      sede: sedeMadryn.id,
      responsable: juan.id,
      marca: 'WEG',
      modelo: 'W22 15CV',
      fechaIngreso: date('2023-03-15'),
      ubicacion: 'Planta Principal - Sector A',
      horasActuales: 1240,
      estado: 'alerta' as const,
      temperaturaMin: 40, temperaturaMax: 75, temperaturaAlerta: 80, temperaturaCritica: 90,
      amperajeNormal: 22, presionNormal: null,
      intervaloMedicionHoras: 120, intervaloLubricacionHoras: 250, intervaloRodamientoHoras: 500,
      proximoMantenimiento: addDays(3),
      notas: 'Motor trifásico. Revisar rodamiento lado polea.',
    },
    {
      key: 'act-002',
      codigo: 'TAL-COM-001',
      nombre: 'Compresor Aire Taller',
      tipo: 'Compresor',
      sector: 'Taller',
      sede: sedeMadryn.id,
      responsable: carlos.id,
      marca: 'Schulz',
      modelo: 'CSL 20BR/200',
      fechaIngreso: date('2022-08-10'),
      ubicacion: 'Taller Mecánico',
      horasActuales: 2180,
      estado: 'normal' as const,
      temperaturaMin: 20, temperaturaMax: 70, temperaturaAlerta: 75, temperaturaCritica: 85,
      amperajeNormal: 18, presionNormal: 8,
      intervaloMedicionHoras: 150, intervaloLubricacionHoras: 300, intervaloRodamientoHoras: 600,
      proximoMantenimiento: addDays(15),
      notas: 'Presión de trabajo 8 bar',
    },
    {
      key: 'act-003',
      codigo: 'PES-BOM-001',
      nombre: 'Bomba Centrífuga Nº1',
      tipo: 'Bomba',
      sector: 'Pescadería',
      sede: sedeMadryn.id,
      responsable: maria.id,
      marca: 'Grundfos',
      modelo: 'CM10-3',
      fechaIngreso: date('2024-01-20'),
      ubicacion: 'Sala de Bombas - Pescadería',
      horasActuales: 890,
      estado: 'normal' as const,
      temperaturaMin: 15, temperaturaMax: 55, temperaturaAlerta: 60, temperaturaCritica: 70,
      amperajeNormal: 12, presionNormal: 4,
      intervaloMedicionHoras: 100, intervaloLubricacionHoras: 200, intervaloRodamientoHoras: 400,
      proximoMantenimiento: addDays(22),
      notas: 'Bomba de agua de mar',
    },
    {
      key: 'act-004',
      codigo: 'FRI-CAM-001',
      nombre: 'Cámara Frigorífica Nº1',
      tipo: 'Cámara de frío',
      sector: 'Frigorífico',
      sede: sedeRawson.id,
      responsable: carlos.id,
      marca: 'Bohn',
      modelo: 'LET-042',
      fechaIngreso: date('2021-06-05'),
      ubicacion: 'Sector Frío - Cámara 1',
      horasActuales: 8760,
      estado: 'critico' as const,
      temperaturaMin: -25, temperaturaMax: -18, temperaturaAlerta: -15, temperaturaCritica: -10,
      amperajeNormal: 35, presionNormal: 6,
      intervaloMedicionHoras: 72, intervaloLubricacionHoras: 500, intervaloRodamientoHoras: 1000,
      proximoMantenimiento: today,
      notas: 'URGENTE: temperatura fuera de rango',
    },
    {
      key: 'act-005',
      codigo: 'PLT-CIN-001',
      nombre: 'Motor Cinta Transportadora',
      tipo: 'Motor',
      sector: 'Planta',
      sede: sedeMadryn.id,
      responsable: juan.id,
      marca: 'Siemens',
      modelo: '1LA7 11kW',
      fechaIngreso: date('2023-09-12'),
      ubicacion: 'Planta - Línea de Producción',
      horasActuales: 650,
      estado: 'normal' as const,
      temperaturaMin: 30, temperaturaMax: 70, temperaturaAlerta: 75, temperaturaCritica: 85,
      amperajeNormal: 20, presionNormal: null,
      intervaloMedicionHoras: 120, intervaloLubricacionHoras: 250, intervaloRodamientoHoras: 500,
      proximoMantenimiento: addDays(30),
      notas: null,
    },
    {
      key: 'act-006',
      codigo: 'ELE-TAB-001',
      nombre: 'Tablero Eléctrico Principal',
      tipo: 'Tablero',
      sector: 'Electricidad',
      sede: sedeMadryn.id,
      responsable: juan.id,
      marca: 'Schneider',
      modelo: 'PrismaPlus G',
      fechaIngreso: date('2020-11-30'),
      ubicacion: 'Sala Eléctrica Principal',
      horasActuales: 0,
      estado: 'normal' as const,
      temperaturaMin: 15, temperaturaMax: 45, temperaturaAlerta: 50, temperaturaCritica: 60,
      amperajeNormal: 150, presionNormal: null,
      intervaloMedicionHoras: 200, intervaloLubricacionHoras: null, intervaloRodamientoHoras: null,
      proximoMantenimiento: addDays(45),
      notas: 'Termografía cada 6 meses',
    },
    {
      key: 'act-007',
      codigo: 'GEN-GRP-001',
      nombre: 'Grupo Electrógeno 150kVA',
      tipo: 'Generador',
      sector: 'Generación',
      sede: sedeRawson.id,
      responsable: carlos.id,
      marca: 'Cummins',
      modelo: 'C150D5',
      fechaIngreso: date('2022-03-18'),
      ubicacion: 'Sala de Máquinas',
      horasActuales: 320,
      estado: 'mantenimiento' as const,
      temperaturaMin: 60, temperaturaMax: 95, temperaturaAlerta: 100, temperaturaCritica: 110,
      amperajeNormal: 220, presionNormal: 5,
      intervaloMedicionHoras: 250, intervaloLubricacionHoras: 250, intervaloRodamientoHoras: 1000,
      proximoMantenimiento: subDays(2),
      notas: 'Cambio de aceite pendiente',
    },
    {
      key: 'act-008',
      codigo: 'GRU-ROD-001',
      nombre: 'Rodamiento Puente Grúa',
      tipo: 'Rodamiento',
      sector: 'Planta',
      sede: sedeMadryn.id,
      responsable: carlos.id,
      marca: 'SKF',
      modelo: '6312-2RS',
      fechaIngreso: date('2023-01-08'),
      ubicacion: 'Nave Industrial - Puente Grúa',
      horasActuales: 1100,
      estado: 'alerta' as const,
      temperaturaMin: 20, temperaturaMax: 60, temperaturaAlerta: 65, temperaturaCritica: 75,
      amperajeNormal: null, presionNormal: null,
      intervaloMedicionHoras: 80, intervaloLubricacionHoras: 160, intervaloRodamientoHoras: 500,
      proximoMantenimiento: addDays(5),
      notas: 'Vibración leve detectada en última inspección',
    },
  ];

  const activos: Record<string, string> = {};
  for (const a of activosData) {
    const created = await prisma.activo.create({
      data: {
        empresaId: empresa.id,
        sedeId: a.sede,
        sectorId: sectores[a.sector],
        tipoId: tipos[a.tipo],
        responsableId: a.responsable,
        codigo: a.codigo,
        nombre: a.nombre,
        marca: a.marca,
        modelo: a.modelo,
        fechaIngreso: a.fechaIngreso,
        ubicacion: a.ubicacion,
        horasActuales: a.horasActuales,
        estado: a.estado,
        temperaturaMin: a.temperaturaMin,
        temperaturaMax: a.temperaturaMax,
        temperaturaAlerta: a.temperaturaAlerta,
        temperaturaCritica: a.temperaturaCritica,
        amperajeNormal: a.amperajeNormal,
        presionNormal: a.presionNormal,
        intervaloMedicionHoras: a.intervaloMedicionHoras,
        intervaloLubricacionHoras: a.intervaloLubricacionHoras,
        intervaloRodamientoHoras: a.intervaloRodamientoHoras,
        proximoMantenimiento: a.proximoMantenimiento,
        notas: a.notas,
      },
    });
    activos[a.key] = created.id;
  }

  console.log('Creando mediciones...');
  type Vib = 'ninguna' | 'leve' | 'moderada' | 'alta';
  type EstM = 'normal' | 'revision' | 'urgente';
  const medicionesData: {
    activo: string;
    diasAtras: number;
    temperatura: number;
    amperaje: number | null;
    presion: number | null;
    vibracion: Vib;
    horasMarcha: number;
    estado: EstM;
    observaciones: string;
    tecnico: string;
  }[] = [
    // act-001 - Motor Hormigonera (tendencia de temperatura en ascenso)
    { activo: 'act-001', diasAtras: 55, temperatura: 65, amperaje: 21, presion: null, vibracion: 'ninguna', horasMarcha: 1100, estado: 'normal', observaciones: 'Funcionamiento normal', tecnico: juan.id },
    { activo: 'act-001', diasAtras: 40, temperatura: 68, amperaje: 22, presion: null, vibracion: 'ninguna', horasMarcha: 1160, estado: 'normal', observaciones: '', tecnico: juan.id },
    { activo: 'act-001', diasAtras: 25, temperatura: 71, amperaje: 23, presion: null, vibracion: 'leve', horasMarcha: 1200, estado: 'revision', observaciones: 'Temperatura levemente elevada, vibración leve detectada', tecnico: juan.id },
    { activo: 'act-001', diasAtras: 10, temperatura: 76, amperaje: 24, presion: null, vibracion: 'leve', horasMarcha: 1230, estado: 'revision', observaciones: 'Temperatura en ascenso, programar revisión', tecnico: juan.id },
    { activo: 'act-001', diasAtras: 2, temperatura: 84, amperaje: 25, presion: null, vibracion: 'moderada', horasMarcha: 1240, estado: 'urgente', observaciones: 'ALERTA: temperatura por encima del límite de alerta', tecnico: juan.id },
    // act-002 - Compresor Taller
    { activo: 'act-002', diasAtras: 50, temperatura: 52, amperaje: 17, presion: 8, vibracion: 'ninguna', horasMarcha: 2050, estado: 'normal', observaciones: '', tecnico: carlos.id },
    { activo: 'act-002', diasAtras: 30, temperatura: 55, amperaje: 18, presion: 8.2, vibracion: 'ninguna', horasMarcha: 2120, estado: 'normal', observaciones: 'Funcionamiento correcto', tecnico: carlos.id },
    { activo: 'act-002', diasAtras: 7, temperatura: 58, amperaje: 18, presion: 7.9, vibracion: 'ninguna', horasMarcha: 2180, estado: 'normal', observaciones: '', tecnico: carlos.id },
    // act-003 - Bomba Pescadería
    { activo: 'act-003', diasAtras: 45, temperatura: 38, amperaje: 11.5, presion: 4.1, vibracion: 'ninguna', horasMarcha: 820, estado: 'normal', observaciones: '', tecnico: maria.id },
    { activo: 'act-003', diasAtras: 20, temperatura: 40, amperaje: 12, presion: 3.9, vibracion: 'ninguna', horasMarcha: 860, estado: 'normal', observaciones: 'Sin novedades', tecnico: maria.id },
    { activo: 'act-003', diasAtras: 5, temperatura: 42, amperaje: 12, presion: 4, vibracion: 'ninguna', horasMarcha: 890, estado: 'normal', observaciones: '', tecnico: maria.id },
    // act-004 - Cámara Frigorífica (empeorando)
    { activo: 'act-004', diasAtras: 60, temperatura: -22, amperaje: 34, presion: 6, vibracion: 'ninguna', horasMarcha: 8600, estado: 'normal', observaciones: '', tecnico: carlos.id },
    { activo: 'act-004', diasAtras: 30, temperatura: -20, amperaje: 35, presion: 5.8, vibracion: 'ninguna', horasMarcha: 8700, estado: 'normal', observaciones: 'Temperatura dentro del rango', tecnico: carlos.id },
    { activo: 'act-004', diasAtras: 10, temperatura: -17, amperaje: 37, presion: 5.5, vibracion: 'leve', horasMarcha: 8730, estado: 'revision', observaciones: 'Temperatura por encima del rango normal, investigar', tecnico: carlos.id },
    { activo: 'act-004', diasAtras: 1, temperatura: -12, amperaje: 40, presion: 5.2, vibracion: 'moderada', horasMarcha: 8760, estado: 'urgente', observaciones: 'CRÍTICO: temperatura muy por encima del límite de alerta', tecnico: carlos.id },
    // act-007 - Generador
    { activo: 'act-007', diasAtras: 40, temperatura: 82, amperaje: 215, presion: 4.8, vibracion: 'ninguna', horasMarcha: 290, estado: 'normal', observaciones: '', tecnico: carlos.id },
    { activo: 'act-007', diasAtras: 12, temperatura: 88, amperaje: 220, presion: 5, vibracion: 'leve', horasMarcha: 310, estado: 'revision', observaciones: 'Necesita cambio de aceite', tecnico: carlos.id },
    // act-008 - Rodamiento Puente Grúa
    { activo: 'act-008', diasAtras: 50, temperatura: 45, amperaje: null, presion: null, vibracion: 'ninguna', horasMarcha: 1020, estado: 'normal', observaciones: '', tecnico: carlos.id },
    { activo: 'act-008', diasAtras: 22, temperatura: 52, amperaje: null, presion: null, vibracion: 'leve', horasMarcha: 1070, estado: 'revision', observaciones: 'Vibración leve detectada, monitorear', tecnico: carlos.id },
    { activo: 'act-008', diasAtras: 6, temperatura: 58, amperaje: null, presion: null, vibracion: 'leve', horasMarcha: 1100, estado: 'revision', observaciones: 'Temperatura en ascenso, vibración persiste', tecnico: carlos.id },
  ];

  for (const m of medicionesData) {
    await prisma.medicion.create({
      data: {
        activoId: activos[m.activo],
        tecnicoId: m.tecnico,
        fecha: subDays(m.diasAtras),
        temperatura: m.temperatura,
        amperaje: m.amperaje,
        presion: m.presion,
        vibracion: m.vibracion,
        horasMarcha: m.horasMarcha,
        estado: m.estado,
        observaciones: m.observaciones || null,
        origen: 'manual',
      },
    });
  }

  console.log('Creando tareas de mantenimiento...');
  const tareasData = [
    { activo: 'act-007', tipo: 'Cambio de Aceite', programada: subDays(2), realizada: null, estado: 'vencido' as const, responsable: carlos.id, obs: 'Cambio de aceite motor diesel vencido' },
    { activo: 'act-004', tipo: 'Revisión Sistema de Refrigeración', programada: today, realizada: null, estado: 'vencido' as const, responsable: carlos.id, obs: 'Revisar gas refrigerante y termostato' },
    { activo: 'act-001', tipo: 'Lubricación de Rodamientos', programada: addDays(3), realizada: null, estado: 'pendiente' as const, responsable: juan.id, obs: 'Lubricación lado polea y lado acoplamiento' },
    { activo: 'act-008', tipo: 'Inspección de Rodamiento', programada: addDays(5), realizada: null, estado: 'pendiente' as const, responsable: carlos.id, obs: 'Inspección y posible reemplazo de rodamiento' },
    { activo: 'act-002', tipo: 'Service Compresor', programada: addDays(15), realizada: null, estado: 'pendiente' as const, responsable: carlos.id, obs: 'Service 3000hs: filtros, aceite, correas' },
  ];

  for (const t of tareasData) {
    await prisma.tareaMantenimiento.create({
      data: {
        activoId: activos[t.activo],
        responsableId: t.responsable,
        tipo: t.tipo,
        fechaProgramada: t.programada,
        fechaRealizada: t.realizada,
        estado: t.estado,
        observaciones: t.obs,
      },
    });
  }

  console.log('Seed completado.');
  console.log(`Empresa demo: ${empresa.nombre} (id: ${empresa.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
