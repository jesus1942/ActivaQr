CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "mensaje" TEXT,
    "plan" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "content" TEXT,
    "term" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_creadoEn_idx" ON "Lead"("creadoEn");
CREATE INDEX "Lead_source_campaign_idx" ON "Lead"("source", "campaign");

ALTER TABLE "Empresa"
ADD COLUMN "fuenteAlta" TEXT,
ADD COLUMN "campanaAlta" TEXT,
ADD COLUMN "contenidoAlta" TEXT;
