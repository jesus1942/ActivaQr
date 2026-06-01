// v1.1.0
export type EstadoActivo = 'normal' | 'alerta' | 'critico' | 'mantenimiento';
export type EstadoMedicion = 'normal' | 'revision' | 'urgente';
export type EstadoOperativo = 'operativo' | 'pausa' | 'mantenimiento' | 'montaje' | 'fuera_servicio';

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
  activo: boolean;
}

export interface Tecnico {
  id: string;
  nombre: string;
  rol: 'admin' | 'supervisor' | 'tecnico';
  email?: string;
  telefono?: string;
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
  responsableId: string;
  horasActuales: number;
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
}

export interface Medicion {
  id: string;
  activoId: string;
  fecha: string;
  temperatura: number;
  amperaje: number;
  presion: number;
  vibracion: 'ninguna' | 'leve' | 'moderada' | 'alta';
  horasMarcha: number;
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
  tipo: string;
  fechaProgramada: string;
  fechaRealizada?: string;
  estado: 'pendiente' | 'completado' | 'vencido';
  responsableId: string;
  observaciones: string;
}
