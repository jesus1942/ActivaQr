ALTER TABLE "ParametroCategoria"
ADD COLUMN "opciones" JSONB,
ADD COLUMN "valoresAlerta" JSONB,
ADD COLUMN "valoresCritico" JSONB,
ADD COLUMN "valoresUrgente" JSONB;

ALTER TABLE "TipoActivo"
ADD COLUMN "mideHoras" BOOLEAN NOT NULL DEFAULT true;
