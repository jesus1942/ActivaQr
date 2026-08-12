CREATE TABLE "IntegracionCamara" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "proveedor" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'pendiente',
  "credencialesCifradas" TEXT,
  "configuracion" JSONB,
  "webhookTokenHash" TEXT,
  "webhookTokenHint" TEXT,
  "ultimoEventoEn" TIMESTAMP(3),
  "ultimoError" TEXT,
  "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadaEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegracionCamara_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Camara" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "integracionId" TEXT NOT NULL,
  "identificadorExterno" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "ubicacion" TEXT,
  "modelo" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'sin_datos',
  "habilitada" BOOLEAN NOT NULL DEFAULT true,
  "reproduccionUrl" TEXT,
  "protocoloReproduccion" TEXT,
  "capacidades" JSONB,
  "ultimoContactoEn" TIMESTAMP(3),
  "ultimoMovimientoEn" TIMESTAMP(3),
  "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadaEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Camara_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventoCamara" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "camaraId" TEXT NOT NULL,
  "identificadorExterno" TEXT,
  "tipo" TEXT NOT NULL,
  "etiqueta" TEXT,
  "zona" TEXT,
  "confianza" DOUBLE PRECISION,
  "iniciadoEn" TIMESTAMP(3) NOT NULL,
  "finalizadoEn" TIMESTAMP(3),
  "snapshotUrl" TEXT,
  "clipUrl" TEXT,
  "metadatos" JSONB,
  "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventoCamara_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegracionCamara_webhookTokenHash_key" ON "IntegracionCamara"("webhookTokenHash");
CREATE INDEX "IntegracionCamara_empresaId_proveedor_idx" ON "IntegracionCamara"("empresaId", "proveedor");
CREATE INDEX "IntegracionCamara_empresaId_estado_idx" ON "IntegracionCamara"("empresaId", "estado");
CREATE UNIQUE INDEX "Camara_integracionId_identificadorExterno_key" ON "Camara"("integracionId", "identificadorExterno");
CREATE INDEX "Camara_empresaId_estado_idx" ON "Camara"("empresaId", "estado");
CREATE INDEX "Camara_empresaId_ultimoMovimientoEn_idx" ON "Camara"("empresaId", "ultimoMovimientoEn");
CREATE INDEX "EventoCamara_empresaId_iniciadoEn_idx" ON "EventoCamara"("empresaId", "iniciadoEn");
CREATE INDEX "EventoCamara_camaraId_iniciadoEn_idx" ON "EventoCamara"("camaraId", "iniciadoEn");
CREATE INDEX "EventoCamara_empresaId_tipo_iniciadoEn_idx" ON "EventoCamara"("empresaId", "tipo", "iniciadoEn");
CREATE UNIQUE INDEX "EventoCamara_camaraId_identificadorExterno_key" ON "EventoCamara"("camaraId", "identificadorExterno");

ALTER TABLE "IntegracionCamara" ADD CONSTRAINT "IntegracionCamara_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Camara" ADD CONSTRAINT "Camara_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Camara" ADD CONSTRAINT "Camara_integracionId_fkey" FOREIGN KEY ("integracionId") REFERENCES "IntegracionCamara"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventoCamara" ADD CONSTRAINT "EventoCamara_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventoCamara" ADD CONSTRAINT "EventoCamara_camaraId_fkey" FOREIGN KEY ("camaraId") REFERENCES "Camara"("id") ON DELETE CASCADE ON UPDATE CASCADE;
