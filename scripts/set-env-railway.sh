#!/usr/bin/env bash
# Carga variables de entorno sensibles en Railway sin exponerlas en pantalla,
# historial de shell, ni archivos de texto plano.
# Requiere: railway CLI  (https://docs.railway.app/guides/cli)
# Uso: bash scripts/set-env-railway.sh

set -euo pipefail

VERDE="\e[32m" ROJO="\e[31m" AMARILLO="\e[33m" RESET="\e[0m"

ok()   { echo -e "${VERDE}✓${RESET} $*"; }
warn() { echo -e "${AMARILLO}⚠${RESET}  $*"; }
err()  { echo -e "${ROJO}✗${RESET} $*"; exit 1; }

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   ActivaQR — Variables a Railway     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Verificar railway CLI ──────────────────────────────────────────────────
if ! command -v railway &>/dev/null; then
  warn "Railway CLI no está instalado. Instalando..."
  curl -fsSL https://railway.app/install.sh | sh
  export PATH="$HOME/.railway/bin:$PATH"
fi
ok "Railway CLI disponible ($(railway --version 2>/dev/null || echo 'ok'))"

# ── 2. Verificar login ────────────────────────────────────────────────────────
if ! railway whoami &>/dev/null; then
  echo ""
  echo "Necesitás iniciar sesión en Railway:"
  railway login
fi
ok "Sesión Railway activa"

# ── 3. Seleccionar servicio ───────────────────────────────────────────────────
echo ""
echo "Seleccioná el entorno Railway a actualizar:"
echo "  1) Producción  (activaqr backend — el live)"
echo "  2) Otro servicio (ingresás el nombre a mano)"
read -rp "Opción [1/2]: " OPCION

if [[ "$OPCION" == "2" ]]; then
  read -rp "Nombre del servicio Railway: " SERVICIO
  railway service "$SERVICIO" 2>/dev/null || true
fi

# Linkear al proyecto ActivaQR en Railway si no está linkeado.
if ! railway status &>/dev/null; then
  echo ""
  warn "No hay proyecto linkeado. Vinculando al proyecto ActivaQR..."
  railway link
fi
ok "Proyecto Railway vinculado"

# ── 4. Pedir variables de forma segura ───────────────────────────────────────
echo ""
echo "Ingresá las variables. El texto NO se muestra mientras escribís."
echo "Dejá en blanco y Enter para saltar una variable."
echo ""

declare -A VARS

leer_var() {
  local NOMBRE=$1
  local DESCRIPCION=$2
  echo -n "  ${DESCRIPCION}: "
  read -rs VALOR
  echo ""                        # salto de línea después del input oculto
  if [[ -n "$VALOR" ]]; then
    VARS["$NOMBRE"]="$VALOR"
  else
    warn "  ${NOMBRE} omitida."
  fi
}

leer_var "MP_ACCESS_TOKEN"  "MP_ACCESS_TOKEN (empieza con TEST- o APP_USR-)"
leer_var "MP_BACK_URL"      "MP_BACK_URL (URL de retorno, ej: https://jesus1942.github.io/ActivaQr/)"
leer_var "JWT_SECRET"       "JWT_SECRET (dejá en blanco si no querés cambiarlo)"
leer_var "SUPERADMIN_EMAIL"    "SUPERADMIN_EMAIL (dejá en blanco si no querés cambiarlo)"
leer_var "SUPERADMIN_PASSWORD" "SUPERADMIN_PASSWORD (dejá en blanco si no querés cambiarlo)"

# ── 5. Confirmar antes de enviar ─────────────────────────────────────────────
echo ""
echo "Variables a subir:"
for KEY in "${!VARS[@]}"; do
  VALOR="${VARS[$KEY]}"
  PREVIEW="${VALOR:0:6}$(printf '%0.s*' $(seq 1 $((${#VALOR} > 6 ? ${#VALOR} - 6 : 0))))"
  echo "  ${KEY} = ${PREVIEW}"
done
echo ""
read -rp "¿Confirmar y subir a Railway? [s/N]: " CONFIRM
[[ "$CONFIRM" =~ ^[sS]$ ]] || { warn "Cancelado."; exit 0; }

# ── 6. Subir a Railway ────────────────────────────────────────────────────────
echo ""
for KEY in "${!VARS[@]}"; do
  railway variables set "${KEY}=${VARS[$KEY]}"
  ok "${KEY} actualizada en Railway"
done

echo ""
ok "¡Listo! Railway va a redesplegar automáticamente con las nuevas variables."
echo ""
echo "Limpiando variables de memoria..."
unset VARS
