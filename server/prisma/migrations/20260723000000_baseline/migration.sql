-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('inicial', 'empresa', 'industrial');

-- CreateEnum
CREATE TYPE "EstadoEmpresa" AS ENUM ('activa', 'suspendida');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('superadmin', 'admin', 'operador');

-- CreateEnum
CREATE TYPE "EstadoActivo" AS ENUM ('normal', 'alerta', 'critico', 'mantenimiento');

-- CreateEnum
CREATE TYPE "EstadoOperativo" AS ENUM ('operativo', 'pausa', 'mantenimiento', 'montaje', 'fuera_servicio');

-- CreateEnum
CREATE TYPE "Vibracion" AS ENUM ('ninguna', 'leve', 'moderada', 'alta');

-- CreateEnum
CREATE TYPE "EstadoMedicion" AS ENUM ('normal', 'revision', 'urgente');

-- CreateEnum
CREATE TYPE "OrigenMedicion" AS ENUM ('manual', 'csv', 'api');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('pendiente', 'completado', 'vencido');

-- CreateEnum
CREATE TYPE "EstadoPermiso" AS ENUM ('pendiente', 'activo', 'revocado');

-- CreateEnum
CREATE TYPE "TipoParametro" AS ENUM ('numerico', 'porcentaje', 'booleano', 'texto', 'seleccion');

-- CreateTable
CREATE TABLE "PermisoAccesoRemoto" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "estado" "EstadoPermiso" NOT NULL DEFAULT 'pendiente',
    "solicitadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "otorgadoEn" TIMESTAMP(3),
    "revocadoEn" TIMESTAMP(3),
    "costoMensual" DOUBLE PRECISION,

    CONSTRAINT "PermisoAccesoRemoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeRemoto" (
    "id" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,
    "autorRol" TEXT NOT NULL,
    "autorNombre" TEXT NOT NULL,
    "contenido" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'texto',
    "adjunto" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "capturedLat" DOUBLE PRECISION,
    "capturedLng" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3),
    "deviceModel" TEXT,
    "fuenteUbicacion" TEXT,

    CONSTRAINT "MensajeRemoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cuit" TEXT,
    "logoUrl" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'inicial',
    "planSolicitado" "Plan",
    "estado" "EstadoEmpresa" NOT NULL DEFAULT 'activa',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "esTrial" BOOLEAN NOT NULL DEFAULT false,
    "trialFin" TIMESTAMP(3),
    "trialLecturaFin" TIMESTAMP(3),
    "politicasAceptadasEn" TIMESTAMP(3),
    "politicasAceptadasIp" TEXT,
    "politicasVersion" TEXT,
    "mpPreapprovalId" TEXT,
    "mpEstadoSub" TEXT,
    "mpMonto" DOUBLE PRECISION,
    "mpUltimoPago" TIMESTAMP(3),

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "cargo" TEXT,
    "rol" "RolUsuario" NOT NULL DEFAULT 'admin',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcceso" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "telegramChatId" TEXT,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sede" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "ciudad" TEXT,

    CONSTRAINT "Sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaEquipo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "nombre" TEXT NOT NULL,
    "icono" TEXT,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoriaEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FallaCatalogo" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "empresaId" TEXT,
    "codigo" TEXT,
    "sintoma" TEXT NOT NULL,
    "causas" JSONB NOT NULL,
    "solucion" TEXT NOT NULL,
    "severidad" TEXT NOT NULL DEFAULT 'advertencia',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FallaCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParametroCategoria" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "unidad" TEXT,
    "tipo" "TipoParametro" NOT NULL DEFAULT 'numerico',
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "minNormal" DOUBLE PRECISION,
    "maxNormal" DOUBLE PRECISION,
    "umbralAlerta" DOUBLE PRECISION,
    "umbralCritico" DOUBLE PRECISION,
    "umbralUrgente" DOUBLE PRECISION,
    "invertido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ParametroCategoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoActivo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "icono" TEXT,
    "categoriaId" TEXT,
    "mideTemperatura" BOOLEAN NOT NULL DEFAULT true,
    "mideAmperaje" BOOLEAN NOT NULL DEFAULT false,
    "midePresion" BOOLEAN NOT NULL DEFAULT false,
    "mideVibracion" BOOLEAN NOT NULL DEFAULT true,
    "mideBateria" BOOLEAN NOT NULL DEFAULT false,
    "mideToner" BOOLEAN NOT NULL DEFAULT false,
    "mideContador" BOOLEAN NOT NULL DEFAULT false,
    "mideVoltaje" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoActivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "sedeId" TEXT,
    "sectorId" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "responsableId" TEXT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "ubicacion" TEXT,
    "horasActuales" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoActivo" NOT NULL DEFAULT 'normal',
    "estadoOperativo" "EstadoOperativo" NOT NULL DEFAULT 'operativo',
    "temperaturaMin" DOUBLE PRECISION,
    "temperaturaMax" DOUBLE PRECISION,
    "temperaturaAlerta" DOUBLE PRECISION,
    "temperaturaCritica" DOUBLE PRECISION,
    "amperajeNormal" DOUBLE PRECISION,
    "amperajeAlerta" DOUBLE PRECISION,
    "amperajeCritico" DOUBLE PRECISION,
    "presionNormal" DOUBLE PRECISION,
    "presionAlerta" DOUBLE PRECISION,
    "presionCritica" DOUBLE PRECISION,
    "voltajeMin" DOUBLE PRECISION,
    "voltajeMax" DOUBLE PRECISION,
    "voltajeAlerta" DOUBLE PRECISION,
    "bateriaAlerta" INTEGER,
    "bateriaCritica" INTEGER,
    "tonerAlerta" INTEGER,
    "tonerCritico" INTEGER,
    "intervaloMedicionHoras" INTEGER,
    "intervaloLubricacionHoras" INTEGER,
    "intervaloRodamientoHoras" INTEGER,
    "proximoMantenimiento" TIMESTAMP(3),
    "notas" TEXT,
    "fotoUrl" TEXT,
    "visibilidadPublica" JSONB,
    "esItinerante" BOOLEAN NOT NULL DEFAULT false,
    "locacionBase" TEXT,
    "locacionActual" TEXT,
    "fechaSalida" TIMESTAMP(3),
    "fechaRetorno" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicion" (
    "id" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "tecnicoId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperatura" DOUBLE PRECISION,
    "amperaje" DOUBLE PRECISION,
    "presion" DOUBLE PRECISION,
    "vibracion" "Vibracion" NOT NULL DEFAULT 'ninguna',
    "horasMarcha" INTEGER,
    "voltaje" DOUBLE PRECISION,
    "porcentajeBateria" INTEGER,
    "nivelToner" INTEGER,
    "contador" INTEGER,
    "estado" "EstadoMedicion" NOT NULL DEFAULT 'normal',
    "observaciones" TEXT,
    "origen" "OrigenMedicion" NOT NULL DEFAULT 'manual',
    "parametrosExtra" JSONB,

    CONSTRAINT "Medicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foto" (
    "id" TEXT NOT NULL,
    "medicionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "capturedLat" DOUBLE PRECISION,
    "capturedLng" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3),
    "deviceModel" TEXT,
    "fuenteUbicacion" TEXT,
    "subidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visita" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "activoId" TEXT,
    "referer" TEXT,
    "userAgent" TEXT,
    "pais" TEXT,
    "ciudad" TEXT,
    "ip" TEXT,
    "seccion" TEXT,
    "empresaId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TareaMantenimiento" (
    "id" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "responsableId" TEXT,
    "numero" INTEGER,
    "tipo" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "fechaProgramada" TIMESTAMP(3) NOT NULL,
    "fechaRealizada" TIMESTAMP(3),
    "estado" "EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "observaciones" TEXT,
    "materiales" TEXT,
    "horasTrabajo" DOUBLE PRECISION,
    "cerradaPor" TEXT,
    "fotos" JSONB,

    CONSTRAINT "TareaMantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAuditoria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT NOT NULL,
    "usuarioRol" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'otro',
    "url" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoMP" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "mpPagoId" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "estado" TEXT NOT NULL,
    "concepto" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preapprovalId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoMP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT,
    "email" TEXT,
    "mensaje" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "userAgent" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermisoAccesoRemoto_empresaId_key" ON "PermisoAccesoRemoto"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "PermisoAccesoRemoto_token_key" ON "PermisoAccesoRemoto"("token");

-- CreateIndex
CREATE INDEX "PermisoAccesoRemoto_token_idx" ON "PermisoAccesoRemoto"("token");

-- CreateIndex
CREATE INDEX "MensajeRemoto_permisoId_idx" ON "MensajeRemoto"("permisoId");

-- CreateIndex
CREATE INDEX "Empresa_mpPreapprovalId_idx" ON "Empresa"("mpPreapprovalId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_resetToken_key" ON "Usuario"("resetToken");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_idx" ON "Usuario"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_usuarioId_idx" ON "PushSubscription"("usuarioId");

-- CreateIndex
CREATE INDEX "Sede_empresaId_idx" ON "Sede"("empresaId");

-- CreateIndex
CREATE INDEX "Sector_empresaId_idx" ON "Sector"("empresaId");

-- CreateIndex
CREATE INDEX "CategoriaEquipo_empresaId_idx" ON "CategoriaEquipo"("empresaId");

-- CreateIndex
CREATE INDEX "FallaCatalogo_categoriaId_idx" ON "FallaCatalogo"("categoriaId");

-- CreateIndex
CREATE INDEX "FallaCatalogo_empresaId_idx" ON "FallaCatalogo"("empresaId");

-- CreateIndex
CREATE INDEX "ParametroCategoria_categoriaId_idx" ON "ParametroCategoria"("categoriaId");

-- CreateIndex
CREATE INDEX "TipoActivo_empresaId_idx" ON "TipoActivo"("empresaId");

-- CreateIndex
CREATE INDEX "TipoActivo_categoriaId_idx" ON "TipoActivo"("categoriaId");

-- CreateIndex
CREATE INDEX "Activo_empresaId_idx" ON "Activo"("empresaId");

-- CreateIndex
CREATE INDEX "Activo_sectorId_idx" ON "Activo"("sectorId");

-- CreateIndex
CREATE INDEX "Activo_tipoId_idx" ON "Activo"("tipoId");

-- CreateIndex
CREATE UNIQUE INDEX "Activo_empresaId_codigo_key" ON "Activo"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "Medicion_activoId_idx" ON "Medicion"("activoId");

-- CreateIndex
CREATE INDEX "Foto_medicionId_idx" ON "Foto"("medicionId");

-- CreateIndex
CREATE INDEX "Visita_tipo_idx" ON "Visita"("tipo");

-- CreateIndex
CREATE INDEX "Visita_activoId_idx" ON "Visita"("activoId");

-- CreateIndex
CREATE INDEX "Visita_creadoEn_idx" ON "Visita"("creadoEn");

-- CreateIndex
CREATE INDEX "TareaMantenimiento_activoId_idx" ON "TareaMantenimiento"("activoId");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_empresaId_idx" ON "RegistroAuditoria"("empresaId");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_entidad_idx" ON "RegistroAuditoria"("entidad");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_creadoEn_idx" ON "RegistroAuditoria"("creadoEn");

-- CreateIndex
CREATE INDEX "Documento_activoId_idx" ON "Documento"("activoId");

-- CreateIndex
CREATE UNIQUE INDEX "PagoMP_mpPagoId_key" ON "PagoMP"("mpPagoId");

-- CreateIndex
CREATE INDEX "PagoMP_empresaId_idx" ON "PagoMP"("empresaId");

-- CreateIndex
CREATE INDEX "PagoMP_fecha_idx" ON "PagoMP"("fecha");

-- CreateIndex
CREATE INDEX "Testimonio_estado_creadoEn_idx" ON "Testimonio"("estado", "creadoEn");

-- AddForeignKey
ALTER TABLE "PermisoAccesoRemoto" ADD CONSTRAINT "PermisoAccesoRemoto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeRemoto" ADD CONSTRAINT "MensajeRemoto_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "PermisoAccesoRemoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sede" ADD CONSTRAINT "Sede_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaEquipo" ADD CONSTRAINT "CategoriaEquipo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FallaCatalogo" ADD CONSTRAINT "FallaCatalogo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParametroCategoria" ADD CONSTRAINT "ParametroCategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoActivo" ADD CONSTRAINT "TipoActivo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoActivo" ADD CONSTRAINT "TipoActivo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoActivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicion" ADD CONSTRAINT "Medicion_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicion" ADD CONSTRAINT "Medicion_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_medicionId_fkey" FOREIGN KEY ("medicionId") REFERENCES "Medicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaMantenimiento" ADD CONSTRAINT "TareaMantenimiento_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaMantenimiento" ADD CONSTRAINT "TareaMantenimiento_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoMP" ADD CONSTRAINT "PagoMP_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
