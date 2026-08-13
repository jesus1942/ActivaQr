-- Repara sólo valores físicamente imposibles para un DUAL R3 que hayan
-- quedado guardados antes de reconocer la codificación en centésimas.
UPDATE "LecturaIoT" AS lectura
SET "valorNumero" = lectura."valorNumero" / 100.0
FROM "VariableIoT" AS variable
JOIN "DispositivoIoT" AS dispositivo ON dispositivo."id" = variable."dispositivoId"
WHERE lectura."variableId" = variable."id"
  AND (dispositivo."modelo" ILIKE '%DUAL%R3%' OR dispositivo."modelo" ILIKE '%E32-2SW%')
  AND lectura."valorNumero" IS NOT NULL
  AND (
    (variable."clave" ~ '^current(_[0-9]+)?$' AND lectura."valorNumero" > 15)
    OR (variable."clave" ~ '^voltage(_[0-9]+)?$' AND lectura."valorNumero" > 300)
    OR (variable."clave" ~ '^(actpow|power|apparentpow|reactpow|reactivepow)(_[0-9]+)?$' AND lectura."valorNumero" > 3300)
  );

UPDATE "VariableIoT" AS variable
SET "valorNumero" = variable."valorNumero" / 100.0
FROM "DispositivoIoT" AS dispositivo
WHERE dispositivo."id" = variable."dispositivoId"
  AND (dispositivo."modelo" ILIKE '%DUAL%R3%' OR dispositivo."modelo" ILIKE '%E32-2SW%')
  AND variable."valorNumero" IS NOT NULL
  AND (
    (variable."clave" ~ '^current(_[0-9]+)?$' AND variable."valorNumero" > 15)
    OR (variable."clave" ~ '^voltage(_[0-9]+)?$' AND variable."valorNumero" > 300)
    OR (variable."clave" ~ '^(actpow|power|apparentpow|reactpow|reactivepow)(_[0-9]+)?$' AND variable."valorNumero" > 3300)
  );
