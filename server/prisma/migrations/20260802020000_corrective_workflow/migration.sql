CREATE TYPE "NivelAlertaTecnica" AS ENUM ('desmejorado', 'riesgo', 'critico');
CREATE TYPE "EstadoAlertaTecnica" AS ENUM ('abierta', 'propuesta_emitida', 'autorizada', 'rechazada', 'riesgo_aceptado', 'cerrada');
CREATE TYPE "EstadoOrdenCorrectiva" AS ENUM ('autorizada', 'programada', 'en_progreso', 'completada', 'cancelada');
CREATE TYPE "EstadoPermisoTrabajo" AS ENUM ('no_requerido', 'pendiente', 'aprobado', 'rechazado', 'vencido');

ALTER TABLE "Cotizacion"
ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'gestionado',
ADD COLUMN "alertaTecnicaId" TEXT;

CREATE TABLE "AlertaTecnica" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "medicionId" TEXT,
    "nivel" "NivelAlertaTecnica" NOT NULL,
    "estado" "EstadoAlertaTecnica" NOT NULL DEFAULT 'abierta',
    "hallazgo" TEXT NOT NULL,
    "riesgo" TEXT NOT NULL,
    "recomendacion" TEXT NOT NULL,
    "recomiendaDetencion" BOOLEAN NOT NULL DEFAULT false,
    "decisionCliente" TEXT,
    "decisionDetalle" TEXT,
    "decisionPorId" TEXT,
    "decisionPorNombre" TEXT,
    "decisionEn" TIMESTAMP(3),
    "creadaPorId" TEXT,
    "creadaPorNombre" TEXT NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertaTecnica_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrdenTrabajoCorrectiva" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "alertaId" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "estado" "EstadoOrdenCorrectiva" NOT NULL DEFAULT 'autorizada',
    "alcance" TEXT NOT NULL,
    "materialesPrevistos" TEXT,
    "plazoEstimadoDias" INTEGER NOT NULL,
    "costoAprobado" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "requierePermiso" BOOLEAN NOT NULL DEFAULT false,
    "estadoPermiso" "EstadoPermisoTrabajo" NOT NULL DEFAULT 'no_requerido',
    "permisoCondiciones" TEXT,
    "permisoValidoDesde" TIMESTAMP(3),
    "permisoValidoHasta" TIMESTAMP(3),
    "permisoAprobadoPorId" TEXT,
    "permisoAprobadoPorNombre" TEXT,
    "permisoAprobadoEn" TIMESTAMP(3),
    "autorizadaPorId" TEXT,
    "autorizadaPorNombre" TEXT NOT NULL,
    "autorizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "programadaPara" TIMESTAMP(3),
    "responsableNombre" TEXT,
    "iniciadaEn" TIMESTAMP(3),
    "finalizadaEn" TIMESTAMP(3),
    "cierreTrabajo" TEXT,
    "repuestosUtilizados" TEXT,
    "horasTrabajo" DOUBLE PRECISION,
    "evidencias" JSONB,
    "medicionCierreId" TEXT,
    "conformidadCliente" TEXT NOT NULL DEFAULT 'pendiente',
    "conformidadDetalle" TEXT,
    "conformidadPorId" TEXT,
    "conformidadPorNombre" TEXT,
    "conformidadEn" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdenTrabajoCorrectiva_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cotizacion_alertaTecnicaId_key" ON "Cotizacion"("alertaTecnicaId");
CREATE UNIQUE INDEX "AlertaTecnica_numero_key" ON "AlertaTecnica"("numero");
CREATE UNIQUE INDEX "AlertaTecnica_medicionId_key" ON "AlertaTecnica"("medicionId");
CREATE INDEX "AlertaTecnica_empresaId_creadaEn_idx" ON "AlertaTecnica"("empresaId", "creadaEn");
CREATE INDEX "AlertaTecnica_activoId_estado_idx" ON "AlertaTecnica"("activoId", "estado");
CREATE UNIQUE INDEX "OrdenTrabajoCorrectiva_numero_key" ON "OrdenTrabajoCorrectiva"("numero");
CREATE UNIQUE INDEX "OrdenTrabajoCorrectiva_alertaId_key" ON "OrdenTrabajoCorrectiva"("alertaId");
CREATE UNIQUE INDEX "OrdenTrabajoCorrectiva_cotizacionId_key" ON "OrdenTrabajoCorrectiva"("cotizacionId");
CREATE INDEX "OrdenTrabajoCorrectiva_empresaId_estado_idx" ON "OrdenTrabajoCorrectiva"("empresaId", "estado");
CREATE INDEX "OrdenTrabajoCorrectiva_activoId_creadaEn_idx" ON "OrdenTrabajoCorrectiva"("activoId", "creadaEn");

ALTER TABLE "Cotizacion"
ADD CONSTRAINT "Cotizacion_alertaTecnicaId_fkey"
FOREIGN KEY ("alertaTecnicaId") REFERENCES "AlertaTecnica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AlertaTecnica"
ADD CONSTRAINT "AlertaTecnica_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "AlertaTecnica_activoId_fkey"
FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "AlertaTecnica_medicionId_fkey"
FOREIGN KEY ("medicionId") REFERENCES "Medicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrdenTrabajoCorrectiva"
ADD CONSTRAINT "OrdenTrabajoCorrectiva_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "OrdenTrabajoCorrectiva_activoId_fkey"
FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "OrdenTrabajoCorrectiva_alertaId_fkey"
FOREIGN KEY ("alertaId") REFERENCES "AlertaTecnica"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "OrdenTrabajoCorrectiva_cotizacionId_fkey"
FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "OrdenTrabajoCorrectiva_medicionCierreId_fkey"
FOREIGN KEY ("medicionCierreId") REFERENCES "Medicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
