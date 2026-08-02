ALTER TABLE "Empresa"
ADD COLUMN "mpMontoUsd" DOUBLE PRECISION,
ADD COLUMN "mpCotizacionUsdArs" DOUBLE PRECISION,
ADD COLUMN "mpCotizacionFuente" TEXT,
ADD COLUMN "mpCotizacionActualizadaEn" TIMESTAMP(3);

CREATE TABLE "CotizacionUsdArs" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "compra" DOUBLE PRECISION,
    "venta" DOUBLE PRECISION NOT NULL,
    "fuente" TEXT NOT NULL,
    "fechaFuente" TIMESTAMP(3) NOT NULL,
    "consultadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CotizacionUsdArs_pkey" PRIMARY KEY ("id")
);
