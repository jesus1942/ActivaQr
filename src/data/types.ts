export type EstadoActivo = 'normal' | 'alerta' | 'critico' | 'mantenimiento';
export type EstadoMedicion = 'normal' | 'revision' | 'urgente';

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
  mideTemperatura: boolean;
  mideAmperaje: boolean;
  midePresion: boolean;
  mideVibracion: boolean;
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
  temperaturaMin: number;
  temperaturaMax: number;
  temperaturaAlerta: number;
  temperaturaCritica: number;
  amperajeNormal: number;
  presionNormal: number;
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
