ALTER TABLE "DispositivoIoT"
ADD COLUMN "archivadoEn" TIMESTAMP(3),
ADD COLUMN "archivadoPorId" TEXT,
ADD COLUMN "archivadoPorNombre" TEXT;

CREATE INDEX "DispositivoIoT_empresaId_archivadoEn_idx"
ON "DispositivoIoT"("empresaId", "archivadoEn");
