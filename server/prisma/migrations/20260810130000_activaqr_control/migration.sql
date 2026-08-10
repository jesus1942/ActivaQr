-- ActivaQR Control: licencia premium, conectores, telemetria, alarmas y comandos.
CREATE TABLE "ModuloControlEmpresa" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL, "estado" TEXT NOT NULL DEFAULT 'configuracion',
  "nombreServicio" TEXT NOT NULL DEFAULT 'ActivaQR Control', "cargoImplementacionUsd" DOUBLE PRECISION,
  "abonoMensualUsd" DOUBLE PRECISION, "monedaFacturacion" TEXT NOT NULL DEFAULT 'USD',
  "limiteDispositivos" INTEGER NOT NULL DEFAULT 25, "limiteGateways" INTEGER NOT NULL DEFAULT 2,
  "retencionDias" INTEGER NOT NULL DEFAULT 365, "umbralSinConexionMinutos" INTEGER NOT NULL DEFAULT 10,
  "controlRemotoHabilitado" BOOLEAN NOT NULL DEFAULT false, "tableroConfig" JSONB,
  "notasComerciales" TEXT, "habilitadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "habilitadoPorId" TEXT, "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModuloControlEmpresa_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ModuloControlEmpresa_empresaId_key" ON "ModuloControlEmpresa"("empresaId");
CREATE INDEX "ModuloControlEmpresa_estado_idx" ON "ModuloControlEmpresa"("estado");

CREATE TABLE "IntegracionIoT" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL, "nombre" TEXT NOT NULL, "proveedor" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'pendiente', "credencialesCifradas" TEXT, "configuracion" JSONB,
  "webhookTokenHash" TEXT, "webhookTokenHint" TEXT, "ultimoEventoEn" TIMESTAMP(3), "ultimoError" TEXT,
  "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadaEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegracionIoT_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IntegracionIoT_webhookTokenHash_key" ON "IntegracionIoT"("webhookTokenHash");
CREATE INDEX "IntegracionIoT_empresaId_proveedor_idx" ON "IntegracionIoT"("empresaId", "proveedor");
CREATE INDEX "IntegracionIoT_empresaId_estado_idx" ON "IntegracionIoT"("empresaId", "estado");

CREATE TABLE "DispositivoIoT" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL, "integracionId" TEXT NOT NULL, "activoId" TEXT,
  "identificadorExterno" TEXT NOT NULL, "nombre" TEXT NOT NULL, "modelo" TEXT, "tipo" TEXT NOT NULL DEFAULT 'sensor',
  "estado" TEXT NOT NULL DEFAULT 'sin_datos', "habilitado" BOOLEAN NOT NULL DEFAULT true,
  "permiteControl" BOOLEAN NOT NULL DEFAULT false, "ubicacion" TEXT, "ultimoContactoEn" TIMESTAMP(3),
  "bateria" DOUBLE PRECISION, "rssi" DOUBLE PRECISION, "metadatos" JSONB,
  "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadaEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DispositivoIoT_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DispositivoIoT_integracionId_identificadorExterno_key" ON "DispositivoIoT"("integracionId", "identificadorExterno");
CREATE INDEX "DispositivoIoT_empresaId_estado_idx" ON "DispositivoIoT"("empresaId", "estado");
CREATE INDEX "DispositivoIoT_activoId_idx" ON "DispositivoIoT"("activoId");

CREATE TABLE "VariableIoT" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL, "dispositivoId" TEXT NOT NULL, "clave" TEXT NOT NULL,
  "nombre" TEXT NOT NULL, "tipo" TEXT NOT NULL DEFAULT 'numero', "unidad" TEXT,
  "valorNumero" DOUBLE PRECISION, "valorBooleano" BOOLEAN, "valorTexto" TEXT,
  "calidad" TEXT NOT NULL DEFAULT 'buena', "medidaEn" TIMESTAMP(3), "actualizadaEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VariableIoT_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VariableIoT_dispositivoId_clave_key" ON "VariableIoT"("dispositivoId", "clave");
CREATE INDEX "VariableIoT_empresaId_medidaEn_idx" ON "VariableIoT"("empresaId", "medidaEn");

CREATE TABLE "LecturaIoT" (
  "id" TEXT NOT NULL, "variableId" TEXT NOT NULL, "valorNumero" DOUBLE PRECISION,
  "valorBooleano" BOOLEAN, "valorTexto" TEXT, "calidad" TEXT NOT NULL DEFAULT 'buena',
  "medidaEn" TIMESTAMP(3) NOT NULL, "recibidaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LecturaIoT_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LecturaIoT_variableId_medidaEn_idx" ON "LecturaIoT"("variableId", "medidaEn");

CREATE TABLE "ReglaAlarmaIoT" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL, "variableId" TEXT NOT NULL, "nombre" TEXT NOT NULL,
  "operador" TEXT NOT NULL, "umbralNumero" DOUBLE PRECISION, "umbralBooleano" BOOLEAN, "umbralTexto" TEXT,
  "demoraSegundos" INTEGER NOT NULL DEFAULT 0, "severidad" TEXT NOT NULL DEFAULT 'advertencia',
  "activa" BOOLEAN NOT NULL DEFAULT true, "notificarPush" BOOLEAN NOT NULL DEFAULT true,
  "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadaEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReglaAlarmaIoT_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReglaAlarmaIoT_empresaId_activa_idx" ON "ReglaAlarmaIoT"("empresaId", "activa");
CREATE INDEX "ReglaAlarmaIoT_variableId_idx" ON "ReglaAlarmaIoT"("variableId");

CREATE TABLE "AlarmaIoT" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL, "dispositivoId" TEXT NOT NULL, "variableId" TEXT,
  "reglaId" TEXT, "titulo" TEXT NOT NULL, "detalle" TEXT, "severidad" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'activa', "valorDisparador" TEXT, "iniciadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reconocidaEn" TIMESTAMP(3), "reconocidaPorId" TEXT, "reconocidaPorNombre" TEXT,
  "resolucion" TEXT, "resueltaEn" TIMESTAMP(3), CONSTRAINT "AlarmaIoT_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AlarmaIoT_empresaId_estado_iniciadaEn_idx" ON "AlarmaIoT"("empresaId", "estado", "iniciadaEn");
CREATE INDEX "AlarmaIoT_dispositivoId_estado_idx" ON "AlarmaIoT"("dispositivoId", "estado");

CREATE TABLE "ComandoIoT" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL, "dispositivoId" TEXT NOT NULL, "tipo" TEXT NOT NULL,
  "payload" JSONB NOT NULL, "motivo" TEXT NOT NULL, "estado" TEXT NOT NULL DEFAULT 'pendiente',
  "solicitadoPorId" TEXT NOT NULL, "solicitadoPorNombre" TEXT NOT NULL,
  "solicitadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "aprobadoPorId" TEXT,
  "aprobadoPorNombre" TEXT, "aprobadoEn" TIMESTAMP(3), "ejecutadoEn" TIMESTAMP(3), "resultado" TEXT,
  CONSTRAINT "ComandoIoT_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ComandoIoT_empresaId_estado_solicitadoEn_idx" ON "ComandoIoT"("empresaId", "estado", "solicitadoEn");
CREATE INDEX "ComandoIoT_dispositivoId_solicitadoEn_idx" ON "ComandoIoT"("dispositivoId", "solicitadoEn");

ALTER TABLE "ModuloControlEmpresa" ADD CONSTRAINT "ModuloControlEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegracionIoT" ADD CONSTRAINT "IntegracionIoT_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DispositivoIoT" ADD CONSTRAINT "DispositivoIoT_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DispositivoIoT" ADD CONSTRAINT "DispositivoIoT_integracionId_fkey" FOREIGN KEY ("integracionId") REFERENCES "IntegracionIoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DispositivoIoT" ADD CONSTRAINT "DispositivoIoT_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VariableIoT" ADD CONSTRAINT "VariableIoT_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VariableIoT" ADD CONSTRAINT "VariableIoT_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "DispositivoIoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LecturaIoT" ADD CONSTRAINT "LecturaIoT_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "VariableIoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReglaAlarmaIoT" ADD CONSTRAINT "ReglaAlarmaIoT_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReglaAlarmaIoT" ADD CONSTRAINT "ReglaAlarmaIoT_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "VariableIoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlarmaIoT" ADD CONSTRAINT "AlarmaIoT_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlarmaIoT" ADD CONSTRAINT "AlarmaIoT_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "DispositivoIoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlarmaIoT" ADD CONSTRAINT "AlarmaIoT_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "VariableIoT"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AlarmaIoT" ADD CONSTRAINT "AlarmaIoT_reglaId_fkey" FOREIGN KEY ("reglaId") REFERENCES "ReglaAlarmaIoT"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComandoIoT" ADD CONSTRAINT "ComandoIoT_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComandoIoT" ADD CONSTRAINT "ComandoIoT_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "DispositivoIoT"("id") ON DELETE CASCADE ON UPDATE CASCADE;
