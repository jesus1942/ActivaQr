UPDATE "Usuario" AS usuario
SET "email" = regexp_replace(
  usuario."email",
  '@activaqr\.com$',
  '@activaqr.net',
  'i'
)
WHERE usuario."email" ~* '@activaqr\.com$'
  AND NOT EXISTS (
    SELECT 1
    FROM "Usuario" AS existente
    WHERE lower(existente."email") = lower(
      regexp_replace(usuario."email", '@activaqr\.com$', '@activaqr.net', 'i')
    )
  );
