/**
 * Catalogo de fallas tipicas de autoelevadores y equipos de izaje de planta.
 *
 * Cubre contrabalanceados diesel/GLP, electricos a bateria, reach trucks y
 * montacargas. Las soluciones marcan explicitamente la inspeccion pre-uso
 * obligatoria y los puntos donde un mal mantenimiento mata operadores
 * (vuelco lateral, perdida de carga, falla de frenos).
 *
 * Mercado objetivo: terminales portuarias (Puerto Madryn, Puerto Deseado,
 * Buenos Aires), parques eolicos (manejo de componentes pesados),
 * frigorificos (electricos en camara fria), Vaca Muerta (movimiento de
 * casing y herramienta), almacenes y plantas industriales medianas.
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

const FALLAS: FallaSeed[] = [
  {
    codigo: 'AE-001',
    sintoma: 'Perdida de fuerza de elevacion (no levanta la carga nominal o lo hace muy lento)',
    severidad: 'critico',
    orden: 1,
    causas: [
      { causa: 'Aceite hidraulico bajo (perdida en cilindros, mangueras o tanque)', probabilidad: 'alta' },
      { causa: 'Valvula de alivio principal regulada por debajo de la presion nominal', probabilidad: 'alta' },
      { causa: 'Bomba hidraulica desgastada (pierde caudal interno por holguras)', probabilidad: 'media' },
      { causa: 'Filtro de succion tapado (cavitacion de bomba)', probabilidad: 'media' },
      { causa: 'Cilindro principal pasando aceite por sello interno', probabilidad: 'media' },
      { causa: 'Sobrecarga: la carga real supera la capacidad a ese centro/altura', probabilidad: 'media' },
    ],
    solucion:
      'CRITICO. Un autoelevador que no levanta la nominal NO debe usarse: probable falla cercana que puede dejar caer la carga.\n' +
      '1. Lectura del horometro y nivel de aceite. Bajar mastil al piso, completar al nivel correcto con aceite del mismo grado (ISO VG 32 o 46 tipico).\n' +
      '2. Verificar carga real con balanza si hay duda. Recordar la curva: a 1000 mm de centro la capacidad baja ~30% respecto a 500 mm.\n' +
      '3. Medir presion del circuito principal con manometro en el puerto de prueba (P1). Comparar con valor de placa del fabricante.\n' +
      '4. Si la presion no llega: ajustar valvula de alivio o reemplazar. Nunca aflojar el seguro sin saber el valor correcto: sobre-presion rompe mangueras.\n' +
      '5. Si la presion llega pero el mastil baja solo con carga (cae con peso): cilindro principal con sello interno pasando. Cambio de kit de sellos o reemplazo.\n' +
      '6. Verificar filtro de succion. Cavitacion de bomba se escucha como zumbido agudo y deja la bomba dañada en pocas horas.',
  },
  {
    codigo: 'AE-002',
    sintoma: 'El mastil sube o baja a saltos / con tirones',
    severidad: 'advertencia',
    orden: 2,
    causas: [
      { causa: 'Aire atrapado en el circuito hidraulico (despues de cambio de manguera o cilindro)', probabilidad: 'alta' },
      { causa: 'Cadenas del mastil desbalanceadas (una mas tensa que la otra)', probabilidad: 'alta' },
      { causa: 'Rodillos del mastil desgastados o secos de grasa', probabilidad: 'media' },
      { causa: 'Guias del mastil desalineadas (golpe o deformacion)', probabilidad: 'media' },
      { causa: 'Valvula proporcional de levante con desgaste o suciedad', probabilidad: 'baja' },
    ],
    solucion:
      '1. Purgar aire del circuito: bajar y subir el mastil al maximo 5-6 veces sin carga. Si el problema desaparece: era aire.\n' +
      '2. Verificar tension de las dos cadenas con el mastil arriba. Deben tener la misma tension al tacto. Ajustar tuercas tensoras hasta igualar.\n' +
      '3. Engrasar rodillos del mastil y guias. Inspeccionar rodillos: si tienen marcas planas o juego radial, reemplazar.\n' +
      '4. Verificar que la columna del mastil esta recta y las guias no estan torcidas (golpes contra estructuras).\n' +
      '5. Si el problema sigue con todo el resto OK: limpiar o reemplazar valvula proporcional de levante.',
  },
  {
    codigo: 'AE-003',
    sintoma: 'Fuga de aceite hidraulico (charcos bajo la maquina, suciedad en cilindros)',
    severidad: 'advertencia',
    orden: 3,
    causas: [
      { causa: 'Sellos del vastago del cilindro principal vencidos', probabilidad: 'alta' },
      { causa: 'Mangueras de alta presion con fatiga, golpe o conexion floja', probabilidad: 'alta' },
      { causa: 'Sellos de cilindros de inclinacion (tilt) vencidos', probabilidad: 'media' },
      { causa: 'Tapon de retorno al tanque flojo', probabilidad: 'media' },
      { causa: 'Cilindro de side shift con sello roto', probabilidad: 'media' },
    ],
    solucion:
      '1. Localizar la fuga exacta. Limpiar con desengrasante, dejar trabajar la maquina, observar donde reaparece.\n' +
      '2. Si es del vastago del cilindro principal: cambio de kit de sellos (rascador, sello principal, anti-extrusion). Operacion media, 4 a 8 horas.\n' +
      '3. Mangueras: cambiar la afectada. Si tiene mas de 8 años de servicio, evaluar cambio del lote completo de mangueras de alta. Recordar trabajar con LOTO hidraulico (descargar presion bajando mastil al piso) antes de aflojar.\n' +
      '4. Sellos de cilindros de inclinacion: si la pintura del vastago se ve oscura por aceite, son los sellos. Cambio.\n' +
      '5. Ambiental: el aceite hidraulico contamina suelo. Recoger con kit absorbente, disponer como residuo peligroso. En frigorificos esto es ademas un problema sanitario.',
  },
  {
    codigo: 'AE-004',
    sintoma: 'Cadenas del mastil con desgaste, fisuras o estiramiento desigual',
    severidad: 'critico',
    orden: 4,
    causas: [
      { causa: 'Vida util agotada (varia segun OEM, 8000-15000 horas tipico)', probabilidad: 'alta' },
      { causa: 'Lubricacion insuficiente o ausente', probabilidad: 'alta' },
      { causa: 'Operacion sostenida con sobrecarga', probabilidad: 'media' },
      { causa: 'Polea / catalina dañada con dientes con desgaste irregular', probabilidad: 'media' },
      { causa: 'Corrosion (operacion en frigorificos o ambiente costero salino)', probabilidad: 'media' },
    ],
    solucion:
      'CRITICO. Cadena rota = mastil cae con la carga. Mata operadores.\n' +
      '1. Medir elongacion: tomar 20 pasos consecutivos sin carga y comparar con la medida nominal del fabricante. Si elongo > 2%: cambiar la cadena. Si una cadena elongo mas que la otra: cambiar ambas (siempre se cambian de a par).\n' +
      '2. Inspeccionar pasador por pasador en busca de fisuras transversales o axiales. Cualquier fisura visible obliga al cambio.\n' +
      '3. Engrasar segun OEM con aceite de baja viscosidad penetrante (no grasa pesada). La grasa atrae polvo y forma pasta abrasiva entre eslabones.\n' +
      '4. Verificar las catalinas / poleas. Si los dientes tienen forma de gancho o estan desgastados de un solo lado: cambiar tambien.\n' +
      '5. En ambiente salino o frigorifico: especificar cadenas con tratamiento anticorrosivo. Llevar registro de horas trabajadas y planificar cambio preventivo antes del limite OEM.',
  },
  {
    codigo: 'AE-005',
    sintoma: 'Uñas (horquillas) dobladas, fisuradas o con desgaste excesivo en talon',
    severidad: 'critico',
    orden: 5,
    causas: [
      { causa: 'Operacion sostenida con sobrecarga', probabilidad: 'alta' },
      { causa: 'Golpes contra estructuras (palet, piso, racks)', probabilidad: 'alta' },
      { causa: 'Carga muy desplazada del centro (alta tension en talon de uña)', probabilidad: 'media' },
      { causa: 'Uñas con vida util excedida sin chequeo periodico', probabilidad: 'media' },
    ],
    solucion:
      'CRITICO. Una uña que se rompe deja caer la carga. Es la causa #1 de accidentes con autoelevadores en planta.\n' +
      '1. Medir espesor del talon con calibre. Si esta por debajo del 90% del espesor original: descartar uña. Ese es el limite ISO 5057.\n' +
      '2. Inspeccion visual: cualquier fisura, doblez perceptible, o uña deformada hacia abajo (tip mas bajo que el otro): cambiar ambas (de a par).\n' +
      '3. Marcar las uñas con codigo (numero de serie + año de instalacion) para llevar registro.\n' +
      '4. Verificar el carro porta-horquillas. Si esta deformado tambien: cambiar el carro.\n' +
      '5. Capacitar operadores: no usar uñas para empujar, no apoyar carga descentrada, no chocar contra pisos. Cada golpe acumula fatiga.',
  },
  {
    codigo: 'AE-006',
    sintoma: 'Frenos blandos, esponjosos o sin frenado adecuado',
    severidad: 'critico',
    orden: 6,
    causas: [
      { causa: 'Liquido de frenos bajo o contaminado con agua (DOT3/DOT4 vencido)', probabilidad: 'alta' },
      { causa: 'Pastillas o cintas de freno desgastadas a min', probabilidad: 'alta' },
      { causa: 'Aire en el circuito hidraulico de frenos', probabilidad: 'media' },
      { causa: 'Bomba de freno (cilindro maestro) con sellos vencidos', probabilidad: 'media' },
      { causa: 'Mangueras flexibles del freno dilatadas (envejecidas)', probabilidad: 'media' },
      { causa: 'Tambores o discos rayados / con corrosion', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. Autoelevador sin frenos en deposito = atropella personas. No operar hasta resolver.\n' +
      '1. Verificar nivel y aspecto del liquido en deposito. Si esta oscuro/marron: cambiar liquido y purgar.\n' +
      '2. Inspeccionar pastillas/cintas. Espesor minimo varia por OEM (tipico 1.5 a 2 mm). Por debajo: cambio.\n' +
      '3. Purgar circuito: en autoelevadores con tambor + disco hay multiples puntos de purga. Empezar por el mas lejano.\n' +
      '4. Si despues de purgado y pastillas nuevas el pedal sigue blando: cilindro maestro con sellos vencidos. Cambio.\n' +
      '5. Probar el freno de estacionamiento en pendiente del 15% con carga nominal. Debe sostener sin deslizar.\n' +
      '6. Patagonia / Madryn: las rampas portuarias y los muelles tienen pendientes. Si el freno de estacionamiento no aguanta, el equipo no debe operarse ahi.',
  },
  {
    codigo: 'AE-007',
    sintoma: 'Sobrecalentamiento del motor (diesel o GLP)',
    severidad: 'critico',
    orden: 7,
    causas: [
      { causa: 'Radiador tapado externamente (polvo, residuos, harina, paja)', probabilidad: 'alta' },
      { causa: 'Nivel bajo de refrigerante o sin agua', probabilidad: 'alta' },
      { causa: 'Termostato pegado cerrado', probabilidad: 'media' },
      { causa: 'Bomba de agua dañada o correa floja/rota', probabilidad: 'media' },
      { causa: 'Tapon de radiador con junta vencida (pierde presion)', probabilidad: 'media' },
      { causa: 'Operacion sostenida en zonas muy calientes sin pausa de enfriamiento', probabilidad: 'media' },
    ],
    solucion:
      '1. Verificar nivel de refrigerante en frio. Completar con la mezcla correcta (agua + anticongelante segun OEM).\n' +
      '2. Limpiar radiador externamente con aire comprimido a baja presion (no doblar aletas). En frigorificos o panaderias se tapa rapido con polvo y residuos.\n' +
      '3. Verificar tension de correa de bomba de agua y ventilador. Cambiar si esta grietada o vencida.\n' +
      '4. Test del termostato: motor frio en marcha, palpar manguera superior del radiador. Si esta fria y el motor calienta: termostato pegado. Cambio.\n' +
      '5. Para Motor Diesel ver tambien MD-004 en catalogo de motores diesel.\n' +
      '6. Operativo: en almacenes calurosos (sin AC), planificar pausas de enfriamiento del equipo cada 2-3 horas de operacion continua.',
  },
  {
    codigo: 'AE-008',
    sintoma: 'Bateria de traccion no mantiene carga o autonomia muy corta (electrico)',
    severidad: 'advertencia',
    orden: 8,
    causas: [
      { causa: 'Bateria de plomo-acido sulfatada (mal mantenimiento, descargas profundas repetidas)', probabilidad: 'alta' },
      { causa: 'Nivel de electrolito bajo en celdas (falta de agua destilada)', probabilidad: 'alta' },
      { causa: 'Cargador inteligente con perfil de carga mal configurado', probabilidad: 'media' },
      { causa: 'Celdas individuales debiles (medir tension por celda)', probabilidad: 'media' },
      { causa: 'Bateria con vida util excedida (1200-1500 ciclos tipico)', probabilidad: 'media' },
      { causa: 'Bornes corroidos o flojos (en frigorifico la condensacion lo acelera)', probabilidad: 'baja' },
    ],
    solucion:
      '1. Medir tension de cada celda en banco con multimetro. Celdas con tension < 2.0 V (descargada) o < 0.05 V de diferencia con otras (debil): batería sulfatada o con celda muerta.\n' +
      '2. Verificar nivel de electrolito. Debe cubrir las placas. Completar SOLO con agua destilada despues de carga completa (no en descarga).\n' +
      '3. Inspeccion de bornes. Limpiar con bicarbonato + agua si hay sulfato, aplicar grasa anti-corrosiva al re-conectar.\n' +
      '4. Verificar el perfil de carga del cargador: tension de bulk, absorcion, float, ecualizacion. OEM da los valores exactos.\n' +
      '5. Carga de ecualizacion 1 vez por mes (en plomo-acido inundada). Importante para revertir sulfatacion incipiente.\n' +
      '6. En frigorificos: especificar baterias con vasos sellados (gel/AGM) o litio. La condensacion en plomo-acido inundada genera fugas y corrosion rapida.',
  },
  {
    codigo: 'AE-009',
    sintoma: 'Neumaticos desgastados, planos, picados o con grietas',
    severidad: 'advertencia',
    orden: 9,
    causas: [
      { causa: 'Vida util agotada (varia por uso, normalmente 1500-3000 horas)', probabilidad: 'alta' },
      { causa: 'Operacion sostenida sobre piso con vidrios, virutas u objetos cortantes', probabilidad: 'alta' },
      { causa: 'Sobrecarga (genera deformacion permanente y desgaste lateral)', probabilidad: 'media' },
      { causa: 'Presion incorrecta (en cubiertas neumaticas)', probabilidad: 'media' },
      { causa: 'Direccion descalibrada (convergencia mal) genera desgaste irregular', probabilidad: 'media' },
    ],
    solucion:
      '1. Medir desgaste midiendo profundidad de surco o, en cubiertas macizas, observando la linea testigo del fabricante.\n' +
      '2. En cubiertas macizas (mas comunes en interior, frigorificos, terminales): cuando llegaron a la linea, cambiar. No esperar.\n' +
      '3. En cubiertas neumaticas: medir presion en frio segun OEM. Sobre y sub-inflado generan desgaste rapido.\n' +
      '4. Cambio siempre por pares (eje completo) para mantener equilibrio.\n' +
      '5. Desgaste irregular (mas en un lado): revisar convergencia y angulos de direccion.\n' +
      '6. En terminales portuarias y obra: barrer el area de trabajo. Un vidrio o varilla acabe con una cubierta en pocas horas.',
  },
  {
    codigo: 'AE-010',
    sintoma: 'Sistema de inclinacion (tilt) del mastil no responde, lento o desigual',
    severidad: 'advertencia',
    orden: 10,
    causas: [
      { causa: 'Aceite hidraulico bajo o aire en los cilindros de inclinacion', probabilidad: 'alta' },
      { causa: 'Sellos de uno de los cilindros de tilt vencidos (un cilindro mas debil que el otro)', probabilidad: 'alta' },
      { causa: 'Valvula direccional de tilt con desgaste o suciedad', probabilidad: 'media' },
      { causa: 'Bujes / pivotes del mastil sin grasa o secos', probabilidad: 'media' },
      { causa: 'Estructura del mastil torcida por golpe', probabilidad: 'baja' },
    ],
    solucion:
      '1. Inclinar al maximo adelante y atras varias veces sin carga para purgar aire. Verificar nivel de aceite.\n' +
      '2. Si un cilindro acompaña al otro pero con holgura (uno termina antes que el otro): sellos del cilindro mas rapido vencidos. Cambio.\n' +
      '3. Engrasar pivotes y bujes del mastil. La operacion los seca rapido en ambientes polvorientos.\n' +
      '4. Valvula de control: si el movimiento no es proporcional al joystick / palanca, limpieza interna o reemplazo.\n' +
      '5. Si el mastil no se inclina parejo (queda torcido): estructura dañada. Verificar planitud con regla / nivel laser.',
  },
  {
    codigo: 'AE-011',
    sintoma: 'Direccion dura, con juego excesivo o que tira hacia un lado',
    severidad: 'advertencia',
    orden: 11,
    causas: [
      { causa: 'Bomba de direccion asistida con baja presion o caudal', probabilidad: 'alta' },
      { causa: 'Cilindro de direccion con sellos vencidos (pasa aceite entre camaras)', probabilidad: 'alta' },
      { causa: 'Bujes / pivotes de mangueta de direccion sin grasa', probabilidad: 'media' },
      { causa: 'Rotulas de barra de direccion con juego', probabilidad: 'media' },
      { causa: 'Cubierta del eje direccional descentrada o con presion despareja', probabilidad: 'media' },
    ],
    solucion:
      '1. Verificar nivel de aceite hidraulico (algunos modelos comparten tanque con el sistema de elevacion).\n' +
      '2. Medir presion de salida de la bomba de direccion con manometro. Si esta baja: bomba desgastada.\n' +
      '3. Inspeccionar el cilindro de direccion. Si las dos camaras son del mismo diametro y la maquina no centra bien: sellos pasando.\n' +
      '4. Verificar juego en rotulas barra-mangueta. Cualquier juego perceptible: cambio.\n' +
      '5. Engrasar todos los puntos del tren delantero / direccional segun ficha de mantenimiento.\n' +
      '6. En piso muy desnivelado (canteras, obra): la cubierta direccional sufre mas. Alternar lado del operador si la operacion es repetitiva.',
  },
  {
    codigo: 'AE-012',
    sintoma: 'Side shift atascado, lento o no centra',
    severidad: 'info',
    orden: 12,
    causas: [
      { causa: 'Guias del side shift sucias o con falta de grasa', probabilidad: 'alta' },
      { causa: 'Sellos del cilindro de side shift vencidos', probabilidad: 'media' },
      { causa: 'Carro del side shift con desgaste irregular', probabilidad: 'media' },
      { causa: 'Valvula de side shift con suciedad o desgaste', probabilidad: 'media' },
    ],
    solucion:
      '1. Limpiar guias del side shift con desengrasante. Engrasar segun ficha.\n' +
      '2. Si despues de la limpieza sigue lento: cilindro de side shift con sellos vencidos. Cambio.\n' +
      '3. Inspeccionar guias del carro: si hay desgaste en escalon, se traba en zonas del recorrido.\n' +
      '4. Operativo: el side shift es para ajustar centimetros, no para mover paletas grandes lateralmente. Capacitar operadores.',
  },
  {
    codigo: 'AE-013',
    sintoma: 'Humo excesivo por el escape (diesel o GLP)',
    severidad: 'advertencia',
    orden: 13,
    causas: [
      { causa: 'Filtro de aire saturado (mezcla rica, humo negro)', probabilidad: 'alta' },
      { causa: 'Inyectores diesel o regulador GLP descalibrado', probabilidad: 'media' },
      { causa: 'Aceite quemandose (humo azul: aros, retenes vencidos)', probabilidad: 'media' },
      { causa: 'GLP: regulador con fuga interna o tobera con suciedad', probabilidad: 'media' },
      { causa: 'Sobrecarga sostenida del motor (operando mas alla del rango eficiente)', probabilidad: 'baja' },
    ],
    solucion:
      '1. Filtro de aire es el primer cambio. En almacen con polvo, panaderia con harina, frigorifico con condensacion: cambio mas frecuente que la ficha del OEM.\n' +
      '2. Para motor diesel ver tambien catalogo MD-001 a MD-013 (sintomas comunes).\n' +
      '3. En GLP: humo intenso suele ser regulador. El regulador es el componente que mas falla del sistema GLP. Cambio o ajuste por especialista.\n' +
      '4. Humo azul persistente: aros y retenes de valvulas. Operacion mayor.\n' +
      '5. Ventilacion del local: humo + CO en almacenes mal ventilados intoxica operadores. Si la maquina genera humo y trabaja en cerrado: parar y resolver, no postergar.',
  },
  {
    codigo: 'AE-014',
    sintoma: 'Sobre-temperatura del aceite hidraulico (alarma de SCADA o termo visual)',
    severidad: 'critico',
    orden: 14,
    causas: [
      { causa: 'Operacion sostenida a presion maxima (trabajo intenso continuo)', probabilidad: 'alta' },
      { causa: 'Intercambiador de calor del aceite tapado externamente', probabilidad: 'alta' },
      { causa: 'Aceite vencido o de viscosidad incorrecta', probabilidad: 'media' },
      { causa: 'Valvula de alivio descargando aceite frecuentemente (generando calor)', probabilidad: 'media' },
      { causa: 'Ventilador del cooler del aceite no funciona', probabilidad: 'media' },
    ],
    solucion:
      'CRITICO. Aceite hidraulico > 90°C oxida en horas y daña sellos y bombas.\n' +
      '1. Parar y dejar enfriar antes de seguir.\n' +
      '2. Limpiar intercambiador de calor del aceite (suele ser un mini radiador). En ambiente con polvo se tapa rapido.\n' +
      '3. Verificar ventilador del cooler. Si no funciona: revisar fusible, rele termostatico, motor.\n' +
      '4. Cambio de aceite y filtros si se sospecha aceite vencido. Sacar muestra para analisis si la operacion es critica.\n' +
      '5. Si la maquina opera todo el dia a presion maxima: el calculo del cooler fue ajustado. Considerar instalacion de cooler auxiliar.\n' +
      '6. Verificar que la valvula de alivio no descargue continuamente (sobre-carga genera calor).',
  },
  {
    codigo: 'AE-015',
    sintoma: 'Falla en sistemas de seguridad (claxon, baliza, alarma de retroceso, cinturon, OPSS)',
    severidad: 'critico',
    orden: 15,
    causas: [
      { causa: 'Bombilla / LED de baliza quemado', probabilidad: 'alta' },
      { causa: 'Sensor de marcha atras desconectado o dañado', probabilidad: 'alta' },
      { causa: 'Cinturon de seguridad sin enrollar o con anclaje suelto', probabilidad: 'alta' },
      { causa: 'Sensor OPSS (presencia de operador en asiento) en falla', probabilidad: 'media' },
      { causa: 'Cableado dañado por golpe o por humedad', probabilidad: 'media' },
      { causa: 'Bocina con bobina quemada', probabilidad: 'baja' },
    ],
    solucion:
      'CRITICO. Autoelevador sin avisadores funcionales NO debe operar segun la Ley 19.587 (Higiene y Seguridad en Trabajo) y Decreto 351/79 Argentina.\n' +
      '1. Reemplazar bombillas / LED quemados de baliza. Verificar funcionamiento al subir a operar (parte de inspeccion pre-uso).\n' +
      '2. Alarma de retroceso: probar al activar reversa. Si no suena: revisar sensor, cableado, parlante.\n' +
      '3. Cinturon: verificar que se enrolla solo, que la traba funciona, que los anclajes estan firmes. Cinturon que no se cierra: cambio.\n' +
      '4. OPSS: con operador sentado debe permitir operacion. Con asiento vacio y maquina prendida: no debe responder a comandos (en algunos modelos despues de 3-5 segundos).\n' +
      '5. Capacitar operadores en inspeccion pre-uso: si falta un avisador, no se sube. Es regla, no opcion.\n' +
      '6. Llevar registro escaneable del check pre-uso (ActivaQR puede hacer eso).',
  },
  {
    codigo: 'AE-016',
    sintoma: 'Vibracion o ruido anormal en motor de traccion (electrico)',
    severidad: 'advertencia',
    orden: 16,
    causas: [
      { causa: 'Rodamientos del motor de traccion gastados', probabilidad: 'alta' },
      { causa: 'Escobillas / carbones del motor desgastados (en motores DC)', probabilidad: 'alta' },
      { causa: 'Anillo colector con marcas o suciedad (motores DC)', probabilidad: 'media' },
      { causa: 'Acoplamiento motor-transmision con juego', probabilidad: 'media' },
      { causa: 'Fijaciones del motor flojas', probabilidad: 'media' },
    ],
    solucion:
      '1. Escuchar el ruido a velocidades distintas. Ruido proporcional a velocidad y bajo carga: rodamientos. Ruido como "estatica" + chispas visibles: carbones.\n' +
      '2. En motor DC: inspeccionar carbones. Si quedan < 10 mm o si la cara de contacto esta despareja: cambio.\n' +
      '3. Limpieza del colector con lija fina y solvente especifico. No usar limas ni lijas gruesas.\n' +
      '4. En motor AC trifasico: rodamientos. Cambio. En electricos modernos los rodamientos vienen sellados y duran mucho, asi que si ya estan ruidosos suelen ser los originales con muchas horas.\n' +
      '5. Verificar torque de fijaciones del motor al chasis. Pernos flojos amplifican vibracion.',
  },
];

export async function seedFallasAutoelevador() {
  const categoria = await prisma.categoriaEquipo.findFirst({
    where: { nombre: 'Autoelevador / Equipo de Izaje', empresaId: null },
  });
  if (!categoria) {
    console.log('seedFallasAutoelevador: categoria "Autoelevador / Equipo de Izaje" no encontrada, saltando');
    return;
  }

  let creadas = 0;
  let actualizadas = 0;
  for (const falla of FALLAS) {
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
  console.log(`seedFallasAutoelevador: ${creadas} creadas, ${actualizadas} actualizadas`);
}

if (require.main === module) {
  seedFallasAutoelevador()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
