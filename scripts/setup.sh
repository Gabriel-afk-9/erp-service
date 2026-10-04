#!/usr/bin/env bash
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
#   bash scripts/setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

STEP_TOTAL=7
WORK_DONE=false
DOCKER_COMPOSE=""

log_header() {
  echo ""
  echo "========================================"
  echo " Project Setup"
  echo "========================================"
  echo ""
}

log_step() {
  echo "$1"
}

log_ok() {
  echo "[OK] $1"
}

log_skip() {
  echo "[SKIP] $1 (already done)"
}

log_do() {
  echo "[DO] $1"
}

fail() {
  echo "[FAIL] $1"
  exit 1
}

run_step() {
  local failure_hint="$1"
  shift
  local output
  local exit_code
  set +e
  output=$("$@" 2>&1)
  exit_code=$?
  set -e
  if [ "$exit_code" -ne 0 ]; then
    echo "$output"
    fail "$failure_hint (exit code $exit_code)"
  fi
}

test_tcp_port() {
  local host="$1"
  local port="$2"
  if command -v nc >/dev/null 2>&1; then
    nc -z -w1 "$host" "$port" >/dev/null 2>&1
    return $?
  fi
  timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" >/dev/null 2>&1
  return $?
}

import_dotenv() {
  local env_file="$1"
  if [ ! -f "$env_file" ]; then
    return 0
  fi
  set -a
  # shellcheck source=/dev/null
  source "$env_file"
  set +a
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
    return 0
  fi
  fail "Docker Compose nao encontrado. Instale o Docker Compose v2 (docker compose) ou v1 (docker-compose) e rode o setup de novo."
}

test_docker_daemon() {
  docker info >/dev/null 2>&1
}

log_header

# ---------------------------------------------------------------------------
# [1/7] Tooling: Node.js, pnpm, Docker
# ---------------------------------------------------------------------------
log_step "[1/$STEP_TOTAL] Verificando ferramentas..."

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js nao encontrado no PATH. Instale o Node.js 22 (https://nodejs.org) e rode o setup de novo."
fi
NODE_VERSION="$(node -p "process.versions.node" 2>/dev/null | tr -d '[:space:]')"
NODE_MAJOR="${NODE_VERSION%%.*}"
if [ "$NODE_MAJOR" -lt 22 ] 2>/dev/null; then
  fail "Node.js $NODE_VERSION encontrado, mas o projeto exige Node.js 22+. Atualize o Node.js e rode o setup de novo."
fi
log_ok "Node.js $NODE_VERSION encontrado"

if ! command -v pnpm >/dev/null 2>&1; then
  fail "pnpm nao encontrado no PATH. Instale com 'corepack enable' ou 'npm install -g pnpm' e rode o setup de novo."
fi
PNPM_VERSION="$(pnpm --version 2>/dev/null | tr -d '[:space:]')"
EXPECTED_PM="$(node -p "JSON.parse(require('fs').readFileSync('package.json','utf8')).packageManager || ''" 2>/dev/null | tr -d '[:space:]')"
if [ -n "$EXPECTED_PM" ]; then
  EXPECTED_PNPM_VERSION="${EXPECTED_PM#pnpm@}"
  if [ "$PNPM_VERSION" != "$EXPECTED_PNPM_VERSION" ]; then
    fail "pnpm $PNPM_VERSION encontrado, mas o projeto exige pnpm $EXPECTED_PNPM_VERSION (definido em packageManager). Atualize com 'corepack enable' ou 'npm install -g pnpm@$EXPECTED_PNPM_VERSION' e rode o setup de novo."
  fi
fi
log_ok "pnpm $PNPM_VERSION encontrado"

if ! test_docker_daemon; then
  log_step "Docker daemon inativo. Tentando iniciar o Docker..."
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl start docker >/dev/null 2>&1 || true
  elif command -v service >/dev/null 2>&1; then
    sudo service docker start >/dev/null 2>&1 || true
  fi
  DEADLINE=$(( $(date +%s) + 180 ))
  while ! test_docker_daemon; do
    if [ "$(date +%s)" -gt "$DEADLINE" ]; then
      fail "Docker daemon indisponivel apos 180s. Inicie o Docker manualmente (sudo systemctl start docker) e rode o setup de novo."
    fi
    sleep 5
  done
fi
log_ok "Docker daemon ativo"

detect_compose
log_ok "Docker Compose encontrado ($DOCKER_COMPOSE)"

# ---------------------------------------------------------------------------
# [2/7] Dependencies (per package with its own lockfile)
# ---------------------------------------------------------------------------
log_step "[2/$STEP_TOTAL] Verificando dependencias..."

for pkg in "root:.:pnpm-lock.yaml" "api:api:pnpm-lock.yaml" "web:web:pnpm-lock.yaml"; do
  PKG_NAME="${pkg%%:*}"
  REST="${pkg#*:}"
  PKG_DIR_NAME="${REST%%:*}"
  LOCK_NAME="${REST##*:}"
  if [ "$PKG_DIR_NAME" = "." ]; then
    PKG_DIR="$REPO_ROOT"
  else
    PKG_DIR="$REPO_ROOT/$PKG_DIR_NAME"
  fi
  LOCK_PATH="$PKG_DIR/$LOCK_NAME"
  NODE_MODULES="$PKG_DIR/node_modules"
  NEEDS_INSTALL=false
  REASON=""
  if [ ! -d "$NODE_MODULES" ]; then
    NEEDS_INSTALL=true
    REASON="node_modules ausente"
  elif [ "$LOCK_PATH" -nt "$NODE_MODULES" ]; then
    NEEDS_INSTALL=true
    REASON="lockfile mais novo que a instalacao"
  fi
  if [ "$NEEDS_INSTALL" = true ]; then
    log_do "Instalando dependencias de '$PKG_NAME' ($REASON)..."
    if [ "$PKG_DIR_NAME" = "." ]; then
      run_step "Falha ao instalar dependencias de '$PKG_NAME'" pnpm install
    else
      run_step "Falha ao instalar dependencias de '$PKG_NAME'" pnpm --dir "$PKG_DIR_NAME" install
    fi
    WORK_DONE=true
    log_ok "Dependencias de '$PKG_NAME' instaladas"
  else
    log_skip "Dependencias de '$PKG_NAME'"
  fi
done

# ---------------------------------------------------------------------------
# [3/7] Environment file (never overwrite an existing one)
# ---------------------------------------------------------------------------
log_step "[3/$STEP_TOTAL] Verificando .env..."

ENV_EXAMPLE="$REPO_ROOT/api/.env.example"
ENV_FILE="$REPO_ROOT/api/.env"
if [ ! -f "$ENV_FILE" ]; then
  if [ ! -f "$ENV_EXAMPLE" ]; then
    fail "api/.env.example nao encontrado. Restaure o arquivo e rode o setup de novo."
  fi
  log_do "Criando api/.env a partir de api/.env.example..."
  cp -n "$ENV_EXAMPLE" "$ENV_FILE"
  WORK_DONE=true
  log_ok "api/.env criado"
else
  log_skip "api/.env"
fi

import_dotenv "$ENV_FILE"

# ---------------------------------------------------------------------------
# [4/7] Infrastructure via Docker Compose
# ---------------------------------------------------------------------------
log_step "[4/$STEP_TOTAL] Garantindo infraestrutura..."

run_step "Falha ao subir os servicos com '$DOCKER_COMPOSE up -d'" $DOCKER_COMPOSE -f "$REPO_ROOT/docker-compose.yml" up -d

for svc in "PostgreSQL:5432" "Redis:6379"; do
  SVC_NAME="${svc%%:*}"
  SVC_PORT="${svc##*:}"
  READY=false
  for _ in $(seq 1 60); do
    if test_tcp_port "localhost" "$SVC_PORT"; then
      READY=true
      break
    fi
    sleep 2
  done
  if [ "$READY" != "true" ]; then
    fail "$SVC_NAME nao respondeu em localhost:$SVC_PORT apos 2 minutos. Verifique '$DOCKER_COMPOSE ps' e os logs com '$DOCKER_COMPOSE logs'."
  fi
  log_ok "$SVC_NAME ativo (localhost:$SVC_PORT)"
done

# ---------------------------------------------------------------------------
# [5/7] Database: Prisma client + migrations (deploy, never reset)
# ---------------------------------------------------------------------------
log_step "[5/$STEP_TOTAL] Preparando banco..."

run_step "Falha em 'prisma generate'" pnpm --dir api exec prisma generate
log_ok "Prisma Client gerado"

MIGRATIONS_DIR="$REPO_ROOT/api/prisma/migrations"
HAS_MIGRATIONS=false
if [ -d "$MIGRATIONS_DIR" ]; then
  shopt -s nullglob 2>/dev/null || true
  DIRS=("$MIGRATIONS_DIR"/*/)
  if [ "${#DIRS[@]}" -gt 0 ]; then
    HAS_MIGRATIONS=true
  fi
  shopt -u nullglob 2>/dev/null || true
fi

if [ "$HAS_MIGRATIONS" = false ]; then
  log_do "Nenhuma migration encontrada: criando migration inicial..."
  run_step "Falha ao criar a migration inicial com 'prisma migrate dev --name init'" pnpm --dir api exec prisma migrate dev --name init
  WORK_DONE=true
  log_ok "Migration inicial aplicada"
else
  run_step "Falha ao aplicar migrations com 'prisma migrate deploy'" pnpm --dir api exec prisma migrate deploy
  log_ok "Migrations em dia"
fi

# ---------------------------------------------------------------------------
# [6/7] Seed (idempotente)
# ---------------------------------------------------------------------------
log_step "[6/$STEP_TOTAL] Executando seed..."

run_step "Falha em 'db:seed'" pnpm --dir api run db:seed
log_ok "Seed executado"

# ---------------------------------------------------------------------------
# [7/7] Validation
# ---------------------------------------------------------------------------
log_step "[7/$STEP_TOTAL] Validando ambiente..."

run_step "Falha em 'prisma validate'" pnpm --dir api exec prisma validate
log_ok "Schema Prisma valido"

set +e
echo "SELECT 1;" | pnpm --dir api exec prisma db execute --stdin --schema "$REPO_ROOT/api/prisma/schema.prisma" >/dev/null 2>&1
SQL_EXIT=$?
set -e
if [ "$SQL_EXIT" -ne 0 ]; then
  fail "Nao foi possivel executar 'SELECT 1' no PostgreSQL. Verifique DATABASE_URL em api/.env e se o container esta saudavel."
fi
log_ok "PostgreSQL responde a consultas"

echo ""
if [ "$WORK_DONE" = true ]; then
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
