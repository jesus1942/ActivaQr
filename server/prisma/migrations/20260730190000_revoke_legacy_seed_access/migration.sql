-- Revoke operator accounts that share an identical password hash. A secure
-- credential must be unique per account; repeated hashes identify historical
-- sample-data access without publishing names, addresses or password values.
UPDATE "Usuario" AS u
SET "activo" = false
WHERE u."rol" = 'operador'
  AND EXISTS (
    SELECT 1
    FROM "Usuario" AS other
    WHERE other."id" <> u."id"
      AND other."passwordHash" = u."passwordHash"
  );
