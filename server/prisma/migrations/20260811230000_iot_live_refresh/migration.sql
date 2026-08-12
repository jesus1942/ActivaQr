-- El tablero y la sincronización eWeLink pasan a refrescar cada 5 segundos.
-- jsonb_set conserva cualquier otra configuración ya guardada por integración.
UPDATE "IntegracionIoT"
SET "configuracion" = jsonb_set(COALESCE("configuracion", '{}'::jsonb), '{pollingSeconds}', '5'::jsonb, true)
WHERE "proveedor" = 'sonoff_ewelink';

UPDATE "ModuloControlEmpresa"
SET "tableroConfig" = jsonb_set(COALESCE("tableroConfig", '{}'::jsonb), '{refreshSeconds}', '5'::jsonb, true);
