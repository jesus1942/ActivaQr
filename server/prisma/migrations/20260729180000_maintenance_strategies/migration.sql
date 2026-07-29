ALTER TABLE "Activo"
ADD COLUMN "kilometrosActuales" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "estrategiaMantenimiento" TEXT NOT NULL DEFAULT 'fecha',
ADD COLUMN "intervaloMantenimiento" INTEGER,
ADD COLUMN "unidadMantenimiento" TEXT,
ADD COLUMN "proximoMantenimientoLectura" INTEGER,
ADD COLUMN "ultimaFechaMantenimiento" TIMESTAMP(3);

ALTER TABLE "Medicion"
ADD COLUMN "kilometraje" INTEGER;

-- Conserva la conducta de los equipos existentes: los que ya miden horas
-- siguen por horómetro; el resto mantiene su fecha programada.
UPDATE "Activo" AS a
SET
  "estrategiaMantenimiento" = 'horas',
  "intervaloMantenimiento" = COALESCE(a."intervaloLubricacionHoras", a."intervaloMedicionHoras"),
  "unidadMantenimiento" = 'horas',
  "proximoMantenimientoLectura" = CASE
    WHEN COALESCE(a."intervaloLubricacionHoras", a."intervaloMedicionHoras") IS NOT NULL
    THEN a."horasActuales" + COALESCE(a."intervaloLubricacionHoras", a."intervaloMedicionHoras")
    ELSE NULL
  END
FROM "TipoActivo" AS t
WHERE a."tipoId" = t."id" AND t."mideHoras" = TRUE;

UPDATE "Activo"
SET "unidadMantenimiento" = 'meses'
WHERE "estrategiaMantenimiento" = 'fecha' AND "unidadMantenimiento" IS NULL;
