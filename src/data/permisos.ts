/**
 * Matriz de permisos por rol en el frontend.
 * El backend es la fuente de verdad; esto solo evita mostrar acciones
 * que el servidor rechazaría (mejor UX).
 */
import type { RolUsuario } from './auth';

export type Rol = RolUsuario;
export type RolPerfil = 'tecnico' | 'mantenimiento' | 'jefatura' | 'direccion';
export type ModuloEmpresa =
  | 'dashboard'
  | 'indicadores'
  | 'auditoria'
  | 'activos'
  | 'medicion'
  | 'mantenimiento'
  | 'reportes'
  | 'importar'
  | 'qr'
  | 'configuracion'
  | 'mensajes'
  | 'cotizaciones'
  | 'correctivos'
  | 'control_industrial'
  | 'camaras';

export const PERFILES_TENANT: { value: RolPerfil; label: string; descripcion: string }[] = [
  { value: 'tecnico', label: 'Técnico', descripcion: 'QR, mediciones, fotos y órdenes asignadas.' },
  { value: 'mantenimiento', label: 'Mantenimiento', descripcion: 'Activos, planes, tareas y seguimiento operativo.' },
  { value: 'jefatura', label: 'Jefatura', descripcion: 'Control técnico, indicadores, auditoría y configuración operativa.' },
  { value: 'direccion', label: 'Dirección', descripcion: 'Indicadores, reportes, costos, riesgo y trazabilidad en modo consulta.' },
];

export function esTecnico(rol?: string | null): boolean {
  return rol === 'tecnico' || rol === 'operador';
}

export function esAdminTenant(rol?: string | null): boolean {
  return rol === 'admin' || rol === 'superadmin';
}

export function puedeGestionarOperacion(rol?: string | null): boolean {
  return esAdminTenant(rol) || rol === 'mantenimiento' || rol === 'jefatura';
}

export function puedeGestionarEstructuraTecnica(rol?: string | null): boolean {
  return esAdminTenant(rol) || rol === 'jefatura';
}

export function esSoloLectura(rol?: string | null): boolean {
  return rol === 'direccion';
}

export function etiquetaRol(rol?: string | null): string {
  const etiquetas: Record<string, string> = {
    superadmin: 'Superadmin',
    admin: 'Administrador de cuenta',
    operador: 'Técnico',
    tecnico: 'Técnico',
    mantenimiento: 'Mantenimiento',
    jefatura: 'Jefatura',
    direccion: 'Dirección',
  };
  return rol ? etiquetas[rol] ?? rol : '';
}

const MODULOS_POR_ROL: Record<string, readonly ModuloEmpresa[]> = {
  mantenimiento: ['dashboard', 'activos', 'medicion', 'mantenimiento', 'control_industrial', 'camaras'],
  jefatura: ['dashboard', 'indicadores', 'auditoria', 'activos', 'medicion', 'mantenimiento', 'reportes', 'importar', 'qr', 'configuracion', 'correctivos', 'control_industrial', 'camaras'],
  direccion: ['indicadores', 'auditoria', 'activos', 'reportes', 'cotizaciones', 'correctivos', 'control_industrial', 'camaras'],
};

export function puedeVerModulo(rol: string | null | undefined, modulo: ModuloEmpresa): boolean {
  if (!rol || rol === 'admin' || rol === 'superadmin') return true;
  return MODULOS_POR_ROL[rol]?.includes(modulo) ?? false;
}

export function puedeEliminarActivos(rol?: string | null): boolean {
  return puedeGestionarEstructuraTecnica(rol);
}

export function puedeGestionarConfiguracion(rol?: string | null): boolean {
  return puedeGestionarEstructuraTecnica(rol);
}

export function puedeCargarMediciones(rol?: string | null): boolean {
  return puedeGestionarOperacion(rol) || esTecnico(rol);
}
