/**
 * Catalogo de fallas tipicas de cintas transportadoras de banda.
 *
 * Cubre cintas con motor unico y cintas con DOBLE ACCIONAMIENTO:
 * un motor de TRACCION (polea de cabeza) y un motor de ACOMPAÑAMIENTO
 * (polea snub o polea de cola), comunes en cintas largas o muy
 * cargadas donde un solo motor no genera fuerza de friccion suficiente.
 *
 * Cuando la falla aplica solo a un caso (mono o dual), se aclara en el
 * sintoma o en las causas.
 */
import {
  ejecutarSeedStandalone,
  guardarFallasCatalogo,
  type FallaSeedInput,
} from './seedFallasCatalogo';

const FALLAS_CINTA: FallaSeedInput[] = [
  {
    codigo: 'CT-001',
    sintoma: 'La banda se corre hacia un costado (desalineacion)',
    severidad: 'advertencia',
    orden: 1,
    causas: [
      { causa: 'Rodillos del lado del tramo de carga descentrados o no perpendiculares al eje', probabilidad: 'alta' },
      { causa: 'Carga descentrada en la tolva de alimentacion', probabilidad: 'alta' },
      { causa: 'Empalme cortado fuera de escuadra (banda con falta de paralelismo)', probabilidad: 'media' },
      { causa: 'Poleas desalineadas (cabeza, cola o snub)', probabilidad: 'media' },
      { causa: 'Material adherido a una polea solo de un lado', probabilidad: 'media' },
      { causa: 'Estructura del bastidor torcida', probabilidad: 'baja' },
    ],
    solucion:
      'PARAR la cinta antes de tocar nada. El roce continuo contra la estructura corta la banda longitudinalmente.\n' +
      '1. Identificar HACIA donde se corre y EN que tramo (vacio o con carga).\n' +
      '2. Verificar que la tolva descargue centrada sobre la banda. Si la carga llega de costado, la banda se va para el lado opuesto.\n' +
      '3. Limpiar todas las poleas. Material pegado de un solo lado genera "polea ovalada" virtual.\n' +
      '4. Comprobar escuadra de las poleas con cordel. Ajustar tensores.\n' +
      '5. Inclinar (rotar pocos grados) los rodillos del lado opuesto al desplazamiento, asi la banda se autocentre. Es un ajuste fino, iterativo.\n' +
      '6. Si la banda viene torcida desde fabrica o el empalme esta fuera de escuadra: solo se resuelve cortando y empalmando de nuevo.',
  },
  {
    codigo: 'CT-002',
    sintoma: 'La banda patina en la polea motriz (motor gira, banda no avanza o avanza mas lento)',
    severidad: 'critico',
    orden: 2,
    causas: [
      { causa: 'Contrapeso de tension insuficiente o trabado', probabilidad: 'alta' },
      { causa: 'Recubrimiento de la polea motriz desgastado (de goma lisa) o sucio', probabilidad: 'alta' },
      { causa: 'Banda mojada, aceitada o con material fino que actua de lubricante', probabilidad: 'alta' },
      { causa: 'Sobrecarga: tolva descargando mas tonelaje del nominal', probabilidad: 'media' },
      { causa: 'Angulo de envolvencia insuficiente (especialmente si se quito el snub o el motor de acompañamiento)', probabilidad: 'media' },
      { causa: 'En cintas con doble drive: motor de acompañamiento desconectado o trabajando contra el motor principal', probabilidad: 'media' },
    ],
    solucion:
      'CRITICO. El patinaje genera calor en la polea, quema el recubrimiento y puede fundir la banda. Parar si el sensor zero-speed disparo.\n' +
      '1. Verificar el contrapeso. Que se mueva libre, que no este trabado contra topes mecanicos.\n' +
      '2. Inspeccionar el recubrimiento de la polea motriz. Si esta liso (sin la rombo o diamante) o vidriado: re-encauchar.\n' +
      '3. Si hay agua en la banda, instalar limpia-bandas (rascador) antes de la polea motriz.\n' +
      '4. Verificar que la cinta no este sobrecargada. Pesar tonelaje real vs diseño.\n' +
      '5. En DUAL DRIVE: comparar corriente de motor de traccion vs motor de acompañamiento. Si solo uno levanta corriente, el otro no esta entregando par (drive en falla, freno aplicado, acoplamiento partido).',
  },
  {
    codigo: 'CT-003',
    sintoma: 'DUAL DRIVE: motor de traccion y motor de acompañamiento con corriente muy distinta',
    severidad: 'advertencia',
    orden: 3,
    causas: [
      { causa: 'Configuracion de reparto de carga (load sharing) del variador desbalanceada', probabilidad: 'alta' },
      { causa: 'Uno de los reductores con desgaste interno (relacion efectiva distinta)', probabilidad: 'media' },
      { causa: 'Acoplamiento elastico de un motor partido o gomas vencidas', probabilidad: 'media' },
      { causa: 'Una polea motriz con diametro distinto a la otra (re-encauchado mal)', probabilidad: 'media' },
      { causa: 'Comunicacion entre variadores (PROFIBUS / Ethernet) intermitente', probabilidad: 'baja' },
    ],
    solucion:
      'En cintas con doble drive (master-slave o droop control) los dos motores deben repartir carga proporcional al diseño (50/50 o segun configuracion).\n' +
      '1. Anotar corriente de cada motor en vacio y bajo carga nominal. Si uno tiene >30% mas corriente que el otro: hay desbalance real.\n' +
      '2. Revisar la configuracion de droop (estatismo) o load sharing en ambos variadores. Deben ser identicos.\n' +
      '3. Verificar acoplamientos. Gomas partidas hacen que el par no llegue completo al reductor.\n' +
      '4. Medir diametro efectivo de ambas poleas motrices. Diferencias generan que un motor "tire" mas.\n' +
      '5. Si la comunicacion entre drives es intermitente, el droop manual o backup debe estar configurado para evitar que un motor quede solo bajo carga total.',
  },
  {
    codigo: 'CT-004',
    sintoma: 'Sobrecorriente en el motor (motor de traccion, acompañamiento, o unico)',
    severidad: 'critico',
    orden: 4,
    causas: [
      { causa: 'Sobrecarga: tolva descargando mas que el diseño', probabilidad: 'alta' },
      { causa: 'Rodillos trabados (rodamientos secos o rotos)', probabilidad: 'alta' },
      { causa: 'Cinta arrancando con carga acumulada (no se vacio antes de parar)', probabilidad: 'alta' },
      { causa: 'Reductor con bajo nivel de aceite o con dientes rotos', probabilidad: 'media' },
      { causa: 'Tension de la banda excesiva (contrapeso pesado de mas)', probabilidad: 'media' },
      { causa: 'Cuerpo extraño atascado en chute o entre polea y banda', probabilidad: 'media' },
      { causa: 'Embragado mecanico interno desgastado (en sistemas con embrague hidraulico)', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. El relay termico va a disparar; si se by-passea, se quema el motor.\n' +
      '1. Tonelaje real vs diseño. Si la cinta esta sobrecargada cronicamente, no hay arreglo mecanico que aguante.\n' +
      '2. Caminar la cinta detenida, mano por mano sobre cada rodillo. Los que se sienten trabados o que estan calientes, marcarlos para cambio.\n' +
      '3. Si la cinta paro con carga: arrancar es muy costoso en par. Ayudar con desatasque manual o usar arrancador suave.\n' +
      '4. Verificar nivel y estado del aceite del reductor. Aceite negro / oloroso: hay desgaste interno.\n' +
      '5. Inspeccionar chute de descarga y zona entre polea y banda en busca de barras, piedras u objetos atascados.',
  },
  {
    codigo: 'CT-005',
    sintoma: 'Rodillos con ruido (chillido, golpeteo) o calientes al tocarlos',
    severidad: 'advertencia',
    orden: 5,
    causas: [
      { causa: 'Rodamientos del rodillo secos (sin grasa o con sello roto)', probabilidad: 'alta' },
      { causa: 'Rodillo trabado parcialmente (gira a saltos)', probabilidad: 'alta' },
      { causa: 'Carcasa del rodillo aplastada por impacto de material', probabilidad: 'media' },
      { causa: 'Rodillo desalineado (con angulo respecto al eje de la cinta)', probabilidad: 'media' },
      { causa: 'Material fino infiltrado entre carcasa y eje (especialmente carbon, cemento, harinas)', probabilidad: 'media' },
    ],
    solucion:
      'Los rodillos ruidosos avisan antes de trabarse. Un rodillo trabado quema la banda en pocas horas.\n' +
      '1. Recorrer la cinta detenida o a velocidad muy baja con guante. Tocar cada rodillo (carcasa y soporte). Los calientes (mas de 50°C arriba del ambiente) o que rotan con dificultad: cambiar.\n' +
      '2. En zonas polvorientas, los rodillos baratos (chinos) sin sello laberintico duran poco. Especificar marca con sello reforzado para esos puntos.\n' +
      '3. Si un rodillo aplastado por golpe esta apoyando la banda en zona deformada: reemplazar de inmediato, sino genera ruido y desgaste localizado.\n' +
      '4. Llevar un registro de rodillos cambiados por tramo. Si en una zona se cambian seguido, hay un problema mayor (material que cae de un chute, agua infiltrandose, etc).',
  },
  {
    codigo: 'CT-006',
    sintoma: 'El empalme de la banda esta abierto / vibracion fuerte en el empalme',
    severidad: 'critico',
    orden: 6,
    causas: [
      { causa: 'Empalme clipado: pernos sueltos o cortados', probabilidad: 'alta' },
      { causa: 'Empalme vulcanizado: capa de adhesion despegandose', probabilidad: 'alta' },
      { causa: 'Sobrecarga continua que vencio el empalme', probabilidad: 'media' },
      { causa: 'Empalme original mal ejecutado (paralelismo, longitud de solape, tiempo de prensa)', probabilidad: 'media' },
      { causa: 'Banda envejecida con elastomero cristalizado en la zona de empalme', probabilidad: 'media' },
    ],
    solucion:
      'CRITICO. Un empalme abriendose puede romper en cualquier momento. La banda se va al piso, tarda dias volver a empalmar y hay riesgo grave para el operario.\n' +
      '1. Si es clipado y faltan algunos pernos pero la mayoria estan firmes: PARAR y reponer los faltantes con la herramienta correcta.\n' +
      '2. Si la zona vulcanizada se abre solo en bordes: aplicar reparacion en frio (cubierto, cemento, parche) y planificar re-empalme en proxima parada programada.\n' +
      '3. Si la separacion es interna o avanza rapido: re-empalmar. Vulcanizar es la opcion mas segura para bandas con tonelaje alto.\n' +
      '4. Verificar tension. Empalme bajo tension excesiva no aguanta. Revisar contrapeso.\n' +
      '5. Llevar registro de cuando se hizo el empalme y bajo que condiciones (vulcanizado vs clipado, marca de pernos, temperatura). Sirve para predecir cuando re-empalmar.',
  },
  {
    codigo: 'CT-007',
    sintoma: 'Caida de material por los costados de la cinta',
    severidad: 'advertencia',
    orden: 7,
    causas: [
      { causa: 'Faldones (skirts) de goma desgastados o mal ajustados', probabilidad: 'alta' },
      { causa: 'Banda desalineada en la zona de carga', probabilidad: 'alta' },
      { causa: 'Carga lateral de la tolva (material que cae fuera del centro)', probabilidad: 'media' },
      { causa: 'Velocidad de la cinta muy baja para el caudal (material se acumula)', probabilidad: 'media' },
      { causa: 'Banda con artesa insuficiente (rodillos de impacto sueltos o caidos)', probabilidad: 'media' },
    ],
    solucion:
      'No es solo limpieza. La acumulacion debajo de la cinta tapa rodillos, entra a la polea de cola y daña la banda.\n' +
      '1. Ajustar o cambiar faldones. Tienen que tocar la banda sin friccion excesiva.\n' +
      '2. Alinear la cinta primero (ver CT-001) y despues los faldones.\n' +
      '3. Verificar que la tolva descargue centrada y no de costado.\n' +
      '4. Revisar rodillos de impacto bajo la zona de carga. Deben formar artesa firme (30 o 35 grados tipico).\n' +
      '5. Si el chute esta sub-dimensionado, hay que rediseñarlo para guiar el material al centro.',
  },
  {
    codigo: 'CT-008',
    sintoma: 'Vibracion fuerte en el motor o la zona del reductor',
    severidad: 'advertencia',
    orden: 8,
    causas: [
      { causa: 'Acoplamiento elastico (gomas) vencido o partido', probabilidad: 'alta' },
      { causa: 'Soportes (anclajes) del motor flojos o gomas hundidas', probabilidad: 'alta' },
      { causa: 'Rodamientos del motor o del reductor en falla terminal', probabilidad: 'media' },
      { causa: 'Desalineacion entre eje motor y eje reductor', probabilidad: 'media' },
      { causa: 'Diente roto dentro del reductor', probabilidad: 'baja' },
    ],
    solucion:
      'La vibracion del motor se transmite a la polea y de ahi a la banda. No esperar a que rompa.\n' +
      '1. Visualmente: revisar acoplamiento. Si las gomas estan rajadas o tienen mucho juego, cambiar.\n' +
      '2. Tocar anclajes del motor con mano (cuidado). Si vibran libremente o estan agrietados: ajustar o cambiar gomas antivibratorias.\n' +
      '3. Medir vibracion con vibrometro. > 7 mm/s en banda 2 a 1000Hz indica problema serio (rodamiento, desalineacion).\n' +
      '4. Verificar alineacion motor-reductor con regla o laser. Diferencias > 0.1 mm requieren correccion con galgas.\n' +
      '5. Si hay golpe interno en el reductor (golpeteo metalico ciclico) y crece: parar antes de que rompa el carter. Desarmar.',
  },
  {
    codigo: 'CT-009',
    sintoma: 'Reductor caliente, con fuga de aceite o ruidoso',
    severidad: 'critico',
    orden: 9,
    causas: [
      { causa: 'Nivel de aceite bajo (fugas por retenes o tapones)', probabilidad: 'alta' },
      { causa: 'Aceite vencido o de viscosidad incorrecta', probabilidad: 'alta' },
      { causa: 'Sobrecarga continua (par mayor al de diseño)', probabilidad: 'media' },
      { causa: 'Respiradero tapado (presion interna sube y empuja aceite por retenes)', probabilidad: 'media' },
      { causa: 'Rodamiento del eje de entrada o de salida en falla', probabilidad: 'media' },
      { causa: 'Diente roto o desgaste excesivo de corona/sinfin', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. Trabajar sin aceite o con aceite contaminado destruye el reductor en horas.\n' +
      '1. Verificar nivel de aceite con varilla o visor. Completar al nivel correcto. Anotar cuanto se completo.\n' +
      '2. Buscar la fuga visualmente: retenes del eje de entrada, salida, tapones de drenaje, juntas de carcasa.\n' +
      '3. Limpiar y verificar respiradero. Suele ser un tapon roscado arriba del reductor. Si esta tapado por polvo, sale aceite por todos lados.\n' +
      '4. Sacar muestra de aceite. Si esta negro y oloroso: cambiarlo. Si tiene viruta o particulas: hay desgaste interno, planificar inspeccion.\n' +
      '5. Si el reductor sigue muy caliente (>90°C) con aceite OK y sin sobrecarga: rodamientos al limite. Reemplazar antes de que se rompan los dientes por desalineacion interna.',
  },
  {
    codigo: 'CT-010',
    sintoma: 'La cinta no arranca o arranca a tirones',
    severidad: 'advertencia',
    orden: 10,
    causas: [
      { causa: 'Cinta cargada antes de parar (par de arranque insuficiente)', probabilidad: 'alta' },
      { causa: 'Variador en falla (sobrecorriente, sobrevoltaje, sobretemperatura)', probabilidad: 'alta' },
      { causa: 'Freno mecanico (de servicio o estacionamiento) no se libera', probabilidad: 'media' },
      { causa: 'Acoplamiento hidraulico sin aceite o con aceite incorrecto', probabilidad: 'media' },
      { causa: 'Cuerda de emergencia (pull cord) activada o cable sensor disparado', probabilidad: 'media' },
      { causa: 'En DUAL DRIVE: solo un motor recibe orden de arranque', probabilidad: 'baja' },
    ],
    solucion:
      '1. Leer codigo de falla del variador. Es lo primero. Anotar codigo, no resetear sin entender.\n' +
      '2. Verificar pull cord (cuerda de emergencia) en toda la longitud de la cinta. Cualquier estacion accionada bloquea el arranque.\n' +
      '3. Verificar sensor de desalineacion (belt sway), zero speed, detector de banda rota. Cualquiera disparado impide arranque por enclavamiento.\n' +
      '4. Verificar que el freno se libera al dar marcha. En cintas inclinadas con freno de estacionamiento: si no libera, motor empuja contra freno.\n' +
      '5. Si la cinta esta cargada: vaciar manualmente o usar el modo de arranque a velocidad reducida.\n' +
      '6. En cintas con acoplamiento hidraulico (Voith): verificar nivel y temperatura del aceite del acople.\n' +
      '7. En DUAL DRIVE: confirmar que ambos drives reciben orden simultanea. Si uno arranca y el otro no, el primero se sobrecarga y dispara.',
  },
  {
    codigo: 'CT-011',
    sintoma: 'Corte longitudinal en la banda (rayadura larga o tajo)',
    severidad: 'critico',
    orden: 11,
    causas: [
      { causa: 'Objeto extraño metalico atascado en chute o entre polea y banda', probabilidad: 'alta' },
      { causa: 'Material grande atorado en faldones o en estructura, raspando la banda', probabilidad: 'alta' },
      { causa: 'Rodillo aplastado con borde filoso', probabilidad: 'media' },
      { causa: 'Pernos del empalme clipado sobresalen y rayan la banda en cada paso', probabilidad: 'media' },
      { causa: 'Estructura del bastidor con punta agresiva por golpe', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. Un corte longitudinal pequeño se vuelve un tajo grande en horas. Una vez que entra a la polea, divide la banda en dos.\n' +
      '1. PARAR la cinta y bloquear el arranque.\n' +
      '2. Buscar el origen del corte. Localizar donde la banda toca algo afilado: chute, faldones, rodillos, estructura.\n' +
      '3. Retirar el objeto extraño o eliminar la punta agresiva.\n' +
      '4. Si el corte es de menos de 10 cm: parche en frio con cemento + cubre, o reparacion con grapas. Vigilar evolucion.\n' +
      '5. Si el corte es de mas de 10 cm o esta cerca del empalme: re-empalmar el tramo dañado.\n' +
      '6. Considerar instalar detector de corte longitudinal (rip detector) en cintas largas o costosas.',
  },
  {
    codigo: 'CT-012',
    sintoma: 'Acumulacion de material en la polea de cola',
    severidad: 'advertencia',
    orden: 12,
    causas: [
      { causa: 'Rascador (limpiador) primario o secundario desgastado o despegado de la banda', probabilidad: 'alta' },
      { causa: 'Material humedo o pegajoso (arcilla, mineral fino, harinas)', probabilidad: 'alta' },
      { causa: 'Falta de limpiador en V (V-plow) antes de la polea de cola', probabilidad: 'media' },
      { causa: 'Velocidad de la cinta muy baja para descarga eficiente', probabilidad: 'baja' },
    ],
    solucion:
      'El material acumulado en la polea de cola desalinea la banda y sube la corriente del motor.\n' +
      '1. Ajustar o reemplazar limpiadores. El primario apoya con presion sobre la polea de cabeza; el secundario debe estar a 30 cm aguas abajo.\n' +
      '2. Verificar que la presion del limpiador este bien (no demasiada que dañe la banda, no tan poca que no limpie).\n' +
      '3. Instalar V-plow antes de la polea de cola para barrer material que cayo en el retorno.\n' +
      '4. En cintas con material muy adhesivo: considerar limpiador rotativo o cepillo.\n' +
      '5. Limpieza manual periodica de la zona bajo la polea de cola hasta corregir la causa raiz.',
  },
  {
    codigo: 'CT-013',
    sintoma: 'Olor a quemado o humo desde el motor o el reductor',
    severidad: 'critico',
    orden: 13,
    causas: [
      { causa: 'Bobinado del motor calentando por sobrecorriente o falla de aislacion', probabilidad: 'alta' },
      { causa: 'Reductor sin aceite o con aceite carbonizado por sobrecalentamiento', probabilidad: 'alta' },
      { causa: 'Acoplamiento patinando por gomas vencidas', probabilidad: 'media' },
      { causa: 'Patinaje de la banda en la polea (calor por friccion)', probabilidad: 'media' },
      { causa: 'Ventilador del motor roto o tapado con polvo', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. Apagar y bloquear inmediatamente. Olor a quemado en motor electrico = falla inminente y riesgo de incendio.\n' +
      '1. Dejar que se enfrie antes de tocar. Medir temperatura con infrarrojo.\n' +
      '2. Medir resistencia de aislacion del motor con megger. < 1 MOhm: motor con falla, mandar a rebobinar o cambiar.\n' +
      '3. Verificar ventilador del motor. Si esta tapado por polvo o roto, el motor cocina su propia bobina.\n' +
      '4. Si el olor viene del reductor: ver CT-009 (nivel y estado del aceite, posible diente roto generando calor por fricc).\n' +
      '5. Si la fuente es la polea por patinaje: ver CT-002. La banda en contacto con polea caliente puede inflamarse en material seco (carbon, granos).',
  },
  {
    codigo: 'CT-014',
    sintoma: 'Desgaste premature del recubrimiento de la banda (cobertura superior)',
    severidad: 'advertencia',
    orden: 14,
    causas: [
      { causa: 'Material muy abrasivo para el tipo de cobertura especificada', probabilidad: 'alta' },
      { causa: 'Angulo de caida del material en zona de carga demasiado alto', probabilidad: 'alta' },
      { causa: 'Velocidad de la cinta menor que la del material (impacto y deslizamiento)', probabilidad: 'media' },
      { causa: 'Rodillos de impacto sub-dimensionados o ausentes', probabilidad: 'media' },
      { causa: 'Sobre-tension de los rascadores rayando la cobertura', probabilidad: 'baja' },
    ],
    solucion:
      'La cobertura se desgasta mas en la zona de carga. Si en 6 meses ya tiene 40% de desgaste, hay un problema de diseño o de operacion.\n' +
      '1. Medir espesor de cobertura con calibre o ultrasonido a lo largo de la cinta. Identificar zonas de desgaste localizado.\n' +
      '2. En zona de carga: agregar o reemplazar rodillos de impacto. Reducir altura de caida con chute mejor diseñado.\n' +
      '3. Verificar que la velocidad del material al caer sea similar a la de la cinta. Diferencia grande = desgaste por deslizamiento.\n' +
      '4. Si el material es muy abrasivo (mineria de cuarzo, arenas siliceas, escoria): considerar banda con cobertura grado M o N (mas resistente).\n' +
      '5. Reducir presion de rascadores al minimo que limpie efectivamente.',
  },
  {
    codigo: 'CT-015',
    sintoma: 'Sensor de patinaje (zero speed) o detector de banda rota dispara intermitentemente',
    severidad: 'advertencia',
    orden: 15,
    causas: [
      { causa: 'Patinaje real intermitente bajo picos de carga', probabilidad: 'alta' },
      { causa: 'Sensor inductivo desalineado o con disco lector dañado', probabilidad: 'alta' },
      { causa: 'Tornillo de target del sensor de velocidad flojo o caido', probabilidad: 'media' },
      { causa: 'Configuracion de umbral del sensor mal ajustada para la velocidad real', probabilidad: 'media' },
      { causa: 'Cable del sensor cortado, humedo o con falsos contactos', probabilidad: 'baja' },
    ],
    solucion:
      'Antes de bypasear el sensor: descartar que sea patinaje real. Bypasear un sensor que estaba detectando patinaje real terminó muchas bandas en el piso.\n' +
      '1. Verificar fisicamente que la banda gira a velocidad constante observando una marca.\n' +
      '2. Inspeccionar el sensor: distancia a target (1-3 mm tipico), alineacion, fijacion del soporte.\n' +
      '3. Verificar conexionado: cable sin cortes, conector limpio y seco.\n' +
      '4. Comparar con corriente del motor. Si la corriente sube cuando dispara el sensor, hay patinaje real.\n' +
      '5. Ajustar umbral en el rele de proteccion (entre 60 y 80% de la velocidad nominal tipico).',
  },
];

export async function seedFallasCintaTransportadora() {
  await guardarFallasCatalogo({
    categoriaNombre: 'Cinta Transportadora',
    etiqueta: 'seedFallasCintaTransportadora',
    fallas: FALLAS_CINTA,
  });
}

if (require.main === module) {
  ejecutarSeedStandalone(seedFallasCintaTransportadora);
}
