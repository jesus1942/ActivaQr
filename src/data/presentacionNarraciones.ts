/**
 * Texto que se escucha en el modo automático de la presentación comercial.
 *
 * Está separado de las notas del expositor porque esas notas contienen
 * instrucciones de venta (por ejemplo, preguntas para hacerle al prospecto)
 * que no deben leerse literalmente durante una reproducción automática.
 */
export const NARRACIONES_PRESENTACION = [
  `Antes de empezar, pensemos en una pregunta muy simple. ¿Cuánto tarda hoy una empresa en saber qué pasó realmente con un equipo? ActivaQR nace para acortar esa distancia. Cada activo tiene un código QR que conecta su identidad, sus mediciones, sus tareas y su evidencia. No buscamos reemplazar el ERP ni el SCADA. Buscamos unir el dato técnico con la acción concreta, para que la historia del activo esté disponible antes de una falla y no recién cuando ya es tarde.`,

  `En muchas plantas no faltan datos. El problema es que llegan separados. Una medición queda en una planilla, una foto en un teléfono, una urgencia en un chat y la explicación final en la memoria de una persona. El ERP registra una parte del negocio y el SCADA observa el proceso, pero el trabajo de campo suele quedar fragmentado. ActivaQR reúne esas piezas alrededor del activo, para que detectar, decidir y cerrar formen parte de una misma historia verificable.`,

  `Lo que no se documenta también tiene un costo. En este ejemplo usamos diez horas de parada evitable y un costo de cuatrocientos cincuenta dólares por hora. El resultado, cuatro mil quinientos dólares mensuales, es solamente un escenario para dimensionar la conversación; no es una promesa de ahorro. La oportunidad empieza mucho antes de evitar todas las fallas: empieza cuando la empresa puede detectar antes, asignar más rápido y demostrar exactamente qué se hizo.`,

  `ActivaQR complementa los sistemas que la empresa ya tiene. El ERP ordena compras, costos, inventario y transacciones. El SCADA y los PLC observan variables, estados y alarmas del proceso. ActivaQR trabaja en otra capa: conecta el equipo con el técnico, la evidencia, la autorización, la orden y la auditoría. Si existe una integración, también puede recibir información de otros sistemas. El objetivo no es duplicar datos, sino darles continuidad operativa hasta que el problema quede resuelto.`,

  `Veamos el recorrido completo. Un técnico escanea el QR del equipo, registra una medición y adjunta el contexto necesario. Si el valor se desvía, ActivaQR genera una alerta. A partir de ahí se asigna una acción, se solicita la autorización que corresponda, se ejecuta el trabajo y se conserva la evidencia del cierre. Cada paso queda relacionado con el mismo activo. Así, una ronda de campo deja de ser un dato aislado y se convierte en una decisión trazable.`,

  `La misma información tiene que servirle a personas con responsabilidades distintas. El técnico necesita saber qué medir y qué tarea ejecutar. El responsable de mantenimiento necesita priorizar, asignar y comprobar. La dirección necesita indicadores claros para decidir, sin recorrer formularios técnicos. ActivaQR no propone una pantalla idéntica para todos. Propone una fuente común de verdad, con permisos y niveles de detalle acordes a cada rol.`,

  `Este es el dashboard operativo de ActivaQR. No hace falta leer cada número. Lo importante es la jerarquía: qué requiere atención, qué está pendiente y cómo viene evolucionando la operación. Desde un indicador se puede abrir el activo relacionado y llegar a sus mediciones, tareas y evidencia. El tablero no termina en un porcentaje; funciona como una puerta de entrada para saber dónde actuar primero y por qué.`,

  `Cada activo conserva su propio contexto técnico. En una sola ficha se puede identificar el equipo, ubicarlo, consultar sus características y recorrer su historial. Esto reduce la dependencia de la memoria individual. La prueba más sencilla es preguntarse si una persona nueva podría entender qué pasó con ese equipo sin llamar al técnico anterior. Cuando la respuesta está en el sistema, el conocimiento deja de perderse cada vez que cambia una guardia o un responsable.`,

  `Registrar una medición en campo no debería ser un trámite genérico. Por eso el formulario se adapta al tipo de activo y muestra los parámetros que realmente corresponden. La lectura puede acompañarse con observaciones, fotografía y ubicación cuando la política de la empresa lo requiera. Esos datos aportan contexto, pero su uso siempre debe respetar las reglas internas del cliente. El resultado es una medición útil, vinculada al equipo correcto y lista para alimentar alertas e historial.`,

  `Un plan preventivo tiene valor cuando se puede ver su cumplimiento. En esta pantalla, el equipo de mantenimiento distingue tareas vencidas, próximas y completadas. Cada actividad queda vinculada al activo y al responsable que intervino. Así se puede pasar de tener un cronograma en una planilla a gestionar trabajo visible, priorizado y comprobable. La idea no es sumar burocracia, sino reducir la incertidumbre sobre qué debía hacerse, cuándo y con qué resultado.`,

  `Una alerta no debe transformarse automáticamente en un gasto. En el flujo correctivo de ActivaQR, el desvío puede originar una cotización. Esa propuesta se revisa y se acepta antes de habilitar la orden de trabajo. Después se controlan los permisos de ejecución y recién entonces se realiza y documenta la intervención. Esta cadena separa con claridad detectar, presupuestar, autorizar y ejecutar. Cada decisión deja evidencia y puede ser revisada más adelante.`,

  `La auditoría responde tres preguntas básicas: quién hizo algo, qué cambió y cuándo ocurrió. Una medición fuera de rango, un cambio de estado o el cierre de una tarea dejan una secuencia consultable. Esto no reemplaza los procedimientos ni las certificaciones propias de cada industria. Aporta una evidencia operativa consistente, útil para investigar incidentes, revisar responsabilidades y demostrar que una acción efectivamente se completó.`,

  `El activo es el centro del grafo operativo. A su alrededor se relacionan mediciones, alertas, tareas, mantenimientos, documentos y decisiones. No son módulos aislados: cada relación permite seguir el camino desde la lectura original hasta el cierre. Esta estructura evita reconstruir un incidente buscando información en distintos lugares. La historia se consulta desde el equipo y conserva tanto el dato técnico como el contexto humano que explica qué se decidió.`,

  `La conectividad de una planta no siempre acompaña el trabajo de campo. ActivaQR contempla una cola local para registrar información cuando la señal es inestable y sincronizarla cuando vuelve la conexión. No hablamos de operar indefinidamente sin internet, sino de evitar que una ronda se pierda por un corte momentáneo. El alcance se define según los sectores, los dispositivos y las políticas del cliente, especialmente cuando existen redes industriales o zonas con restricciones.`,

  `ActivaQR está pensado como una plataforma multiempresa. Cada organización trabaja dentro de su propio límite de datos. El identificador de la empresa surge de la sesión autenticada y no de un valor que la pantalla pueda elegir libremente. A eso se suman roles y permisos para reducir el alcance de cada usuario. Este diseño aporta aislamiento y control, aunque siempre debe complementarse con las políticas de identidad, acceso y seguridad que defina la organización.`,

  `ERP, SCADA y ActivaQR resuelven capas distintas. El ERP se concentra en las transacciones del negocio. El SCADA observa y controla variables del proceso. ActivaQR acompaña la gestión del activo en campo: lecturas, fotos, tareas, autorizaciones y evidencia. Por eso la conversación correcta no es cuál sistema reemplaza a cuál, sino cómo se conectan para evitar puntos ciegos. Si la empresa ya utiliza un C M M S o un E A M, se comparan los flujos y las APIs antes de definir la complementariedad.`,

  `Cuando una empresa dice “ya tenemos ERP”, es una buena señal. Significa que ya valora la información ordenada. La respuesta no es cuestionar esa inversión. Es revisar si el ERP también resuelve el recorrido del técnico frente al activo, la evidencia de campo y el cierre operativo. Si ese espacio ya está cubierto, se analiza la integración. Si no lo está, un piloto acotado permite demostrar convivencia y valor sin modificar de entrada los procesos centrales.`,

  `Cuando la empresa ya tiene SCADA, existe una base técnica muy valiosa. El SCADA puede detectar una señal o generar una alarma. ActivaQR agrega el contexto de lo que ocurre después: quién inspeccionó, qué encontró, qué foto tomó, quién autorizó y cómo se cerró el trabajo. No prometemos una integración universal. La factibilidad depende del protocolo, las APIs, las exportaciones disponibles y las reglas de ciberseguridad de la planta.`,

  `Antes de aprobar una prueba, el área de tecnología necesita límites claros. Qué datos entran, quién accede, desde qué dispositivos, durante cuánto tiempo y cómo se realiza la salida. Por eso conviene incluir al equipo de sistemas desde el diseño del piloto, con un alcance documentado y responsables definidos. Si la organización exige certificaciones o controles específicos, se registran como requisitos concretos. La confianza no se construye con promesas generales, sino con un perímetro que pueda revisarse.`,

  `Finanzas suele preguntar por el precio de la solución. La comparación más útil también incluye el costo de no cambiar: horas de parada, tiempo administrativo, reincidencia y dificultad para demostrar tareas. Para construir un caso económico serio necesitamos datos del propio prospecto. Tres valores alcanzan para empezar: costo estimado por hora, horas evitables y cantidad de activos incluidos. Con eso se arma un escenario transparente, sin convertir una estimación en una garantía.`,

  `La adopción se define con preguntas prácticas. ¿Cuánto tarda la puesta en marcha? ¿Qué ocurre si no hay señal? ¿Quién puede ver o modificar un registro? ¿Se pueden importar datos existentes? ¿Cómo se acompaña a los técnicos? Cada respuesta debe corresponder a una capacidad real o a un alcance claramente acordado. Si algo requiere desarrollo, se presenta como hoja de ruta. La pregunta final es la más importante: qué podría impedir que el equipo use ActivaQR todos los días.`,

  `Este simulador no promete un retorno. Sirve para conversar con datos del prospecto. Podemos ajustar la cantidad de activos, las horas de parada evitable y el costo estimado por hora. A partir de ahí se observa la exposición mensual y un porcentaje ilustrativo de valor recuperable. El número final no decide por sí solo. Lo importante es acordar qué métrica concreta vamos a observar durante el piloto para saber si ActivaQR produjo una mejora verificable.`,

  `Un piloto de treinta días reduce el riesgo de decidir. Se elige un sector con un problema visible, un grupo acotado de activos y responsables definidos. Primero se releva la situación actual. Después se configuran equipos, usuarios y recorridos. Durante la prueba se acompaña el uso y se registran tanto los resultados como las fricciones. El cierre no es una demostración comercial: es una reunión de evidencia para decidir qué funcionó, qué debe ajustarse y si conviene escalar.`,

  `El piloto tiene que aprobarse con evidencia, no solamente con entusiasmo. Conviene elegir entre tres y cinco criterios claros: tiempo de detección, cumplimiento de tareas, calidad del historial, uso efectivo por parte del equipo o reducción de registros dispersos. También se documentan los inconvenientes y los pasos manuales que aparezcan. Esa información permite decidir con honestidad y diseñar una expansión que respete la operación real.`,

  `La propuesta comercial se adapta al tamaño de la empresa, a la cantidad de activos, usuarios, sedes e integraciones necesarias. Lo que no se negocia es la trazabilidad, el aislamiento de datos y los controles de seguridad. Lo que sí puede ajustarse es el alcance, el acompañamiento y la velocidad de despliegue. Por eso el plan se presenta después de entender la operación. Primero definimos el problema y la prueba; después dimensionamos la solución adecuada.`,

  `El próximo paso no es comprar a ciegas. Es demostrar. La propuesta es elegir un sector, seleccionar alrededor de veinte activos y acordar una prueba controlada. Para que funcione hacen falta un responsable técnico, un sponsor con capacidad de decisión y una fecha de relevamiento. En treinta días la empresa debería contar con evidencia suficiente para responder una pregunta concreta: ¿ActivaQR mejora la forma en que detectamos, decidimos y demostramos el trabajo sobre nuestros activos?`,
] as const;

export const CONFIGURACION_NARRACION = {
  idioma: 'es-AR',
  velocidad: 0.84,
  tono: 1,
  pausaEntreLaminasMs: 1100,
} as const;
