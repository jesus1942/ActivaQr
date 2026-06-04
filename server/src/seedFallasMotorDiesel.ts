/**
 * Catalogo de fallas tipicas de Motor Diesel / Generador.
 *
 * Es la base de conocimiento que ve el tecnico en campo al escanear el QR del
 * equipo. Cada falla cubre: sintoma observable, causas probables ordenadas por
 * frecuencia tipica, y solucion paso a paso. Esta info se vuelve util cuando
 * el operario llega al equipo en falla y no sabe por donde empezar.
 *
 * Las fallas son globales (empresaId = null): provistas por ActivaQR para todos
 * los tenants. Cada empresa puede agregar fallas propias desde la app.
 *
 * Severidad: info | advertencia | critico.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

interface CausaProbable {
  causa: string;
  probabilidad: 'alta' | 'media' | 'baja';
}

interface FallaSeed {
  codigo?: string;
  sintoma: string;
  causas: CausaProbable[];
  solucion: string;
  severidad: 'info' | 'advertencia' | 'critico';
  orden: number;
}

const FALLAS_MOTOR_DIESEL: FallaSeed[] = [
  {
    codigo: 'MD-001',
    sintoma: 'Humo NEGRO por el escape',
    severidad: 'advertencia',
    orden: 1,
    causas: [
      { causa: 'Filtro de aire saturado o tapado', probabilidad: 'alta' },
      { causa: 'Inyectores con caudal alto o mal pulverizando (goteo)', probabilidad: 'alta' },
      { causa: 'Turbo dañado o con perdida de presion', probabilidad: 'media' },
      { causa: 'Bomba inyectora desreglada (exceso de combustible)', probabilidad: 'media' },
      { causa: 'Sensor MAF/MAP fallando (en motores electronicos)', probabilidad: 'baja' },
    ],
    solucion:
      '1. Revisar y cambiar el filtro de aire. Es lo mas comun y mas barato.\n' +
      '2. Si el filtro estaba bien, medir presion de turbo y revisar mangueras de admision en busca de fugas.\n' +
      '3. Hacer prueba de inyectores en banco. Inyectores que gotean son la segunda causa mas frecuente.\n' +
      '4. Si todo lo anterior esta OK, revisar regulacion de bomba inyectora con personal especializado.',
  },
  {
    codigo: 'MD-002',
    sintoma: 'Humo AZUL por el escape',
    severidad: 'critico',
    orden: 2,
    causas: [
      { causa: 'Aros de pistones desgastados (motor quemando aceite)', probabilidad: 'alta' },
      { causa: 'Retenes de valvulas vencidos', probabilidad: 'alta' },
      { causa: 'Turbo con sellos dañados (pasa aceite a la admision)', probabilidad: 'media' },
      { causa: 'Cilindros desgastados / con rayas', probabilidad: 'media' },
      { causa: 'Nivel de aceite excesivo en el carter', probabilidad: 'baja' },
    ],
    solucion:
      '1. Verificar nivel de aceite. Si esta por encima del maximo, drenar al nivel correcto.\n' +
      '2. Si el humo aparece al acelerar de golpe: probable problema de aros o cilindros.\n' +
      '3. Si aparece al arrancar en frio y baja: retenes de valvulas.\n' +
      '4. Si aparece en regimen alto: revisar sellos del turbo (sacar mangueras y buscar restos de aceite).\n' +
      '5. Medir compresion de cada cilindro. Diferencias > 15% indican desgaste interno y rectificacion del motor.',
  },
  {
    codigo: 'MD-003',
    sintoma: 'Humo BLANCO denso CONSTANTE por el escape (no es vapor)',
    severidad: 'critico',
    orden: 3,
    causas: [
      { causa: 'Junta de tapa de cilindros soplada (agua en camara de combustion)', probabilidad: 'alta' },
      { causa: 'Tapa de cilindros fisurada', probabilidad: 'alta' },
      { causa: 'Block fisurado', probabilidad: 'media' },
      { causa: 'Inyector pulverizando mal (combustible sin quemar)', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. PARAR EL MOTOR hasta diagnosticar. Si entra agua al cilindro puede romper biela o tirar pistones.\n' +
      '1. Verificar nivel de refrigerante. Si bajo sin perdidas visibles: confirmado, hay paso de agua a combustion.\n' +
      '2. Sacar bujias de precalentamiento e inspeccionar. Pueden estar limpias (lavadas por agua).\n' +
      '3. Hacer prueba de gases en el sistema de refrigeracion (detector de CO2).\n' +
      '4. Si confirmado: desarmar tapa de cilindros, cambiar junta y verificar planitud de tapa. A veces hay que rectificar o reemplazar.',
  },
  {
    codigo: 'MD-003B',
    sintoma: 'Humo BLANCO al arrancar (desaparece despues de unos minutos)',
    severidad: 'advertencia',
    orden: 4,
    causas: [
      { causa: 'Valvula de escape de gases del motor (EGR) pegada o sucia', probabilidad: 'alta' },
      { causa: 'Valvula PCV (ventilacion del carter) tapada — vapores de aceite quemados', probabilidad: 'alta' },
      { causa: 'Retenes de valvulas vencidos (chupa aceite con motor frio)', probabilidad: 'media' },
      { causa: 'Condensacion acumulada en el escape (normal en frio extremo)', probabilidad: 'media' },
      { causa: 'Combustible diesel con agua o contaminacion', probabilidad: 'baja' },
      { causa: 'Bujias de precalentamiento debiles (combustion incompleta inicial)', probabilidad: 'baja' },
    ],
    solucion:
      'No es critico si el humo desaparece al alcanzar temperatura. Si persiste, ver MD-003.\n' +
      '1. Limpiar la valvula EGR. Con uso prolongado se llena de carbonilla y se pega.\n' +
      '2. Revisar la valvula PCV y la manguera de ventilacion del carter. Si esta tapada, los vapores de aceite van al colector de admision y se queman generando humo blanco.\n' +
      '3. Si el humo es blanco-azulado al arrancar en frio y baja al calentar: retenes de valvulas vencidos. Cambio.\n' +
      '4. Verificar bujias de precalentamiento individualmente. Las debiles dejan combustion incompleta los primeros segundos.\n' +
      '5. Si trabajas con combustible de mala calidad o sospecha de agua en el tanque: drenar tanque y filtros, cambiar gasoil.',
  },
  {
    codigo: 'MD-004',
    sintoma: 'Temperatura del refrigerante supera el rango (>95°C en operacion normal)',
    severidad: 'advertencia',
    orden: 4,
    causas: [
      { causa: 'Termostato pegado cerrado', probabilidad: 'alta' },
      { causa: 'Radiador tapado externamente (suciedad entre aletas)', probabilidad: 'alta' },
      { causa: 'Nivel bajo de refrigerante', probabilidad: 'media' },
      { causa: 'Bomba de agua con impeller dañado', probabilidad: 'media' },
      { causa: 'Ventilador electrico no enciende / correa rota', probabilidad: 'media' },
      { causa: 'Radiador obstruido internamente (sarro)', probabilidad: 'baja' },
    ],
    solucion:
      '1. Verificar nivel de refrigerante en frio. Completar si hace falta.\n' +
      '2. Revisar visualmente la parte externa del radiador. Si hay tierra, hojas o grasa entre aletas, limpiar con aire comprimido o agua a baja presion.\n' +
      '3. Con el motor en marcha hasta temperatura: tocar la manguera superior del radiador. Si esta fria mientras el motor calienta: termostato cerrado, hay que cambiarlo.\n' +
      '4. Verificar que la correa de la bomba de agua y el ventilador este tensa y sin grietas.\n' +
      '5. Si todo lo anterior OK: probar bomba de agua (a veces el impeller se desprende del eje).',
  },
  {
    codigo: 'MD-005',
    sintoma: 'Presion de aceite baja (luz testigo encendida o manometro debajo del minimo)',
    severidad: 'critico',
    orden: 5,
    causas: [
      { causa: 'Nivel de aceite bajo', probabilidad: 'alta' },
      { causa: 'Aceite degradado o de viscosidad incorrecta', probabilidad: 'alta' },
      { causa: 'Filtro de aceite tapado o instalado mal', probabilidad: 'media' },
      { causa: 'Bomba de aceite desgastada', probabilidad: 'media' },
      { causa: 'Bujes de biela o bancada gastados', probabilidad: 'media' },
      { causa: 'Manometro o sensor defectuoso (falsa alarma)', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. APAGAR el motor de inmediato si la presion baja en marcha. Trabajar sin presion de aceite destruye el motor en minutos.\n' +
      '1. Verificar nivel de aceite con varilla. Completar al nivel correcto si esta bajo.\n' +
      '2. Verificar que el aceite no este diluido con combustible (huele a gasoil) ni con agua (color cafe con leche).\n' +
      '3. Cambiar filtro de aceite si tiene mas de las horas recomendadas.\n' +
      '4. Si la presion sigue baja con motor a temperatura: medir presion real con manometro mecanico (descartar sensor).\n' +
      '5. Si la presion es realmente baja: revision de bomba de aceite y holguras de bancada (motorista).',
  },
  {
    codigo: 'MD-006',
    sintoma: 'El motor NO ARRANCA (gira pero no enciende)',
    severidad: 'advertencia',
    orden: 6,
    causas: [
      { causa: 'Falta de combustible o tanque vacio', probabilidad: 'alta' },
      { causa: 'Aire en el sistema de combustible', probabilidad: 'alta' },
      { causa: 'Filtro de gasoil tapado', probabilidad: 'alta' },
      { causa: 'Bujias de precalentamiento quemadas (en frio)', probabilidad: 'media' },
      { causa: 'Bomba de cebado dañada', probabilidad: 'media' },
      { causa: 'Inyectores pegados (sin caudal)', probabilidad: 'baja' },
      { causa: 'Bomba inyectora dañada', probabilidad: 'baja' },
    ],
    solucion:
      '1. Verificar nivel de combustible.\n' +
      '2. Cebar el sistema con la bomba manual (la perilla en la cabeza del filtro). Bombear hasta que se sienta resistencia.\n' +
      '3. Cambiar filtro de gasoil. Si tiene mas de 250 horas o no se recuerda cuando se cambio, es probable.\n' +
      '4. Si arranca en caliente pero no en frio: probar bujias de precalentamiento con un tester. Cambiar las que esten quemadas.\n' +
      '5. Aflojar el racor de un inyector y girar el motor. Si no sale combustible: hay problema en bomba o linea.\n' +
      '6. Si todo lo anterior OK: revisar bomba inyectora con especialista.',
  },
  {
    codigo: 'MD-007',
    sintoma: 'Perdida de potencia notable (le falta fuerza, le cuesta subir cargas)',
    severidad: 'advertencia',
    orden: 7,
    causas: [
      { causa: 'Filtro de aire saturado', probabilidad: 'alta' },
      { causa: 'Filtro de gasoil tapado', probabilidad: 'alta' },
      { causa: 'Inyectores desgastados (caudal bajo)', probabilidad: 'media' },
      { causa: 'Turbo con presion baja (fuga en mangueras, eje gastado)', probabilidad: 'media' },
      { causa: 'Sincronizacion de bomba inyectora corrida', probabilidad: 'baja' },
      { causa: 'Catalizador / DPF saturado (motores modernos)', probabilidad: 'baja' },
    ],
    solucion:
      '1. Filtros, siempre primero: aire y gasoil. Cambiar ambos antes de gastar plata en diagnostico mas profundo.\n' +
      '2. Inspeccionar mangueras del turbo. Buscar grietas, abrazaderas flojas, manchas de aceite.\n' +
      '3. Conectar manometro al turbo y medir presion bajo carga. Comparar con manual del motor.\n' +
      '4. Hacer prueba de caudal de inyectores en banco.\n' +
      '5. En motores con DPF o EGR: revisar codigos de falla por scanner.',
  },
  {
    codigo: 'MD-008',
    sintoma: 'Vibracion excesiva en ralenti o en regimen',
    severidad: 'advertencia',
    orden: 8,
    causas: [
      { causa: 'Inyectores desbalanceados (uno entrega mas que otro)', probabilidad: 'alta' },
      { causa: 'Soportes (tacos) de motor rotos o vencidos', probabilidad: 'alta' },
      { causa: 'Compresion despareja entre cilindros', probabilidad: 'media' },
      { causa: 'Volante o damper de ciguenal dañado', probabilidad: 'baja' },
      { causa: 'Bomba inyectora con mal sincronismo de elementos', probabilidad: 'baja' },
    ],
    solucion:
      '1. Inspeccionar visualmente los soportes del motor. Si la goma esta separada del metal o agrietada: reemplazar todos.\n' +
      '2. En ralenti, aflojar uno por uno los racores de inyectores. Si al aflojar uno la vibracion NO aumenta: ese cilindro no trabaja bien.\n' +
      '3. Medir compresion en frio y en caliente. Diferencia > 15% entre cilindros: problema interno.\n' +
      '4. Si la vibracion es en regimen alto y constante: revisar damper de ciguenal (puede estar despegado).',
  },
  {
    codigo: 'MD-009',
    sintoma: 'Ruido METALICO interno (golpeteo, "biela", cascabeleo)',
    severidad: 'critico',
    orden: 9,
    causas: [
      { causa: 'Bujes de biela gastados (golpeteo a media velocidad bajo carga)', probabilidad: 'alta' },
      { causa: 'Bujes de bancada gastados (golpeteo grave en ralenti)', probabilidad: 'alta' },
      { causa: 'Combustion con autoencendido (gasoil malo o sincronizacion adelantada)', probabilidad: 'media' },
      { causa: 'Holgura excesiva en valvulas (regulacion)', probabilidad: 'media' },
      { causa: 'Piston golpeando tapa (camisas flojas)', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. No exigir el motor hasta diagnosticar. Si es buje de biela, en pocas horas puede tirarla.\n' +
      '1. Escuchar con un estetoscopio mecanico para localizar el origen (cabezote vs block vs carter).\n' +
      '2. Si es ruido en cabezote y rapido: probable holgura de valvulas. Regular.\n' +
      '3. Si es ruido grave y profundo en bajo regimen: probable bancada.\n' +
      '4. Si es ruido a media velocidad bajo carga: biela.\n' +
      '5. Medir holguras con plastigauge cuando se desarme. Lo correcto suele estar entre 0.025 y 0.075 mm.',
  },
  {
    codigo: 'MD-010',
    sintoma: 'Consumo excesivo de combustible (mas litros/hora que lo normal)',
    severidad: 'advertencia',
    orden: 10,
    causas: [
      { causa: 'Filtro de aire saturado (mezcla rica)', probabilidad: 'alta' },
      { causa: 'Inyectores con caudal alto o goteando', probabilidad: 'alta' },
      { causa: 'Termostato pegado abierto (motor frio consume mas)', probabilidad: 'media' },
      { causa: 'Bomba inyectora desreglada', probabilidad: 'media' },
      { causa: 'Sensor de temperatura defectuoso (ECU enriquece)', probabilidad: 'baja' },
    ],
    solucion:
      '1. Cambiar filtro de aire.\n' +
      '2. Verificar que el motor alcance temperatura de trabajo normal (75-85°C). Si tarda mucho o no llega: termostato pegado abierto, cambiarlo.\n' +
      '3. Hacer prueba de caudal y pulverizacion de inyectores en banco.\n' +
      '4. En motores electronicos: leer codigos y verificar sensor de temperatura del refrigerante.',
  },
  {
    codigo: 'MD-011',
    sintoma: 'Arranque dificil en frio (gira bien pero tarda en encender)',
    severidad: 'advertencia',
    orden: 11,
    causas: [
      { causa: 'Bujias de precalentamiento quemadas o reles fallando', probabilidad: 'alta' },
      { causa: 'Compresion baja por anillos o valvulas', probabilidad: 'media' },
      { causa: 'Combustible parafinado (en invierno con gasoil comun)', probabilidad: 'media' },
      { causa: 'Bateria con carga insuficiente (gira lento)', probabilidad: 'media' },
      { causa: 'Aire en el sistema de inyeccion', probabilidad: 'baja' },
    ],
    solucion:
      '1. Verificar tension de bateria y velocidad de giro del arranque. Debe girar firme (>200 rpm).\n' +
      '2. Probar bujias de precalentamiento individualmente con tester. Reemplazar las quemadas.\n' +
      '3. Revisar rele de precalentamiento (en algunos motores es comun que falle).\n' +
      '4. En invierno con temperaturas bajo 0°C: usar gasoil grado polar o agregar aditivo antiparafinico.\n' +
      '5. Si arranca pero corre desparejo: probable problema de compresion (medir).',
  },
  {
    codigo: 'MD-012',
    sintoma: 'Aceite mezclado con refrigerante o viceversa (color "cafe con leche")',
    severidad: 'critico',
    orden: 12,
    causas: [
      { causa: 'Junta de tapa de cilindros soplada (paso entre galerias)', probabilidad: 'alta' },
      { causa: 'Tapa de cilindros fisurada', probabilidad: 'alta' },
      { causa: 'Block fisurado', probabilidad: 'media' },
      { causa: 'Enfriador de aceite (intercooler de aceite) dañado', probabilidad: 'media' },
    ],
    solucion:
      'CRITICO. No usar el motor. La mezcla destruye lubricacion y daña el sistema.\n' +
      '1. Verificar tapa de aceite y varilla: si hay emulsion blanca o color "cafe con leche", confirmado.\n' +
      '2. Verificar el deposito de refrigerante: si tiene capa aceitosa flotando, hay paso entre sistemas.\n' +
      '3. Si el motor tiene enfriador de aceite por agua (comun en motores grandes), probarlo primero. Es la reparacion mas barata.\n' +
      '4. Si el enfriador esta OK: desarmar tapa de cilindros. Cambiar junta y verificar planitud. Si esta fisurada: reemplazar.\n' +
      '5. Mientras tanto: cambiar todo el aceite y filtro despues de reparar. Hacer 2-3 cambios cortos los primeros 50h para limpiar.',
  },
];

export async function seedFallasMotorDiesel() {
  const categoria = await prisma.categoriaEquipo.findFirst({
    where: { nombre: 'Motor Diesel / Generador', empresaId: null },
  });
  if (!categoria) {
    console.log('seedFallasMotorDiesel: categoria "Motor Diesel / Generador" no encontrada, saltando');
    return;
  }

  let creadas = 0;
  let actualizadas = 0;
  for (const falla of FALLAS_MOTOR_DIESEL) {
    const existente = await prisma.fallaCatalogo.findFirst({
      where: { categoriaId: categoria.id, empresaId: null, codigo: falla.codigo },
    });
    const causas = falla.causas as unknown as Prisma.InputJsonValue;
    if (existente) {
      await prisma.fallaCatalogo.update({
        where: { id: existente.id },
        data: {
          sintoma: falla.sintoma,
          causas,
          solucion: falla.solucion,
          severidad: falla.severidad,
          orden: falla.orden,
        },
      });
      actualizadas++;
    } else {
      await prisma.fallaCatalogo.create({
        data: {
          categoriaId: categoria.id,
          empresaId: null,
          codigo: falla.codigo,
          sintoma: falla.sintoma,
          causas,
          solucion: falla.solucion,
          severidad: falla.severidad,
          orden: falla.orden,
        },
      });
      creadas++;
    }
  }
  console.log(`seedFallasMotorDiesel: ${creadas} creadas, ${actualizadas} actualizadas`);
}

if (require.main === module) {
  seedFallasMotorDiesel()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
