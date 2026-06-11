// Plantillas de mantenimiento sugeridas por tipo de activo. Cada
// plantilla matchea por palabras clave en el nombre del tipo (case
// insensitive). Al crear un activo, si su tipo matchea, se le ofrece
// al usuario programar las tareas con un click — fechas calculadas
// como hoy + cadaDias.
//
// Pensado para reemplazar el "esto qué tengo que hacer" del operador
// promedio sin que tenga que armar el plan desde cero. El usuario
// puede tildar las que sirvan, cambiar las que necesite, o ignorar.
//
// Ojo: estas plantillas asumen activo INSTALADO Y EN USO. Para stock
// o reventa el usuario simplemente cierra el modal sin aplicar.

export interface TareaSugerida {
  tipo: string;             // ej "Cloración"
  cadaDias: number;         // periodicidad en dias
  observaciones: string;    // que mirar al hacer la tarea
  prioridad?: 'baja' | 'media' | 'alta';
}

export interface PlantillaMantenimiento {
  // Palabras clave que disparan el match (lowercase, sin acentos).
  keywords: string[];
  // Etiqueta humana que se muestra en el modal.
  titulo: string;
  descripcion: string;
  tareas: TareaSugerida[];
}

export const PLANTILLAS: PlantillaMantenimiento[] = [
  {
    keywords: ['piscina', 'pileta', 'natator'],
    titulo: 'Piscina instalada',
    descripcion: 'Plan basico para una piscina en uso. Si es de stock para venta, ignora estas sugerencias.',
    tareas: [
      { tipo: 'Cloracion y pH',           cadaDias: 7,   observaciones: 'Medir cloro libre, ajustar dosificador, registrar pH y alcalinidad.', prioridad: 'alta' },
      { tipo: 'Limpieza del vaso',         cadaDias: 14,  observaciones: 'Cepillar paredes y fondo, pasar barrefondo o limpiafondos automatico.' },
      { tipo: 'Retrolavado del filtro',    cadaDias: 30,  observaciones: 'Revisar carga del filtro, retrolavar arena o limpiar cartuchos.' },
      { tipo: 'Revision de equipos',       cadaDias: 90,  observaciones: 'Chequear bomba, sellos, valvulas y tablero electrico.' },
      { tipo: 'Vaciado y limpieza anual',  cadaDias: 365, observaciones: 'Vaciar, cepillar, revisar fisuras, repintar si corresponde.' },
    ],
  },
  {
    keywords: ['heladera', 'refrigerador', 'frigorific', 'freezer', 'camara fria'],
    titulo: 'Heladera / cámara fría',
    descripcion: 'Plan tipo para una heladera o cámara en uso continuo.',
    tareas: [
      { tipo: 'Limpieza interior',         cadaDias: 30,  observaciones: 'Descargar, limpiar estantes y juntas con producto neutro.' },
      { tipo: 'Limpieza condensador',      cadaDias: 90,  observaciones: 'Aspirar serpentin trasero, revisar polvo y obstrucciones.' },
      { tipo: 'Descongelamiento',          cadaDias: 180, observaciones: 'Si no es no-frost: descongelar y revisar evaporador.' },
      { tipo: 'Revision de gas y termostato', cadaDias: 365, observaciones: 'Tecnico chequea carga de gas, presion, termostato y luz piloto.' },
    ],
  },
  {
    keywords: ['aire acondicionado', 'split', 'climatizador', 'ac '],
    titulo: 'Aire acondicionado',
    descripcion: 'Limpieza periódica de filtros + revisión anual de gas.',
    tareas: [
      { tipo: 'Limpieza filtros',          cadaDias: 30,  observaciones: 'Lavar filtros con agua tibia, secar antes de colocar.' },
      { tipo: 'Revision serpentin',        cadaDias: 180, observaciones: 'Limpiar serpentin con espuma, revisar drenaje.' },
      { tipo: 'Revision carga de gas',     cadaDias: 365, observaciones: 'Tecnico mide presion y carga si falta gas.' },
    ],
  },
  {
    keywords: ['caldera', 'calefon', 'termotanque', 'caloventor'],
    titulo: 'Caldera / calefón',
    descripcion: 'Mantenimiento de equipos a gas con piloto y serpentín.',
    tareas: [
      { tipo: 'Limpieza piloto y quemador', cadaDias: 90,  observaciones: 'Revisar llama, limpiar quemador.' },
      { tipo: 'Revision anual',             cadaDias: 365, observaciones: 'Gasista matriculado: estanqueidad, ventilacion, prueba de fuga.', prioridad: 'alta' },
    ],
  },
  {
    keywords: ['horno', 'amasadora', 'sobadora'],
    titulo: 'Horno / equipo de panadería',
    descripcion: 'Limpieza frecuente + revisión técnica periódica.',
    tareas: [
      { tipo: 'Limpieza diaria',           cadaDias: 7,   observaciones: 'Limpiar interior, bandejas y exterior.' },
      { tipo: 'Revision quemadores',       cadaDias: 90,  observaciones: 'Chequear llama uniforme, regulacion de gas.' },
      { tipo: 'Revision termostato',       cadaDias: 365, observaciones: 'Calibrar termostato, revisar sellos de puerta.' },
    ],
  },
  {
    keywords: ['ascensor', 'montacarg', 'elevador'],
    titulo: 'Ascensor / montacargas',
    descripcion: 'Inspección obligatoria por normativa.',
    tareas: [
      { tipo: 'Inspeccion mensual',        cadaDias: 30,  observaciones: 'Tecnico habilitado revisa cabina, frenos, puertas, paro de emergencia.', prioridad: 'alta' },
      { tipo: 'Revision anual',            cadaDias: 365, observaciones: 'Revision profunda: cables, poleas, motor, sistema de seguridad.', prioridad: 'alta' },
    ],
  },
  {
    keywords: ['motor', 'generador', 'grupo electrog', 'bomba'],
    titulo: 'Motor / bomba / generador',
    descripcion: 'Mantenimiento de equipos rotativos a motor.',
    tareas: [
      { tipo: 'Cambio de aceite',          cadaDias: 90,  observaciones: 'Cambiar aceite y filtro de aceite.' },
      { tipo: 'Cambio de filtros',         cadaDias: 180, observaciones: 'Cambiar filtro de aire y de combustible si aplica.' },
      { tipo: 'Revision general',          cadaDias: 365, observaciones: 'Chequeo de sellos, rodamientos, alineacion, tablero electrico.' },
    ],
  },
  {
    keywords: ['cortadora', 'amoladora', 'taladro', 'sierra'],
    titulo: 'Herramienta eléctrica',
    descripcion: 'Mantenimiento basico de herramientas de mano.',
    tareas: [
      { tipo: 'Limpieza y lubricacion',    cadaDias: 30,  observaciones: 'Soplar polvo, lubricar partes moviles.' },
      { tipo: 'Cambio de carbones / discos', cadaDias: 180, observaciones: 'Revisar desgaste de carbones del motor, cambiar discos si aplica.' },
    ],
  },
  {
    keywords: ['matafuego', 'extintor'],
    titulo: 'Matafuego',
    descripcion: 'Recarga obligatoria por norma.',
    tareas: [
      { tipo: 'Verificacion mensual',      cadaDias: 30,  observaciones: 'Revisar presion, manometro, precinto, fecha.' },
      { tipo: 'Recarga anual',             cadaDias: 365, observaciones: 'Servicio certificado de recarga.', prioridad: 'alta' },
    ],
  },
];

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function buscarPlantilla(nombreTipo: string | null | undefined): PlantillaMantenimiento | null {
  if (!nombreTipo) return null;
  const n = normalizar(nombreTipo);
  for (const p of PLANTILLAS) {
    if (p.keywords.some((k) => n.includes(normalizar(k)))) return p;
  }
  return null;
}
