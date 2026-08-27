ALTER TABLE "Usuario"
ADD COLUMN "telegramAlertasHabilitadas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "telegramAlertasAceptadasEn" TIMESTAMP(3);
