// Analisis predictivo de series temporales para mantenimiento.
// Combina tendencia (regresion lineal + R²), proyeccion de umbrales y
// deteccion robusta de anomalias mediante mediana/MAD para no confundir
// ruido aislado con una degradacion real.

export interface PuntoMedicion {
  fecha: Date;
  valor: number;
}

export type Direccion = 'creciente' | 'decreciente';
export type Severidad = 'normal' | 'observar' | 'alerta' | 'critico';
export type ConfianzaPrediccion = 'insuficiente' | 'baja' | 'media' | 'alta';

export interface AnomaliaDetectada {
  fecha: Date;
  valor: number;
  score: number;
  tipo: 'desvio_estadistico' | 'salto_brusco';
  nivel: 'observar' | 'alerta';
}

export interface ResultadoAnalisis {
  cantidadPuntos: number;
  primerValor: number | null;
  ultimoValor: number | null;
  delta: number | null;
  pendienteMensual: number | null;
  periodoDias: number;
  confianza: ConfianzaPrediccion;
  prediccionDisponible: boolean;
  tendencia: 'subiendo' | 'estable' | 'bajando' | null;
  diasHastaAlerta: number | null;
  diasHastaCritico: number | null;
  severidad: Severidad;
  anomalias: AnomaliaDetectada[];
  ultimaAnomalia: AnomaliaDetectada | null;
  resumen: string;
  recomendacion: string | null;
}

function mediana(valores: number[]): number {
  if (!valores.length) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[mitad] : (ordenados[mitad - 1] + ordenados[mitad]) / 2;
}

function mad(valores: number[], centro = mediana(valores)): number {
  return mediana(valores.map((v) => Math.abs(v - centro)));
}

/** Detecta outliers contra una ventana movil previa, sin mirar datos futuros. */
function detectarAnomalias(puntos: PuntoMedicion[]): AnomaliaDetectada[] {
  if (puntos.length < 6) return [];
  const resultado: AnomaliaDetectada[] = [];

  for (let i = 5; i < puntos.length; i++) {
    const inicio = Math.max(0, i - 12);
    const ventana = puntos.slice(inicio, i);
    const valores = ventana.map((p) => p.valor);
    const centro = mediana(valores);
    const dispersion = mad(valores, centro);
    const desvio = Math.abs(puntos[i].valor - centro);

    // Z robusto: funciona mejor que media/desvio estandar ante outliers previos.
    const escalaMinima = Math.max(Math.abs(centro) * 0.08, 0.25);
    const scoreDesvio = dispersion > 1e-9
      ? (0.6745 * desvio) / dispersion
      : desvio > escalaMinima ? 6 : 0;

    const diferencias = ventana.slice(1).map((p, idx) => p.valor - ventana[idx].valor);
    const centroDif = diferencias.length ? mediana(diferencias) : 0;
    const dispersionDif = diferencias.length ? mad(diferencias, centroDif) : 0;
    const salto = Math.abs((puntos[i].valor - puntos[i - 1].valor) - centroDif);
    const saltoMinimo = Math.max(Math.abs(centro) * 0.12, 0.5);
    const scoreSalto = dispersionDif > 1e-9
      ? (0.6745 * salto) / dispersionDif
      : salto > saltoMinimo ? 6 : 0;

    const score = Math.max(scoreDesvio, scoreSalto);
    if (score < 4.5) continue;

    resultado.push({
      fecha: puntos[i].fecha,
      valor: puntos[i].valor,
      score,
      tipo: scoreSalto > scoreDesvio ? 'salto_brusco' : 'desvio_estadistico',
      nivel: score >= 6 ? 'alerta' : 'observar',
    });
  }

  return resultado;
}

function pendienteLineal(puntos: PuntoMedicion[]): number {
  if (puntos.length < 5) return 0;
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

function coeficienteDeterminacion(puntos: PuntoMedicion[], pendiente: number): number {
  if (puntos.length < 2) return 0;
  const base = puntos[0].fecha.getTime();
  const xs = puntos.map((p) => (p.fecha.getTime() - base) / 86400000);
  const mediaX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const mediaY = puntos.reduce((a, p) => a + p.valor, 0) / puntos.length;
  const intercepto = mediaY - pendiente * mediaX;
  const total = puntos.reduce((acc, p) => acc + (p.valor - mediaY) ** 2, 0);
  if (total === 0) return 1;
  const residual = puntos.reduce((acc, p, i) => {
    const estimado = intercepto + pendiente * xs[i];
    return acc + (p.valor - estimado) ** 2;
  }, 0);
  return Math.max(0, Math.min(1, 1 - residual / total));
}

function diasHasta(valorActual: number, umbral: number, pendienteDiaria: number, direccion: Direccion): number | null {
  if (direccion === 'creciente') {
    if (valorActual >= umbral || pendienteDiaria <= 0) return null;
    return Math.round((umbral - valorActual) / pendienteDiaria);
  }
  if (valorActual <= umbral || pendienteDiaria >= 0) return null;
  return Math.round((valorActual - umbral) / Math.abs(pendienteDiaria));
}

export interface AnalizarOpciones {
  puntos: PuntoMedicion[];
  alerta: number | null | undefined;
  critico: number | null | undefined;
  direccion: Direccion;
  unidad: string;
  parametro: string;
}

export function analizarTendencia({ puntos, alerta, critico, direccion, unidad, parametro }: AnalizarOpciones): ResultadoAnalisis {
  const puntosValidos = puntos.filter((p) => Number.isFinite(p.valor) && p.fecha instanceof Date && !isNaN(p.fecha.getTime()));
  if (puntosValidos.length === 0) {
    return {
      cantidadPuntos: 0, primerValor: null, ultimoValor: null, delta: null, pendienteMensual: null,
      periodoDias: 0, confianza: 'insuficiente', prediccionDisponible: false, tendencia: null,
      diasHastaAlerta: null, diasHastaCritico: null, severidad: 'normal', anomalias: [], ultimaAnomalia: null,
      resumen: 'Sin mediciones suficientes para analizar tendencia.', recomendacion: null,
    };
  }

  const ordenados = [...puntosValidos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const primer = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  const delta = ultimo.valor - primer.valor;
  const periodoDias = Math.max(0, (ultimo.fecha.getTime() - primer.fecha.getTime()) / 86400000);
  const historialSuficiente = ordenados.length >= 5 && periodoDias >= 7;
  const pendienteDiaria = historialSuficiente ? pendienteLineal(ordenados) : 0;
  const r2 = historialSuficiente ? coeficienteDeterminacion(ordenados, pendienteDiaria) : 0;
  const prediccionDisponible = historialSuficiente && r2 >= 0.5;
  const pendienteMensual = prediccionDisponible ? pendienteDiaria * 30 : null;
  const confianza: ConfianzaPrediccion = !historialSuficiente ? 'insuficiente'
    : r2 >= 0.85 && periodoDias >= 30 && ordenados.length >= 8 ? 'alta'
    : r2 >= 0.7 ? 'media'
    : r2 >= 0.5 ? 'baja'
    : 'insuficiente';

  const rango = Math.max(0.5, Math.abs(critico ?? alerta ?? ultimo.valor) * 0.05);
  let tendencia: 'subiendo' | 'estable' | 'bajando' | null = prediccionDisponible ? 'estable' : null;
  if (pendienteMensual != null && pendienteMensual > rango) tendencia = 'subiendo';
  else if (pendienteMensual != null && pendienteMensual < -rango) tendencia = 'bajando';

  const diasAlerta = prediccionDisponible && alerta != null ? diasHasta(ultimo.valor, alerta, pendienteDiaria, direccion) : null;
  const diasCritico = prediccionDisponible && critico != null ? diasHasta(ultimo.valor, critico, pendienteDiaria, direccion) : null;
  const anomalias = detectarAnomalias(ordenados);
  const ultimaAnomalia = anomalias.length ? anomalias[anomalias.length - 1] : null;
  const limiteReciente = ordenados[Math.max(0, ordenados.length - 2)].fecha.getTime();
  const anomaliaReciente = ultimaAnomalia && ultimaAnomalia.fecha.getTime() >= limiteReciente ? ultimaAnomalia : null;

  let severidad: Severidad = 'normal';
  const cruzaAlerta = alerta != null && (direccion === 'creciente' ? ultimo.valor >= alerta : ultimo.valor <= alerta);
  const cruzaCritico = critico != null && (direccion === 'creciente' ? ultimo.valor >= critico : ultimo.valor <= critico);
  if (cruzaCritico) severidad = 'critico';
  else if (cruzaAlerta) severidad = 'alerta';
  else if ((diasCritico != null && diasCritico <= 90) || (diasAlerta != null && diasAlerta <= 60)) severidad = 'alerta';
  else if ((diasCritico != null && diasCritico <= 180) || (diasAlerta != null && diasAlerta <= 120)) severidad = 'observar';
  if (anomaliaReciente?.nivel === 'alerta' && severidad === 'normal') severidad = 'alerta';
  else if (anomaliaReciente && severidad === 'normal') severidad = 'observar';

  const ultimoTxt = `${ultimo.valor.toFixed(1)}${unidad}`;
  const periodoTxt = periodoDias < 1 ? 'menos de un día'
    : periodoDias < 30 ? `${Math.max(1, Math.round(periodoDias))} días`
    : periodoDias < 60 ? '1 mes'
    : `${Math.round(periodoDias / 30)} meses`;

  let resumen: string;
  if (!prediccionDisponible) {
    const estadoUmbral = cruzaCritico ? 'en nivel crítico' : cruzaAlerta ? 'en alerta' : 'sin tendencia confirmada';
    resumen = `${parametro} ${estadoUmbral}: ${ultimoTxt}. Historial: ${ordenados.length} mediciones en ${periodoTxt}; todavía no alcanza para proyectar.`;
  } else if (tendencia === 'estable' || pendienteMensual === null) {
    resumen = `${parametro} estable: ${ultimoTxt} (${ordenados.length} mediciones en ${periodoTxt}).`;
  } else {
    const verbo = pendienteMensual > 0 ? 'subió' : 'bajó';
    resumen = `${parametro} ${verbo} ${Math.abs(delta).toFixed(1)}${unidad} en ${periodoTxt}. Actual: ${ultimoTxt}.`;
  }
  if (anomaliaReciente) {
    resumen += ` Anomalía reciente detectada (${anomaliaReciente.tipo === 'salto_brusco' ? 'salto brusco' : 'desvío estadístico'}).`;
  } else if (anomalias.length) {
    resumen += ` Se detectaron ${anomalias.length} anomalía${anomalias.length === 1 ? '' : 's'} en el historial.`;
  }

  let recomendacion: string | null = null;
  if (cruzaCritico) {
    recomendacion = `${parametro} cruzó el umbral CRÍTICO (${critico}${unidad}). Valor actual: ${ultimoTxt}. Intervención correctiva inmediata.`;
  } else if (cruzaAlerta) {
    recomendacion = `${parametro} cruzó el umbral de ALERTA (${alerta}${unidad}). Valor actual: ${ultimoTxt}. Prioridad alta: revisar dentro de las próximas 24 horas y confirmar con una nueva medición.`;
  } else if (diasCritico != null && diasCritico <= 90) {
    recomendacion = `${parametro} proyecta cruzar el umbral CRÍTICO (${critico}${unidad}) en ~${diasCritico} días al ritmo actual. Programar mantenimiento predictivo antes.`;
  } else if (diasAlerta != null && diasAlerta <= 60) {
    recomendacion = `${parametro} proyecta cruzar el umbral de alerta (${alerta}${unidad}) en ~${diasAlerta} días. Conviene revisar antes de que escale.`;
  } else if (anomaliaReciente) {
    recomendacion = `${parametro} presentó un ${anomaliaReciente.tipo === 'salto_brusco' ? 'salto brusco' : 'valor atípico'} (${anomaliaReciente.valor.toFixed(1)}${unidad}). Verificar proceso y sensor y confirmar con una nueva lectura antes de descartar la señal.`;
  }

  return {
    cantidadPuntos: ordenados.length,
    primerValor: primer.valor,
    ultimoValor: ultimo.valor,
    delta,
    pendienteMensual,
    periodoDias,
    confianza,
    prediccionDisponible,
    tendencia,
    diasHastaAlerta: diasAlerta,
    diasHastaCritico: diasCritico,
    severidad,
    anomalias,
    ultimaAnomalia,
    resumen,
    recomendacion,
  };
}
