ALTER TABLE "VariableIoT"
ADD COLUMN "uso" TEXT NOT NULL DEFAULT 'carga';

UPDATE "VariableIoT"
SET "uso" = 'lampara'
WHERE "clave" ~ '^switch_[1-4]$'
  AND lower("nombre") ~ '(luz|luces|lampara|lámpara|iluminacion|iluminación)';

UPDATE "VariableIoT"
SET "uso" = 'motor'
WHERE "clave" ~ '^switch_[1-4]$'
  AND lower("nombre") ~ '(motor|cortina|persiana|porton|portón)';
