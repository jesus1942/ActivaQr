/**
 * Catalogo de fallas tipicas en aerogeneradores.
 *
 * Pensado para empresas de O&M de parques eolicos. Cubre arquitecturas con
 * multiplicadora y direct drive (PMSG, sin caja).
 *
 * Aerogenerador es una maquina critica de seguridad: trabajar en la gondola
 * sin LOTO completo (rotor lock pin, pitch lock, yaw lock, conexion de tierra,
 * candado electrico) puede matar. Cada solucion deja eso claro.
 *
 * Particularidades de Patagonia (Madryn, Comodoro): viento alto sostenido y
 * rafagas violentas, salinidad costa atlantica, frio + icing invernal, polvo
 * en tormentas. Se incorporan fallas y consideraciones puntuales.
 */
import {
  ejecutarSeedStandalone,
  guardarFallasCatalogo,
  type FallaSeedInput,
} from './seedFallasCatalogo';

const FALLAS: FallaSeedInput[] = [
  {
    codigo: 'AG-001',
    sintoma: 'Vibracion alta en gondola (alarma del CMS)',
    severidad: 'critico',
    orden: 1,
    causas: [
      { causa: 'Desbalance del rotor (una pala con masa distinta, hielo asimetrico, daño)', probabilidad: 'alta' },
      { causa: 'Pitch descalibrado (palas a angulos distintos entre si)', probabilidad: 'alta' },
      { causa: 'Daño en rodamiento principal (main bearing)', probabilidad: 'media' },
      { causa: 'Acoplamiento (composite shaft o spider) dañado entre gearbox y generador', probabilidad: 'media' },
      { causa: 'Resonancia estructural a viento sostenido (frecuencia 1P o 3P de paso de pala)', probabilidad: 'media' },
      { causa: 'Aflojamiento de bridas o pernos de anclaje del bastidor principal', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. Frenar la maquina y dejar en idle. NO subir si la vibracion es severa y el viento sigue alto. Riesgo de colapso.\n' +
      '1. Leer alarmas del CMS y separar: vibracion baja frecuencia (rotor / estructura) vs alta frecuencia (rodamientos).\n' +
      '2. Si es baja frecuencia y aparece con cierta direccion de viento: posible icing o desbalance aerodinamico. Inspeccion visual desde tierra con telescopio o drone.\n' +
      '3. Verificar pitch de las tres palas en posicion conocida (0° y 90°). Diferencias > 0.3° entre palas requieren recalibracion.\n' +
      '4. Si es alta frecuencia con armonicos en BPFO/BPFI/BSF del rodamiento principal: analisis de envolvente con vibrometro. Cambio de bearing es operacion mayor (grua, ~3 dias).\n' +
      '5. Verificar torque de pernos de anclaje del main frame con sequencia indicada por OEM (Vestas, SgRE, etc).',
  },
  {
    codigo: 'AG-002',
    sintoma: 'Sobretemperatura del generador (devanado o rodamiento)',
    severidad: 'critico',
    orden: 2,
    causas: [
      { causa: 'Sistema de refrigeracion del generador degradado (intercambiador sucio, refrigerante bajo, bomba)', probabilidad: 'alta' },
      { causa: 'Filtros de aire de cooling tapados (en generadores con air-cooled)', probabilidad: 'alta' },
      { causa: 'Operacion sostenida sobre potencia nominal (en bajadas de presion atmosferica + viento alto sostenido)', probabilidad: 'media' },
      { causa: 'Sensor PT100 del devanado dañado (falsa alarma)', probabilidad: 'media' },
      { causa: 'Falla incipiente de aislacion entre fases o fase-tierra', probabilidad: 'baja' },
      { causa: 'Anillos rozantes desgastados en generador DFIG (calor por arco)', probabilidad: 'baja' },
    ],
    solucion:
      '1. Verificar registro de temperatura ambiente vs temperatura del devanado. Calcular delta T. Si el delta es mas alto que historico: el problema es refrigeracion, no carga.\n' +
      '2. Inspeccionar intercambiador de calor del generador. Limpiar aletas externas si esta sucio. Verificar nivel y caudal del refrigerante.\n' +
      '3. Si es generador con refrigeracion por aire: cambiar/limpiar filtros. En zonas de polvo o costa los filtros se tapan rapido.\n' +
      '4. Verificar que el sensor PT100 lee razonable: comparar las tres fases entre si y con sensor de rodamiento.\n' +
      '5. En DFIG con anillos rozantes: inspeccionar carbones y anillos por arcing. Reemplazar si hay desgaste irregular.',
  },
  {
    codigo: 'AG-003',
    sintoma: 'Particulas metalicas o aumento abrupto en analisis de aceite de multiplicadora',
    severidad: 'critico',
    orden: 3,
    causas: [
      { causa: 'Desgaste de planetarios (planet bearings o engranajes)', probabilidad: 'alta' },
      { causa: 'Daño en HSS bearing (rodamiento del eje de alta velocidad)', probabilidad: 'alta' },
      { causa: 'Micropitting en engranajes (lubricacion al limite, aceite vencido)', probabilidad: 'media' },
      { causa: 'Spalling en cono carrier o ring gear', probabilidad: 'media' },
      { causa: 'Contaminacion externa por mal sellado de gearbox', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. La rotura completa de un planetario puede destruir la multiplicadora ($150-300k USD reemplazo, grua ~5 dias).\n' +
      '1. Confirmar con analisis ferrografico (ASTM D7416) o boroscopia interna por sello superior.\n' +
      '2. Identificar la fuente: planet, sun, ring, HSS o IMS bearing. Comparar tamaño y morfologia de particulas.\n' +
      '3. Si hay daño localizado y leve: programar inspeccion boroscopica de toda la gearbox. Aumentar frecuencia de cambio de aceite y filtros.\n' +
      '4. Si el daño avanza (PPM Fe crece > 50% mes a mes): planificar uptower repair o full gearbox swap.\n' +
      '5. Revisar el aceite. Vestas/SgRE/Goldwind tienen marcas y grados especificos (PAO sintetico, ISO VG 320 tipico). Aceite cambiado fuera de spec acelera el desgaste.',
  },
  {
    codigo: 'AG-004',
    sintoma: 'Fault del sistema PITCH (paso de pala) - alguna pala no responde o se queda trabada',
    severidad: 'critico',
    orden: 4,
    causas: [
      { causa: 'Acumulador hidraulico despresurizado (nitrogeno perdido)', probabilidad: 'alta' },
      { causa: 'Valvula proporcional del pitch sucia o atascada', probabilidad: 'alta' },
      { causa: 'Encoder absoluto del eje del pitch dañado (lecturas erroneas)', probabilidad: 'media' },
      { causa: 'Slip ring del pitch con falla de comunicacion intermitente', probabilidad: 'media' },
      { causa: 'En pitch electrico (Bosch Rexroth, Mita-Teknik): bateria de emergencia descargada o capacitor charger fallando', probabilidad: 'media' },
      { causa: 'Motor pitch o servo con fallo de embobinado', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. El pitch es la unica forma de frenar el rotor a vientos altos. Una pala atascada en angulo bajo (cerca de 0°) con viento alto puede llevar a sobrevelocidad incontrolada.\n' +
      '1. NO subir hasta que el pitch este en feathered (90°) y rotor bloqueado con pin pasador.\n' +
      '2. Diagnostico desde SCADA: posicion comandada vs medida, corriente del motor pitch, codigo de error del controlador.\n' +
      '3. En pitch hidraulico: medir presion del acumulador en frio (60-80 bar tipico de pre-carga N2). Re-cargar con N2 si esta baja.\n' +
      '4. En pitch electrico: verificar tension de baterias de emergencia (ultracapacitores tipicos 24-48 V). Cambiar capacitores hinchados.\n' +
      '5. Si la falla es repetitiva: probar reemplazo de valvula proporcional / encoder. Son los items mas comunes.',
  },
  {
    codigo: 'AG-005',
    sintoma: 'Fault del sistema YAW (orientacion) - la maquina no orienta al viento',
    severidad: 'critico',
    orden: 5,
    causas: [
      { causa: 'Frenos de yaw atascados (presion constante por valvula trabada)', probabilidad: 'alta' },
      { causa: 'Pastillas de freno de yaw vencidas (desgaste a min, alarma por baja presion)', probabilidad: 'alta' },
      { causa: 'Motor de yaw quemado (en general 2 a 4 motores trabajando en paralelo)', probabilidad: 'media' },
      { causa: 'Engranaje de corona de yaw con diente roto o desgaste excesivo', probabilidad: 'media' },
      { causa: 'Sensor de posicion de yaw (encoder absoluto) en error', probabilidad: 'media' },
      { causa: 'Veleta o anemometro dando lectura erratica (la maquina no sabe a donde orientar)', probabilidad: 'media' },
    ],
    solucion:
      'CRITICO si la maquina queda mal orientada (load lateral, fatiga en torre). Bloquear hasta resolver.\n' +
      '1. Verificar que ningun freno este atascado: con maquina parada y bloqueada, soltar uno por uno y medir presion residual.\n' +
      '2. Inspeccionar pastillas de freno de yaw (suelen ser 8 a 16 calipers). Reemplazar las que esten por debajo de espesor minimo (varia segun OEM, tipico 3 mm).\n' +
      '3. Verificar corriente de los motores de yaw en operacion. Si uno levanta mucho mas: probable rodamiento del motor o engranaje localizado.\n' +
      '4. Inspeccion visual de la corona de yaw (ring gear). Dientes con pitting o spalling: planificar reemplazo.\n' +
      '5. Verificar lubricacion: grasa al ring gear (auto-lub system) y aceite en yaw drives. Falta de grasa acelera todo lo anterior.\n' +
      '6. Si los datos de viento (veleta + anemometro) son erraticos: ver AG-007.',
  },
  {
    codigo: 'AG-006',
    sintoma: 'CABLE TWIST: alarma de torsion de cable de potencia/comunicacion en la torre',
    severidad: 'advertencia',
    orden: 6,
    causas: [
      { causa: 'Yaw siempre en una misma direccion por viento sostenido sin rotacion inversa', probabilidad: 'alta' },
      { causa: 'Sensor de torsion (twist sensor) mal calibrado o disparando antes de tiempo', probabilidad: 'media' },
      { causa: 'Algoritmo de untwist deshabilitado o con bug en logica de control', probabilidad: 'media' },
    ],
    solucion:
      'Los cables de la gondola pasan por el centro de la torre. Despues de 2-3 vueltas en el mismo sentido (varia por OEM) hay que destorcer (untwist).\n' +
      '1. Verificar cantidad de vueltas en el contador del SCADA y comparar con limite del OEM (tipico 2.5 a 3 vueltas).\n' +
      '2. Ejecutar untwist manual: poner la maquina en idle, soltar frenos de yaw, accionar motores en sentido inverso hasta volver a 0 ± 30°.\n' +
      '3. Si el algoritmo no destorce automaticamente despues de ciertos limites: revisar configuracion del controlador (es comun que se desactive por error humano).\n' +
      '4. En Patagonia con viento muy direccional (oeste), las maquinas pasan dias sin rotar el rotor mas alla de un sector pequeño. Configurar untwist preventivo cada X dias o por horometro de orientacion.',
  },
  {
    codigo: 'AG-007',
    sintoma: 'Lecturas erraticas de anemometro o veleta (potencia oscilante, errores de orientacion)',
    severidad: 'advertencia',
    orden: 7,
    causas: [
      { causa: 'Hielo en el anemometro o veleta (icing)', probabilidad: 'alta' },
      { causa: 'Calefactor del sensor de viento fallando (en zonas con icing)', probabilidad: 'alta' },
      { causa: 'Sensor dañado por rayo o fatiga (rodamiento interno del cup anemometer)', probabilidad: 'media' },
      { causa: 'Cable de instrumentacion roto o con humedad en conector', probabilidad: 'media' },
      { causa: 'Turbulencia en estela de la propia torre (en cierta direccion)', probabilidad: 'baja' },
    ],
    solucion:
      '1. Inspeccionar visualmente sensores en el tope de la gondola. Si hay hielo: detener y derretir (calefactor o calor solar). Programar revision del heater.\n' +
      '2. Si el anemometro de copa esta entrabado: girar manualmente. Si no gira libre, reemplazar.\n' +
      '3. Reemplazar sensor por uno nuevo y calibrado (Vector, Thies, NRG). En Patagonia recomendable modelo con heater de alta potencia.\n' +
      '4. En estos casos, contrastar con MET MAST del parque o con SCADA de turbinas vecinas. Si todas marcan distinto a este: el problema es el sensor.\n' +
      '5. Para Madryn / Chubut: especificar sensores con grado de corrosion alto (acero inox 316 o titanio).',
  },
  {
    codigo: 'AG-008',
    sintoma: 'Frenado de emergencia disparado / E-STOP frecuente',
    severidad: 'critico',
    orden: 8,
    causas: [
      { causa: 'Sobrevelocidad detectada (rotor over RPM)', probabilidad: 'alta' },
      { causa: 'Vibracion superior a umbral de seguridad', probabilidad: 'alta' },
      { causa: 'Perdida de comunicacion entre controlador principal y safety chain', probabilidad: 'media' },
      { causa: 'Caida de tension de red (grid loss) y la maquina no soporto LVRT', probabilidad: 'media' },
      { causa: 'Sensor de freno o de pitch reportando error a la cadena de seguridad', probabilidad: 'media' },
      { causa: 'Watchdog del PLC reseteandose por falla de fuente o sobrecalentamiento del rack', probabilidad: 'baja' },
    ],
    solucion:
      '1. Bajar el log de eventos del controlador. El E-stop tiene una secuencia: identificar cual fue el PRIMER evento (los demas son consecuencia).\n' +
      '2. Si fue sobrevelocidad: ver AG-009.\n' +
      '3. Si fue grid loss: verificar registro del parque (PI o SCADA central). En Patagonia las caidas de tension de la 132 kV son comunes con viento alto.\n' +
      '4. Si fue vibracion: ver AG-001.\n' +
      '5. Verificar temperatura del rack del PLC. Cabinets sin AC funcionando bien pueden superar 50°C en verano patagonico, lo que causa resets erraticos.\n' +
      '6. En SCADA buscar patron: si los trips coinciden con cierto horario, viento, o temperatura ambiente, hay correlacion para investigar.',
  },
  {
    codigo: 'AG-009',
    sintoma: 'Disparo por sobrevelocidad del rotor (over RPM)',
    severidad: 'critico',
    orden: 9,
    causas: [
      { causa: 'Pitch respondiendo lento o atascado durante racha (ver AG-004)', probabilidad: 'alta' },
      { causa: 'Setpoint de power vs viento mal ajustado en region 3', probabilidad: 'alta' },
      { causa: 'Inercia del rotor mayor a la esperada por hielo (todas las palas con masa extra)', probabilidad: 'media' },
      { causa: 'Anemometro dando lectura baja (la maquina cree que hay menos viento del real, no hace feather)', probabilidad: 'media' },
      { causa: 'Tabla de pitch vs viento corrupta o desactualizada despues de firmware update', probabilidad: 'baja' },
      { causa: 'Generador en falla intermitente (perdida de torque resistente)', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. Sobrevelocidad sostenida puede llegar a runaway y destruccion total de la maquina. Es la falla mas peligrosa de un aerogenerador.\n' +
      '1. Revisar registro: cuanto tardo el pitch en ir a 90° desde el alarm. Tiempo objetivo varia por OEM (4 a 8 segundos tipico).\n' +
      '2. Verificar tiempos de respuesta de cada eje de pitch en SCADA. Diferencias entre palas > 0.5 s son indicio.\n' +
      '3. Confirmar lecturas de anemometro y veleta. Si subio el viento real pero el sensor no lo vio: hielo, daño o calibracion.\n' +
      '4. Verificar tabla de curva de potencia y pitch vs viento. Despues de firmware updates es comun que algun parametro vuelva al default y la maquina sobre-acelere.\n' +
      '5. Si se sospecha problema de generador: medir resistencia y aislacion. Generador en falla pierde torque resistente y el rotor se acelera.',
  },
  {
    codigo: 'AG-010',
    sintoma: 'Daño visible en pala (rayo, erosion en leading edge, fisura)',
    severidad: 'advertencia',
    orden: 10,
    causas: [
      { causa: 'Impacto de rayo (en Patagonia menos frecuente que en zonas tropicales, pero ocurre)', probabilidad: 'media' },
      { causa: 'Erosion de leading edge por arena, polvo o lluvia a alta velocidad', probabilidad: 'alta' },
      { causa: 'Fatiga estructural por ciclos de carga (frecuente despues de 8-12 años)', probabilidad: 'media' },
      { causa: 'Defecto de fabricacion (delaminacion en pull-pintura inicial)', probabilidad: 'baja' },
      { causa: 'Hielo despegado golpeando otra pala o estructura', probabilidad: 'baja' },
    ],
    solucion:
      '1. Inspeccion visual desde tierra con telescopio Swarovski o drone. Documentar fotos con escala.\n' +
      '2. Clasificar daño segun criterio del OEM (categorias I a IV tipico). Tipo IV o cerca: bajar la maquina y reparar.\n' +
      '3. Erosion en LE (leading edge erosion): reparable con LE protection tape o pintura especifica. En Patagonia con polvo + viento es problema recurrente.\n' +
      '4. Daño por rayo: verificar continuidad del down-conductor desde el receptor de la pala hasta la conexion a tierra de la torre. Resistencia debe ser < 10 Ohm.\n' +
      '5. Fisuras transversales o delaminaciones profundas: requiere intervencion de cuadrilla GWO + composite repair specialist. Coordinar con OEM warranty si aplica.',
  },
  {
    codigo: 'AG-011',
    sintoma: 'Ruido inusual en el tren cinematico (zumbido, golpeteo, chirrido)',
    severidad: 'advertencia',
    orden: 11,
    causas: [
      { causa: 'Rodamiento del eje de alta velocidad (HSS bearing) en falla incipiente', probabilidad: 'alta' },
      { causa: 'Acoplamiento entre gearbox y generador con elastomeros vencidos', probabilidad: 'media' },
      { causa: 'Lubricacion insuficiente en alguna etapa de la gearbox (filtro tapado, bomba de lubricacion fallando)', probabilidad: 'media' },
      { causa: 'Rotor magnetico tocando estator (en direct drive PMSG) por sag de rodamientos', probabilidad: 'baja' },
      { causa: 'Pernos sueltos en bridas o pernos de fundacion de gearbox', probabilidad: 'baja' },
    ],
    solucion:
      '1. Localizar la fuente del ruido subiendo (con seguridad: viento < 10 m/s, EPP completo, comunicacion con base).\n' +
      '2. Tomar mediciones de vibracion con vibrometro portatil en puntos clave (HSS, IMS, LSS, main bearing). Comparar con baseline historico.\n' +
      '3. Si el ruido es periodico y coincide con frecuencia BPFO/BPFI de un rodamiento conocido: confirmacion. Planificar cambio.\n' +
      '4. Verificar caudal de aceite a cada zona de la gearbox. Si el indicador de flujo de una linea esta bajo: filtro o linea tapada.\n' +
      '5. En direct drive (Enercon, Goldwind PMSG): el "air gap" entre rotor y estator debe ser uniforme. Verificacion con galga.',
  },
  {
    codigo: 'AG-012',
    sintoma: 'Fuga de aceite en multiplicadora o en sistema hidraulico',
    severidad: 'advertencia',
    orden: 12,
    causas: [
      { causa: 'Retenes de eje de gearbox vencidos (HSS y LSS son los mas comunes)', probabilidad: 'alta' },
      { causa: 'Mangueras o conexiones hidraulicas con fatiga o golpe', probabilidad: 'alta' },
      { causa: 'Tapas o juntas de carter mal ajustadas despues de mantenimiento previo', probabilidad: 'media' },
      { causa: 'Pinhole en intercambiador de calor del aceite', probabilidad: 'media' },
      { causa: 'Sobrellenado del oil sump (aceite sube por respiraderos)', probabilidad: 'baja' },
    ],
    solucion:
      '1. Identificar fuente exacta. Limpiar primero con desengrasante, dejar operar y observar donde aparece la nueva mancha.\n' +
      '2. Verificar nivel de aceite. Si bajo: completar con aceite del mismo OEM y grado. Mezclar aditivos / marcas degrada el aceite.\n' +
      '3. Ambiental: el aceite que cae al fondo de la gondola se acumula en bandeja de contencion. Drenar y disposicion adecuada (no botar).\n' +
      '4. Retenes de eje: requiere parada de varios dias para cambio. Si la fuga es pequeña, gestionar hasta proxima parada planificada.\n' +
      '5. Mangueras: cambiar la afectada y revisar las adyacentes (suelen vencer todas en lote por edad).\n' +
      '6. En zonas saladas como Madryn: revisar grade de mangueras. Caucho estandar se degrada rapido con UV + sal.',
  },
  {
    codigo: 'AG-013',
    sintoma: 'Perdida de potencia: la maquina genera menos kW que turbinas vecinas con mismo viento',
    severidad: 'advertencia',
    orden: 13,
    causas: [
      { causa: 'Hielo en las palas (icing) - causa el mayor lucro cesante en invierno patagonico', probabilidad: 'alta' },
      { causa: 'Pitch desviado de la curva optima (curva de cp degradada)', probabilidad: 'alta' },
      { causa: 'Erosion de leading edge muy avanzada (caida del Cp)', probabilidad: 'media' },
      { causa: 'Anemometro mal calibrado, mediciones bajas y la maquina opera derateada', probabilidad: 'media' },
      { causa: 'Generador con un devanado abierto operando degradado', probabilidad: 'media' },
      { causa: 'Cable de potencia con resistencia alta por terminal flojo o sulfatacion', probabilidad: 'baja' },
    ],
    solucion:
      '1. Comparar curva de potencia real (10 min averages, 6 meses) vs curva certificada del OEM. Usar Met Mast del parque para viento no afectado por estela.\n' +
      '2. Si la caida es estacional (invierno): probablemente icing. Evaluar sistema anti-icing (heater de palas) si el parque lo justifica.\n' +
      '3. Verificar leading edge: si esta erosionado mas alla del 20% del chord en la zona externa de las palas, recuperar coverage con tape o pintura especifica.\n' +
      '4. Auto-recalibracion de pitch: hacer test estatico con la maquina parada y nivelada, confirmar 0° y 90° por escala fisica.\n' +
      '5. Termografia en caja de bornes del generador y en union de cables en torre. Calientes > 60°C sobre ambiente indican alta resistencia.',
  },
  {
    codigo: 'AG-014',
    sintoma: 'Cable o conexion electrica caliente en torre (termografia)',
    severidad: 'critico',
    orden: 14,
    causas: [
      { causa: 'Terminal o conexion floja (torque insuficiente, fatiga termica acumulada)', probabilidad: 'alta' },
      { causa: 'Sulfatacion de conexion en zona con humedad y sal (Patagonia costera)', probabilidad: 'alta' },
      { causa: 'Cable sub-dimensionado o degradado por edad', probabilidad: 'media' },
      { causa: 'Conexion entre fases con sobrecarga (perdida de balance)', probabilidad: 'media' },
      { causa: 'Pantalla del cable desconectada o con perdida de continuidad', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. Una conexion floja en cable de potencia puede llegar a arco, incendio, y perdida total de la maquina.\n' +
      '1. Termografia con maquina a plena potencia. Identificar el punto caliente.\n' +
      '2. LOTO COMPLETO antes de tocar (rotor lock, candado en interruptor principal, descarga de capacitores, prueba con detector).\n' +
      '3. Abrir conexion, limpiar, verificar superficies de contacto. Re-aplicar pasta conductora especifica.\n' +
      '4. Re-torque con la herramienta y secuencia del OEM. Nunca eyeball.\n' +
      '5. Si la conexion estaba sulfatada (oxido verde-blanco): probablemente la junta perdio sellado. Cambiar junta y verificar ingreso de aire/agua.\n' +
      '6. Registrar baseline termografico cada 6 meses despues del fix.',
  },
  {
    codigo: 'AG-015',
    sintoma: 'Grid loss / undervoltage frecuente disparando la maquina',
    severidad: 'advertencia',
    orden: 15,
    causas: [
      { causa: 'Inestabilidad de la red de transmision del parque (debil sistema interconectado)', probabilidad: 'alta' },
      { causa: 'Configuracion de LVRT/HVRT del convertidor no alineada con norma vigente', probabilidad: 'media' },
      { causa: 'Transformador de la maquina con tap mal ajustado (sub-tension secundaria)', probabilidad: 'media' },
      { causa: 'Banco de capacitores del parque mal compensando reactivos', probabilidad: 'media' },
      { causa: 'Sensores de tension en el convertidor descalibrados', probabilidad: 'baja' },
    ],
    solucion:
      '1. Bajar el log del convertidor (Power Converter en Vestas, MMC en SgRE, etc). Identificar la magnitud y duracion exacta del evento de tension.\n' +
      '2. Comparar contra curva LVRT del OEM y de CAMMESA. Si la red oscila dentro de la curva pero la maquina sale: revisar configuracion del convertidor.\n' +
      '3. Coordinar con el operador del parque y con la transportista regional. Patagonia tiene tramos largos y debil compensacion reactiva.\n' +
      '4. Revisar tap del transformador interno (de gondola o torre). Si la tension de baja esta cerca del minimo: cambiar tap.\n' +
      '5. Si el problema es electrico del parque: ajustar setpoint de Q (reactivos) por SCADA central para compensar.',
  },
  {
    codigo: 'AG-016',
    sintoma: 'ICING: hielo en palas o sensores en invierno patagonico',
    severidad: 'advertencia',
    orden: 16,
    causas: [
      { causa: 'Condiciones meteorologicas favorables: humedad alta + temperatura < 0°C + viento moderado', probabilidad: 'alta' },
      { causa: 'Maquina sin sistema anti-icing instalado (la mayoria en Argentina no lo tiene)', probabilidad: 'alta' },
      { causa: 'Calefactor de sensores fuera de servicio', probabilidad: 'media' },
    ],
    solucion:
      'No es falla, es condicion operativa. En el sur durante junio-agosto puede pasar varios dias seguidos.\n' +
      '1. La maquina debe detectarse a si misma con hielo: bajada de potencia + vibracion + caida de RPM con viento alto.\n' +
      '2. Si la deteccion automatica no esta configurada: setear "ice detection" en SCADA con umbral apropiado (caida de Cp > 15%).\n' +
      '3. Parar la maquina hasta deshielo natural. Operar con hielo desbalancea el rotor y daña rodamientos.\n' +
      '4. Anti-icing electrico en pala (Vestas IPS, SgRE De-Ice) es caro pero amortiza en parques con > 200 horas/año de icing. Para Madryn evaluar caso por caso.\n' +
      '5. Para hielo desprendido cayendo: zona de exclusion alrededor de la maquina segun radio de pala + 1.5x (typicamente > 150 m).',
  },
  {
    codigo: 'AG-017',
    sintoma: 'Disparo del freno mecanico de rotor durante operacion (no por procedimiento)',
    severidad: 'critico',
    orden: 17,
    causas: [
      { causa: 'Sobrevelocidad confirmada (el freno mecanico es backup del freno aerodinamico/pitch)', probabilidad: 'alta' },
      { causa: 'Falla del sistema hidraulico que mantiene los frenos abiertos (perdida de presion)', probabilidad: 'alta' },
      { causa: 'Solenoide del freno mecanico atascada o con cableado en falla', probabilidad: 'media' },
      { causa: 'Pastillas de freno gastadas a min y rozando intermitentemente', probabilidad: 'media' },
      { causa: 'Watchdog del PLC interpretando estado erroneo de safety chain', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. Un freno mecanico aplicado a plena RPM genera enorme calor, puede destruir el disco y desbalancear el rotor.\n' +
      '1. NO reiniciar hasta inspeccionar disco y pastillas. Si el disco esta deformado o azul-violaceo por calor: reemplazar.\n' +
      '2. Verificar presion del sistema hidraulico que mantiene frenos abiertos. Si la presion cayo: hay fuga o bomba en falla.\n' +
      '3. Inspeccionar pastillas: espesor minimo segun OEM (tipico 4 mm). Si llegaron a min y rozaron, dejaron marcas en el disco.\n' +
      '4. Verificar circuito electrico de comando del freno (solenoides). Cables con humedad o conector flojo causa actuacion espuria.\n' +
      '5. Revisar el log: si el evento que dispara el freno fue overspeed, ir a AG-009. El freno mecanico nunca se activa solo en operacion normal.',
  },
];

export async function seedFallasAerogenerador() {
  await guardarFallasCatalogo({
    categoriaNombre: 'Aerogenerador',
    etiqueta: 'seedFallasAerogenerador',
    fallas: FALLAS,
  });
}

if (require.main === module) {
  ejecutarSeedStandalone(seedFallasAerogenerador);
}
