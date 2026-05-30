export type EstadoActivo = 'normal' | 'alerta' | 'critico' | 'mantenimiento';
export type TipoActivo = 'motor' | 'compresor' | 'bomba' | 'camara_frio' | 'tablero' | 'rodamiento' | 'generador' | 'otro';
export type EstadoMedicion = 'normal' | 'revision' | 'urgente';

export interface Activo {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoActivo;
  sector: string;
  marca: string;
  modelo: string;
  fechaIngreso: string;
  ubicacion: string;
  responsable: string;
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
  tecnico: string;
}

export interface TareaMantenimiento {
  id: string;
  activoId: string;
  tipo: string;
  fechaProgramada: string;
  fechaRealizada?: string;
  estado: 'pendiente' | 'completado' | 'vencido';
  responsable: string;
  observaciones: string;
}
