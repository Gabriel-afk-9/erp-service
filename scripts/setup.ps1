#Requires -Version 5.1
<#
.SYNOPSIS
  Environment preparation for Windows.

.DESCRIPTION
  One-command setup. Can be run from the repo root.
  First run prepares everything (dependencies, api/.env, Docker
  infrastructure, Prisma client, initial migration, seed, validation).
  Later runs only verify state and perform steps that are actually missing.

  The script never performs destructive operations: it never runs
  `prisma migrate reset`, `docker compose down -v`, DROP DATABASE, volume
  removal, and it never overwrites an existing api/.env.

.EXAMPLE
  .\scripts\setup.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $RepoRoot
$StepTotal = 7
$WorkDone = $false

function Write-Header {
  Write-Output ""
  Write-Output "========================================"
  Write-Output " Project Setup"
  Write-Output "========================================"
  Write-Output ""
}

function Write-Step([string] $Message) {
  Write-Output $Message
}

function Write-Ok([string] $Message) {
  Write-Output "[OK] $Message"
}

function Write-Skip([string] $Message) {
  Write-Output "[SKIP] $Message (already done)"
}

function Write-Do([string] $Message) {
  Write-Output "[DO] $Message"
}

function Fail([string] $Message) {
  Write-Output "[FAIL] $Message"
  exit 1
}

function Invoke-StepCommand([string] $FilePath, [string[]] $Arguments, [string] $FailureHint) {
  # Native tools (docker, pnpm, prisma) write progress to stderr. Merging
  # 2>&1 under "Stop" would turn that noise into a terminating error, so
  # stderr is collected with "Continue" and only the exit code decides.
  $previousAction = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & $FilePath @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousAction
  if ($exitCode -ne 0) {
    $output | ForEach-Object { Write-Output $_ }
    Fail("$FailureHint (exit code $exitCode)")
  }
}

function Test-TcpPort([string] $HostName, [int] $Port) {
  $client = New-Object Net.Sockets.TcpClient
  try {
    $result = $client.BeginConnect($HostName, $Port, $null, $null)
    return $result.AsyncWaitHandle.WaitOne(1000)
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Import-DotEnv([string] $Path) {
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $parts = $line -split "=", 2
    if ($parts.Count -eq 2) {
      $name = $parts[0].Trim()
      $value = $parts[1].Trim()
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

Write-Header

# ---------------------------------------------------------------------------
# [1/7] Tooling: Node.js, pnpm, Docker
# ---------------------------------------------------------------------------
Write-Step "[1/$StepTotal] Verificando ferramentas..."

try {
  $nodeVersion = (& node -p "process.versions.node" 2>$null).Trim()
} catch {
  Fail("Node.js nao encontrado no PATH. Instale o Node.js 22 (https://nodejs.org) e rode o setup de novo.")
}
$nodeMajor = [int]($nodeVersion.Split(".")[0])
if ($nodeMajor -lt 22) {
  Fail("Node.js $nodeVersion encontrado, mas o projeto exige Node.js 22+. Atualize o Node.js e rode o setup de novo.")
}
Write-Ok "Node.js $nodeVersion encontrado"

try {
  $pnpmVersion = (& pnpm --version 2>$null).Trim()
} catch {
  Fail("pnpm nao encontrado no PATH. Instale com 'corepack enable' ou 'npm install -g pnpm' e rode o setup de novo.")
}
Write-Ok "pnpm $pnpmVersion encontrado"

function Test-DockerDaemon {
  # Via cmd so the daemon-down stderr is reliably swallowed (2>NUL).
  cmd /c "docker info 2>NUL" | Out-Null
  return ($LASTEXITCODE -eq 0)
}

if (-not (Test-DockerDaemon)) {
  Write-Step "Docker daemon inativo. Tentando abrir o Docker Desktop..."
  $dockerExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
  if (Test-Path -LiteralPath $dockerExe) {
    Start-Process -FilePath $dockerExe | Out-Null
  }
  $deadline = (Get-Date).AddSeconds(180)
  while (-not (Test-DockerDaemon)) {
    if ((Get-Date) -gt $deadline) {
      Fail("Docker daemon indisponivel apos 180s. Abra o Docker Desktop manualmente e rode o setup de novo.")
    }
    Start-Sleep -Seconds 5
  }
}
Write-Ok "Docker daemon ativo"

# ---------------------------------------------------------------------------
# [2/7] Dependencies (per package with its own lockfile)
# ---------------------------------------------------------------------------
Write-Step "[2/$StepTotal] Verificando dependencias..."

$packages = @(
  @{ Name = "root"; Dir = $RepoRoot; Lock = "pnpm-lock.yaml" },
  @{ Name = "api"; Dir = (Join-Path $RepoRoot "api"); Lock = "pnpm-lock.yaml" },
  @{ Name = "web"; Dir = (Join-Path $RepoRoot "web"); Lock = "pnpm-lock.yaml" }
)

foreach ($pkg in $packages) {
  $nodeModules = Join-Path $pkg.Dir "node_modules"
  $lockPath = Join-Path $pkg.Dir $pkg.Lock
  $needsInstall = $false
  if (-not (Test-Path -LiteralPath $nodeModules)) {
    $needsInstall = $true
    $reason = "node_modules ausente"
  } elseif ((Get-Item -LiteralPath $lockPath).LastWriteTime -gt (Get-Item -LiteralPath $nodeModules).LastWriteTime) {
    $needsInstall = $true
    $reason = "lockfile mais novo que a instalacao"
  }
  if ($needsInstall) {
    Write-Do "Instalando dependencias de '$($pkg.Name)' ($reason)..."
    Invoke-StepCommand "pnpm" @("--dir", $pkg.Dir, "install") "Falha ao instalar dependencias de '$($pkg.Name)'"
    $script:WorkDone = $true
    Write-Ok "Dependencias de '$($pkg.Name)' instaladas"
  } else {
    Write-Skip "Dependencias de '$($pkg.Name)'"
  }
}

# ---------------------------------------------------------------------------
# [3/7] Environment file (never overwrite an existing one)
# ---------------------------------------------------------------------------
Write-Step "[3/$StepTotal] Verificando .env..."

$envExample = Join-Path $RepoRoot "api\.env.example"
$envFile = Join-Path $RepoRoot "api\.env"
if (-not (Test-Path -LiteralPath $envFile)) {
  if (-not (Test-Path -LiteralPath $envExample)) {
    Fail("api\.env.example nao encontrado. Restaure o arquivo e rode o setup de novo.")
  }
  Write-Do "Criando api\.env a partir de api\.env.example..."
  Copy-Item -LiteralPath $envExample -Destination $envFile
  $WorkDone = $true
  Write-Ok "api\.env criado"
} else {
  Write-Skip "api\.env"
}

# Make DATABASE_URL (and friends) visible to child processes invoked below.
# The API itself does not use dotenv, so the dev shell needs $env:DATABASE_URL too.
Import-DotEnv $envFile

# ---------------------------------------------------------------------------
# [4/7] Infrastructure via Docker Compose
# ---------------------------------------------------------------------------
Write-Step "[4/$StepTotal] Garantindo infraestrutura..."

Invoke-StepCommand "docker" @("compose", "-f", (Join-Path $RepoRoot "docker-compose.yml"), "up", "-d") "Falha ao subir os servicos com 'docker compose up -d'"

$services = @(
  @{ Name = "PostgreSQL"; Host = "localhost"; Port = 5432 },
  @{ Name = "Redis"; Host = "localhost"; Port = 6379 }
)
foreach ($svc in $services) {
  $ready = $false
  for ($i = 1; $i -le 60; $i++) {
    if (Test-TcpPort $svc.Host $svc.Port) { $ready = $true; break }
    Start-Sleep -Seconds 2
  }
  if (-not $ready) {
    Fail("$($svc.Name) nao respondeu em $($svc.Host):$($svc.Port) apos 2 minutos. Verifique 'docker compose ps' e os logs com 'docker compose logs'.")
  }
  Write-Ok "$($svc.Name) ativo ($($svc.Host):$($svc.Port))"
}

# ---------------------------------------------------------------------------
# [5/7] Database: Prisma client + migrations (deploy, never reset)
# ---------------------------------------------------------------------------
Write-Step "[5/$StepTotal] Preparando banco..."

# `prisma generate` replaces the query-engine DLL, which Windows refuses
# while a dev server has it loaded (EPERM). When the client already exists,
# that specific failure just means "already generated": skip with a notice
# instead of aborting. A genuinely missing client still fails below.
$prismaClientLink = Join-Path $RepoRoot "api\node_modules\@prisma\client"
$previousAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$genOutput = (& pnpm --dir api exec prisma generate 2>&1 | Out-String)
$genCode = $LASTEXITCODE
$ErrorActionPreference = $previousAction
if ($genCode -ne 0) {
  $lockedByDevServer = ($genOutput -match "EPERM") -and ($genOutput -match "query_engine") -and (Test-Path -LiteralPath $prismaClientLink)
  if (-not $lockedByDevServer) {
    $genOutput | ForEach-Object { Write-Output $_ }
    Fail("Falha em 'prisma generate' (exit code $genCode)")
  }
  Write-Output "[SKIP] Prisma Client (bloqueado pelo backend em execucao; ja gerado - reinicie o backend se o schema mudou)"
} else {
  Write-Ok "Prisma Client gerado"
}

$migrationsDir = Join-Path $RepoRoot "api\prisma\migrations"
$hasMigrations = (Test-Path -LiteralPath $migrationsDir) -and
  (@(Get-ChildItem -LiteralPath $migrationsDir -Directory -ErrorAction SilentlyContinue).Count -gt 0)

if (-not $hasMigrations) {
  Write-Do "Nenhuma migration encontrada: criando migration inicial..."
  Invoke-StepCommand "pnpm" @("--dir", "api", "exec", "prisma", "migrate", "dev", "--name", "init") "Falha ao criar a migration inicial com 'prisma migrate dev --name init'"
  $WorkDone = $true
  Write-Ok "Migration inicial aplicada"
} else {
  Invoke-StepCommand "pnpm" @("--dir", "api", "exec", "prisma", "migrate", "deploy") "Falha ao aplicar migrations com 'prisma migrate deploy'"
  Write-Ok "Migrations em dia"
}

# ---------------------------------------------------------------------------
# [6/7] Seed (currently informational only)
# ---------------------------------------------------------------------------
Write-Step "[6/$StepTotal] Executando seed..."

Invoke-StepCommand "pnpm" @("--dir", "api", "run", "db:seed") "Falha em 'db:seed'"
Write-Ok "Seed executado (dados sinteticos vivem nos gateways in-memory)"

# ---------------------------------------------------------------------------
# [7/7] Validation
# ---------------------------------------------------------------------------
Write-Step "[7/$StepTotal] Validando ambiente..."

Invoke-StepCommand "pnpm" @("--dir", "api", "exec", "prisma", "validate") "Falha em 'prisma validate'"
Write-Ok "Schema Prisma valido"

$sqlOk = $true
$previousAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  "SELECT 1;" | & pnpm --dir api exec prisma db execute --stdin --schema (Join-Path $RepoRoot "api\prisma\schema.prisma") 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { $sqlOk = $false }
} catch {
  $sqlOk = $false
}
$ErrorActionPreference = $previousAction
if (-not $sqlOk) {
  Fail("Nao foi possivel executar 'SELECT 1' no PostgreSQL. Verifique DATABASE_URL em api\.env e se o container esta saudavel.")
}
Write-Ok "PostgreSQL responde a consultas"

Write-Output ""
if ($WorkDone) {
  Write-Output "Setup inicial concluido."
} else {
  Write-Output "Ambiente ja estava pronto. Nenhuma etapa refeita."
}
Write-Output "Projeto pronto para desenvolvimento."
Write-Output ""
Write-Output "Proximos passos:"
Write-Output "  API : pnpm --dir api dev   (http://localhost:3000)"
Write-Output "  Web : pnpm --dir web dev   (http://localhost:5173)"
Write-Output "  Login de teste: coordenacao / senha123"
