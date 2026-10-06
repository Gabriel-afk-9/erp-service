#!/usr/bin/env bash
#
# Environment preparation for Linux.
#
# One-command setup. Can be run from the repo root.
# First run prepares everything (dependencies, api/.env, Docker
# infrastructure, Prisma client, initial migration, seed, validation).
# Later runs only verify state and perform steps that are actually missing.
#
# The script never performs destructive operations: it never runs
# `prisma migrate reset`, `docker compose down -v`, DROP DATABASE, volume
# removal, and it never overwrites an existing api/.env.
#
# Usage:
#   ./scripts/setup.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

STEP_TOTAL=7
WORK_DONE=false

log_header() {
  echo ""
  echo "========================================"
  echo " Project Setup"
  echo "========================================"
  echo ""
}

log_step() { echo "$1"; }
log_ok() { echo "[OK] $1"; }
log_skip() { echo "[SKIP] $1 (already done)"; }
log_do() { echo "[DO] $1"; }

fail() {
  echo "[FAIL] $1" >&2
  exit 1
}

# Run a command, printing a hint on failure.
run_or_fail() {
  local hint="$1"
  shift
  if ! "$@"; then
    local code=$?
    fail "$hint (exit code $code)"
  fi
}

# Wait until host:port accepts TCP connections (timeout in seconds).
wait_tcp() {
  local host="$1"
  local port="$2"
  local timeout_secs="$3"
  local deadline=$((SECONDS + timeout_secs))
  while ((SECONDS < deadline)); do
    if python3 -c "import socket,sys; s=socket.socket(); s.settimeout(1); s.connect(('$host', $port)); s.close()" 2>/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

log_header

# ---------------------------------------------------------------------------
# [1/7] Tooling: Node.js, pnpm, Docker
# ---------------------------------------------------------------------------
log_step "[1/$STEP_TOTAL] Verificando ferramentas..."

command -v node >/dev/null 2>&1 \
  || fail "Node.js nao encontrado no PATH. Instale o Node.js 22 (https://nodejs.org) e rode o setup de novo."
NODE_VERSION="$(node -p "process.versions.node")"
NODE_MAJOR="${NODE_VERSION%%.*}"
if ((NODE_MAJOR < 22)); then
  fail "Node.js $NODE_VERSION encontrado, mas o projeto exige Node.js 22+. Atualize o Node.js e rode o setup de novo."
fi
log_ok "Node.js $NODE_VERSION encontrado"

command -v pnpm >/dev/null 2>&1 \
  || fail "pnpm nao encontrado no PATH. Instale com 'corepack enable' ou 'npm install -g pnpm' e rode o setup de novo."
PNPM_VERSION="$(pnpm --version)"
log_ok "pnpm $PNPM_VERSION encontrado"

if ! docker info >/dev/null 2>&1; then
  fail "Docker daemon indisponivel. Inicie com 'sudo systemctl start docker' (ou abra o Docker Desktop) e rode o setup de novo."
fi
log_ok "Docker daemon ativo"

# ---------------------------------------------------------------------------
# [2/7] Dependencies (per package with its own lockfile)
# ---------------------------------------------------------------------------
log_step "[2/$STEP_TOTAL] Verificando dependencias..."

for pkg in root api web; do
  if [[ "$pkg" == "root" ]]; then
    pkg_dir="$REPO_ROOT"
  else
    pkg_dir="$REPO_ROOT/$pkg"
  fi
  lock_path="$pkg_dir/pnpm-lock.yaml"
  node_modules="$pkg_dir/node_modules"
  needs_install=false
  reason=""
  if [[ ! -d "$node_modules" ]]; then
    needs_install=true
    reason="node_modules ausente"
  elif [[ "$lock_path" -nt "$node_modules" ]]; then
    needs_install=true
    reason="lockfile mais novo que a instalacao"
  fi
  if [[ "$needs_install" == true ]]; then
    log_do "Instalando dependencias de '$pkg' ($reason)..."
    run_or_fail "Falha ao instalar dependencias de '$pkg'" pnpm --dir "$pkg_dir" install
    WORK_DONE=true
    log_ok "Dependencias de '$pkg' instaladas"
  else
    log_skip "Dependencias de '$pkg'"
  fi
done

# ---------------------------------------------------------------------------
# [3/7] Environment file (never overwrite an existing one)
# ---------------------------------------------------------------------------
log_step "[3/$STEP_TOTAL] Verificando .env..."

ENV_EXAMPLE="$REPO_ROOT/api/.env.example"
ENV_FILE="$REPO_ROOT/api/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  [[ -f "$ENV_EXAMPLE" ]] \
    || fail "api/.env.example nao encontrado. Restaure o arquivo e rode o setup de novo."
  log_do "Criando api/.env a partir de api/.env.example..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  WORK_DONE=true
  log_ok "api/.env criado"
else
  log_skip "api/.env"
fi

# Make DATABASE_URL (and friends) visible to child processes invoked below.
# The API itself does not use dotenv, so the dev shell needs DATABASE_URL too.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# ---------------------------------------------------------------------------
# [4/7] Infrastructure via Docker Compose
# ---------------------------------------------------------------------------
log_step "[4/$STEP_TOTAL] Garantindo infraestrutura..."

run_or_fail "Falha ao subir os servicos com 'docker compose up -d'" \
  docker compose -f "$REPO_ROOT/docker-compose.yml" up -d

for svc in "PostgreSQL|localhost|5432" "Redis|localhost|6379"; do
  svc_name="${svc%%|*}"
  rest="${svc#*|}"
  svc_host="${rest%%|*}"
  svc_port="${rest##*|}"
  if ! wait_tcp "$svc_host" "$svc_port" 120; then
    fail "$svc_name nao respondeu em $svc_host:$svc_port apos 2 minutos. Verifique 'docker compose ps' e os logs com 'docker compose logs'."
  fi
  log_ok "$svc_name ativo ($svc_host:$svc_port)"
done

# ---------------------------------------------------------------------------
# [5/7] Database: Prisma client + migrations (deploy, never reset)
# ---------------------------------------------------------------------------
log_step "[5/$STEP_TOTAL] Preparando banco..."

run_or_fail "Falha em 'prisma generate'" pnpm --dir api exec prisma generate
log_ok "Prisma Client gerado"

MIGRATIONS_DIR="$REPO_ROOT/api/prisma/migrations"
MIGRATION_COUNT="$(find "$MIGRATIONS_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)"
MIGRATION_COUNT="$(echo "$MIGRATION_COUNT" | tr -d ' ')"

if [[ "$MIGRATION_COUNT" -eq 0 ]]; then
  log_do "Nenhuma migration encontrada: criando migration inicial..."
  run_or_fail "Falha ao criar a migration inicial com 'prisma migrate dev --name init'" \
    pnpm --dir api exec prisma migrate dev --name init
  WORK_DONE=true
  log_ok "Migration inicial aplicada"
else
  run_or_fail "Falha ao aplicar migrations com 'prisma migrate deploy'" \
    pnpm --dir api exec prisma migrate deploy
  log_ok "Migrations em dia"
fi

# ---------------------------------------------------------------------------
# [6/7] Seed (currently informational only)
# ---------------------------------------------------------------------------
log_step "[6/$STEP_TOTAL] Executando seed..."

run_or_fail "Falha em 'db:seed'" pnpm --dir api run db:seed
log_ok "Seed executado (dados sinteticos vivem nos gateways in-memory)"

# ---------------------------------------------------------------------------
# [7/7] Validation
# ---------------------------------------------------------------------------
log_step "[7/$STEP_TOTAL] Validando ambiente..."

run_or_fail "Falha em 'prisma validate'" pnpm --dir api exec prisma validate
log_ok "Schema Prisma valido"

if ! echo "SELECT 1;" | pnpm --dir api exec prisma db execute --stdin --schema "$REPO_ROOT/api/prisma/schema.prisma" >/dev/null 2>&1; then
  fail "Nao foi possivel executar 'SELECT 1' no PostgreSQL. Verifique DATABASE_URL em api/.env e se o container esta saudavel."
fi
log_ok "PostgreSQL responde a consultas"

echo ""
if [[ "$WORK_DONE" == true ]]; then
  echo "Setup inicial concluido."
else
  echo "Ambiente ja estava pronto. Nenhuma etapa refeita."
fi
echo "Projeto pronto para desenvolvimento."
echo ""
echo "Proximos passos:"
echo "  API : pnpm --dir api dev   (http://localhost:3000)"
echo "  Web : pnpm --dir web dev   (http://localhost:5173)"
echo "  Login de teste: coordenacao / senha123"
