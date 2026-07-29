/**
 * Control de visibilidad de la ficha pública (QR).
 * Cada activo puede definir qué bloques de información son visibles sin login.
 * Si el activo no tiene configuración, se aplican defaults seguros:
 * la info de identificación es pública, los datos operativos sensibles no.
 */

export type ClaveVisibilidad =
  | 'identidad'      // codigo, nombre, marca, modelo, tipo
  | 'ubicacion'      // sector, ubicacion, itinerancia
  | 'estado'         // estado del activo y estado operativo
  | 'parametros'     // rangos de temperatura, amperaje, presion
  | 'mediciones'     // ultima medicion
  | 'responsable'    // nombre y telefono del responsable
  | 'mantenimiento'  // proximo mantenimiento, fechas
  | 'notas';         // notas libres

export type VisibilidadPublica = Record<ClaveVisibilidad, boolean>;

// Defaults seguros: se muestra lo no sensible, se ocultan mediciones,
// responsable e historial de mantenimiento.
export const VISIBILIDAD_DEFAULT: VisibilidadPublica = {
  identidad: true,
  ubicacion: true,
  estado: true,
  parametros: false,
  mediciones: false,
  responsable: false,
  mantenimiento: false,
  notas: true,
};

export function normalizarVisibilidad(raw: unknown): VisibilidadPublica {
  if (!raw || typeof raw !== 'object') return { ...VISIBILIDAD_DEFAULT };
  const v = raw as Record<string, unknown>;
  const out = { ...VISIBILIDAD_DEFAULT };
  (Object.keys(VISIBILIDAD_DEFAULT) as ClaveVisibilidad[]).forEach((k) => {
    if (typeof v[k] === 'boolean') out[k] = v[k] as boolean;
  });
  return out;
}

/**
 * Aplica la visibilidad a un activo ya cargado (con relaciones).
 * Elimina los campos cuyo bloque esté oculto.
 */
export function aplicarVisibilidad<T extends Record<string, any>>(activo: T): T {
  const vis = normalizarVisibilidad(activo.visibilidadPublica);
  const a: any = { ...activo, visibilidadPublica: vis };

  if (!vis.identidad) {
    a.marca = null;
    a.modelo = null;
    a.tipo = null;
  }
  if (!vis.ubicacion) {
    a.ubicacion = null;
    a.sector = null;
    a.esItinerante = false;
    a.locacionBase = null;
    a.locacionActual = null;
    a.fechaSalida = null;
    a.fechaRetorno = null;
  }
  if (!vis.estado) {
    a.estado = null;
    a.estadoOperativo = null;
  }
  if (!vis.parametros) {
    a.temperaturaMin = null;
    a.temperaturaMax = null;
    a.temperaturaAlerta = null;
    a.temperaturaCritica = null;
    a.amperajeNormal = null;
    a.presionNormal = null;
  }
  if (!vis.mediciones) {
    a.mediciones = [];
  }
  if (!vis.responsable) {
    a.responsable = null;
  }
  if (!vis.mantenimiento) {
    a.proximoMantenimiento = null;
    a.proximoMantenimientoLectura = null;
    a.estrategiaMantenimiento = null;
    a.intervaloMantenimiento = null;
    a.unidadMantenimiento = null;
    a.ultimaFechaMantenimiento = null;
    a.horasActuales = null;
    a.kilometrosActuales = null;
  }
  if (!vis.notas) {
    a.notas = null;
  }

  return a;
}
