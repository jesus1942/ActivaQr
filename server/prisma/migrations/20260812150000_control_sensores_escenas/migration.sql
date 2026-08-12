CREATE TABLE "EscenaIoT" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "acciones" JSONB NOT NULL,
  "creadaPorId" TEXT NOT NULL,
  "creadaPorNombre" TEXT NOT NULL,
  "ultimaEjecucionEn" TIMESTAMP(3),
  "ultimaEjecucionEstado" TEXT,
  "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadaEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EscenaIoT_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EscenaIoT_empresaId_activa_idx" ON "EscenaIoT"("empresaId", "activa");
CREATE INDEX "EscenaIoT_empresaId_creadaEn_idx" ON "EscenaIoT"("empresaId", "creadaEn");
ALTER TABLE "EscenaIoT" ADD CONSTRAINT "EscenaIoT_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReglaAlarmaIoT" ADD COLUMN "condicionDesde" TIMESTAMP(3);
