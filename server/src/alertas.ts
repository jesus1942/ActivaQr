/**
 * Lógica inteligente de alertas.
 * Calcula el estado de una medición comparando los valores medidos
 * contra los umbrales configurados en el activo.
 *
 * Jerarquía: urgente > critico > alerta > normal
 */

export type NivelAlerta = 'normal' | 'alerta' | 'critico' | 'urgente';

const NIVEL: Record<NivelAlerta, number> = {
  normal: 0, alerta: 1, critico: 2, urgente: 3,
};

function peor(a: NivelAlerta, b: NivelAlerta): NivelAlerta {
  return NIVEL[a] >= NIVEL[b] ? a : b;
}

export function peorEstado(a: NivelAlerta, b: NivelAlerta): NivelAlerta {
  return peor(a, b);
}

export interface ParametroConUmbrales {
  clave: string;
  tipo: 'numerico' | 'porcentaje' | 'booleano' | 'texto' | 'seleccion';
  valoresAlerta?: unknown;
  valoresCritico?: unknown;
  valoresUrgente?: unknown;
  umbralAlerta?: number | null;
  umbralCritico?: number | null;
  umbralUrgente?: number | null;
  minNormal?: number | null;
  maxNormal?: number | null;
  invertido?: boolean;
}

function contieneValor(configurados: unknown, valor: unknown): boolean {
  if (!Array.isArray(configurados)) return false;
  const actual = String(valor).trim().toLowerCase();
  return configurados.some((item) => String(item).trim().toLowerCase() === actual);
}

/** Evalúa parámetros configurables de una categoría (pH, cloro, RPM, etc.). */
export function calcularEstadoParametrosExtra(
  valores: Record<string, unknown> | null | undefined,
  parametros: ParametroConUmbrales[],
): NivelAlerta {
  if (!valores) return 'normal';
  let estado: NivelAlerta = 'normal';

  for (const parametro of parametros) {
    const valorOriginal = valores[parametro.clave];
    if (valorOriginal === undefined || valorOriginal === null || valorOriginal === '') continue;

    let actual: NivelAlerta = 'normal';
    if (contieneValor(parametro.valoresUrgente, valorOriginal)) actual = 'urgente';
    else if (contieneValor(parametro.valoresCritico, valorOriginal)) actual = 'critico';
    else if (contieneValor(parametro.valoresAlerta, valorOriginal)) actual = 'alerta';
    else if (parametro.tipo === 'numerico' || parametro.tipo === 'porcentaje') {
      const valor = Number(valorOriginal);
      if (!Number.isFinite(valor)) continue;
      if (parametro.invertido) {
        if (parametro.umbralUrgente != null && valor <= parametro.umbralUrgente) actual = 'urgente';
        else if (parametro.umbralCritico != null && valor <= parametro.umbralCritico) actual = 'critico';
        else if (parametro.umbralAlerta != null && valor <= parametro.umbralAlerta) actual = 'alerta';
        else if (parametro.minNormal != null && valor < parametro.minNormal) actual = 'alerta';
      } else {
        if (parametro.umbralUrgente != null && valor >= parametro.umbralUrgente) actual = 'urgente';
        else if (parametro.umbralCritico != null && valor >= parametro.umbralCritico) actual = 'critico';
        else if (parametro.umbralAlerta != null && valor >= parametro.umbralAlerta) actual = 'alerta';
        else if (parametro.maxNormal != null && valor > parametro.maxNormal) actual = 'alerta';
        else if (parametro.minNormal != null && valor < parametro.minNormal) actual = 'alerta';
      }
    }
    estado = peor(estado, actual);
  }
  return estado;
}

/** Evalúa un valor numérico contra umbrales (menor = peor, ej: batería, tóner). */
function evaluarMinimo(valor: number, alerta?: number | null, critico?: number | null): NivelAlerta {
  if (critico != null && valor <= critico) return 'urgente';
  if (alerta != null && valor <= alerta) return 'critico';
  return 'normal';
}

/** Evalúa un valor numérico contra umbrales (mayor = peor, ej: temperatura, amperaje, presión). */
function evaluarMaximo(valor: number, alerta?: number | null, critico?: number | null, maximo?: number | null): NivelAlerta {
  if (maximo != null && valor > maximo) return 'urgente';
  if (critico != null && valor >= critico) return 'critico';
  if (alerta != null && valor >= alerta) return 'alerta';
  return 'normal';
}

interface UmbralesActivo {
  temperaturaMin?: number | null;
  temperaturaAlerta?: number | null;
  temperaturaCritica?: number | null;
  temperaturaMax?: number | null;
  amperajeNormal?: number | null;
  amperajeAlerta?: number | null;
  amperajeCritico?: number | null;
  presionNormal?: number | null;
  presionAlerta?: number | null;
  presionCritica?: number | null;
  voltajeMin?: number | null;
  voltajeMax?: number | null;
  voltajeAlerta?: number | null;
  bateriaAlerta?: number | null;
  bateriaCritica?: number | null;
  tonerAlerta?: number | null;
  tonerCritico?: number | null;
}

interface ValoresMedicion {
  temperatura?: number | null;
  amperaje?: number | null;
  presion?: number | null;
  voltaje?: number | null;
  porcentajeBateria?: number | null;
  nivelToner?: number | null;
  vibracion?: 'ninguna' | 'leve' | 'moderada' | 'alta' | null;
}

/**
 * Calcula el estado automático de una medición.
 * Si no hay umbrales configurados para un parámetro, ese parámetro no contribuye al estado.
 * El estado final es el peor de todos los parámetros evaluados.
 */
export function calcularEstadoAutomatico(
  valores: ValoresMedicion,
  umbrales: UmbralesActivo,
): NivelAlerta {
  let estado: NivelAlerta = 'normal';

  if (valores.temperatura != null) {
    // Temperatura alta: alerta/critico/urgente segun umbrales
    estado = peor(estado, evaluarMaximo(
      valores.temperatura,
      umbrales.temperaturaAlerta,
      umbrales.temperaturaCritica,
      umbrales.temperaturaMax,
    ));
    // Temperatura baja: por debajo del minimo tambien es anormal
    if (umbrales.temperaturaMin != null && valores.temperatura < umbrales.temperaturaMin) {
      estado = peor(estado, 'alerta');
    }
  }

  if (valores.amperaje != null) {
    estado = peor(estado, evaluarMaximo(
      valores.amperaje,
      umbrales.amperajeAlerta,
      umbrales.amperajeCritico,
    ));
    // Amperaje en 0 con un valor normal esperado = equipo detenido o falla de sensor
    if (umbrales.amperajeNormal != null && umbrales.amperajeNormal > 0 && valores.amperaje === 0) {
      estado = peor(estado, 'alerta');
    }
  }

  if (valores.presion != null) {
    estado = peor(estado, evaluarMaximo(
      valores.presion,
      umbrales.presionAlerta,
      umbrales.presionCritica,
    ));
    // Presion en 0 con un valor normal esperado = sin presion, anormal
    if (umbrales.presionNormal != null && umbrales.presionNormal > 0 && valores.presion === 0) {
      estado = peor(estado, 'alerta');
    }
  }

  // Vibracion: moderada = alerta, alta = critico
  if (valores.vibracion != null) {
    if (valores.vibracion === 'alta') estado = peor(estado, 'critico');
    else if (valores.vibracion === 'moderada') estado = peor(estado, 'alerta');
  }

  if (valores.voltaje != null) {
    // Voltaje en 0 = equipo sin energia o falla, siempre anormal
    if (valores.voltaje === 0) {
      estado = peor(estado, 'critico');
    }
    // Voltaje fuera de rango → alerta; muy fuera → critico
    if (umbrales.voltajeMin != null && valores.voltaje < umbrales.voltajeMin) {
      estado = peor(estado, 'alerta');
    }
    if (umbrales.voltajeMax != null && valores.voltaje > umbrales.voltajeMax) {
      estado = peor(estado, evaluarMaximo(
        valores.voltaje,
        umbrales.voltajeAlerta,
        umbrales.voltajeMax,
      ));
    }
  }

  // Batería y tóner: valores bajos son peores
  if (valores.porcentajeBateria != null) {
    estado = peor(estado, evaluarMinimo(
      valores.porcentajeBateria,
      umbrales.bateriaAlerta,
      umbrales.bateriaCritica,
    ));
  }

  if (valores.nivelToner != null) {
    estado = peor(estado, evaluarMinimo(
      valores.nivelToner,
      umbrales.tonerAlerta,
      umbrales.tonerCritico,
    ));
  }

  return estado;
}

/**
 * Convierte el estado de la medición al estado del activo.
 * urgente → critico (el activo entra en estado crítico, necesita intervención)
 * critico → critico
 * alerta  → alerta
 * normal  → normal
 */
export function estadoMedicionAActivo(estadoMedicion: NivelAlerta): 'normal' | 'alerta' | 'critico' | 'mantenimiento' {
  if (estadoMedicion === 'urgente' || estadoMedicion === 'critico') return 'critico';
  if (estadoMedicion === 'alerta') return 'alerta';
  return 'normal';
}
