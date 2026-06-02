/**
 * Matriz de permisos por rol en el frontend.
 * El backend es la fuente de verdad; esto solo evita mostrar acciones
 * que el servidor rechazaría (mejor UX).
 */
export type Rol = 'superadmin' | 'admin' | 'operador';

export function puedeEliminarActivos(rol?: string | null): boolean {
  return rol === 'admin' || rol === 'superadmin';
}

export function puedeGestionarConfiguracion(rol?: string | null): boolean {
  return rol === 'admin' || rol === 'superadmin';
}

export function puedeCargarMediciones(rol?: string | null): boolean {
  return rol === 'admin' || rol === 'operador' || rol === 'superadmin';
}
