CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "contactoNombre" TEXT,
    "contactoEmail" TEXT,
    "contactoTelefono" TEXT,
    "concepto" TEXT NOT NULL,
    "planSoftware" TEXT NOT NULL,
    "detalle" JSONB NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "vigenciaHasta" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "creadaPorId" TEXT,
    "creadaPorNombre" TEXT NOT NULL,
    "enviadaEn" TIMESTAMP(3),
    "vistaEn" TIMESTAMP(3),
    "respondidaEn" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CotizacionEnvio" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "detalle" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CotizacionEnvio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CotizacionMensaje" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "autorId" TEXT,
    "autorRol" TEXT NOT NULL,
    "autorNombre" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CotizacionMensaje_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cotizacion_numero_key" ON "Cotizacion"("numero");
CREATE INDEX "Cotizacion_empresaId_creadaEn_idx" ON "Cotizacion"("empresaId", "creadaEn");
CREATE INDEX "Cotizacion_estado_creadaEn_idx" ON "Cotizacion"("estado", "creadaEn");
CREATE INDEX "CotizacionEnvio_cotizacionId_creadoEn_idx" ON "CotizacionEnvio"("cotizacionId", "creadoEn");
CREATE INDEX "CotizacionMensaje_cotizacionId_creadoEn_idx" ON "CotizacionMensaje"("cotizacionId", "creadoEn");

ALTER TABLE "Cotizacion"
  ADD CONSTRAINT "Cotizacion_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CotizacionEnvio"
  ADD CONSTRAINT "CotizacionEnvio_cotizacionId_fkey"
  FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CotizacionMensaje"
  ADD CONSTRAINT "CotizacionMensaje_cotizacionId_fkey"
  FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
