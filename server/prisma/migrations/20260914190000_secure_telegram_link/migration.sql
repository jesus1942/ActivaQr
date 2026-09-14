-- Desafíos temporales para verificar el nuevo canal de recuperación.
ALTER TABLE "Usuario"
  ADD COLUMN "telegramPendingChatId" TEXT,
  ADD COLUMN "telegramLinkCodeHash" TEXT,
  ADD COLUMN "telegramLinkExpires" TIMESTAMP(3),
  ADD COLUMN "telegramLinkAttempts" INTEGER NOT NULL DEFAULT 0;
