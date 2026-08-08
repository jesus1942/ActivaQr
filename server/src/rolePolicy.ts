/**
 * Perfiles de trabajo dentro de un tenant.
 *
 * `admin` se conserva como dueño de la cuenta (usuarios, suscripcion y
 * politicas) y `operador` como alias legado de `tecnico`. De esta forma las
 * cuentas existentes no pierden acceso cuando se incorporan los cuatro
 * perfiles empresariales.
 */
export type RolAplicacion =
  | 'superadmin'
  | 'admin'
  | 'operador'
  | 'tecnico'
  | 'mantenimiento'
  | 'jefatura'
  | 'direccion';

export const ROLES_PERFIL = ['tecnico', 'mantenimiento', 'jefatura', 'direccion'] as const;
export type RolPerfil = (typeof ROLES_PERFIL)[number];

export function esRolPerfil(valor: unknown): valor is RolPerfil {
  return typeof valor === 'string' && (ROLES_PERFIL as readonly string[]).includes(valor);
}

export function esTecnicoCampo(rol: RolAplicacion): boolean {
  return rol === 'tecnico' || rol === 'operador';
}

export function puedeAdministrarTenant(rol: RolAplicacion): boolean {
  return rol === 'admin' || rol === 'superadmin';
}

export function puedeGestionarOperacion(rol: RolAplicacion): boolean {
  return puedeAdministrarTenant(rol) || rol === 'mantenimiento' || rol === 'jefatura';
}

export function puedeGestionarConfiguracionTecnica(rol: RolAplicacion): boolean {
  return puedeAdministrarTenant(rol) || rol === 'jefatura';
}

export function puedeCargarTrabajoCampo(rol: RolAplicacion): boolean {
  return puedeGestionarOperacion(rol) || esTecnicoCampo(rol);
}

export function puedeEliminarHistorial(rol: RolAplicacion): boolean {
  return puedeGestionarConfiguracionTecnica(rol);
}

export function puedeConsultarGestion(rol: RolAplicacion): boolean {
  return puedeAdministrarTenant(rol) || rol === 'jefatura' || rol === 'direccion';
}

export function puedeConsultarDireccion(rol: RolAplicacion): boolean {
  return puedeAdministrarTenant(rol) || rol === 'direccion';
}
