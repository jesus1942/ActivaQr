/**
 * seedCategorias.ts
 * Crea las categorías globales de equipos (empresaId = null).
 * Catálogo profesional multi-rubro: desde estética hasta aeroespacial.
 * Ejecutar: npx ts-node src/seedCategorias.ts
 * O importar y llamar desde index.ts al inicio.
 *
 * Convención de umbrales:
 *  - invertido=false  -> el valor es peligroso cuando SUBE.
 *      umbralAlerta < umbralCritico < umbralUrgente
 *  - invertido=true   -> el valor es peligroso cuando BAJA (presión de aceite,
 *      nivel de batería, combustible, etc).
 *      umbralAlerta > umbralCritico > umbralUrgente
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
  // ───────────────────────── ENERGÍA Y FUERZA MOTRIZ ─────────────────────────
  {
    nombre: 'Motor Diesel / Generador',
    descripcion: 'Grupos electrógenos y motores diesel estacionarios.',
    orden: 10,
    parametros: [
      { nombre: 'Temperatura de agua', clave: 'temperatura_agua', unidad: '°C', orden: 1, umbralAlerta: 90, umbralCritico: 100, umbralUrgente: 105 },
      { nombre: 'Temperatura de aceite', clave: 'temperatura_aceite', unidad: '°C', orden: 2, umbralAlerta: 95, umbralCritico: 110, umbralUrgente: 120 },
      { nombre: 'Presión de aceite', clave: 'presion_aceite', unidad: 'bar', orden: 3, invertido: true, umbralAlerta: 2.5, umbralCritico: 1.5, umbralUrgente: 1.0 },
      { nombre: 'RPM', clave: 'rpm', unidad: 'RPM', orden: 4, umbralAlerta: 1900, umbralCritico: 2100, umbralUrgente: 2200 },
      { nombre: 'Voltaje de salida', clave: 'voltaje_salida', unidad: 'V', orden: 5, minNormal: 210, maxNormal: 240, umbralAlerta: 200 },
      { nombre: 'Frecuencia', clave: 'frecuencia', unidad: 'Hz', orden: 6, minNormal: 49, maxNormal: 51 },
      { nombre: 'Nivel de combustible', clave: 'nivel_combustible', unidad: '%', tipo: 'porcentaje', orden: 7, invertido: true, umbralAlerta: 20, umbralCritico: 10 },
      { nombre: 'Horas de marcha', clave: 'horas_marcha', unidad: 'h', orden: 8 },
    ],
  },
  {
    nombre: 'Energía Solar / Fotovoltaica',
    descripcion: 'Paneles solares, inversores y bancos de baterías.',
    orden: 11,
    parametros: [
      { nombre: 'Tensión de string', clave: 'tension_string', unidad: 'V', orden: 1, minNormal: 350, maxNormal: 600, umbralAlerta: 650, umbralCritico: 700 },
      { nombre: 'Corriente de generación', clave: 'corriente_gen', unidad: 'A', orden: 2 },
      { nombre: 'Potencia generada', clave: 'potencia_gen', unidad: 'kW', orden: 3 },
      { nombre: 'Temperatura del inversor', clave: 'temp_inversor', unidad: '°C', orden: 4, umbralAlerta: 60, umbralCritico: 75, umbralUrgente: 85 },
      { nombre: 'Estado de carga de baterías', clave: 'soc_baterias', unidad: '%', tipo: 'porcentaje', orden: 5, invertido: true, umbralAlerta: 30, umbralCritico: 20, umbralUrgente: 10 },
      { nombre: 'Eficiencia', clave: 'eficiencia', unidad: '%', tipo: 'porcentaje', orden: 6, invertido: true, umbralAlerta: 80 },
    ],
  },
  {
    nombre: 'UPS / Sala de Servidores',
    descripcion: 'Sistemas de alimentación ininterrumpida y energía crítica.',
    orden: 12,
    parametros: [
      { nombre: 'Carga del UPS', clave: 'carga_ups', unidad: '%', tipo: 'porcentaje', orden: 1, umbralAlerta: 75, umbralCritico: 90, umbralUrgente: 95 },
      { nombre: 'Autonomía estimada', clave: 'autonomia', unidad: 'min', orden: 2, invertido: true, umbralAlerta: 15, umbralCritico: 8, umbralUrgente: 3 },
      { nombre: 'Estado de batería', clave: 'estado_bateria', unidad: '%', tipo: 'porcentaje', orden: 3, invertido: true, umbralAlerta: 70, umbralCritico: 50 },
      { nombre: 'Temperatura de batería', clave: 'temp_bateria', unidad: '°C', orden: 4, umbralAlerta: 30, umbralCritico: 40, umbralUrgente: 45 },
      { nombre: 'Tensión de entrada', clave: 'tension_entrada', unidad: 'V', orden: 5, minNormal: 200, maxNormal: 240 },
    ],
  },

  // ───────────────────────── FLUIDOS Y PRESIÓN ─────────────────────────
  {
    nombre: 'Hidráulico / Power Pack',
    descripcion: 'Centrales hidráulicas, cilindros y power packs.',
    orden: 20,
    parametros: [
      { nombre: 'Presión del sistema', clave: 'presion_sistema', unidad: 'bar', orden: 1, umbralAlerta: 180, umbralCritico: 200, umbralUrgente: 220 },
      { nombre: 'Presión de retorno', clave: 'presion_retorno', unidad: 'bar', orden: 2, umbralAlerta: 5, umbralCritico: 8 },
      { nombre: 'Temperatura del fluido', clave: 'temperatura_fluido', unidad: '°C', orden: 3, umbralAlerta: 60, umbralCritico: 75, umbralUrgente: 85 },
      { nombre: 'Nivel del tanque', clave: 'nivel_tanque', unidad: '%', tipo: 'porcentaje', orden: 4, invertido: true, umbralAlerta: 20, umbralCritico: 10 },
      { nombre: 'Caudal', clave: 'caudal', unidad: 'L/min', orden: 5 },
      { nombre: 'Estado del filtro', clave: 'estado_filtro', tipo: 'seleccion', orden: 6 },
    ],
  },
  {
    nombre: 'Neumático / Compresor',
    descripcion: 'Compresores de aire y sistemas neumáticos.',
    orden: 21,
    parametros: [
      { nombre: 'Presión de trabajo', clave: 'presion_trabajo', unidad: 'bar', orden: 1, umbralAlerta: 8, umbralCritico: 9, umbralUrgente: 10 },
      { nombre: 'Temperatura del compresor', clave: 'temperatura_compresor', unidad: '°C', orden: 2, umbralAlerta: 80, umbralCritico: 95, umbralUrgente: 105 },
      { nombre: 'Punto de rocío', clave: 'punto_rocio', unidad: '°C', orden: 3 },
      { nombre: 'Humedad', clave: 'humedad', unidad: '%', tipo: 'porcentaje', orden: 4 },
      { nombre: 'Horas de cabezal', clave: 'horas_cabezal', unidad: 'h', orden: 5 },
    ],
  },
  {
    nombre: 'Bomba Centrífuga',
    descripcion: 'Bombas de agua, efluentes y procesos.',
    orden: 22,
    parametros: [
      { nombre: 'Caudal', clave: 'caudal', unidad: 'm³/h', orden: 1 },
      { nombre: 'Presión de descarga', clave: 'presion_descarga', unidad: 'bar', orden: 2, umbralAlerta: 5, umbralCritico: 6 },
      { nombre: 'Presión de succión', clave: 'presion_succion', unidad: 'bar', orden: 3 },
      { nombre: 'Temperatura de rodamiento', clave: 'temperatura_rodamiento', unidad: '°C', orden: 4, umbralAlerta: 70, umbralCritico: 85, umbralUrgente: 95 },
      { nombre: 'Nivel de vibración', clave: 'vibracion_nivel', unidad: 'mm/s', orden: 5, umbralAlerta: 4.5, umbralCritico: 7.1, umbralUrgente: 11.2 },
      { nombre: 'Corriente del motor', clave: 'corriente_motor', unidad: 'A', orden: 6 },
    ],
  },
  {
    nombre: 'Caldera / Vapor',
    descripcion: 'Calderas de vapor y agua caliente.',
    orden: 23,
    parametros: [
      { nombre: 'Presión de vapor', clave: 'presion_vapor', unidad: 'bar', orden: 1, umbralAlerta: 8, umbralCritico: 10, umbralUrgente: 11 },
      { nombre: 'Temperatura de salida', clave: 'temp_salida', unidad: '°C', orden: 2, umbralAlerta: 180, umbralCritico: 200 },
      { nombre: 'Nivel de agua', clave: 'nivel_agua', unidad: '%', tipo: 'porcentaje', orden: 3, invertido: true, umbralAlerta: 30, umbralCritico: 15, umbralUrgente: 5 },
      { nombre: 'pH del agua', clave: 'ph_agua', orden: 4, minNormal: 8.5, maxNormal: 10.5 },
      { nombre: 'Dureza del agua', clave: 'dureza', unidad: 'ppm', orden: 5, umbralAlerta: 5 },
      { nombre: 'Temperatura de gases', clave: 'temp_gases', unidad: '°C', orden: 6, umbralAlerta: 250, umbralCritico: 300 },
    ],
  },
  {
    nombre: 'Tratamiento de Agua / Ósmosis',
    descripcion: 'Plantas de ósmosis inversa, ablandadores y filtración.',
    orden: 24,
    parametros: [
      { nombre: 'Conductividad permeado', clave: 'conductividad', unidad: 'µS/cm', orden: 1, umbralAlerta: 50, umbralCritico: 100 },
      { nombre: 'Presión de membrana', clave: 'presion_membrana', unidad: 'bar', orden: 2, umbralAlerta: 15, umbralCritico: 18 },
      { nombre: 'pH', clave: 'ph', orden: 3, minNormal: 6.5, maxNormal: 8.5 },
      { nombre: 'Caudal de rechazo', clave: 'caudal_rechazo', unidad: 'L/h', orden: 4 },
      { nombre: 'Cloro residual', clave: 'cloro', unidad: 'ppm', orden: 5, umbralAlerta: 0.1, umbralCritico: 0.5 },
      { nombre: 'TDS', clave: 'tds', unidad: 'ppm', orden: 6, umbralAlerta: 300, umbralCritico: 500 },
    ],
  },

  // ───────────────────────── ELÉCTRICO E INFRAESTRUCTURA ─────────────────────────
  {
    nombre: 'Eléctrico / Tablero',
    descripcion: 'Tableros de distribución y protección eléctrica.',
    orden: 30,
    parametros: [
      { nombre: 'Voltaje L1', clave: 'voltaje_l1', unidad: 'V', orden: 1, minNormal: 210, maxNormal: 240 },
      { nombre: 'Voltaje L2', clave: 'voltaje_l2', unidad: 'V', orden: 2, minNormal: 210, maxNormal: 240 },
      { nombre: 'Voltaje L3', clave: 'voltaje_l3', unidad: 'V', orden: 3, minNormal: 210, maxNormal: 240 },
      { nombre: 'Corriente', clave: 'corriente', unidad: 'A', orden: 4 },
      { nombre: 'Factor de potencia', clave: 'factor_potencia', orden: 5, invertido: true, umbralAlerta: 0.92 },
      { nombre: 'Temperatura del gabinete', clave: 'temperatura_gabinete', unidad: '°C', orden: 6, umbralAlerta: 45, umbralCritico: 60 },
      { nombre: 'Desbalance de fases', clave: 'desbalance', unidad: '%', tipo: 'porcentaje', orden: 7, umbralAlerta: 2, umbralCritico: 5 },
    ],
  },
  {
    nombre: 'HVAC / Climatización',
    descripcion: 'Aires acondicionados, chillers y manejadoras de aire.',
    orden: 31,
    parametros: [
      { nombre: 'Temperatura ambiente', clave: 'temperatura_ambiente', unidad: '°C', orden: 1 },
      { nombre: 'Temperatura evaporador', clave: 'temperatura_evaporador', unidad: '°C', orden: 2 },
      { nombre: 'Presión alta', clave: 'presion_alta', unidad: 'bar', orden: 3, umbralAlerta: 18, umbralCritico: 22 },
      { nombre: 'Presión baja', clave: 'presion_baja', unidad: 'bar', orden: 4, invertido: true, umbralAlerta: 3, umbralCritico: 2 },
      { nombre: 'Corriente compresor', clave: 'corriente_compresor', unidad: 'A', orden: 5 },
      { nombre: 'Delta T', clave: 'delta_t', unidad: '°C', orden: 6, invertido: true, umbralAlerta: 8 },
    ],
  },
  {
    nombre: 'Torre de Enfriamiento',
    descripcion: 'Torres de enfriamiento y circuitos de agua de condensación.',
    orden: 32,
    parametros: [
      { nombre: 'Temperatura de entrada', clave: 'temp_entrada', unidad: '°C', orden: 1 },
      { nombre: 'Temperatura de salida', clave: 'temp_salida', unidad: '°C', orden: 2, umbralAlerta: 32, umbralCritico: 36 },
      { nombre: 'Aproximación (approach)', clave: 'approach', unidad: '°C', orden: 3, umbralAlerta: 5, umbralCritico: 8 },
      { nombre: 'Conductividad', clave: 'conductividad', unidad: 'µS/cm', orden: 4, umbralAlerta: 2000, umbralCritico: 3000 },
      { nombre: 'pH', clave: 'ph', orden: 5, minNormal: 7, maxNormal: 9 },
      { nombre: 'Nivel de bandeja', clave: 'nivel_bandeja', unidad: '%', tipo: 'porcentaje', orden: 6, invertido: true, umbralAlerta: 25 },
    ],
  },
  {
    nombre: 'Ascensor / Elevador',
    descripcion: 'Ascensores, montacargas y elevadores verticales.',
    orden: 33,
    parametros: [
      { nombre: 'Corriente de tracción', clave: 'corriente_traccion', unidad: 'A', orden: 1 },
      { nombre: 'Temperatura del motor', clave: 'temp_motor', unidad: '°C', orden: 2, umbralAlerta: 70, umbralCritico: 90 },
      { nombre: 'Nivelación de parada', clave: 'nivelacion', unidad: 'mm', orden: 3, umbralAlerta: 10, umbralCritico: 20 },
      { nombre: 'Estado de cables', clave: 'estado_cables', tipo: 'seleccion', orden: 4 },
      { nombre: 'Ciclos acumulados', clave: 'ciclos', orden: 5 },
      { nombre: 'Prueba de frenos OK', clave: 'frenos_ok', tipo: 'booleano', orden: 6 },
    ],
  },

  // ───────────────────────── TRANSPORTE INTERNO / MANEJO DE MATERIALES ─────────────────────────
  {
    nombre: 'Cinta Transportadora',
    descripcion: 'Cintas transportadoras de banda. Cubre cintas con motor unico y cintas con doble accionamiento (motor de traccion + motor de acompañamiento). Aplica a mineria, aridos, frigorificos, plantas de proceso, packaging y agro.',
    orden: 35,
    parametros: [
      { nombre: 'Corriente motor de traccion', clave: 'corriente_motor_traccion', unidad: 'A', orden: 1, umbralAlerta: 90, umbralCritico: 110 },
      { nombre: 'Corriente motor de acompañamiento', clave: 'corriente_motor_acomp', unidad: 'A', orden: 2, umbralAlerta: 90, umbralCritico: 110 },
      { nombre: 'Temperatura motor de traccion', clave: 'temp_motor_traccion', unidad: '°C', orden: 3, umbralAlerta: 80, umbralCritico: 95, umbralUrgente: 105 },
      { nombre: 'Temperatura motor de acompañamiento', clave: 'temp_motor_acomp', unidad: '°C', orden: 4, umbralAlerta: 80, umbralCritico: 95, umbralUrgente: 105 },
      { nombre: 'Temperatura del reductor', clave: 'temp_reductor', unidad: '°C', orden: 5, umbralAlerta: 75, umbralCritico: 90 },
      { nombre: 'Velocidad de la cinta', clave: 'velocidad_cinta', unidad: 'm/s', orden: 6 },
      { nombre: 'Nivel de aceite del reductor', clave: 'nivel_aceite_reductor', unidad: '%', tipo: 'porcentaje', orden: 7, invertido: true, umbralAlerta: 30, umbralCritico: 15 },
      { nombre: 'Tension de la banda (contrapeso)', clave: 'tension_banda', unidad: 'kN', orden: 8 },
      { nombre: 'Temperatura de rodamiento polea motriz', clave: 'temp_rodamiento_motriz', unidad: '°C', orden: 9, umbralAlerta: 60, umbralCritico: 75, umbralUrgente: 85 },
      { nombre: 'Vibracion del motor', clave: 'vibracion_motor', unidad: 'mm/s', orden: 10, umbralAlerta: 4.5, umbralCritico: 7.1, umbralUrgente: 11.2 },
      { nombre: 'Estado del empalme', clave: 'estado_empalme', tipo: 'seleccion', orden: 11 },
      { nombre: 'Patinaje detectado (zero speed)', clave: 'patinaje', tipo: 'booleano', orden: 12 },
      { nombre: 'Horas de operacion', clave: 'horas_operacion', unidad: 'h', orden: 13 },
    ],
  },

  // ───────────────────────── ENERGIA EOLICA ─────────────────────────
  {
    nombre: 'Aerogenerador',
    descripcion: 'Turbinas eolicas de eje horizontal. Cubre arquitecturas con multiplicadora (gearbox) y direct drive (PMSG, sin caja). Parametros pensados para empresas de O&M de parques eolicos: Vestas, Goldwind, Nordex/Acciona, Siemens Gamesa, GE, Wobben/Enercon, Suzlon, Senvion.',
    orden: 36,
    parametros: [
      { nombre: 'Velocidad del viento', clave: 'viento', unidad: 'm/s', orden: 1, umbralAlerta: 20, umbralCritico: 25 },
      { nombre: 'Velocidad del rotor', clave: 'rpm_rotor', unidad: 'RPM', orden: 2 },
      { nombre: 'Velocidad del generador', clave: 'rpm_generador', unidad: 'RPM', orden: 3 },
      { nombre: 'Potencia activa', clave: 'potencia_activa', unidad: 'kW', orden: 4 },
      { nombre: 'Temperatura devanado generador', clave: 'temp_devanado', unidad: '°C', orden: 5, umbralAlerta: 130, umbralCritico: 150, umbralUrgente: 160 },
      { nombre: 'Temperatura aceite multiplicadora', clave: 'temp_aceite_gearbox', unidad: '°C', orden: 6, umbralAlerta: 75, umbralCritico: 85, umbralUrgente: 95 },
      { nombre: 'Temperatura rodamiento principal', clave: 'temp_rod_principal', unidad: '°C', orden: 7, umbralAlerta: 70, umbralCritico: 85, umbralUrgente: 95 },
      { nombre: 'Presion sistema hidraulico', clave: 'presion_hidraulica', unidad: 'bar', orden: 8, umbralAlerta: 200, umbralCritico: 230 },
      { nombre: 'Angulo de pitch (paso de pala)', clave: 'pitch_angle', unidad: 'grados', orden: 9 },
      { nombre: 'Posicion de yaw (orientacion)', clave: 'yaw_pos', unidad: 'grados', orden: 10 },
      { nombre: 'Vibracion gondola (RMS, banda 0.1-10 Hz)', clave: 'vib_gondola', unidad: 'mm/s', orden: 11, umbralAlerta: 4.5, umbralCritico: 7.1, umbralUrgente: 11.2 },
      { nombre: 'Vibracion alta frecuencia (banda > 100 Hz, rodamientos)', clave: 'vib_alta_freq', unidad: 'g', orden: 12 },
      { nombre: 'Disponibilidad', clave: 'disponibilidad', unidad: '%', tipo: 'porcentaje', orden: 13, invertido: true, umbralAlerta: 95, umbralCritico: 90 },
      { nombre: 'Disparos de seguridad acumulados (mes)', clave: 'trips_mes', orden: 14, umbralAlerta: 5, umbralCritico: 15 },
      { nombre: 'Horas equivalentes plena carga (EFLH)', clave: 'eflh', unidad: 'h', orden: 15 },
    ],
  },

  // ───────────────────────── IZAJE Y MANEJO DE CARGA ─────────────────────────
  {
    nombre: 'Autoelevador / Equipo de Izaje',
    descripcion: 'Autoelevadores contrabalanceados (diesel, GLP, electricos) y equipos de izaje de planta. Aplica a operacion en almacenes, frigorificos, terminales portuarias, parques eolicos y plantas industriales. Cubre tambien reach trucks y montacargas de planta.',
    orden: 37,
    parametros: [
      { nombre: 'Horometro (horas de operacion)', clave: 'horometro', unidad: 'h', orden: 1 },
      { nombre: 'Carga nominal a 500 mm de centro', clave: 'carga_nominal', unidad: 'kg', orden: 2 },
      { nombre: 'Temperatura motor (diesel/GLP)', clave: 'temp_motor', unidad: '°C', orden: 3, umbralAlerta: 95, umbralCritico: 105, umbralUrgente: 110 },
      { nombre: 'Estado de bateria (electrico)', clave: 'soc_bateria', unidad: '%', tipo: 'porcentaje', orden: 4, invertido: true, umbralAlerta: 30, umbralCritico: 20 },
      { nombre: 'Voltaje de bateria de traccion', clave: 'voltaje_bat_traccion', unidad: 'V', orden: 5 },
      { nombre: 'Presion del sistema hidraulico', clave: 'presion_hidraulica', unidad: 'bar', orden: 6, umbralAlerta: 180, umbralCritico: 200 },
      { nombre: 'Temperatura del aceite hidraulico', clave: 'temp_aceite_hidr', unidad: '°C', orden: 7, umbralAlerta: 65, umbralCritico: 80, umbralUrgente: 90 },
      { nombre: 'Nivel de aceite hidraulico', clave: 'nivel_aceite_hidr', unidad: '%', tipo: 'porcentaje', orden: 8, invertido: true, umbralAlerta: 30, umbralCritico: 15 },
      { nombre: 'Estado de cadenas del mastil', clave: 'estado_cadenas', tipo: 'seleccion', orden: 9 },
      { nombre: 'Estado de uñas / horquillas', clave: 'estado_uñas', tipo: 'seleccion', orden: 10 },
      { nombre: 'Estado de neumaticos', clave: 'estado_neumaticos', tipo: 'seleccion', orden: 11 },
      { nombre: 'Inspeccion pre-uso OK', clave: 'preuso_ok', tipo: 'booleano', orden: 12 },
      { nombre: 'Cinturon de seguridad / OPSS funcional', clave: 'opss_ok', tipo: 'booleano', orden: 13 },
      { nombre: 'Bocina y baliza funcionales', clave: 'alarmas_ok', tipo: 'booleano', orden: 14 },
    ],
  },

  // ───────────────────────── MANUFACTURA Y MÁQUINA-HERRAMIENTA ─────────────────────────
  {
    nombre: 'CNC / Máquina Herramienta',
    descripcion: 'Centros de mecanizado, tornos y fresadoras CNC.',
    orden: 40,
    parametros: [
      { nombre: 'Temperatura del husillo', clave: 'temp_husillo', unidad: '°C', orden: 1, umbralAlerta: 55, umbralCritico: 70 },
      { nombre: 'RPM del husillo', clave: 'rpm_husillo', unidad: 'RPM', orden: 2 },
      { nombre: 'Vibración', clave: 'vibracion', unidad: 'mm/s', orden: 3, umbralAlerta: 2.8, umbralCritico: 4.5 },
      { nombre: 'Presión hidráulica', clave: 'presion_hidraulica', unidad: 'bar', orden: 4 },
      { nombre: 'Nivel de refrigerante', clave: 'nivel_refrigerante', unidad: '%', tipo: 'porcentaje', orden: 5, invertido: true, umbralAlerta: 20 },
      { nombre: 'Horas de uso de herramienta', clave: 'horas_herramienta', unidad: 'h', orden: 6 },
    ],
  },
  {
    nombre: 'Inyección de Plásticos',
    descripcion: 'Inyectoras y sopladoras de plástico.',
    orden: 41,
    parametros: [
      { nombre: 'Temperatura de cañón', clave: 'temp_canon', unidad: '°C', orden: 1, umbralAlerta: 260, umbralCritico: 290 },
      { nombre: 'Temperatura de molde', clave: 'temp_molde', unidad: '°C', orden: 2 },
      { nombre: 'Presión de inyección', clave: 'presion_iny', unidad: 'bar', orden: 3, umbralAlerta: 1400, umbralCritico: 1600 },
      { nombre: 'Tiempo de ciclo', clave: 'tiempo_ciclo', unidad: 's', orden: 4 },
      { nombre: 'Fuerza de cierre', clave: 'fuerza_cierre', unidad: 'ton', orden: 5 },
      { nombre: 'Piezas defectuosas', clave: 'piezas_def', unidad: '%', tipo: 'porcentaje', orden: 6, umbralAlerta: 3, umbralCritico: 8 },
    ],
  },
  {
    nombre: 'Soldadura',
    descripcion: 'Equipos de soldadura MIG/MAG, TIG y por punto.',
    orden: 42,
    parametros: [
      { nombre: 'Corriente de soldadura', clave: 'corriente_sold', unidad: 'A', orden: 1 },
      { nombre: 'Tensión de arco', clave: 'tension_arco', unidad: 'V', orden: 2 },
      { nombre: 'Caudal de gas', clave: 'caudal_gas', unidad: 'L/min', orden: 3, minNormal: 12, maxNormal: 18 },
      { nombre: 'Temperatura de fuente', clave: 'temp_fuente', unidad: '°C', orden: 4, umbralAlerta: 60, umbralCritico: 75 },
      { nombre: 'Factor de marcha', clave: 'factor_marcha', unidad: '%', tipo: 'porcentaje', orden: 5 },
    ],
  },
  {
    nombre: 'Robótica Industrial',
    descripcion: 'Brazos robóticos y celdas automatizadas.',
    orden: 43,
    parametros: [
      { nombre: 'Temperatura de servos', clave: 'temp_servos', unidad: '°C', orden: 1, umbralAlerta: 55, umbralCritico: 70 },
      { nombre: 'Consumo de ejes', clave: 'consumo_ejes', unidad: 'A', orden: 2 },
      { nombre: 'Repetibilidad', clave: 'repetibilidad', unidad: 'mm', orden: 3, umbralAlerta: 0.1, umbralCritico: 0.3 },
      { nombre: 'Ciclos completados', clave: 'ciclos', orden: 4 },
      { nombre: 'Errores de posición', clave: 'errores_pos', orden: 5, umbralAlerta: 1, umbralCritico: 5 },
      { nombre: 'Presión de pinza', clave: 'presion_pinza', unidad: 'bar', orden: 6 },
    ],
  },

  // ───────────────────────── ESTÉTICA, SALUD Y LABORATORIO ─────────────────────────
  {
    nombre: 'Estética / Equipos de Belleza',
    descripcion: 'HIFU, láser, radiofrecuencia, criolipólisis, IPL y cavitación.',
    orden: 50,
    parametros: [
      { nombre: 'Potencia de emisión', clave: 'potencia_emision', unidad: 'W', orden: 1 },
      { nombre: 'Energía / disparo', clave: 'energia_disparo', unidad: 'J', orden: 2 },
      { nombre: 'Temperatura del cabezal', clave: 'temp_cabezal', unidad: '°C', orden: 3, umbralAlerta: 40, umbralCritico: 50, umbralUrgente: 55 },
      { nombre: 'Temperatura de crio (placa)', clave: 'temp_crio', unidad: '°C', orden: 4 },
      { nombre: 'Disparos acumulados', clave: 'disparos', orden: 5, umbralAlerta: 800000, umbralCritico: 1000000 },
      { nombre: 'Nivel de agua/refrigerante', clave: 'nivel_refrig', unidad: '%', tipo: 'porcentaje', orden: 6, invertido: true, umbralAlerta: 30, umbralCritico: 15 },
      { nombre: 'Calibración vigente', clave: 'calibracion_ok', tipo: 'booleano', orden: 7 },
      { nombre: 'Estado del manípulo', clave: 'estado_manipulo', tipo: 'seleccion', orden: 8 },
    ],
  },
  {
    nombre: 'Equipo Médico / Clínico',
    descripcion: 'Equipamiento médico general: monitores, bombas, respiradores.',
    orden: 51,
    parametros: [
      { nombre: 'Tensión de batería', clave: 'tension_bateria', unidad: 'V', orden: 1, invertido: true, umbralAlerta: 11.5, umbralCritico: 10.8 },
      { nombre: 'Autonomía', clave: 'autonomia', unidad: 'min', orden: 2, invertido: true, umbralAlerta: 30, umbralCritico: 10 },
      { nombre: 'Corriente de fuga', clave: 'corriente_fuga', unidad: 'µA', orden: 3, umbralAlerta: 100, umbralCritico: 500 },
      { nombre: 'Exactitud verificada', clave: 'exactitud_ok', tipo: 'booleano', orden: 4 },
      { nombre: 'Calibración vigente', clave: 'calibracion_ok', tipo: 'booleano', orden: 5 },
      { nombre: 'Próxima validación', clave: 'prox_validacion', tipo: 'texto', orden: 6 },
    ],
  },
  {
    nombre: 'Odontología',
    descripcion: 'Sillones, autoclaves, compresores y RX dental.',
    orden: 52,
    parametros: [
      { nombre: 'Presión del compresor', clave: 'presion_compresor', unidad: 'bar', orden: 1, minNormal: 4, maxNormal: 8 },
      { nombre: 'Temperatura de autoclave', clave: 'temp_autoclave', unidad: '°C', orden: 2, minNormal: 121, maxNormal: 134 },
      { nombre: 'Presión de esterilización', clave: 'presion_ester', unidad: 'bar', orden: 3, minNormal: 1.0, maxNormal: 2.2 },
      { nombre: 'Ciclos de autoclave', clave: 'ciclos_autoclave', orden: 4 },
      { nombre: 'Nivel de agua destilada', clave: 'nivel_agua', unidad: '%', tipo: 'porcentaje', orden: 5, invertido: true, umbralAlerta: 25 },
    ],
  },
  {
    nombre: 'Laboratorio',
    descripcion: 'Centrífugas, autoclaves, estufas e incubadoras.',
    orden: 53,
    parametros: [
      { nombre: 'Temperatura de cámara', clave: 'temp_camara', unidad: '°C', orden: 1 },
      { nombre: 'RPM de centrífuga', clave: 'rpm_centrifuga', unidad: 'RPM', orden: 2 },
      { nombre: 'Desviación de temperatura', clave: 'desvio_temp', unidad: '°C', orden: 3, umbralAlerta: 1, umbralCritico: 2 },
      { nombre: 'Humedad relativa', clave: 'humedad', unidad: '%', tipo: 'porcentaje', orden: 4 },
      { nombre: 'CO2 (incubadora)', clave: 'co2', unidad: '%', tipo: 'porcentaje', orden: 5, minNormal: 4.5, maxNormal: 5.5 },
      { nombre: 'Calibración vigente', clave: 'calibracion_ok', tipo: 'booleano', orden: 6 },
    ],
  },
  {
    nombre: 'Farmacia / Cadena de Frío',
    descripcion: 'Heladeras de vacunas, freezers y cámaras farmacéuticas.',
    orden: 54,
    parametros: [
      { nombre: 'Temperatura de cámara', clave: 'temp_camara', unidad: '°C', orden: 1, minNormal: 2, maxNormal: 8, umbralAlerta: 8, umbralCritico: 10, umbralUrgente: 12 },
      { nombre: 'Temperatura de freezer', clave: 'temp_freezer', unidad: '°C', orden: 2 },
      { nombre: 'Excursión registrada', clave: 'excursion', tipo: 'booleano', orden: 3 },
      { nombre: 'Tiempo fuera de rango', clave: 'tiempo_fuera', unidad: 'min', orden: 4, umbralAlerta: 30, umbralCritico: 120 },
      { nombre: 'Batería de respaldo', clave: 'bateria_respaldo', unidad: '%', tipo: 'porcentaje', orden: 5, invertido: true, umbralAlerta: 40, umbralCritico: 20 },
    ],
  },

  // ───────────────────────── GASTRONOMÍA Y COMERCIO ─────────────────────────
  {
    nombre: 'Refrigeración Comercial',
    descripcion: 'Cámaras frigoríficas, exhibidoras y freezers comerciales.',
    orden: 60,
    parametros: [
      { nombre: 'Temperatura de cámara', clave: 'temp_camara', unidad: '°C', orden: 1, umbralAlerta: 5, umbralCritico: 8, umbralUrgente: 12 },
      { nombre: 'Temperatura de evaporador', clave: 'temp_evap', unidad: '°C', orden: 2 },
      { nombre: 'Presión de baja', clave: 'presion_baja', unidad: 'bar', orden: 3, invertido: true, umbralAlerta: 1.2, umbralCritico: 0.8 },
      { nombre: 'Presión de alta', clave: 'presion_alta', unidad: 'bar', orden: 4, umbralAlerta: 16, umbralCritico: 20 },
      { nombre: 'Ciclos de deshielo', clave: 'ciclos_deshielo', orden: 5 },
      { nombre: 'Corriente del compresor', clave: 'corriente_comp', unidad: 'A', orden: 6 },
    ],
  },
  {
    nombre: 'Cocina Industrial / Gastronomía',
    descripcion: 'Hornos, freidoras, planchas y campanas.',
    orden: 61,
    parametros: [
      { nombre: 'Temperatura del horno', clave: 'temp_horno', unidad: '°C', orden: 1 },
      { nombre: 'Temperatura de aceite (freidora)', clave: 'temp_aceite', unidad: '°C', orden: 2, umbralAlerta: 185, umbralCritico: 200, umbralUrgente: 220 },
      { nombre: 'Presión de gas', clave: 'presion_gas', unidad: 'mbar', orden: 3, minNormal: 18, maxNormal: 25 },
      { nombre: 'Estado de campana/filtros', clave: 'estado_filtros', tipo: 'seleccion', orden: 4 },
      { nombre: 'Detección de fuga de gas', clave: 'fuga_gas', tipo: 'booleano', orden: 5, invertido: true },
      { nombre: 'Horas de uso', clave: 'horas_uso', unidad: 'h', orden: 6 },
    ],
  },
  {
    nombre: 'Panadería',
    descripcion: 'Hornos rotativos, amasadoras, cámaras de fermentación.',
    orden: 62,
    parametros: [
      { nombre: 'Temperatura de horno', clave: 'temp_horno', unidad: '°C', orden: 1, minNormal: 180, maxNormal: 250 },
      { nombre: 'Temperatura de cámara de leudado', clave: 'temp_leudado', unidad: '°C', orden: 2, minNormal: 26, maxNormal: 32 },
      { nombre: 'Humedad de cámara', clave: 'humedad', unidad: '%', tipo: 'porcentaje', orden: 3, minNormal: 70, maxNormal: 85 },
      { nombre: 'Corriente de amasadora', clave: 'corriente_amasadora', unidad: 'A', orden: 4 },
      { nombre: 'Presión de vapor', clave: 'presion_vapor', unidad: 'bar', orden: 5 },
    ],
  },
  {
    nombre: 'Lavandería Industrial',
    descripcion: 'Lavarropas, secadoras y calandras industriales.',
    orden: 63,
    parametros: [
      { nombre: 'Temperatura de lavado', clave: 'temp_lavado', unidad: '°C', orden: 1 },
      { nombre: 'Temperatura de secado', clave: 'temp_secado', unidad: '°C', orden: 2, umbralAlerta: 85, umbralCritico: 95 },
      { nombre: 'Velocidad de centrifugado', clave: 'rpm_centrifugado', unidad: 'RPM', orden: 3 },
      { nombre: 'Vibración', clave: 'vibracion', unidad: 'mm/s', orden: 4, umbralAlerta: 5, umbralCritico: 9 },
      { nombre: 'Presión de vapor', clave: 'presion_vapor', unidad: 'bar', orden: 5 },
      { nombre: 'Ciclos acumulados', clave: 'ciclos', orden: 6 },
    ],
  },

  // ───────────────────────── AGRO, TRANSPORTE E IZAJE ─────────────────────────
  {
    nombre: 'Maquinaria Agrícola',
    descripcion: 'Tractores, cosechadoras y pulverizadoras.',
    orden: 70,
    parametros: [
      { nombre: 'Temperatura de motor', clave: 'temp_motor', unidad: '°C', orden: 1, umbralAlerta: 95, umbralCritico: 105, umbralUrgente: 110 },
      { nombre: 'Presión de aceite', clave: 'presion_aceite', unidad: 'bar', orden: 2, invertido: true, umbralAlerta: 2, umbralCritico: 1 },
      { nombre: 'Horas de motor', clave: 'horas_motor', unidad: 'h', orden: 3 },
      { nombre: 'Nivel de combustible', clave: 'nivel_combustible', unidad: '%', tipo: 'porcentaje', orden: 4, invertido: true, umbralAlerta: 15 },
      { nombre: 'Presión hidráulica', clave: 'presion_hidraulica', unidad: 'bar', orden: 5 },
      { nombre: 'Estado de neumáticos', clave: 'estado_neumaticos', tipo: 'seleccion', orden: 6 },
    ],
  },
  {
    nombre: 'Vehículo / Flota',
    descripcion: 'Camiones, utilitarios y automóviles de flota.',
    orden: 71,
    parametros: [
      { nombre: 'Kilometraje', clave: 'kilometraje', unidad: 'km', orden: 1 },
      { nombre: 'Temperatura de motor', clave: 'temp_motor', unidad: '°C', orden: 2, umbralAlerta: 100, umbralCritico: 110 },
      { nombre: 'Presión de neumáticos', clave: 'presion_neumaticos', unidad: 'PSI', orden: 3, minNormal: 32, maxNormal: 40 },
      { nombre: 'Nivel de aceite', clave: 'nivel_aceite', unidad: '%', tipo: 'porcentaje', orden: 4, invertido: true, umbralAlerta: 30, umbralCritico: 15 },
      { nombre: 'Tensión de batería', clave: 'tension_bateria', unidad: 'V', orden: 5, invertido: true, umbralAlerta: 12.2, umbralCritico: 11.8 },
      { nombre: 'Estado de frenos', clave: 'estado_frenos', tipo: 'seleccion', orden: 6 },
      { nombre: 'Próximo service (km)', clave: 'prox_service', unidad: 'km', orden: 7 },
    ],
  },
  {
    nombre: 'Autoelevador / Montacargas',
    descripcion: 'Autoelevadores eléctricos y a combustión.',
    orden: 72,
    parametros: [
      { nombre: 'Horas de uso', clave: 'horas_uso', unidad: 'h', orden: 1 },
      { nombre: 'Carga de batería', clave: 'carga_bateria', unidad: '%', tipo: 'porcentaje', orden: 2, invertido: true, umbralAlerta: 30, umbralCritico: 15 },
      { nombre: 'Nivel de electrolito', clave: 'nivel_electrolito', unidad: '%', tipo: 'porcentaje', orden: 3, invertido: true, umbralAlerta: 30 },
      { nombre: 'Presión hidráulica de izaje', clave: 'presion_izaje', unidad: 'bar', orden: 4 },
      { nombre: 'Estado de horquillas', clave: 'estado_horquillas', tipo: 'seleccion', orden: 5 },
      { nombre: 'Estado de cadenas', clave: 'estado_cadenas', tipo: 'seleccion', orden: 6 },
    ],
  },
  {
    nombre: 'Grúa / Izaje',
    descripcion: 'Grúas puente, pluma y aparejos de izaje.',
    orden: 73,
    parametros: [
      { nombre: 'Carga de trabajo', clave: 'carga_trabajo', unidad: 'ton', orden: 1 },
      { nombre: 'Límite de carga (SWL)', clave: 'swl', unidad: 'ton', orden: 2 },
      { nombre: 'Estado de cable de acero', clave: 'estado_cable', tipo: 'seleccion', orden: 3 },
      { nombre: 'Desgaste de gancho', clave: 'desgaste_gancho', unidad: '%', tipo: 'porcentaje', orden: 4, umbralAlerta: 5, umbralCritico: 10 },
      { nombre: 'Prueba de fin de carrera OK', clave: 'fin_carrera_ok', tipo: 'booleano', orden: 5 },
      { nombre: 'Ciclos de izaje', clave: 'ciclos', orden: 6 },
    ],
  },

  // ───────────────────────── NAVAL, AERONÁUTICA Y AEROESPACIAL ─────────────────────────
  {
    nombre: 'Naval / Embarcación',
    descripcion: 'Motores marinos, sistemas de propulsión y achique.',
    orden: 80,
    parametros: [
      { nombre: 'Temperatura de motor', clave: 'temp_motor', unidad: '°C', orden: 1, umbralAlerta: 90, umbralCritico: 100 },
      { nombre: 'Presión de aceite', clave: 'presion_aceite', unidad: 'bar', orden: 2, invertido: true, umbralAlerta: 2.5, umbralCritico: 1.5 },
      { nombre: 'Temperatura de agua de mar', clave: 'temp_agua_mar', unidad: '°C', orden: 3 },
      { nombre: 'Nivel de sentina', clave: 'nivel_sentina', unidad: 'cm', orden: 4, umbralAlerta: 10, umbralCritico: 25, umbralUrgente: 40 },
      { nombre: 'RPM de eje', clave: 'rpm_eje', unidad: 'RPM', orden: 5 },
      { nombre: 'Carga de baterías', clave: 'carga_baterias', unidad: '%', tipo: 'porcentaje', orden: 6, invertido: true, umbralAlerta: 40, umbralCritico: 20 },
    ],
  },
  {
    nombre: 'Aviación General',
    descripcion: 'Aeronaves de ala fija y rotativa: motores y celda.',
    orden: 81,
    parametros: [
      { nombre: 'Temperatura de cabeza de cilindro (CHT)', clave: 'cht', unidad: '°C', orden: 1, umbralAlerta: 200, umbralCritico: 230, umbralUrgente: 245 },
      { nombre: 'Temperatura de gases de escape (EGT)', clave: 'egt', unidad: '°C', orden: 2, umbralAlerta: 750, umbralCritico: 815 },
      { nombre: 'Presión de aceite', clave: 'presion_aceite', unidad: 'PSI', orden: 3, invertido: true, umbralAlerta: 55, umbralCritico: 25 },
      { nombre: 'Temperatura de aceite', clave: 'temp_aceite', unidad: '°C', orden: 4, umbralAlerta: 100, umbralCritico: 118 },
      { nombre: 'Horas de célula', clave: 'horas_celula', unidad: 'h', orden: 5 },
      { nombre: 'Horas desde overhaul (TSO)', clave: 'tso', unidad: 'h', orden: 6, umbralAlerta: 1800, umbralCritico: 2000 },
      { nombre: 'Ciclos de tren de aterrizaje', clave: 'ciclos_tren', orden: 7 },
    ],
  },
  {
    nombre: 'Aeroespacial / Propulsión',
    descripcion: 'Sistemas de propulsión, turbinas y bancos de ensayo.',
    orden: 82,
    parametros: [
      { nombre: 'Empuje', clave: 'empuje', unidad: 'kN', orden: 1 },
      { nombre: 'Temperatura de turbina (EGT/ITT)', clave: 'temp_turbina', unidad: '°C', orden: 2, umbralAlerta: 900, umbralCritico: 1000, umbralUrgente: 1050 },
      { nombre: 'Velocidad N1', clave: 'n1', unidad: '%', tipo: 'porcentaje', orden: 3, umbralAlerta: 100, umbralCritico: 104 },
      { nombre: 'Velocidad N2', clave: 'n2', unidad: '%', tipo: 'porcentaje', orden: 4, umbralAlerta: 100, umbralCritico: 105 },
      { nombre: 'Presión de cámara', clave: 'presion_camara', unidad: 'bar', orden: 5 },
      { nombre: 'Vibración de eje', clave: 'vibracion_eje', unidad: 'mm/s', orden: 6, umbralAlerta: 4, umbralCritico: 7, umbralUrgente: 10 },
      { nombre: 'Presión de combustible', clave: 'presion_comb', unidad: 'bar', orden: 7, invertido: true, umbralAlerta: 20, umbralCritico: 12 },
      { nombre: 'Caudal de oxidante', clave: 'caudal_oxidante', unidad: 'kg/s', orden: 8 },
    ],
  },

  // ───────────────────────── TECNOLOGÍA Y SEGURIDAD ─────────────────────────
  {
    nombre: 'IT / Informática',
    descripcion: 'Servidores, PCs, impresoras y equipos de red.',
    orden: 90,
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
    nombre: 'Telecomunicaciones / Antena',
    descripcion: 'Enlaces, antenas, repetidoras y radiobases.',
    orden: 91,
    parametros: [
      { nombre: 'Nivel de señal (RSSI)', clave: 'rssi', unidad: 'dBm', orden: 1, invertido: true, umbralAlerta: -75, umbralCritico: -85, umbralUrgente: -95 },
      { nombre: 'Relación señal/ruido (SNR)', clave: 'snr', unidad: 'dB', orden: 2, invertido: true, umbralAlerta: 20, umbralCritico: 12 },
      { nombre: 'ROE / VSWR', clave: 'vswr', orden: 3, umbralAlerta: 1.5, umbralCritico: 2.0 },
      { nombre: 'Temperatura de equipo', clave: 'temp_equipo', unidad: '°C', orden: 4, umbralAlerta: 55, umbralCritico: 70 },
      { nombre: 'Ancho de banda utilizado', clave: 'ancho_banda', unidad: '%', tipo: 'porcentaje', orden: 5, umbralAlerta: 80, umbralCritico: 95 },
    ],
  },
  {
    nombre: 'Seguridad Electrónica / CCTV',
    descripcion: 'Cámaras, DVR/NVR, controles de acceso y alarmas.',
    orden: 92,
    parametros: [
      { nombre: 'Cámaras operativas', clave: 'camaras_ok', unidad: '%', tipo: 'porcentaje', orden: 1, invertido: true, umbralAlerta: 95, umbralCritico: 80 },
      { nombre: 'Días de grabación disponibles', clave: 'dias_grabacion', unidad: 'días', orden: 2, invertido: true, umbralAlerta: 15, umbralCritico: 7 },
      { nombre: 'Uso de almacenamiento', clave: 'uso_almacenamiento', unidad: '%', tipo: 'porcentaje', orden: 3, umbralAlerta: 85, umbralCritico: 95 },
      { nombre: 'Estado de UPS', clave: 'estado_ups', tipo: 'seleccion', orden: 4 },
      { nombre: 'Temperatura del rack', clave: 'temp_rack', unidad: '°C', orden: 5, umbralAlerta: 35, umbralCritico: 45 },
    ],
  },

  // ───────────────────────── PROCESOS Y AMBIENTE ─────────────────────────
  {
    nombre: 'Pileta / Natatorio',
    descripcion: 'Piletas, climatización de agua y filtrado.',
    orden: 100,
    parametros: [
      { nombre: 'pH del agua', clave: 'ph', orden: 1, minNormal: 7.2, maxNormal: 7.6, umbralAlerta: 7.8, umbralCritico: 8.2 },
      { nombre: 'Cloro libre', clave: 'cloro_libre', unidad: 'ppm', orden: 2, minNormal: 1, maxNormal: 3, umbralAlerta: 0.5, invertido: true },
      { nombre: 'Temperatura del agua', clave: 'temp_agua', unidad: '°C', orden: 3, minNormal: 26, maxNormal: 30 },
      { nombre: 'Turbidez', clave: 'turbidez', unidad: 'NTU', orden: 4, umbralAlerta: 1, umbralCritico: 5 },
      { nombre: 'Presión del filtro', clave: 'presion_filtro', unidad: 'bar', orden: 5, umbralAlerta: 1.5, umbralCritico: 2 },
    ],
  },
  {
    nombre: 'Ambiental / Calidad de Aire',
    descripcion: 'Monitoreo de emisiones y calidad del aire interior.',
    orden: 101,
    parametros: [
      { nombre: 'CO2', clave: 'co2', unidad: 'ppm', orden: 1, umbralAlerta: 1000, umbralCritico: 2000 },
      { nombre: 'CO (monóxido)', clave: 'co', unidad: 'ppm', orden: 2, umbralAlerta: 9, umbralCritico: 35, umbralUrgente: 100 },
      { nombre: 'Material particulado (PM2.5)', clave: 'pm25', unidad: 'µg/m³', orden: 3, umbralAlerta: 35, umbralCritico: 55 },
      { nombre: 'Compuestos orgánicos (VOC)', clave: 'voc', unidad: 'ppb', orden: 4, umbralAlerta: 500, umbralCritico: 1000 },
      { nombre: 'Temperatura', clave: 'temperatura', unidad: '°C', orden: 5 },
      { nombre: 'Humedad relativa', clave: 'humedad', unidad: '%', tipo: 'porcentaje', orden: 6, minNormal: 40, maxNormal: 60 },
    ],
  },
  {
    nombre: 'Minería',
    descripcion: 'Equipos de molienda, chancado y bombeo minero.',
    orden: 102,
    parametros: [
      { nombre: 'Temperatura de rodamientos', clave: 'temp_rodamientos', unidad: '°C', orden: 1, umbralAlerta: 75, umbralCritico: 90, umbralUrgente: 100 },
      { nombre: 'Vibración', clave: 'vibracion', unidad: 'mm/s', orden: 2, umbralAlerta: 7, umbralCritico: 11, umbralUrgente: 18 },
      { nombre: 'Corriente del motor', clave: 'corriente', unidad: 'A', orden: 3 },
      { nombre: 'Presión de lubricación', clave: 'presion_lub', unidad: 'bar', orden: 4, invertido: true, umbralAlerta: 1.5, umbralCritico: 0.8 },
      { nombre: 'Desgaste de revestimiento', clave: 'desgaste_liner', unidad: '%', tipo: 'porcentaje', orden: 5, umbralAlerta: 70, umbralCritico: 90 },
      { nombre: 'Toneladas procesadas', clave: 'toneladas', unidad: 't', orden: 6 },
    ],
  },
  {
    nombre: 'Petróleo y Gas',
    descripcion: 'Cabezales de pozo, separadores y bombas de extracción.',
    orden: 103,
    parametros: [
      { nombre: 'Presión de cabeza de pozo', clave: 'presion_pozo', unidad: 'PSI', orden: 1, umbralAlerta: 3000, umbralCritico: 3500, umbralUrgente: 4000 },
      { nombre: 'Temperatura de línea', clave: 'temp_linea', unidad: '°C', orden: 2 },
      { nombre: 'Caudal', clave: 'caudal', unidad: 'm³/d', orden: 3 },
      { nombre: 'Detección de H2S', clave: 'h2s', unidad: 'ppm', orden: 4, umbralAlerta: 10, umbralCritico: 20, umbralUrgente: 100 },
      { nombre: 'Detección de gas (LEL)', clave: 'lel', unidad: '%', tipo: 'porcentaje', orden: 5, umbralAlerta: 10, umbralCritico: 20, umbralUrgente: 50 },
      { nombre: 'Vibración de bomba', clave: 'vibracion_bomba', unidad: 'mm/s', orden: 6, umbralAlerta: 5, umbralCritico: 9 },
    ],
  },

  // ───────────────────────── GENERAL ─────────────────────────
  {
    nombre: 'General / Otro',
    descripcion: 'Plantilla genérica para equipos sin categoría específica.',
    orden: 999,
    parametros: [
      { nombre: 'Temperatura', clave: 'temperatura', unidad: '°C', orden: 1 },
      { nombre: 'Presión', clave: 'presion', unidad: 'bar', orden: 2 },
      { nombre: 'Corriente', clave: 'corriente', unidad: 'A', orden: 3 },
      { nombre: 'Vibración', clave: 'vibracion', unidad: 'mm/s', orden: 4 },
      { nombre: 'Horas de uso', clave: 'horas_uso', unidad: 'h', orden: 5 },
      { nombre: 'Observación', clave: 'observacion', tipo: 'texto', orden: 6 },
    ],
  },
];

export async function seedCategorias() {
  console.log('Seeding categorías globales de equipos...');
  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const cat of CATEGORIAS_GLOBALES) {
    const existing = await prisma.categoriaEquipo.findFirst({
      where: { nombre: cat.nombre, empresaId: null },
      include: { parametros: true },
    });

    if (existing) {
      // Si existe pero no tiene parámetros (o tiene menos de los esperados),
      // los completamos sin duplicar los ya presentes.
      const clavesExistentes = new Set(existing.parametros.map((p) => p.clave));
      const faltantes = cat.parametros.filter((p) => !clavesExistentes.has(p.clave));
      if (faltantes.length > 0) {
        await prisma.parametroCategoria.createMany({
          data: faltantes.map((p) => ({
            categoriaId: existing.id,
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
        });
        updated++;
      } else {
        skipped++;
      }
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

  console.log(`seedCategorias: ${created} creadas, ${updated} completadas, ${skipped} ya existían.`);
}

// Run directly if called as script
const isMain = require.main === module;
if (isMain) {
  seedCategorias()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
