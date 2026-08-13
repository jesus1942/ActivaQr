-- eWeLink entrega las magnitudes instantáneas del DUAL R3 en centésimas.
-- Corrige valores históricos enteros previos a la normalización del conector.
UPDATE "LecturaIoT" AS lectura
SET "valorNumero" = lectura."valorNumero" / 100.0
FROM "VariableIoT" AS variable
JOIN "DispositivoIoT" AS dispositivo ON dispositivo."id" = variable."dispositivoId"
WHERE lectura."variableId" = variable."id"
  AND dispositivo."modelo" ILIKE '%DUAL%R3%'
  AND variable."clave" ~ '^(current|voltage|actpow|power|apparentpow|reactivepow)(_[0-9]+)?$'
  AND lectura."valorNumero" IS NOT NULL
  AND lectura."valorNumero" = trunc(lectura."valorNumero");

UPDATE "VariableIoT" AS variable
SET "valorNumero" = variable."valorNumero" / 100.0
FROM "DispositivoIoT" AS dispositivo
WHERE dispositivo."id" = variable."dispositivoId"
  AND dispositivo."modelo" ILIKE '%DUAL%R3%'
  AND variable."clave" ~ '^(current|voltage|actpow|power|apparentpow|reactivepow)(_[0-9]+)?$'
  AND variable."valorNumero" IS NOT NULL
  AND variable."valorNumero" = trunc(variable."valorNumero");
