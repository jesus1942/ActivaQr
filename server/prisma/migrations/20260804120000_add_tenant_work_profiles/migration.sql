-- Cuatro perfiles de trabajo por tenant. Los valores anteriores se conservan
-- para no invalidar cuentas ni sesiones existentes durante el despliegue.
ALTER TYPE "RolUsuario" ADD VALUE IF NOT EXISTS 'tecnico';
ALTER TYPE "RolUsuario" ADD VALUE IF NOT EXISTS 'mantenimiento';
ALTER TYPE "RolUsuario" ADD VALUE IF NOT EXISTS 'jefatura';
ALTER TYPE "RolUsuario" ADD VALUE IF NOT EXISTS 'direccion';
