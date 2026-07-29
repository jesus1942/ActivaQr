// v1.1.0
export type EstadoActivo = 'normal' | 'alerta' | 'critico' | 'mantenimiento';
export type EstadoMedicion = 'normal' | 'revision' | 'urgente';
export type EstadoOperativo = 'operativo' | 'pausa' | 'mantenimiento' | 'montaje' | 'fuera_servicio';
export type EstrategiaMantenimiento = 'horas' | 'kilometros' | 'fecha';
export type UnidadMantenimiento = 'horas' | 'kilometros' | 'dias' | 'semanas' | 'meses';

export interface Sector {
  id: string;
  nombre: string;
  color?: string;
  activo: boolean;
}

export interface TipoActivo {
  id: string;
  nombre: string;
  icono?: string;
  categoriaId?: string | null;
  mideTemperatura: boolean;
  mideAmperaje: boolean;
  midePresion: boolean;
  mideVibracion: boolean;
  mideBateria?: boolean;
  mideToner?: boolean;
  mideContador?: boolean;
  mideVoltaje?: boolean;
  mideHoras?: boolean;
  activo: boolean;
}

export interface Tecnico {
  id: string;
  nombre: string;
  cargo?: string;
  activo: boolean;
}

export interface Activo {
  id: string;
  codigo: string;
  nombre: string;
  tipoId: string;
  sectorId: string;
  marca: string;
  modelo: string;
  fechaIngreso: string;
  ubicacion: string;
  fotoUrl?: string | null;
  responsableId: string;
  horasActuales: number;
  kilometrosActuales?: number;
  estrategiaMantenimiento?: EstrategiaMantenimiento;
  intervaloMantenimiento?: number | null;
  unidadMantenimiento?: UnidadMantenimiento | null;
  proximoMantenimientoLectura?: number | null;
  ultimaFechaMantenimiento?: string | null;
  estado: EstadoActivo;
  estadoOperativo?: EstadoOperativo;
  temperaturaMin: number;
  temperaturaMax: number;
  temperaturaAlerta: number;
  temperaturaCritica: number;
  amperajeNormal: number;
  amperajeAlerta?: number | null;
  amperajeCritico?: number | null;
  presionNormal: number;
  presionAlerta?: number | null;
  presionCritica?: number | null;
  voltajeMin?: number | null;
  voltajeMax?: number | null;
  voltajeAlerta?: number | null;
  bateriaAlerta?: number | null;
  bateriaCritica?: number | null;
  tonerAlerta?: number | null;
  tonerCritico?: number | null;
  intervaloMedicionHoras: number;
  intervaloLubricacionHoras: number;
  intervaloRodamientoHoras: number;
  proximoMantenimiento: string;
  notas: string;
  esItinerante?: boolean;
  locacionBase?: string | null;
  locacionActual?: string | null;
  fechaSalida?: string | null;
  fechaRetorno?: string | null;
  visibilidadPublica?: VisibilidadPublica | null;
}

export type ClaveVisibilidad =
  | 'identidad'
  | 'ubicacion'
  | 'estado'
  | 'parametros'
  | 'mediciones'
  | 'responsable'
  | 'mantenimiento'
  | 'notas';

export type VisibilidadPublica = Record<ClaveVisibilidad, boolean>;

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

export const VISIBILIDAD_LABELS: Record<ClaveVisibilidad, string> = {
  identidad: 'Identidad (codigo, nombre, marca, modelo, tipo)',
  ubicacion: 'Ubicacion y sector',
  estado: 'Estado del activo y operativo',
  parametros: 'Parametros operativos (rangos)',
  mediciones: 'Ultima medicion',
  responsable: 'Responsable asignado',
  mantenimiento: 'Proximo mantenimiento',
  notas: 'Notas',
};

export interface Medicion {
  id: string;
  activoId: string;
  fecha: string;
  temperatura: number;
  amperaje: number;
  presion: number;
  vibracion: 'ninguna' | 'leve' | 'moderada' | 'alta';
  horasMarcha: number;
  kilometraje?: number;
  estado: EstadoMedicion;
  observaciones: string;
  tecnicoId: string;
  voltaje?: number;
  porcentajeBateria?: number;
  nivelToner?: number;
  contador?: number;
  parametrosExtra?: Record<string, string | number | boolean> | null;
}

export interface TareaMantenimiento {
  id: string;
  activoId: string;
  numero?: number | null;
  tipo: string;
  prioridad?: 'baja' | 'media' | 'alta';
  fechaProgramada: string;
  fechaRealizada?: string;
  estado: 'pendiente' | 'completado' | 'vencido';
  responsableId: string;
  observaciones: string;
  materiales?: string | null;
  horasTrabajo?: number | null;
  cerradaPor?: string | null;
  fotos?: string[] | null;
}
