// Analisis de tendencias para mantenimiento predictivo.
// Funciones puras, sin React. Tomadas como entrada las mediciones de un
// parametro a lo largo del tiempo y los umbrales del activo, calculan la
// pendiente, proyectan cuando se cruza el umbral y devuelven una
// recomendacion textual lista para mostrar.

export interface PuntoMedicion {
  fecha: Date;
  valor: number;
}

export type Direccion = 'creciente' | 'decreciente';
export type Severidad = 'normal' | 'observar' | 'alerta' | 'critico';

export interface ResultadoAnalisis {
  cantidadPuntos: number;
  primerValor: number | null;
  ultimoValor: number | null;
  delta: number | null; // ultimoValor - primerValor
  pendienteMensual: number | null; // unidades / 30 dias
  tendencia: 'subiendo' | 'estable' | 'bajando' | null;
  diasHastaAlerta: number | null; // null si no se proyecta o ya esta cruzado
  diasHastaCritico: number | null;
  severidad: Severidad;
  resumen: string; // resumen textual para mostrar en pantalla
  recomendacion: string | null; // texto para usar como observacion de tarea predictiva
}

/**
 * Regresion lineal simple sobre los puntos. Devuelve la pendiente expresada
 * en unidades-por-dia. Si hay menos de 3 puntos o todos cayeron el mismo dia,
 * devuelve 0 para evitar predicciones ridiculas.
 */
function pendienteLineal(puntos: PuntoMedicion[]): number {
  if (puntos.length < 3) return 0;
  const base = puntos[0].fecha.getTime();
  const dias = puntos.map((p) => (p.fecha.getTime() - base) / 86400000);
  if (dias[dias.length - 1] === dias[0]) return 0;
  const n = puntos.length;
  const sumX = dias.reduce((a, b) => a + b, 0);
  const sumY = puntos.reduce((a, p) => a + p.valor, 0);
  const sumXY = dias.reduce((a, x, i) => a + x * puntos[i].valor, 0);
  const sumX2 = dias.reduce((a, x) => a + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Estima dias hasta cruzar el umbral, partiendo del valor actual y la
 * pendiente diaria. Devuelve null si la pendiente apunta en la direccion
 * opuesta (no se va a cruzar) o si ya esta cruzado.
 */
function diasHasta(valorActual: number, umbral: number, pendienteDiaria: number, direccion: Direccion): number | null {
  if (direccion === 'creciente') {
    if (valorActual >= umbral) return null; // ya cruzo
    if (pendienteDiaria <= 0) return null; // no se acerca
    return Math.round((umbral - valorActual) / pendienteDiaria);
  } else {
    if (valorActual <= umbral) return null;
    if (pendienteDiaria >= 0) return null;
    return Math.round((valorActual - umbral) / Math.abs(pendienteDiaria));
  }
}

export interface AnalizarOpciones {
  puntos: PuntoMedicion[];
  alerta: number | null | undefined;
  critico: number | null | undefined;
  direccion: Direccion;
  unidad: string;
  parametro: string; // ej "Temperatura", "Bateria"
}

export function analizarTendencia({
  puntos,
  alerta,
  critico,
  direccion,
  unidad,
  parametro,
}: AnalizarOpciones): ResultadoAnalisis {
  const puntosValidos = puntos.filter((p) => Number.isFinite(p.valor) && p.fecha instanceof Date && !isNaN(p.fecha.getTime()));
  if (puntosValidos.length === 0) {
    return {
      cantidadPuntos: 0,
      primerValor: null,
      ultimoValor: null,
      delta: null,
      pendienteMensual: null,
      tendencia: null,
      diasHastaAlerta: null,
      diasHastaCritico: null,
      severidad: 'normal',
      resumen: 'Sin mediciones suficientes para analizar tendencia.',
      recomendacion: null,
    };
  }

  const ordenados = [...puntosValidos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const primer = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  const delta = ultimo.valor - primer.valor;
  const pendienteDiaria = pendienteLineal(ordenados);
  const pendienteMensual = pendienteDiaria * 30;

  // Tendencia categorica: hace falta una variacion minima (5% del rango o
  // 1 unidad) para no marcar oscilaciones de ruido como tendencia.
  const rango = Math.max(0.5, Math.abs(critico ?? alerta ?? ultimo.valor) * 0.05);
  let tendencia: 'subiendo' | 'estable' | 'bajando' | null = 'estable';
  if (pendienteMensual > rango) tendencia = 'subiendo';
  else if (pendienteMensual < -rango) tendencia = 'bajando';

  const diasAlerta = alerta != null ? diasHasta(ultimo.valor, alerta, pendienteDiaria, direccion) : null;
  const diasCritico = critico != null ? diasHasta(ultimo.valor, critico, pendienteDiaria, direccion) : null;

  // Severidad: depende de si ya cruzo umbrales o si va camino a hacerlo.
  let severidad: Severidad = 'normal';
  const cruzaAlerta = alerta != null && (direccion === 'creciente' ? ultimo.valor >= alerta : ultimo.valor <= alerta);
  const cruzaCritico = critico != null && (direccion === 'creciente' ? ultimo.valor >= critico : ultimo.valor <= critico);
  if (cruzaCritico) severidad = 'critico';
  else if (cruzaAlerta) severidad = 'alerta';
  else if ((diasCritico != null && diasCritico <= 90) || (diasAlerta != null && diasAlerta <= 60)) severidad = 'alerta';
  else if ((diasCritico != null && diasCritico <= 180) || (diasAlerta != null && diasAlerta <= 120)) severidad = 'observar';

  // Texto de resumen
  let resumen: string;
  const ultimoTxt = `${ultimo.valor.toFixed(1)}${unidad}`;
  const periodoMeses = (ultimo.fecha.getTime() - primer.fecha.getTime()) / (30 * 86400000);
  const periodoTxt = periodoMeses < 1.2 ? 'el ultimo mes' : `los ultimos ${Math.round(periodoMeses)} meses`;
  if (tendencia === 'estable' || pendienteMensual === null) {
    resumen = `${parametro} estable: ${ultimoTxt} (${ordenados.length} mediciones en ${periodoTxt}).`;
  } else {
    const verbo = pendienteMensual > 0 ? 'subio' : 'bajo';
    const variacion = Math.abs(delta).toFixed(1);
    resumen = `${parametro} ${verbo} ${variacion}${unidad} en ${periodoTxt}. Actual: ${ultimoTxt}.`;
  }

  // Recomendacion para tarea predictiva
  let recomendacion: string | null = null;
  if (cruzaCritico) {
    recomendacion = `${parametro} cruzo el umbral CRITICO (${critico}${unidad}). Valor actual: ${ultimoTxt}. Intervencion correctiva inmediata.`;
  } else if (cruzaAlerta) {
    recomendacion = `${parametro} cruzo el umbral de ALERTA (${alerta}${unidad}). Valor actual: ${ultimoTxt}. Programar revision en los proximos 7 dias.`;
  } else if (diasCritico != null && diasCritico <= 90) {
    recomendacion = `${parametro} proyecta cruzar el umbral CRITICO (${critico}${unidad}) en ~${diasCritico} dias al ritmo actual. Programar mantenimiento predictivo antes.`;
  } else if (diasAlerta != null && diasAlerta <= 60) {
    recomendacion = `${parametro} proyecta cruzar el umbral de alerta (${alerta}${unidad}) en ~${diasAlerta} dias. Conviene revisar antes de que escale.`;
  }

  return {
    cantidadPuntos: ordenados.length,
    primerValor: primer.valor,
    ultimoValor: ultimo.valor,
    delta,
    pendienteMensual,
    tendencia,
    diasHastaAlerta: diasAlerta,
    diasHastaCritico: diasCritico,
    severidad,
    resumen,
    recomendacion,
  };
}
